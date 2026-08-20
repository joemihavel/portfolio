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

/** Kept only so the intro's width is still expressible; nothing renders it. */
export const INTRO = { w: 640, h: 560 };

/** Grid the wall is laid out on. Must match the cell size in posts.ts. */
const COLS = 7;
const ROWS = 6;
const CELL_W = 400;
const CELL_H = 360;
const MARGIN = 260;

export function place(stories: Story[]): {
  cards: Placed[];
  width: number;
  height: number;
  intro: { x: number; y: number };
  peopleZone: { x: number; y: number; w: number; h: number };
} {
  // The wall is exactly its grid plus an even margin. It used to carry an
  // offset for an intro block that has since moved to the hero, which left a
  // band of empty canvas above the first row that you had to scroll past.
  const gridW = COLS * CELL_W;
  const gridH = ROWS * CELL_H;
  const width = gridW + MARGIN * 2;
  const height = gridH + MARGIN * 2;

  const peopleZone = { x: MARGIN, y: MARGIN, w: gridW, h: gridH };

  // News lives in the deck now; these positions are vestigial but the type
  // still carries them.
  const cards = stories.map((s, i) => ({
    ...s,
    x: MARGIN + (i % COLS) * CELL_W,
    y: MARGIN + Math.floor(i / COLS) * CELL_H,
    w: 268,
    rotate: 0,
  }));

  return {
    cards,
    width,
    height,
    intro: { x: width / 2 - INTRO.w / 2, y: MARGIN },
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
