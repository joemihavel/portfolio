import { keyByMidi } from "./keys.ts";

export interface ChartNote { pitch: string; midi: number; beat: number; duration: number; lane: string; }
export interface Song { id: string; title: string; composer: string; difficulty: string; bpm: number; beats: number; notes: ChartNote[]; }

/** Original, monophonic excerpts of public-domain melodies. Rests close each phrase.
 * Für Elise is transposed to D minor. See licenses/piano-game.md for sources. */
function arrangement(id: string, title: string, composer: string, difficulty: string, bpm: number, phrase: string): Song {
  let beat = 0;
  const notes: ChartNote[] = [];
  for (const token of phrase.trim().split(/\s+/)) {
    const [pitch, length] = token.split(":");
    const duration = Number(length);
    if (!Number.isFinite(duration) || duration <= 0) throw new Error(`Invalid note length: ${token}`);
    if (pitch !== "-") {
      const match = /^([A-G])([#b]?)(\d)$/.exec(pitch);
      if (!match) throw new Error(`Invalid pitch: ${pitch}`);
      const midi = (Number(match[3]) + 1) * 12 + ({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[match[1]] ?? 0) + (match[2] === "#" ? 1 : match[2] === "b" ? -1 : 0);
      const key = keyByMidi.get(midi);
      if (!key) throw new Error(`Pitch outside the keyboard: ${pitch}`);
      notes.push({ pitch, midi, beat, duration: duration * .9, lane: key.code });
    }
    beat += duration;
  }
  return { id, title, composer, difficulty, bpm, beats: beat, notes };
}

export const songs: Song[] = [
  arrangement("fur-elise", "Für Elise", "Beethoven", "Intermediate", 82, `
    A4:.5 G#4:.5 A4:.5 G#4:.5 A4:.5 E4:.5 G4:.5 F4:.5 D4:1.5 -:.5
    C4:.5 F4:.5 A4:.5 Bb4:1.5 -:.5 C4:.5 E4:.5 Bb4:.5 A4:1.5 -:.5
    E4:.5 A4:.5 G#4:.5 A4:.5 G#4:.5 A4:.5 E4:.5 G4:.5 F4:.5 D4:1.5 -:.5
    C4:.5 F4:.5 A4:.5 Bb4:1.5 -:.5 C4:.5 E4:.5 A4:.5 G4:.5 F4:.5 D4:2 -:1
  `),
  arrangement("twinkle", "Twinkle, Twinkle, Little Star", "Traditional", "Easy", 76, `
    C4:1 C4:1 G4:1 G4:1 A4:1 A4:1 G4:2 F4:1 F4:1 E4:1 E4:1 D4:1 D4:1 C4:2
    G4:1 G4:1 F4:1 F4:1 E4:1 E4:1 D4:2 G4:1 G4:1 F4:1 F4:1 E4:1 E4:1 D4:2
    C4:1 C4:1 G4:1 G4:1 A4:1 A4:1 G4:2 F4:1 F4:1 E4:1 E4:1 D4:1 D4:1 C4:2
  `),
  arrangement("ode-to-joy", "Ode to Joy", "Beethoven", "Easy", 84, `
    E4:1 E4:1 F4:1 G4:1 G4:1 F4:1 E4:1 D4:1 C4:1 C4:1 D4:1 E4:1 E4:1.5 D4:.5 D4:2
    E4:1 E4:1 F4:1 G4:1 G4:1 F4:1 E4:1 D4:1 C4:1 C4:1 D4:1 E4:1 D4:1.5 C4:.5 C4:2
    D4:1 D4:1 E4:1 C4:1 D4:1 E4:.5 F4:.5 E4:1 C4:1 D4:1 E4:.5 F4:.5 E4:1 D4:1 C4:1 D4:1 G4:2
    E4:1 E4:1 F4:1 G4:1 G4:1 F4:1 E4:1 D4:1 C4:1 C4:1 D4:1 E4:1 D4:1.5 C4:.5 C4:2
  `),
  arrangement("mary-had-a-little-lamb", "Mary Had a Little Lamb", "Traditional", "Easy", 72, `
    E4:1 D4:1 C4:1 D4:1 E4:1 E4:1 E4:2 D4:1 D4:1 D4:2 E4:1 G4:1 G4:2
    E4:1 D4:1 C4:1 D4:1 E4:1 E4:1 E4:1 E4:1 D4:1 D4:1 E4:1 D4:1 C4:2 -:1
  `),
  arrangement("hot-cross-buns", "Hot Cross Buns", "Traditional", "Easy", 68, `
    E4:1 D4:1 C4:2 E4:1 D4:1 C4:2
    C4:1 C4:1 C4:1 C4:1 D4:1 D4:1 D4:1 D4:1
    E4:1 D4:1 C4:2 -:1
  `),
];

export const songById = new Map(songs.map(song => [song.id, song]));
