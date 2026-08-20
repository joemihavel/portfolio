// Shared server-side guards: who is asking, how often, and is this valid.
//
// Everything here runs on the Worker, where the free plan allows 10ms of CPU
// per request — so it is all cheap string work and single-statement D1 calls.
// Nothing loops over user input more than once.

import { env } from "cloudflare:workers";

export const db = () => (env as { DB?: D1Database }).DB;

/**
 * A stable, anonymous handle for one visitor.
 *
 * SHA-256 over the IP plus a server-side salt. The salt means the digests
 * cannot be reversed by hashing the whole IPv4 space — without one, a
 * "hashed IP" is barely better than the IP itself. The result is enough to
 * count someone's actions and useless for identifying them.
 */
export async function visitorId(request: Request): Promise<string> {
  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";

  const salt = (env as { VISITOR_SALT?: string }).VISITOR_SALT ?? "meanwhile-dev-salt";
  const bytes = new TextEncoder().encode(`${salt}:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  // 16 hex chars is 64 bits — far beyond collision risk at this scale, and a
  // third the storage of the full digest.
  return [...new Uint8Array(digest).slice(0, 8)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function country(request: Request): string {
  const raw = request.headers.get("cf-ipcountry");
  return raw && /^[A-Z]{2}$/.test(raw) ? raw : "XX";
}

export const json = (body: unknown, status = 200, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });

/* -------------------------------------------------------------- rate limit */

export interface Limit {
  /** Actions allowed inside one window. */
  max: number;
  /** Window length in ms. */
  windowMs: number;
}

export const LIMITS = {
  // Deliberately generous for a person and useless for a script. Someone
  // writing six good things in an hour is having a lovely day; someone writing
  // six hundred is not a person.
  post: { max: 6, windowMs: 60 * 60 * 1000 },
  react: { max: 60, windowMs: 60 * 60 * 1000 },
  flag: { max: 20, windowMs: 60 * 60 * 1000 },
  // Rearranging is meant to be playful, so this is loose — but each drag is a
  // write, and anyone can move anyone's card, so it cannot be unbounded.
  move: { max: 120, windowMs: 60 * 60 * 1000 },
} satisfies Record<string, Limit>;

/**
 * Fixed-window counter in D1.
 *
 * Fixed rather than sliding because it is one upsert and one read instead of a
 * scan over timestamps — and the failure mode of a fixed window (a burst
 * straddling the boundary) is harmless here.
 *
 * Fails **open**: if the counter itself errors, the request proceeds. A broken
 * limiter should not take the wall down.
 */
export async function allow(
  database: D1Database,
  visitor: string,
  action: keyof typeof LIMITS
): Promise<boolean> {
  const { max, windowMs } = LIMITS[action];
  const now = Date.now();
  const bucket = `${visitor}:${action}:${Math.floor(now / windowMs)}`;

  try {
    const row = await database
      .prepare(
        `INSERT INTO rate_limits (bucket, count, expires_at) VALUES (?1, 1, ?2)
         ON CONFLICT(bucket) DO UPDATE SET count = count + 1
         RETURNING count`
      )
      .bind(bucket, now + windowMs)
      .first<{ count: number }>();

    return (row?.count ?? 1) <= max;
  } catch {
    return true;
  }
}

/** Clears expired counters. Cheap, and only run occasionally by callers. */
export async function sweep(database: D1Database): Promise<void> {
  try {
    await database.prepare("DELETE FROM rate_limits WHERE expires_at < ?1").bind(Date.now()).run();
  } catch {
    /* housekeeping only — never worth failing a request over */
  }
}

/* --------------------------------------------------------------- validation */

export const MAX_MESSAGE = 240;
export const MAX_NAME = 32;
export const MAX_STROKES = 60;
export const MAX_POINTS = 600;

/** Strips control characters and collapses runaway whitespace. */
export function cleanText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value
    // C0/C1 controls, plus the zero-width characters used to smuggle
    // invisible text past a length check.
    .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u2028\u2029\uFEFF]/g, "")
    .replace(/\s{4,}/g, "   ")
    .trim()
    .slice(0, max);
}

/**
 * Validates a scribble.
 *
 * Bounds every dimension — stroke count, total points, and each coordinate —
 * because this is the one field where a client could otherwise post megabytes
 * of numbers.
 *
 * Three outcomes, deliberately distinct: `null` means there was no scribble,
 * `false` means there was one and it is not acceptable. Collapsing those two
 * made an oversized drawing save silently as a text-only card, which looks
 * exactly like the drawing being lost.
 */
export function cleanStrokes(value: unknown): string | null | false {
  if (value === undefined || value === null) return null;
  if (!Array.isArray(value)) return false;
  if (!value.length) return null;
  if (value.length > MAX_STROKES) return false;

  let points = 0;
  const out: number[][][] = [];

  for (const stroke of value) {
    if (!Array.isArray(stroke) || !stroke.length) continue;
    const pts: number[][] = [];
    for (const p of stroke) {
      if (!Array.isArray(p) || p.length !== 2) return false;
      const [x, y] = p;
      if (typeof x !== "number" || typeof y !== "number") return false;
      if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
      if (x < -0.05 || x > 1.05 || y < -0.05 || y > 1.05) return false;
      // Three decimals is under half a pixel on any card this will ever be
      // drawn at, and roughly halves the stored size.
      pts.push([Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000]);
      if (++points > MAX_POINTS) return false;
    }
    if (pts.length) out.push(pts);
  }

  return out.length ? JSON.stringify(out) : null;
}

export const isCountry = (v: unknown): v is string =>
  typeof v === "string" && /^[A-Z]{2}$/.test(v);

export const clampNumber = (v: unknown, lo: number, hi: number, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback;
