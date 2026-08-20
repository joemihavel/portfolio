// Where the cards sit around the hero.
//
// The wall used to be a world you panned around. It is now exactly the
// viewport, so every card has to be visible at once and none may sit behind
// the headline. That makes this a layout problem rather than a scatter: a
// fixed set of slots in the margins around the text, ordered so that the best
// ones are used first and the wall stays balanced when only a few are taken.

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Slot {
  x: number;
  y: number;
  rotation: number;
}

const overlaps = (a: Rect, b: Rect, pad = 0) =>
  a.x < b.x + b.w + pad &&
  a.x + a.w + pad > b.x &&
  a.y < b.y + b.h + pad &&
  a.y + a.h + pad > b.y;

/**
 * Candidate positions as fractions of the viewport.
 *
 * Ordered deliberately, not by geometry: the first four are the corners, so a
 * wall with only a handful of cards still looks composed rather than
 * lopsided. Later entries fill the edges between them. The rotations are hand
 * picked to lean away from the centre, which makes the cluster read as framing
 * the text rather than drifting off it.
 */
const CANDIDATES: { fx: number; fy: number; rotation: number }[] = [
  { fx: 0.045, fy: 0.1, rotation: -3.4 },
  { fx: 0.955, fy: 0.1, rotation: 3.1 },
  { fx: 0.045, fy: 0.9, rotation: 2.6 },
  { fx: 0.955, fy: 0.9, rotation: -2.9 },

  { fx: 0.5, fy: 0.06, rotation: 1.6 },
  { fx: 0.5, fy: 0.94, rotation: -1.9 },
  { fx: 0.035, fy: 0.5, rotation: 2.2 },
  { fx: 0.965, fy: 0.5, rotation: -2.4 },

  { fx: 0.26, fy: 0.07, rotation: -2.1 },
  { fx: 0.74, fy: 0.07, rotation: 2.8 },
  { fx: 0.26, fy: 0.93, rotation: 3.3 },
  { fx: 0.74, fy: 0.93, rotation: -3.0 },

  { fx: 0.13, fy: 0.28, rotation: -1.4 },
  { fx: 0.87, fy: 0.28, rotation: 1.8 },
  { fx: 0.13, fy: 0.72, rotation: 2.0 },
  { fx: 0.87, fy: 0.72, rotation: -1.7 },
];

export interface ArrangeOptions {
  vw: number;
  vh: number;
  /** The hero text, in viewport coordinates. Nothing may land on it. */
  hero: Rect;
  cardW: number;
  cardH: number;
  /** Kept clear of the viewport edges and of the hero. */
  edge?: number;
  gap?: number;
  /**
   * Anything else a card must not cover — the back link and the visitor count
   * live in the top corners, and a card landing on them made both unreadable.
   */
  blocked?: Rect[];
}

/**
 * Returns every slot that fits, best first.
 *
 * A slot is dropped if it would touch the hero, leave the viewport, or collide
 * with a slot already taken — so the result is always fully visible and never
 * overlapping, however small the window is. The caller shows as many of the
 * newest cards as there are slots.
 */
export function arrange({
  vw,
  vh,
  hero,
  cardW,
  cardH,
  edge = 14,
  gap = 16,
  blocked = [],
}: ArrangeOptions): Slot[] {
  const placed: Rect[] = [];
  const out: Slot[] = [];

  for (const c of CANDIDATES) {
    // fx/fy are the slot's centre, so the card is hung around that point.
    let x = c.fx * vw - cardW / 2;
    let y = c.fy * vh - cardH / 2;

    // Pull it back inside rather than discarding it: a corner slot on a narrow
    // window is still a good position once nudged in.
    x = Math.min(vw - cardW - edge, Math.max(edge, x));
    y = Math.min(vh - cardH - edge, Math.max(edge, y));

    const rect: Rect = { x, y, w: cardW, h: cardH };

    if (overlaps(rect, hero, gap)) continue;
    if (blocked.some((b) => overlaps(rect, b, gap))) continue;
    if (placed.some((p) => overlaps(rect, p, gap))) continue;

    placed.push(rect);
    out.push({ x, y, rotation: c.rotation });
  }

  return out;
}

/**
 * Pushes a rectangle out of anything it is overlapping.
 *
 * Used while dragging: rather than refusing to move, the card slides around
 * the obstacle. It is displaced along whichever axis it has entered least,
 * which is what makes it feel like it is being nudged aside rather than
 * snapping somewhere arbitrary.
 */
export function keepOut(card: Rect, obstacles: Rect[], gap = 12): { x: number; y: number } {
  let { x, y } = card;

  // Two passes: clearing one obstacle can push a card into another, and at
  // this scale settling it is cheaper than solving it properly.
  for (let pass = 0; pass < 2; pass++) {
    for (const o of obstacles) {
      const r: Rect = { x, y, w: card.w, h: card.h };
      if (!overlaps(r, o, gap)) continue;

      // How far it would have to travel to leave by each side.
      const left = o.x - gap - (x + card.w);
      const right = o.x + o.w + gap - x;
      const up = o.y - gap - (y + card.h);
      const down = o.y + o.h + gap - y;

      const best = Math.min(Math.abs(left), Math.abs(right), Math.abs(up), Math.abs(down));
      if (best === Math.abs(left)) x += left;
      else if (best === Math.abs(right)) x += right;
      else if (best === Math.abs(up)) y += up;
      else y += down;
    }
  }

  return { x, y };
}

/**
 * Card size for the current viewport. Shrinks before it starts dropping slots.
 *
 * Bounded by height as well as width: a card carrying a scribble is about
 * `w / 2` taller than a text-only one, so on a short window sizing purely off
 * the width produces a card that cannot fit on screen at all.
 */
export function cardSize(vw: number, vh = 900) {
  const w = Math.max(168, Math.min(300, vw * 0.21, vh * 0.34));
  return { w, h: w * 0.66 };
}
