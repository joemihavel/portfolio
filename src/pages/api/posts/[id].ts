// Reactions and flags on a single post.
//
//   POST /api/posts/:id  { action: "react" | "unreact" | "flag" }
//
// Both are deduped server-side by (post, visitor, action). That is the whole
// reason this table exists: a client-side check stops an honest mistake, not
// somebody running a loop.

import type { APIRoute } from "astro";
import { db, json, allow, visitorId, clampNumber } from "../../../server/guard";

export const prerender = false;

/**
 * Flags from this many distinct visitors take a post off the wall.
 *
 * Low, because the wall is small and a bad card should go quickly. Safe,
 * because hiding is reversible — the row is untouched, so a coordinated flag
 * campaign costs one UPDATE to undo.
 */
const FLAGS_TO_HIDE = 3;

export const POST: APIRoute = async ({ params, request }) => {
  const database = db();
  if (!database) return json({ error: "unavailable" }, 503);

  const id = params.id;
  if (!id || !/^p_[a-z0-9]{4,32}$/i.test(id)) return json({ error: "not found" }, 404);

  let body: { action?: unknown; x?: unknown; y?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ error: "bad request" }, 400);
  }
  const action = body.action;

  if (action !== "react" && action !== "unreact" && action !== "flag" && action !== "move") {
    return json({ error: "bad request" }, 400);
  }

  const visitor = await visitorId(request);
  const limitKey =
    action === "flag" ? "flag" : action === "move" ? "move" : "react";
  if (!(await allow(database, visitor, limitKey))) {
    return json({ error: "Slow down a moment — try again shortly." }, 429);
  }

  try {
    if (action === "move") {
      // Position only. Nothing else about a card can be edited by anyone,
      // including the person who wrote it — there is no edit path at all, so
      // this endpoint cannot be used to rewrite someone's words.
      await database
        .prepare(`UPDATE posts SET x = ?2, y = ?3 WHERE id = ?1 AND hidden = 0`)
        .bind(
          id,
          clampNumber(body.x, -10_000, 20_000, 0),
          clampNumber(body.y, -10_000, 20_000, 0)
        )
        .run();
      return json({ ok: true });
    }

    if (action === "unreact") {
      const gone = await database
        .prepare(`DELETE FROM post_actions WHERE post_id = ?1 AND visitor = ?2 AND kind = 'react'`)
        .bind(id, visitor)
        .run();

      // Only move the counter if a row actually went, so a repeated unreact
      // cannot drive it negative.
      if (gone.meta.changes) {
        await database
          .prepare(`UPDATE posts SET reactions = MAX(0, reactions - 1) WHERE id = ?1`)
          .bind(id)
          .run();
      }
      return json(await current(database, id, visitor));
    }

    // The primary key does the deduplication: a second identical action
    // collides and changes nothing, so the counter cannot be inflated.
    const claim = await database
      .prepare(
        `INSERT OR IGNORE INTO post_actions (post_id, visitor, kind, created_at)
         VALUES (?1, ?2, ?3, ?4)`
      )
      .bind(id, visitor, action, Date.now())
      .run();

    if (claim.meta.changes) {
      if (action === "react") {
        await database
          .prepare(`UPDATE posts SET reactions = reactions + 1 WHERE id = ?1`)
          .bind(id)
          .run();
      } else {
        await database
          .prepare(
            `UPDATE posts
                SET flags = flags + 1,
                    hidden = CASE WHEN flags + 1 >= ?2 THEN 1 ELSE hidden END
              WHERE id = ?1`
          )
          .bind(id, FLAGS_TO_HIDE)
          .run();
      }
    }

    return json(await current(database, id, visitor));
  } catch {
    return json({ error: "unavailable" }, 503);
  }
};

/** The post's state as this visitor should now see it. */
async function current(database: D1Database, id: string, visitor: string) {
  const post = await database
    .prepare(`SELECT reactions, hidden FROM posts WHERE id = ?1`)
    .bind(id)
    .first<{ reactions: number; hidden: number }>();

  const mine = await database
    .prepare(
      `SELECT 1 FROM post_actions WHERE post_id = ?1 AND visitor = ?2 AND kind = 'react'`
    )
    .bind(id, visitor)
    .first();

  return {
    reactions: post?.reactions ?? 0,
    hidden: !!post?.hidden,
    reacted: !!mine,
  };
}
