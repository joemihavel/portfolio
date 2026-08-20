// The editorial filter — section 8 of the brief, expressed as code.
//
// The strategy is to make this job easy rather than clever: every source is
// already a good-news outlet, so this does not have to detect positivity from
// scratch. It only has to catch the things that slip through such outlets —
// tragedy framed as inspiration, politics, clickbait and listicles — and then
// keep the day's selection varied.

export const CATEGORIES = {
  planet: { label: "Planet", emoji: "🌱" },
  science: { label: "Science", emoji: "🔬" },
  people: { label: "People", emoji: "🧑‍🤝‍🧑" },
  animals: { label: "Animals", emoji: "🐋" },
  culture: { label: "Culture", emoji: "🎨" },
  achievement: { label: "Human achievement", emoji: "🚀" },
  communities: { label: "Communities", emoji: "🏘️" },
  tiny: { label: "Tiny wins", emoji: "✨" },
};

/**
 * Hard rejects. Anything matching is dropped outright, never scored.
 *
 * The tragedy group is the important one and the reason this file exists: a
 * good-news outlet will happily run "widow completes her late husband's
 * marathon". That is a story about grief wearing a hopeful jacket, and the
 * brief explicitly rules it out. Better to lose a few decent stories than to
 * put one of those in front of someone who came here to feel better.
 */
const REJECT = [
  // Tragedy dressed as inspiration
  /\b(dies?|died|death|dead|killed|fatal|funeral|widow(er)?|late (husband|wife|son|daughter|mother|father)|terminal(ly)?|cancer battle|passed away|obituary|in memory of|memorial)\b/i,
  /\b(shooting|stabbing|murder|massacre|attack|bombing|terror|hostage|kidnap)/i,
  /\b(war|invasion|airstrike|ceasefire|refugee crisis|genocide|conflict zone)\b/i,
  /\b(crash|earthquake|hurricane|wildfire|flooding|famine|outbreak|pandemic|disaster)\b/i,
  /\b(survivor|survived|battling|fights? back from|overcame (cancer|addiction|homelessness))\b/i,
  /\b(abuse|assault|trafficking|suicide|overdose)\b/i,
  // Disease and decline. "Cancer battle" alone let through a story about a new
  // cancer spreading among catfish, which is the opposite of the brief.
  /\b(cancer|tumou?r|disease|infection|parasite|virus|dying|die-?off|collapse)\b/i,
  /\b(heat ?wave|too hot|drought|scorching|record heat|closed? (amid|due to))\b/i,
  /\b(curse|cursing|haunted|sacrific)/i,

  // Politics and polarisation
  /\b(trump|biden|putin|election|senate|congress|parliament|prime minister|president|vote[sd]?|ballot|campaign trail|republican|democrat|tory|labour party|left-wing|right-wing|protest|rally)\b/i,

  // Clickbait, listicles and engagement bait. Any headline opening with a
  // number and a plural noun is a list, whatever the noun happens to be —
  // "5 phrases to teach kids" got through a narrower version of this.
  /^\d+\s+[a-z-]+s\b/i,
  /\b(you won'?t believe|will restore your faith|goes viral|broke the internet|melt(s|ed)? your heart|what happened next|this is why|here'?s why you should)\b/i,
  /\b(horoscope|zodiac|celebrity|kardashian|royal family|red carpet)\b/i,

  // Commerce and self-help, which several of these outlets mix into their feeds
  /\b(deal|discount|sale|coupon|sponsored|giveaway|shop now|best (buys|deals)|gift guide)\b/i,
  /\bhow to \w+/i,
  /\b(tips for|guide to|the secret to)\b/i,

  // Recurring filler columns. Good News Network runs "Good News in History"
  // daily, and it is an almanac of things that happened on this date — which
  // on a given day is as likely to be the Lusitania as anything cheering.
  // These are columns, not stories, and none of them belong on the canvas.
  /\bgood news in history\b/i,
  /\b(quote|word|photo|poem) of the (day|week)\b/i,
  /\b(this week in|your (daily|weekly)|round-?up|digest|newsletter|podcast|episode \d+)\b/i,
  /\bwhat we'?re (reading|watching)\b/i,
  // Any question headline. On this wall a question is a prompt or a mystery,
  // never "a good thing happened".
  /\?/,
  /\b(horoscope|what to watch|weekly wrap)\b/i,

  // Interviews and opinion pieces: someone's view, not something that happened.
  /\b(q&a|interview|opinion|op-ed|column|essay|why i |what i learned)\b/i,
  /\b(life lessons|lessons? (from|learned)|reflects on|looks back on)\b/i,
  // "Matt Haig on finding acceptance", "Joe Newman on what life taught him" —
  // a person's name followed by "on" is the house style for an interview.
  /\b[A-Z][a-z]+ [A-Z][a-z']+ on (finding|what|why|how|being|living|learning)\b/,

  // Advertorial and product-recommendation copy.
  /\b(remedies|swear by|dermatologists?|nutritionists?|experts? recommend|best (ways|things) to|must-have)\b/i,

  // Headlines that turn negative halfway through. These are critical pieces or
  // caveated progress — legitimate journalism, wrong product. Someone came
  // here to feel better, not to learn that the good thing has an asterisk.
  /\b(won'?t|will not|can'?t|cannot|fail(s|ed|ing)?|falls? short|not enough|too late|alone won)\b/i,
  /\b(threaten|threat|jeopardis|at risk|concerns?|worries|warns?|warning|setback|backlash|controversy|criticis|slam)/i,
  /\b(but|yet|however|despite)\b.*\b(problem|risk|threat|decline|loss|concern|struggl)/i,

  // Quiet bad news, which is what the deep end of the ranking fills up with:
  // court defeats, negative findings, and "as the world warms" framing.
  /\b(unconstitutional|struck down|overturn|ruling against|lawsuit|banned|ban on)\b/i,
  /\b(erase|undermine|offset by|cancels? out|backfire|unintended)\b/i,
  /\bas [a-z ]{0,20}(warms|heats|dries|floods)\b/i,
  /\b(hidden hotspots|forever chemicals|microplastic|pollution)\b/i,
];

// Signals a story is specific and concrete rather than a mood piece. The brief
// asks for "surprising, human, specific" — numbers and named places are the
// cheapest reliable proxy for specificity.
const BOOST = [
  { re: /\b\d[\d,.]*\s?(%|percent|million|billion|thousand|hectares?|acres?|km|miles|tonnes?|species|people|years?)\b/i, w: 3 },
  { re: /\b(first|first-ever|record|breakthrough|discovered|restored|rewild|reintroduc|revived|rebuilt|doubled|returned)\b/i, w: 2 },
  { re: /\b(village|town|city|community|volunteers?|neighbours?|students?|farmers?|fishers?)\b/i, w: 2 },
];

const CATEGORY_HINTS = [
  // Art and heritage first: these words are unambiguous, whereas a story about
  // recovered paintings will otherwise trip the animal list on an incidental
  // word in its summary.
  { cat: "culture", re: /\b(painting|artwork|renoir|c[eé]zanne|matisse|picasso|sculpture|museum|gallery|manuscript|archive|mural|opera|orchestra)\b/i },
  { cat: "animals", re:/\b(animal|wildlife|species|bird|whale|elephant|tiger|panda|bee|turtle|wolf|dog|cat|penguin|coral|fish|frog|otter|rhino|orangutan)\b/i },
  { cat: "planet", re: /\b(climate|forest|reforest|rewild|solar|wind|renewable|emission|river|lake|ocean|conservation|recycl|biodiversity|tree|wetland|glacier|clean energy)\b/i },
  { cat: "science", re: /\b(research|scientist|study|discovery|breakthrough|trial|vaccine|telescope|physics|genome|lab|astronom|quantum)\b/i },
  { cat: "achievement", re: /\b(record|expedition|summit|first person|invent|engineer|built|launch|mission|rover|athlete|marathon)\b/i },
  { cat: "communities", re: /\b(village|town|city|council|neighbourhood|housing|transport|library|school|hospital|community centre)\b/i },
  { cat: "culture", re: /\b(art|artist|museum|music|film|language|heritage|tradition|festival|craft|dance|poetry|theatre)\b/i },
  { cat: "people", re: /\b(volunteer|kindness|charity|donat|help(ing|ed)|neighbour|stranger|generosity|foster|mentor)\b/i },
];

export function categorise(story, fallback) {
  const hay = `${story.title} ${story.summary} ${story.categories.join(" ")}`;
  for (const { cat, re } of CATEGORY_HINTS) if (re.test(hay)) return cat;
  return fallback ?? "tiny";
}

// Feeds use typographic quotes, so `we'?re` silently fails to match "We’re".
// Every pattern above is written with straight quotes; normalise to suit.
const flatten = (s = "") => s.replace(/[’‘]/g, "'").replace(/[“”]/g, '"');

export function rejected(story) {
  const title = flatten(story.title);
  const hay = `${title} ${flatten(story.summary)}`;
  // Tested against the title on its own as well, because the anchored patterns
  // (^\d+ listicles, question headlines) can never match once a summary has
  // been concatenated onto the end.
  return REJECT.some((re) => re.test(title) || re.test(hay));
}

export function score(story) {
  const hay = flatten(`${story.title} ${story.summary}`);
  let s = 0;
  for (const { re, w } of BOOST) if (re.test(hay)) s += w;
  // Enough summary to be worth reading, not so much that the card overflows.
  if (story.summary.length > 80) s += 2;
  if (story.summary.length > 400) s -= 1;
  // Questions as headlines are usually opinion or engagement bait.
  if (/\?$/.test(story.title)) s -= 2;
  if (story.title.length > 110) s -= 1;
  return s;
}

// Titles vary slightly across syndication, so compare on a reduced form.
const normTitle = (t) =>
  t.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\b(a|an|the|of|in|to|for|and)\b/g, "").replace(/\s+/g, " ").trim();

export function dedupe(stories) {
  const seenUrl = new Set();
  const seenTitle = new Set();
  const out = [];
  for (const s of stories) {
    const url = s.url.split("?")[0].replace(/\/$/, "");
    const t = normTitle(s.headline);
    if (seenUrl.has(url) || seenTitle.has(t)) continue;
    seenUrl.add(url);
    seenTitle.add(t);
    out.push(s);
  }
  return out;
}

/**
 * Pick `target` stories, spreading them across categories and countries.
 *
 * Round-robin by category rather than straight top-N, because the sources have
 * very different volumes — Mongabay alone would otherwise fill the canvas with
 * conservation and the wall would stop feeling like the whole world. Within a
 * category the best-scoring story goes first, and a country that has already
 * appeared is pushed back a round so the flags stay varied.
 */
export function balance(stories, target) {
  const byCat = new Map();
  for (const s of stories) {
    if (!byCat.has(s.category)) byCat.set(s.category, []);
    byCat.get(s.category).push(s);
  }
  for (const list of byCat.values()) list.sort((a, b) => b.score - a.score);

  const picked = [];
  const countryCount = new Map();
  const sourceCount = new Map();
  // No outlet may own more than a fifth of the day. Smithsonian's feed carries
  // 278 items to Positive News' 10, so without this the biggest archive wins
  // the wall regardless of how good its stories are.
  const sourceCap = Math.max(3, Math.ceil(target * 0.2));
  const cats = [...byCat.keys()];

  while (picked.length < target) {
    let progressed = false;
    for (const cat of cats) {
      const list = byCat.get(cat);
      if (!list?.length) continue;

      // Prefer the best story whose country is not yet over-represented.
      const cap = Math.max(1, Math.ceil(target / 8));
      let idx = list.findIndex(
        (s) =>
          (countryCount.get(s.country?.code ?? "??") ?? 0) < cap &&
          (sourceCount.get(s.source) ?? 0) < sourceCap
      );
      // Nothing left under both caps: take the best that is at least under the
      // source cap, and only then fall back to the head of the list.
      if (idx === -1) idx = list.findIndex((s) => (sourceCount.get(s.source) ?? 0) < sourceCap);
      if (idx === -1) break;

      const [s] = list.splice(idx, 1);
      picked.push(s);
      countryCount.set(s.country?.code ?? "??", (countryCount.get(s.country?.code ?? "??") ?? 0) + 1);
      sourceCount.set(s.source, (sourceCount.get(s.source) ?? 0) + 1);
      progressed = true;
      if (picked.length >= target) break;
    }
    if (!progressed) break; // ran out of stories entirely
  }
  return picked;
}
