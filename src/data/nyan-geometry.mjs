// Single source of truth for the Nyan Cat's geometry, shared by
// scripts/build-svg.mjs (which emits the SVGs) and components/NyanTrail.astro
// (which positions and animates them). Keeping them in one file stops the
// rendered artwork and the layout maths from drifting apart.

// --- From the Figma frame -------------------------------------------------
export const FRAME_W = 1440;
export const RAINBOW_W = 1268; // rainbow spans x 0 → 1268
export const RAINBOW_H = 60;
export const RAINBOW_Y = 585;
export const CAT_W = 165.12;
export const CAT_H = 92.4;
export const CAT_Y = 565.3;

// --- Track ----------------------------------------------------------------
// The cat can be pushed forward past where the design parks it, so the track
// runs wider than the design's rainbow. Costs nothing: the rainbow is a tiling
// <pattern>, so a wider canvas is the same 96 rects.
export const EXTEND = 1.2;
export const TRACK_W = RAINBOW_W * EXTEND; // 1521.6

// Progress (0→1 across the track) at which the cat parks. The track is exactly
// EXTEND times the resting distance, so this is constant at every viewport.
export const REST_P = 1 / EXTEND; // 0.8333

export const CAT_PCT = (CAT_W / TRACK_W) * 100; // 10.85% of track
export const HALF_CAT = CAT_PCT / 2;
export const MIN_P = 0.06;

// Extra breathing room on the right, as a fraction of the frame.
export const REST_INSET = 0.03;

// Where the cat parks, as a fraction of the frame's width.
export const REST_FRAC = RAINBOW_W / FRAME_W - REST_INSET; // 0.8506

// The stage's left edge is the viewport's (the rainbow bleeds off-screen), but
// its resting point is anchored to the CENTRED frame — otherwise on screens
// wider than 1440 the cat keeps sailing right while the text column stops,
// ending up hundreds of px past it. Percentages resolve against the parent, so
// this excludes the scrollbar and cannot cause overflow.
const FRAME = `min(100%, ${FRAME_W}px)`;
export const STAGE_WIDTH_CSS = `calc(((100% - ${FRAME}) / 2 + ${REST_FRAC} * ${FRAME}) * ${EXTEND})`;

// Where the cat's nose sits at rest, in track fractions — used to decide which
// stars have been passed.
export const REST_NOSE = REST_P + HALF_CAT / 100;
