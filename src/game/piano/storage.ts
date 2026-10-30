import { GUIDED_RULESET, type HitAttempt, type RunResult } from "./engine.ts";
import { demoScores, rankedScores, validName, type PianoScore, type ScoreMode } from "./records.ts";

const LOCAL_SCORES = "folio-piano-scores-v2";
const BESTS = "folio-piano-bests-v2";
function read<T>(key: string, fallback: T): T { try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; } }
function write(key: string, value: unknown) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } }
function bests(): Record<string, number> { const value = read<unknown>(BESTS, {}); return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, number> : {}; }
function localId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16)); bytes[6] = bytes[6] & 15 | 64; bytes[8] = bytes[8] & 63 | 128;
  const hex = [...bytes].map(value => value.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
const request = async (body: unknown, signal?: AbortSignal) => {
  const response = await fetch("/api/piano", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal });
  const data = await response.json();
  if (!response.ok) throw Object.assign(new Error(data.error || "Scores are unavailable."), { status: response.status });
  return data;
};
export interface RunIdentity { id: string; songId: string; mode: ScoreMode; }
export class PianoStorage {
  readonly signal: AbortSignal;
  constructor(signal: AbortSignal) { this.signal = signal; }
  best(songId: string): number { const value = bests()[songId]; return typeof value === "number" && Number.isFinite(value) ? value : 0; }
  remember(songId: string, score: number): boolean {
    const values = bests();
    if (score <= this.best(songId)) return false;
    values[songId] = score;
    write(BESTS, values);
    return true;
  }
  async start(songId: string): Promise<RunIdentity> {
    try { const data = await request({ action: "start", songId, ruleset: GUIDED_RULESET }, this.signal); return { id: data.id, songId, mode: data.mode }; }
    catch (error) {
      if (this.signal.aborted || (error as { status?: number }).status === 429) throw error;
      return { id: localId(), songId, mode: "local" };
    }
  }
  async save(run: RunIdentity, name: string, result: RunResult, attempts: HitAttempt[]): Promise<{ score: PianoScore; mode: ScoreMode }> {
    const checked = validName(name);
    if (!checked) throw new Error("Use a name of 2–20 letters or numbers.");
    if (run.mode !== "local") {
      try { return await request({ action: "save", id: run.id, songId: run.songId, name: checked, attempts, duration: result.duration }, this.signal); }
      catch (error) { if (this.signal.aborted || ((error as { status?: number }).status ?? 503) < 500) throw error; }
    }
    const scores = this.localScores();
    if (scores.some(score => score.id === run.id)) throw new Error("This run is already saved.");
    const score: PianoScore = { ...result, id: run.id, name: checked, songId: run.songId, date: new Date().toISOString(), local: true };
    if (!write(LOCAL_SCORES, [...scores, score].sort((a, b) => b.score - a.score).slice(0, 100))) throw new Error("Browser storage is unavailable. Your score could not be saved.");
    return { score, mode: "local" };
  }
  localScores(): PianoScore[] {
    const rows = read<unknown>(LOCAL_SCORES, []);
    return Array.isArray(rows) ? rows.filter((row): row is PianoScore => !!row && typeof row.id === "string" && typeof row.name === "string" && typeof row.score === "number" && Number.isFinite(row.score) && typeof row.songId === "string" && typeof row.date === "string") : [];
  }
  async leaderboard(songId: string) {
    let rows: PianoScore[] = [];
    let mode: ScoreMode = "local";
    try {
      const response = await fetch(`/api/piano?song=${encodeURIComponent(songId)}`, { signal: this.signal });
      if (!response.ok) throw new Error();
      const data = await response.json(); rows = data.scores; mode = data.mode;
    } catch (error) { if (this.signal.aborted) throw error; }
    return { mode, scores: rankedScores([...demoScores, ...this.localScores(), ...rows], songId) };
  }
}
