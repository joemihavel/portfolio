// Visitor tally.
//
// Two routes on one file:
//   GET  /api/visits — read the totals
//   POST /api/visits — record this browser's first visit, then read the totals
//
// What is stored is a country code and a number. Nothing else. Cloudflare
// resolves the country at the edge and hands it over as `cf.country`, so no IP
// address, user agent or timestamp ever reaches the database, and no
// third-party geo-IP service is involved.
//
// The client decides whether to POST: it does so once, guarded by a flag in
// localStorage. That keeps this cookie-free — nothing to consent to — at the
// cost of counting a second time if someone clears storage or switches device.

import type { APIRoute } from "astro";
// v13+ of the adapter dropped locals.runtime.env; bindings come from here.
import { env } from "cloudflare:workers";

// Runs on the Worker rather than at build time.
export const prerender = false;

interface Row {
  country: string;
  count: number;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      // A tally that is a few seconds stale is fine, and this keeps repeat
      // reads off the database entirely.
      "cache-control": "public, max-age=30",
    },
  });

async function tally(db: D1Database) {
  const { results } = await db
    .prepare("SELECT country, count FROM visits ORDER BY count DESC")
    .all<Row>();

  const rows = results ?? [];
  return {
    total: rows.reduce((sum, r) => sum + r.count, 0),
    countries: rows,
  };
}

export const GET: APIRoute = async () => {
  const db = (env as { DB?: D1Database }).DB;
  if (!db) return json({ error: "no database" }, 503);

  try {
    return json(await tally(db));
  } catch {
    return json({ error: "unavailable" }, 503);
  }
};

export const POST: APIRoute = async ({ request }) => {
  const db = (env as { DB?: D1Database }).DB;
  if (!db) return json({ error: "no database" }, 503);

  // Cloudflare sets this header on every request it proxies. Using the header
  // rather than the cf object keeps this independent of adapter internals.
  // 'XX' rather than dropping the visit: an unresolved country is still a
  // visitor, and the total should say so.
  const raw = request.headers.get("cf-ipcountry");
  const country = raw && /^[A-Z]{2}$/.test(raw) ? raw : "XX";

  try {
    // One statement, so a burst of first visits cannot lose an increment the
    // way a read-then-write pair would.
    await db
      .prepare(
        `INSERT INTO visits (country, count) VALUES (?1, 1)
         ON CONFLICT(country) DO UPDATE SET count = count + 1`
      )
      .bind(country)
      .run();

    return json(await tally(db));
  } catch {
    return json({ error: "unavailable" }, 503);
  }
};
