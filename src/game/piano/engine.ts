import type { ChartNote, Song } from "./songs.ts";

export const GUIDED_RULESET = "guided-v2";
export const LEAD_IN_MS = 1600;
export const GENEROUS_WINDOW_MS = 450;

/** Timing changes points, never whether the correct note can be played. */
export function pointsForEarly(earlyMs: number) {
  return Math.max(40, 100 - Math.round(Math.max(0, earlyMs - GENEROUS_WINDOW_MS) / 30));
}
export interface ScheduledNote extends ChartNote { index: number; at: number; end: number; }
export interface HitAttempt { code: string; at: number; }
export interface RunResult {
  score: number; combo: number; bestCombo: number; perfect: number; good: number;
  misses: number; duration: number; maxSpeed: number; matched: number; total: number;
}
export interface Judgement { kind: "perfect" | "good" | "wrong"; at: number; points: number; note?: ScheduledNote; }

/** Input-paced, finite melody. Musical position waits for the next correct key.
 * Between inputs min(position + delta, target) is associative, so scoring and
 * waiting behave identically at every rendering frame rate and in API replay. */
export class PianoEngine {
  readonly song: Song;
  readonly attempts: HitAttempt[] = [];
  score = 0;
  combo = 0;
  bestCombo = 0;
  perfect = 0;
  good = 0;
  misses = 0;
  elapsed = 0;
  position = 0;
  ended = false;
  next = 0;
  onJudge?: (judgement: Judgement) => void;

  constructor(song: Song) { this.song = song; }
  note(index: number): ScheduledNote | null {
    const source = this.song.notes[index];
    if (!source) return null;
    const at = LEAD_IN_MS + source.beat * 60000 / this.song.bpm;
    return { ...source, index, at, end: at + source.duration * 60000 / this.song.bpm };
  }
  current() { return this.note(this.next); }
  advance(at: number) {
    if (this.ended || !Number.isFinite(at) || at < this.elapsed) return;
    const target = this.current();
    if (target) this.position = Math.min(target.at, this.position + at - this.elapsed);
    this.elapsed = at;
  }
  press(code: string, at: number): Judgement | null {
    if (this.ended || !Number.isFinite(at) || at < this.elapsed) return null;
    this.advance(at);
    this.attempts.push({ code, at });
    const note = this.current();
    if (!note) return null;
    if (note.lane !== code) {
      this.misses++;
      this.combo = 0;
      const judgement: Judgement = { kind: "wrong", at, points: 0 };
      this.onJudge?.(judgement);
      return judgement;
    }
    const points = pointsForEarly(note.at - this.position);
    const kind = points === 100 ? "perfect" : "good";
    this.score += points;
    this.combo++;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this[kind]++;
    this.next++;
    this.ended = this.next === this.song.notes.length;
    const judgement: Judgement = { kind, at, points, note };
    this.onJudge?.(judgement);
    return judgement;
  }
  visible(ahead = 2800): ScheduledNote[] {
    const notes: ScheduledNote[] = [];
    for (let index = this.next; index < this.song.notes.length; index++) {
      const note = this.note(index)!;
      if (note.at > this.position + ahead) break;
      notes.push(note);
    }
    return notes;
  }
  result(): RunResult {
    return { score: this.score, combo: this.combo, bestCombo: this.bestCombo, perfect: this.perfect, good: this.good, misses: this.misses, duration: this.elapsed, maxSpeed: 1, matched: this.next, total: this.song.notes.length };
  }
}
