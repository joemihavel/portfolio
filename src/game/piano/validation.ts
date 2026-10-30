import { PianoEngine, type HitAttempt } from "./engine.ts";
import { keyByCode } from "./keys.ts";
import type { Song } from "./songs.ts";

export function validateReplay(song: Song, attempts: unknown, duration: unknown) {
  if (!Array.isArray(attempts) || attempts.length > 20000 || typeof duration !== "number" || !Number.isFinite(duration) || duration < 0 || duration > 3600000) return null;
  const engine = new PianoEngine(song);
  let previous = 0;
  for (const raw of attempts) {
    if (!raw || typeof raw !== "object") return null;
    const attempt = raw as HitAttempt;
    if (!keyByCode.has(attempt.code) || typeof attempt.at !== "number" || !Number.isFinite(attempt.at) || attempt.at < previous || attempt.at > duration + 1 || engine.ended) return null;
    engine.press(attempt.code, attempt.at);
    previous = attempt.at;
  }
  if (!engine.ended || Math.abs(engine.elapsed - duration) > 1) return null;
  return engine.result();
}
