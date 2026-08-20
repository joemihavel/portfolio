// Canvas layout for Meanwhile, Somewhere.
//
// Positions are computed from the story id rather than randomised, so the
// server and the client agree and a card does not jump on hydration. It also
// means a story keeps the same spot all day, which matters once notes are
// pinned around it.

export interface Country {
  code: string;
  name: string;
  flag: string;
}

export interface StoryImage {
  src: string;
  alt: string | null;
  w: number | null;
  h: number | null;
}

export interface Story {
  id: string;
  headline: string;
  image?: StoryImage | null;
  summary: string;
  category: string;
  country: Country | null;
  source: string;
  url: string;
  published_at: string | null;
  read_minutes: number;
  from_reserve?: boolean;
}

export interface Day {
  day: string;
  generated_at: string;
  count: number;
  fresh_count: number;
  stories: Story[];
}

export interface Placed extends Story {
  x: number;
  y: number;
  w: number;
  rotate: number;
}

/** Deterministic 0–1 from a string. xorshift over an FNV-ish seed. */
function rand(seed: string, salt: number): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h << 13;
  h ^= h >>> 17;
  h ^= h << 5;
  return ((h >>> 0) % 100000) / 100000;
}

const CELL_W = 440;
// Portrait photo cards, plus the caption that overhangs them.
const CELL_H = 580;
const PAD = 220;

/** The intro sits on the canvas itself, as the first thing on the wall. */
export const INTRO = { w: 640, h: 560 };

/**
 * Loose grid with per-cell jitter.
 *
 * A jittered grid rather than a true scatter: real scatter needs overlap
 * resolution, and cards that overlap on an infinite canvas are unreadable and
 * fight for clicks. The grid guarantees separation, and the jitter plus a small
 * rotation is enough to read as "pinned to a wall" rather than "laid out in a
 * spreadsheet".
 */
export function place(stories: Story[]): {
  cards: Placed[];
  width: number;
  height: number;
  intro: { x: number; y: number };
  peopleZone: { x: number; y: number; w: number; h: number };
} {
  // News lives in the deck now, so the wall only has to hold the intro and the
  // stamp cards. Sized for those: a world scaled for forty story cards left a
  // dozen stamps swimming in empty grid, which is the failure mode this whole
  // page is trying to avoid.
  // Wide enough for a 7-column grid of cards plus margins.
  const width = 3400;
  const introTop = PAD;
  const bandY = introTop + INTRO.h * 0.62 + 160;

  // Positions are still computed for every story, because the seed cards are
  // derived from them and the caller may want to place news again later.
  const cols = Math.max(3, Math.round(Math.sqrt(stories.length * 1.7)));
  const cards = stories.map((s, i) => ({
    ...s,
    x: PAD + (i % cols) * CELL_W + (rand(s.id, 1) - 0.5) * 110,
    y: bandY + Math.floor(i / cols) * CELL_H + (rand(s.id, 2) - 0.5) * 110,
    w: [244, 268, 292][Math.floor(rand(s.id, 3) * 3)],
    rotate: (rand(s.id, 4) - 0.5) * 5.2,
  }));

  const zoneH = 2160;
  const peopleZone = {
    x: 150,
    y: bandY,
    // Right inset leaves room for a card's own width plus the zoom controls.
    w: width - 150 - 380,
    h: zoneH,
  };

  return {
    cards,
    width,
    height: bandY + zoneH + 340,
    intro: { x: width / 2 - INTRO.w / 2, y: introTop },
    peopleZone,
  };
}

/* One vivid colour per category. The card frame, caption panel and chip all
   take it, so a glance across the wall reads as a spread of subjects rather
   than a spread of photographs. Chosen for white text at 4.5:1 or better. */
export const CATEGORY_COLOUR: Record<string, string> = {
  planet: "#1F8A5B",
  science: "#2C5FD0",
  people: "#D8452B",
  animals: "#B45309",
  culture: "#7C3AED",
  achievement: "#BE185D",
  communities: "#0F766E",
  tiny: "#C2410C",
};

export const CATEGORY_META: Record<string, { label: string; emoji: string }> = {
  planet: { label: "Planet", emoji: "🌱" },
  science: { label: "Science", emoji: "🔬" },
  people: { label: "People", emoji: "🧑‍🤝‍🧑" },
  animals: { label: "Animals", emoji: "🐋" },
  culture: { label: "Culture", emoji: "🎨" },
  achievement: { label: "Human achievement", emoji: "🚀" },
  communities: { label: "Communities", emoji: "🏘️" },
  tiny: { label: "Tiny wins", emoji: "✨" },
};
