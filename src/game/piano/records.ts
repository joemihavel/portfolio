import { PianoEngine, type RunResult } from "./engine.ts";
import { songs } from "./songs.ts";

export interface PianoScore extends RunResult {
  id: string; name: string; songId: string; date: string; demo?: boolean; local?: boolean;
}
export type ScoreMode = "shared" | "preview" | "local";

export function validName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.normalize("NFKC").replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028\u2029\ufeff]/g, "").replace(/\s+/g, " ").trim();
  if ([...name].length < 2 || [...name].length > 20 || !/^[\p{L}\p{N} ._'’-]+$/u.test(name)) return null;
  const compact = name.toLowerCase().replace(/[\s._'-]/g, "").replace(/0/g, "o").replace(/1/g, "i").replace(/3/g, "e");
  const candidates = [compact, ...name.toLowerCase().split(/[ ._'’-]+/)];
  if (candidates.some(word => /^(fuck(?:you|off|er|ing)?|shit(?:head)?|cunt|nigg(?:er|a)|faggot|heilhitler|killall.*)$/i.test(word))) return null;
  return name;
}

export function rankedScores(scores: PianoScore[], songId = "all"): PianoScore[] {
  const unique = new Map(scores.map(score => [score.id, score]));
  return [...unique.values()].filter(score => songId === "all" || score.songId === songId)
    .sort((a, b) => b.score - a.score || b.bestCombo - a.bestCombo || a.duration - b.duration || a.date.localeCompare(b.date)).slice(0, 3);
}

// Fictional examples, identified once as sample scores above the list.
// Replayed with the same guided rules;
// old survival-mode examples are deliberately excluded from this score scale.
const demoNames = ["Aarav", "Priya", "Rohan", "Ananya", "Kabir", "Meera", "Ishaan", "Sneha"];
export const demoScores: PianoScore[] = songs.flatMap((song, songIndex) => [0, 1, 2].map(rank => {
  const engine = new PianoEngine(song);
  for (let index = 0; index < song.notes.length; index++) {
    const note = engine.current()!;
    const early = index % (4 - rank) === 0 ? 900 + rank * 180 : 80;
    engine.press(note.lane, engine.elapsed + Math.max(0, note.at - engine.position - early));
  }
  return { ...engine.result(), id: `demo-guided-${song.id}-${rank}`,
    name: demoNames[(songIndex + rank * 2) % demoNames.length], songId: song.id,
    date: new Date(Date.UTC(2026, 9, 26 - rank - songIndex)).toISOString(), demo: true };
}));
