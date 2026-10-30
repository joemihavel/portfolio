# Archive frames

Archive has 27 native previews: the original 12 static interfaces and 15 animated
studies from Flent Charter section `47:66954`. Source IDs, labels, and the curated
order live in `src/data/archive.ts`. Static screens remain full width in Reader
Mode. Animated screens form smaller, balanced stacks, with paired column heights.
The experimental canvas uses the same collection in three staggered stacks.

`ArchiveFrame.astro` scales each native frame. `ArchiveSequence.astro` renders the
15 studies from `src/data/archive-motion.json`: 109 source HTML states, with Figma
node IDs, stable layer keys, source transition timing, and word-by-word component
variants. `src/scripts/archive-sequences.ts` plays them with Web Animations and one
shared clock. Matching layers move and resize; new layers fade in. Frames have no
click controls, hover interactions, or expand previews. Canvas navigation works.

Playback starts after the sequence's local images and fonts are ready. Invisible
previews and background tabs pause. Reduced motion shows a completed, static state.
Page navigation cancels animation frames, animations, observers, and listeners.
Code examples are literal text from the editable Figma layers, including their
syntax colors; template expressions are never executed as application code.

Prototype reactions are distinct from Figma canvas keyframes. The motion exporter
does not produce Smart Animate code, so this player reconstructs the source's
state transitions and easing. The native browser rendering can differ slightly
from Figma's interpolation and font rasterization.

The old prototype controllers in `src/scripts/archive/` remain dormant. Adding a
new animated preview requires a scene record and its registry entry. To adjust
the order, edit the registry; to adjust states or timing, edit the scene data.
Keep the source IDs and unique layer keys when changing markup.

After changing utility classes in native components or scene HTML, run
`node scripts/build-archive-styles.mjs`. Its CSS is scoped to `.archive-stage`.
The source assets are local under `public/images/archive`; the animated studies'
assets are in `motion/`. Fonts and their licenses are bundled locally.

Layout reference lock: the supplied Charter frames own typography, imagery,
colors, and internal UI. Refero's Ryan Stephen gallery informed image-first
stacking; PORTO ROCHA informed consistent gaps and restrained framing. The user's
latest direction takes precedence: full-width static screens, compact animated
groups, and no empty column endings. No additional labels or controls were added.

Checks: `node --test tests/archive-sequences.test.mjs` and `npm run build`.
