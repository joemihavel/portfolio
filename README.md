# portfolio-2026

Personal site for Joel Mihavel — designer, builder, 0→1.

Built with [Astro](https://astro.build) and [Tailwind CSS](https://tailwindcss.com),
output as static HTML. The homepage is ~14 KB gzipped and ships **no JavaScript
bundles** apart from Astro's view-transition router; everything else is CSS or
small inline scripts.

## Running it

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # static output in dist/
npm run preview  # serve the built site
```

## Layout

```
src/
  assets/          generated SVGs — do not hand-edit
    _source/       pristine Figma exports (the real source)
  components/      Header, Hero, About, NyanTrail, Footer, ComingSoon
  data/            cities, theme ids, Nyan Cat geometry
  layouts/         Layout.astro — head, theme boot, reveal observer
  pages/           index, work, play
  styles/          global.css — palettes, reveal system, shared components
scripts/
  build-svg.mjs    regenerates src/assets from src/assets/_source
```

## Themes

Ten palettes — `light`, `dark`, and eight the `ッ` button picks between at
random. Each is a block of CSS custom properties in `src/styles/global.css`,
surfaced to Tailwind via `@theme inline`. The choice persists in
`localStorage` and is restored before first paint so there is no flash.

Two things to know if you edit the palettes:

- **`--accent-hover` only exists where it has to.** In six themes the supplied
  `--accent` is identical to `--text-primary`, which would make a colour hover
  invisible. Those six get an explicit `--accent-hover`; the rest fall back via
  `var(--accent-hover, var(--accent))`.
- **Tomato's muted text was darkened** from the original values, which scored
  2.5:1 against its background versus ~3.8:1 everywhere else. Comments in
  `global.css` record what changed and why.

## SVG pipeline

The pixel art is generated, not hand-edited:

```bash
node scripts/build-svg.mjs
```

It reads `src/assets/_source/*.svg` (straight from Figma) and writes
`src/assets/*.svg`, doing three jobs:

1. Rewrites flat hex fills into classes backed by theme variables, so the
   artwork recolours with the rest of the site.
2. Collapses the rainbow from 3,168 rects to a single repeating `<pattern>`
   tile — **216 KB → 6 KB** — which also makes seamless scrolling one
   transform. It asserts the tile actually repeats before discarding geometry,
   and aborts rather than silently mangling the art.
3. Splits the cat's tail from its body so it can wag, and draws the paws.

**The paws are not in the Figma file.** The source cat has no legs — its bottom
edge is flat at the canvas edge — so the script draws four on the same 5.8px
grid using the same palette classes, and extends the viewBox. If paws are ever
added in Figma, delete that block and drop the compensating `translate-y` in
`NyanTrail.astro`; don't keep both.

Re-exporting from Figma needs a token — see below.

## Reveals

Elements marked `data-reveal` animate in as they enter the viewport. The system
is **visible by default**: the hidden state only applies once `.reveals` is on
`<html>`, and an inline failsafe strips that class after 2.5s if the observer
never reports in. A script error cannot leave the page blank.

One gotcha worth remembering: the `clip` variant applies its `clip-path` to a
*child*, never to the observed element. Clipping an element to zero area makes
IntersectionObserver report it as invisible, so it would never be told to
reveal — it could never un-hide itself.

## Header

The city picker drives two live values. Time comes from `Intl.DateTimeFormat`
with each city's timezone — no network, and DST-correct. Temperature comes from
[Open-Meteo](https://open-meteo.com), which needs no API key, is CORS-enabled,
and is cached for 15 minutes per city.

Cities are filtered to places whose working day meaningfully overlaps IST, so
they're realistic to work remotely from India. Reasoning is in
`src/data/cities.ts`.

The header persists across view transitions, which is why the clock keeps
ticking and the chosen city survives navigation. The active nav item is
therefore re-pointed from the URL rather than rendered server-side.

## Environment

`.env` holds a Figma personal access token:

```
FIGMA_API_KEY=figd_...
```

It is **only** needed to re-export artwork from Figma. The site builds and runs
without it. `.env` is gitignored — keep it that way.

## Accessibility

- Everything respects `prefers-reduced-motion`; animations collapse to instant
  rather than merely running faster.
- Split-up words (`designer`, `builder`, `0→1`) carry `aria-label` with letters
  marked `aria-hidden`, so screen readers hear words, not letters.
- The city picker is a real listbox — arrow keys, Home/End, Enter, Escape.
- Contrast was measured across all ten themes rather than eyeballed.

## Credits

- **Nyan Cat** — created by Christopher Torres (2011). The pixel rendition here
  is original artwork; the paw animation follows the frame decomposition of
  [cristurm/nyan-cat](https://github.com/cristurm/nyan-cat) (MIT, © 2013
  Cristina Sturm). No code was copied from it.
- **Weather** — [Open-Meteo](https://open-meteo.com), free and key-less.
- **Type** — [Geist](https://vercel.com/font) and
  [Averia Serif Libre](https://fonts.google.com/specimen/Averia+Serif+Libre),
  self-hosted via Fontsource.

## Licence

No licence granted. The artwork, copy and design are Joel Mihavel's.
