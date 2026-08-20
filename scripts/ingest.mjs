// Meanwhile, Somewhere — daily ingest.
//
// Runs in GitHub Actions, not in a Worker: the Cloudflare free plan gives a
// Cron Trigger only 10ms of CPU and 50 subrequests, and parsing a dozen feeds
// blows straight through both. Here there is no CPU limit and no cost.
//
// Output is a plain JSON file committed to the repo, so the canvas is served as
// a static asset. Static asset requests on Workers are free and unlimited,
// which keeps the whole daily-story half of this product off the request meter.
//
//   node scripts/ingest.mjs [--date YYYY-MM-DD] [--target 25] [--dry]

import { writeFile, readFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { fetchFeed } from "./lib/rss.mjs";
import { detectCountry, flagOf } from "./lib/countries.mjs";
import { categorise, rejected, score, dedupe, balance } from "./lib/editorial.mjs";
import { attachImages } from "./lib/og.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "src/data/meanwhile/days");
const RESERVE = join(ROOT, "src/data/meanwhile/reserve.json");

// `cat` is the fallback category when nothing in the text gives a better hint.
const SOURCES = [
  { name: "Positive News", url: "https://www.positive.news/feed/", cat: "people" },
  { name: "Good News Network", url: "https://www.goodnewsnetwork.org/feed/", cat: "tiny" },
  { name: "Reasons to be Cheerful", url: "https://reasonstobecheerful.world/feed/", cat: "communities" },
  { name: "The Optimist Daily", url: "https://www.optimistdaily.com/feed/", cat: "tiny" },
  { name: "Mongabay", url: "https://news.mongabay.com/feed/", cat: "planet" },
  // Added to reach 40/day. These are not good-news outlets, so they lean much
  // harder on the editorial filter — worth it for the volume and for pulling
  // the wall away from the US/UK skew of the four above.
  { name: "Anthropocene", url: "https://www.anthropocenemagazine.org/feed/", cat: "planet" },
  { name: "ScienceDaily", url: "https://www.sciencedaily.com/rss/top/science.xml", cat: "science" },
  { name: "Phys.org", url: "https://phys.org/rss-feed/breaking/", cat: "science" },
  { name: "Smithsonian", url: "https://www.smithsonianmag.com/rss/smart-news/", cat: "culture" },
  { name: "Grist", url: "https://grist.org/feed/", cat: "planet" },
];

const args = process.argv.slice(2);
const flag = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i === -1 ? d : args[i + 1];
};
const DAY = flag("date", new Date().toISOString().slice(0, 10));
// No fixed quota. Supply is the real limit — the sources publish a few dozen
// good things a day between them — so the day is however many clear the
// editorial bar, with a ceiling only to stop a pathological run.
const TARGET = Number(flag("target", 0)) || Infinity;
const CEILING = 120;

// A quality bar rather than a quota.
//
// Taking everything that merely wasn't rejected filled the deep end with
// neutral research abstracts and quiet bad news — a court striking down
// fishing oversight, "buying green erases its own gains". `score` rewards the
// specific and concrete, so requiring a positive score keeps the day to the
// stories that actually earned a place. The count then floats with supply,
// which is what it should do.
const MIN_SCORE = Number(flag("min-score", 3));
const DRY = args.includes("--dry");

const readMinutes = (s) => Math.max(1, Math.round(s.split(/\s+/).length / 200) || 1);

// Stable id from the URL, so the same story keeps its identity across runs and
// notes attached to it never orphan.
const idFor = (url) => {
  let h = 5381;
  for (let i = 0; i < url.length; i++) h = ((h << 5) + h + url.charCodeAt(i)) | 0;
  return `s_${(h >>> 0).toString(36)}`;
};

const trim = (s, n) => {
  if (s.length <= n) return s;
  const cut = s.slice(0, n);
  return cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:.\-–—]$/, "") + "…";
};

async function collect() {
  const results = await Promise.allSettled(
    SOURCES.map(async (src) => ({ src, items: await fetchFeed(src.url) }))
  );

  const out = [];
  for (const r of results) {
    if (r.status === "rejected") {
      console.warn(`  ! feed failed: ${r.reason?.message ?? r.reason}`);
      continue;
    }
    const { src, items } = r.value;
    let kept = 0;
    // Newest first, capped: some feeds carry hundreds of archive items and
    // would otherwise flood the pool with things from months ago.
    for (const it of items.slice(0, 40)) {
      if (!it.title || !it.link) continue;
      if (rejected(it)) continue;

      const country = detectCountry(it.title, it.summary);
      // The publisher's own excerpt, trimmed and attributed — nothing here is
      // machine-authored, so nothing here can be invented.
      const summary = trim(it.summary, 220);
      if (summary.length < 40) continue;

      out.push({
        id: idFor(it.link),
        headline: it.title,
        summary,
        category: categorise(it, src.cat),
        country: country && { code: country.code, name: country.name, flag: flagOf(country.code) },
        source: src.name,
        url: it.link,
        published_at: it.published ? new Date(it.published).toISOString() : null,
        read_minutes: readMinutes(summary) + 1,
        score: score(it),
      });
      kept++;
    }
    console.log(`  ${src.name}: ${items.length} items → ${kept} candidates`);
  }
  return out;
}

async function loadReserve() {
  if (!existsSync(RESERVE)) return [];
  try {
    return JSON.parse(await readFile(RESERVE, "utf8"));
  } catch {
    return [];
  }
}

async function main() {
  console.log(`\nMeanwhile, Somewhere — ingest for ${DAY}\n`);

  const all = dedupe(await collect());
  const fresh = all.filter((s) => (s.score ?? 0) >= MIN_SCORE);
  console.log(
    `\n  ${all.length} unique candidates, ${fresh.length} above the quality bar (score >= ${MIN_SCORE})`
  );

  const reserve = await loadReserve();
  const usedIds = new Set(fresh.map((s) => s.id));

  let picked = balance(fresh, Math.min(CEILING, TARGET === Infinity ? fresh.length : TARGET));
  const fromToday = picked.length;

  // Thin day: top up from the evergreen pool so the canvas is never sparse.
  // The day file records how many are actually from today, so the header can
  // stay honest about it rather than implying 25 things happened this morning.
  // Only tops up when a day is genuinely thin, not to reach a quota that no
  // longer exists.
  const FLOOR = 24;
  if (picked.length < FLOOR) {
    const fill = reserve
      .filter((s) => !usedIds.has(s.id) && !picked.some((p) => p.id === s.id))
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, FLOOR - picked.length)
      .map((s) => ({ ...s, from_reserve: true }));
    picked = picked.concat(fill);
    console.log(`  topped up with ${fill.length} from the reserve pool`);
  }

  // Only now, once the selection is final, so we make 25 requests rather than
  // one per candidate.
  const withImages = await attachImages(picked);
  console.log(`  → ${withImages}/${picked.length} have an image`);

  const day = {
    day: DAY,
    generated_at: new Date().toISOString(),
    count: picked.length,
    fresh_count: fromToday,
    stories: picked.map(({ score: _s, ...rest }) => rest),
  };

  // Everything good that did not make today's cut becomes tomorrow's safety
  // net. Capped so the file cannot grow without bound.
  const leftovers = fresh.filter((s) => !picked.some((p) => p.id === s.id));
  const nextReserve = dedupe([...leftovers, ...reserve])
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 400);

  console.log(`\n  → ${picked.length} stories (${fromToday} from today)`);
  console.log(`  → reserve pool: ${nextReserve.length}`);
  const cats = picked.reduce((m, s) => ((m[s.category] = (m[s.category] ?? 0) + 1), m), {});
  console.log(`  → categories:`, cats);
  const countries = new Set(picked.map((s) => s.country?.code ?? "??"));
  console.log(`  → ${countries.size} countries\n`);

  if (DRY) {
    console.log(JSON.stringify(day.stories.slice(0, 3), null, 2));
    return;
  }

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(join(OUT_DIR, `${DAY}.json`), JSON.stringify(day, null, 2) + "\n");
  await writeFile(RESERVE, JSON.stringify(nextReserve, null, 2) + "\n");
  console.log(`  written to src/data/meanwhile/days/${DAY}.json\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
