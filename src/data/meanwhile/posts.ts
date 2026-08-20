// User-submitted good things: the human half of the wall.
//
// Everything reaches the D1-backed Worker API through `store`, so the composer,
// the canvas renderer and the reaction buttons never touch fetch directly and
// have no idea where a post is kept.

/**
 * A scribble, as vector strokes rather than an image.
 *
 * Each stroke is a list of [x, y] pairs normalised to 0–1 of the pad, so it
 * redraws crisply at any card size and costs a couple of kilobytes instead of
 * the tens a bitmap would. It also means no image storage is ever needed,
 * which is what keeps the eventual backend on the free tier.
 */
export type Stroke = [number, number][];

/** Pad aspect, so a scribble is drawn back at the shape it was made in. */
export const INK_RATIO = 2;

export interface Post {
  id: string;
  message: string;
  strokes?: Stroke[];
  name: string | null;
  /** ISO 3166-1 alpha-2. The display name and flag are resolved client-side. */
  country: string;
  created_at: string;
  x: number;
  y: number;
  rotation: number;
  paper: number;
  reactions: number;
  /** Whether *this* browser has reacted. Server-side this becomes a per-post look-up. */
  reacted?: boolean;
  hidden?: boolean;
  /** Seed cards are real stories, credited to their outlet rather than a person. */
  source?: string;
  url?: string;
}

/**
 * Stamp papers. Cream stock with a coloured ink and a coloured tape strip,
 * from the postage-stamp reference.
 *
 * Fixed rather than theme-derived: the whole point is that human cards read as
 * a different material from the news prints, and tying them to the active theme
 * would make them blend back in. `ink` is chosen per paper for contrast rather
 * than computed, so no palette can produce grey-on-grey.
 */
export const PAPERS = [
  { bg: "#F4EFE2", ink: "#23324F", tape: "#F2C230" },
  { bg: "#F6F1E7", ink: "#7A2E1E", tape: "#8FC7E8" },
  { bg: "#F1EDE0", ink: "#1F4B34", tape: "#F0A0B4" },
  { bg: "#F5EEE6", ink: "#4A2A5E", tape: "#F2C230" },
  { bg: "#F3F0E6", ink: "#8A3B12", tape: "#A8D5A2" },
  { bg: "#EFEBE0", ink: "#123A56", tape: "#F2C230" },
];

export const MAX_LENGTH = 240;

// Bumped to retire the previous round of cards. Older rows are left in place
// rather than deleted, so stepping this back recovers them.
/**
 * The wall's data access.
 *
 * Backed by the D1 API. The only thing still kept in this browser is which
 * cards *this* person has reacted to — the server dedupes by a salted hash of
 * the IP, but that cannot survive a shared network, so the local note is what
 * keeps the button in the right state for you.
 */
const MINE = "meanwhile:reacted:v1";

const mine = (): Set<string> => {
  try {
    return new Set(JSON.parse(localStorage.getItem(MINE) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
};

const remember = (id: string, on: boolean) => {
  try {
    const set = mine();
    on ? set.add(id) : set.delete(id);
    localStorage.setItem(MINE, JSON.stringify([...set]));
  } catch {
    /* private mode: the button still works for this session */
  }
};

export const store = {
  async list(): Promise<Post[]> {
    try {
      const res = await fetch("/api/posts");
      if (!res.ok) return [];
      const { posts } = (await res.json()) as { posts: Post[] };
      const reacted = mine();
      return posts.map((p) => ({ ...p, reacted: reacted.has(p.id) }));
    } catch {
      // Offline or the API is down. An empty wall is the honest answer; the
      // alternative is showing stale cards that may since have been flagged.
      return [];
    }
  },

  async create(
    input: {
      message: string;
      name: string | null;
      country: string;
      paper?: number;
      strokes?: Stroke[];
    }
  ): Promise<Post | { error: string }> {
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: input.message,
          name: input.name,
          country: input.country,
          paper: input.paper ?? Math.floor(Math.random() * PAPERS.length),
          strokes: input.strokes ?? null,
          // Position is not stored in any meaningful sense any more: the wall
          // is the viewport, so where a card sits is recomputed on every load
          // from the window size and where the hero happens to be.
          x: 0,
          y: 0,
          rotation: 0,
        }),
      });

      const data = (await res.json()) as { post?: Post; error?: string };
      if (!res.ok || !data.post) {
        return { error: data.error ?? "Could not save that. Try again in a moment." };
      }
      return data.post;
    } catch {
      return { error: "Could not reach the wall. Check your connection." };
    }
  },

  async react(id: string, on: boolean): Promise<number> {
    remember(id, on);
    try {
      const res = await fetch(`/api/posts/${encodeURIComponent(id)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: on ? "react" : "unreact" }),
      });
      if (!res.ok) return 0;
      const { reactions } = (await res.json()) as { reactions: number };
      return reactions;
    } catch {
      return 0;
    }
  },

  /** Persists a card's new home after it has been dragged. */
  async move(id: string, x: number, y: number): Promise<void> {
    try {
      await fetch(`/api/posts/${encodeURIComponent(id)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "move", x, y }),
      });
    } catch {
      // The card stays where it was dropped for this session either way.
    }
  },

  /** Returns true once enough people have flagged it for it to come down. */
  async flag(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/posts/${encodeURIComponent(id)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "flag" }),
      });
      if (!res.ok) return false;
      const { hidden } = (await res.json()) as { hidden: boolean };
      return hidden;
    } catch {
      return false;
    }
  },
};

/** "3 people felt this" — never a score, never sortable. */
export function reactionLabel(n: number): string {
  if (n <= 0) return "Felt this?";
  if (n === 1) return "1 person felt this";
  return `${n} people felt this`;
}

export function timeAgo(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return days === 1 ? "yesterday" : `${days}d ago`;
}
