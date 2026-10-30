import type { APIRoute } from "astro";
import { db, json, visitorId } from "../../server/guard";
import { songById } from "../../game/piano/songs.ts";
import { validName } from "../../game/piano/records.ts";
import { validateReplay } from "../../game/piano/validation.ts";
import { GUIDED_RULESET } from "../../game/piano/engine.ts";

export const prerender = false;
const mode = import.meta.env.DEV ? "preview" : "shared";
const reply = (body: unknown, status = 200) => json(body, status, { "cache-control": "no-store" });

interface ScoreRow {
  id: string; name: string; song_id: string; score: number; duration: number;
  best_combo: number; perfect: number; good: number; misses: number; max_speed: number; created_at: number;
}

export const GET: APIRoute = async ({ url }) => {
  const database = db();
  if (!database) return reply({ error: "Scores are unavailable." }, 503);
  const songId = url.searchParams.get("song") || "all";
  if (songId !== "all" && !songById.has(songId)) return reply({ error: "Unknown song." }, 400);
  try {
    const sql = `SELECT * FROM piano_scores WHERE ruleset = ?1 ${songId === "all" ? "" : "AND song_id = ?2"} ORDER BY score DESC, best_combo DESC, duration ASC, created_at ASC LIMIT 3`;
    const statement = database.prepare(sql);
    const { results } = await (songId === "all" ? statement.bind(GUIDED_RULESET) : statement.bind(GUIDED_RULESET, songId)).all<ScoreRow>();
    return reply({ mode, scores: (results || []).map(row => ({ id: row.id, name: row.name, songId: row.song_id, score: row.score, duration: row.duration, bestCombo: row.best_combo, perfect: row.perfect, good: row.good, misses: row.misses, maxSpeed: row.max_speed, combo: 0, matched: row.perfect + row.good, total: songById.get(row.song_id)?.notes.length || 0, date: new Date(row.created_at).toISOString() })) });
  } catch { return reply({ error: "Scores are unavailable." }, 503); }
};

export const POST: APIRoute = async ({ request, url }) => {
  if (request.headers.get("origin") && request.headers.get("origin") !== url.origin) return reply({ error: "Invalid origin." }, 403);
  if (Number(request.headers.get("content-length") || 0) > 1000000) return reply({ error: "Run is too large." }, 413);
  const database = db();
  if (!database) return reply({ error: "Scores are unavailable." }, 503);
  let body: Record<string, unknown>;
  try {
    const text = await request.text();
    if (text.length > 1000000) return reply({ error: "Run is too large." }, 413);
    body = JSON.parse(text);
    if (!body || typeof body !== "object" || Array.isArray(body)) return reply({ error: "Invalid request." }, 400);
  } catch { return reply({ error: "Invalid request." }, 400); }
  const song = typeof body.songId === "string" ? songById.get(body.songId) : undefined;
  if (!song) return reply({ error: "Unknown song." }, 400);
  const visitor = await visitorId(request);
  const now = Date.now();
  try {
    // Fail closed if rate-limit storage is unavailable. Runs and writes have
    // separate buckets, so replaying does not consume score submissions.
    const action = body.action === "start" ? "start" : "save";
    const bucket = `${visitor}:${action}:${Math.floor(now / 3600000)}`;
    const limit = await database.prepare(`INSERT INTO piano_rate_limits(bucket,count,expires_at) VALUES (?1,1,?2) ON CONFLICT(bucket) DO UPDATE SET count=count+1 RETURNING count`).bind(bucket, now + 3600000).first<{ count: number }>();
    if (!limit || limit.count > (action === "start" ? 100 : 60)) return reply({ error: "Try again in a little while." }, 429);
    if (body.action === "start") {
      const id = crypto.randomUUID();
      await database.prepare("INSERT INTO piano_runs(id,visitor,song_id,started_at,ruleset) VALUES (?1,?2,?3,?4,?5)").bind(id, visitor, song.id, now, GUIDED_RULESET).run();
      await database.batch([
        database.prepare("DELETE FROM piano_runs WHERE started_at < ?1 AND id NOT IN (SELECT id FROM piano_scores)").bind(now - 7200000),
        database.prepare("DELETE FROM piano_rate_limits WHERE expires_at < ?1").bind(now),
      ]);
      return reply({ id, mode }, 201);
    }
    if (body.action !== "save" || typeof body.id !== "string" || !/^[a-f0-9-]{36}$/.test(body.id)) return reply({ error: "Invalid run." }, 400);
    const name = validName(body.name);
    if (!name) return reply({ error: "Use a name of 2–20 letters or numbers." }, 400);
    const run = await database.prepare("SELECT visitor,song_id,started_at,ruleset FROM piano_runs WHERE id=?1").bind(body.id).first<{ visitor: string; song_id: string; started_at: number; ruleset: string }>();
    if (!run || run.visitor !== visitor || run.song_id !== song.id || run.ruleset !== GUIDED_RULESET || now - run.started_at > 7200000) return reply({ error: "This run has expired. Start the song again." }, 400);
    if (await database.prepare("SELECT id FROM piano_scores WHERE id=?1").bind(body.id).first()) return reply({ error: "This run is already saved." }, 409);
    const result = validateReplay(song, body.attempts, body.duration);
    if (!result || result.duration > now - run.started_at + 250) return reply({ error: "This performance could not be verified." }, 400);
    // Totals come from replaying the chart, never from a submitted score.
    await database.prepare(`INSERT INTO piano_scores(id,name,song_id,score,duration,best_combo,perfect,good,misses,max_speed,created_at,ruleset) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12)`)
      .bind(body.id, name, song.id, result.score, result.duration, result.bestCombo, result.perfect, result.good, result.misses, result.maxSpeed, now, GUIDED_RULESET).run();
    return reply({ score: { ...result, id: body.id, name, songId: song.id, date: new Date(now).toISOString() }, mode }, 201);
  } catch { return reply({ error: "Scores are unavailable." }, 503); }
};
