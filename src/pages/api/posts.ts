// The wall.
//
//   GET  /api/posts — visible posts, newest first
//   POST /api/posts — leave one
//
// Read path is deliberately dumb and cacheable: one indexed query, no joins,
// and a short edge cache so a visitor who is only looking never reaches D1.

import type { APIRoute } from "astro";
import {
  db,
  json,
  allow,
  sweep,
  visitorId,
  cleanText,
  cleanStrokes,
  isCountry,
  clampNumber,
  MAX_MESSAGE,
  MAX_NAME,
} from "../../server/guard";

export const prerender = false;

/** Newest N. The wall is a place to stumble on things, not an archive. */
const PAGE = 300;

interface Row {
  id: string;
  message: string;
  strokes: string | null;
  name: string | null;
  country: string;
  paper: number;
  x: number;
  y: number;
  rotation: number;
  reactions: number;
  created_at: number;
}

const shape = (r: Row) => ({
  id: r.id,
  message: r.message,
  // Parsed here rather than on the client so a corrupt row degrades to a
  // text-only card instead of throwing inside the renderer.
  strokes: r.strokes ? safeParse(r.strokes) : undefined,
  name: r.name,
  country: r.country,
  paper: r.paper,
  x: r.x,
  y: r.y,
  rotation: r.rotation,
  reactions: r.reactions,
  created_at: new Date(r.created_at).toISOString(),
});

function safeParse(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export const GET: APIRoute = async () => {
  const database = db();
  if (!database) return json({ posts: [] }, 503);

  try {
    const { results } = await database
      .prepare(
        `SELECT id, message, strokes, name, country, paper, x, y, rotation,
                reactions, created_at
           FROM posts
          WHERE hidden = 0
          ORDER BY created_at DESC
          LIMIT ?1`
      )
      .bind(PAGE)
      .all<Row>();

    return json({ posts: (results ?? []).map(shape) }, 200, {
      // Fifteen seconds is invisible to a person and removes almost all read
      // traffic from the database.
      "cache-control": "public, max-age=15",
    });
  } catch {
    return json({ posts: [] }, 503);
  }
};

export const POST: APIRoute = async ({ request }) => {
  const database = db();
  if (!database) return json({ error: "unavailable" }, 503);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "bad request" }, 400);
  }

  const visitor = await visitorId(request);
  if (!(await allow(database, visitor, "post"))) {
    return json({ error: "Slow down a moment — try again shortly." }, 429);
  }

  const message = cleanText(body.message, MAX_MESSAGE);

  const checked = cleanStrokes(body.strokes);
  if (checked === false) {
    return json({ error: "That drawing is too big — try a simpler one." }, 400);
  }
  const strokes = checked;

  // A card has to actually say something, in one medium or the other.
  if (!message && !strokes) return json({ error: "empty" }, 400);

  const country = body.country;
  if (!isCountry(country)) return json({ error: "country required" }, 400);

  const name = cleanText(body.name, MAX_NAME) || null;
  const paper = Math.floor(clampNumber(body.paper, 0, 20, 0));
  const x = clampNumber(body.x, -10_000, 20_000, 0);
  const y = clampNumber(body.y, -10_000, 20_000, 0);
  const rotation = clampNumber(body.rotation, -15, 15, 0);

  const id = `p_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
  const now = Date.now();

  try {
    await database
      .prepare(
        `INSERT INTO posts
           (id, message, strokes, name, country, paper, x, y, rotation, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`
      )
      .bind(id, message, strokes, name, country, paper, x, y, rotation, now)
      .run();
  } catch {
    return json({ error: "unavailable" }, 503);
  }

  // Housekeeping on roughly one write in twenty, so expired counters are
  // cleared without any request paying for it often.
  if (Math.random() < 0.05) await sweep(database);

  return json({
    post: {
      id,
      message,
      strokes: strokes ? safeParse(strokes) : undefined,
      name,
      country,
      paper,
      x,
      y,
      rotation,
      reactions: 0,
      created_at: new Date(now).toISOString(),
    },
  }, 201);
};
