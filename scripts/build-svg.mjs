// Turns the raw Figma SVG exports in src/assets/_source into the themed,
// animation-ready versions in src/assets.
//
// Three jobs:
//   1. Flat hex fills  → classes backed by theme CSS vars (so 10 palettes work).
//   2. Rainbow         → the export repeats a 38.4px tile 33 times (3168 rects,
//                        97% redundant). Collapsed to one <pattern> tile, which
//                        both shrinks it ~40x and makes seamless scrolling a
//                        single transform.
//   3. Nyan cat        → the tail (everything left of the body, x < 34.6) is
//                        wrapped in a <g> so it can wag independently.
//
// Run: node scripts/build-svg.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { TRACK_W, RAINBOW_H } from "../src/data/nyan-geometry.mjs";

const SRC = "src/assets/_source";
const OUT = "src/assets";

const MAP = {
  "#7A7A7A": ["a", "--text-muted"],
  "#A8A8A8": ["b", "--text-tertiary"],
  "#C4C4C4": ["c", "--border-subtle"],
  "#D6D6D6": ["d", "--border"],
  "#8E8E8E": ["e", "--icon-muted"],
  "#BEBEBE": ["f", "--icon-secondary"],
  "#DCDCDC": ["g", "--surface-border"],
  "#F8F8F8": ["h", "--text-secondary"],
  black: ["i", "--text-primary"],
  "#000000": ["i", "--text-primary"],
};

const themeFills = (svg) => {
  const used = new Set();
  for (const [hex, [cls]] of Object.entries(MAP)) {
    const re = new RegExp(`fill="${hex}"`, "gi");
    if (re.test(svg)) {
      used.add(cls);
      svg = svg.replace(re, `class="${cls}"`);
    }
  }
  const rules = [...new Map(Object.values(MAP)).entries()]
    .filter(([cls]) => used.has(cls))
    .map(([cls, v]) => `.${cls}{fill:var(${v})}`)
    .join("");
  return { svg, rules };
};

const trim = (s) =>
  s
    .replace(/(\d+\.\d{2,})/g, (n) => String(Math.round(n * 10) / 10))
    .replace(/\.0(?=["\s])/g, "")
    .replace(/>\s+</g, "><");

const parseRects = (svg) =>
  [...svg.matchAll(/<rect([^>]*)\/>/g)].map((m) => {
    const a = m[1];
    const num = (k) => {
      const r = new RegExp(`${k}="([^"]*)"`).exec(a);
      return r ? parseFloat(r[1]) : 0;
    };
    const cls = /class="([^"]*)"/.exec(a);
    return { x: num("x"), y: num("y"), w: num("width"), h: num("height"), c: cls?.[1] ?? "" };
  });

const rect = (r, dx = 0) =>
  `<rect x="${+(r.x - dx).toFixed(1)}" y="${r.y}" width="${r.w}" height="${r.h}" class="${r.c}"/>`;

/* ------------------------------------------------------------------ rainbow */
{
  const raw = readFileSync(`${SRC}/rainbow.svg`, "utf8");
  const { svg, rules } = themeFills(raw);
  const rects = parseRects(svg);

  const PERIOD = 38.4; // verified: column signature repeats every 38.4px
  const tile = rects.filter((r) => r.x < PERIOD);
  if (!tile.length) throw new Error("rainbow: no tile rects found");

  // Sanity-check the assumption before throwing away 97% of the geometry.
  const sig = (rs) =>
    rs
      .map((r) => `${(r.x % PERIOD).toFixed(1)}:${r.y}:${r.c}`)
      .sort()
      .join("|");
  const lastFull = rects.filter((r) => r.x >= PERIOD && r.x < PERIOD * 2);
  if (sig(tile) !== sig(lastFull)) throw new Error("rainbow: tile is not periodic — aborting");

  // Canvas runs the full track, not just the design's 1268, so there is trail
  // to draw when the cat is pushed forward past its resting spot. Because the
  // rainbow tiles, the wider canvas costs no extra geometry.
  const W = TRACK_W;
  const H = RAINBOW_H;
  // The scrolling rect overhangs one tile each side, so translating it by
  // exactly one period always still covers [0, W] — no gap, no duplication.
  const out = trim(
    `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none" xmlns="http://www.w3.org/2000/svg">` +
      `<style>${rules}</style>` +
      `<defs><pattern id="nyanRb" patternUnits="userSpaceOnUse" width="${PERIOD}" height="${H}">` +
      tile.map((r) => rect(r)).join("") +
      `</pattern></defs>` +
      `<rect class="rb-scroll" x="${-PERIOD}" y="0" width="${W + PERIOD * 2}" height="${H}" fill="url(#nyanRb)"/>` +
      `</svg>`
  );
  writeFileSync(`${OUT}/rainbow.svg`, out);
  console.log(
    `rainbow.svg  ${rects.length} rects → ${tile.length} (1 tile)  ${raw.length} → ${out.length} bytes`
  );
}

/* ----------------------------------------------------------------- nyan cat */
{
  const raw = readFileSync(`${SRC}/nyan-cat.svg`, "utf8");
  const { svg, rules } = themeFills(raw);
  const rects = parseRects(svg);

  // Body/head geometry starts at x=34.6; everything left of that is tail.
  const TAIL_MAX_X = 34.6;
  const tail = rects.filter((r) => r.x + r.w <= TAIL_MAX_X);
  const body = rects.filter((r) => r.x + r.w > TAIL_MAX_X);
  if (!tail.length) throw new Error("nyan: tail not found");

  // ---- Paws -------------------------------------------------------------
  // NOT from the Figma file. Joel's export has no paws: its bottom edge is flat
  // at y=96, the full canvas height. These are generated here on the same 5.8
  // grid and the same theme classes so they read as part of the original art.
  // Move them into Figma when convenient and delete this block.
  //
  // Six-frame leg cycle modelled on cristurm/nyan-cat (MIT, © 2013 Cristina
  // Sturm) — its frame decomposition (body / head / tail / paws as independently
  // cycled layers) is what this follows. No code copied.
  const CELL = 5.8;
  const BODY_BOTTOM = 96;
  const PAW_ROWS = 2;
  const H = BODY_BOTTOM + CELL * PAW_ROWS; // 107.6 — canvas grows downward only

  // Evenly spaced across the body's flat underside (x 46.1 → 127).
  const PAW_X = [46.1, 69.2, 92.3, 115.4];
  const paws = PAW_X.map((x, i) => {
    const cells = [
      // grey pad, then the dark sole beneath it
      { x, y: BODY_BOTTOM, w: CELL * 2, h: CELL, c: "c" },
      { x, y: BODY_BOTTOM + CELL, w: CELL * 2, h: CELL, c: "i" },
    ];
    return `<g class="nyan-paw nyan-paw-${i + 1}">${cells.map((r) => rect(r)).join("")}</g>`;
  }).join("");

  const out = trim(
    `<svg width="166" height="${H}" viewBox="0 0 166 ${H}" fill="none" xmlns="http://www.w3.org/2000/svg">` +
      `<style>${rules}</style>` +
      paws +
      `<g class="nyan-body">${body.map((r) => rect(r)).join("")}</g>` +
      `<g class="nyan-tail">${tail.map((r) => rect(r)).join("")}</g>` +
      `</svg>`
  );
  writeFileSync(`${OUT}/nyan-cat.svg`, out);
  console.log(
    `nyan-cat.svg ${rects.length} rects → body ${body.length} / tail ${tail.length} / paws ${PAW_X.length}  viewBox 96 → ${H}  ${raw.length} → ${out.length} bytes`
  );
}

/* ------------------------------------------------------------- joe wordmark */
{
  const raw = readFileSync(`${SRC}/joe-wordmark.svg`, "utf8");
  const { svg, rules } = themeFills(raw);
  const out = trim(svg.replace(/(<svg[^>]*>)/, `$1<style>${rules}</style>`));
  writeFileSync(`${OUT}/joe-wordmark.svg`, out);
  console.log(`joe-wordmark.svg ${raw.length} → ${out.length} bytes`);
}
