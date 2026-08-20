// Article images.
//
// None of the source feeds carry a per-item image — only their own site logo —
// so the picture has to come from the article page's og:image. That means one
// extra request per selected story, which is why it runs only over the ~25 that
// made the cut rather than every candidate.
//
// The URL is hotlinked rather than downloaded. Storing 25 images a day would
// add roughly a third of a gigabyte a year to git history, permanently, for a
// wall that only ever shows today. The trade is that a publisher can rename or
// hotlink-block the file, so the card must survive the image failing to load.

const UA = "MeanwhileSomewhereBot/0.1 (+https://joemihavel.com/meanwhile-somewhere)";

const pick = (html, ...names) => {
  for (const n of names) {
    // property/name may appear either side of content, so try both orders.
    const re = new RegExp(
      `<meta[^>]+(?:property|name)=["']${n}["'][^>]+content=["']([^"']+)["']|` +
        `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${n}["']`,
      "i"
    );
    const m = html.match(re);
    const val = m?.[1] ?? m?.[2];
    if (val) return val;
  }
  return null;
};

// Tracking pixels, spacers and sharing badges masquerading as og:image.
const JUNK = /(sprite|logo|icon|avatar|placeholder|blank|pixel|1x1|spacer|share|badge|favicon)/i;

export async function fetchImage(url, { timeoutMs = 15000 } = {}) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: { "user-agent": UA }, signal: ctl.signal });
    if (!res.ok) return null;

    // og:image lives in <head>; reading the whole article body is wasted
    // bandwidth across 25 requests a day.
    const html = (await res.text()).slice(0, 120_000);

    const src = pick(html, "og:image", "og:image:url", "twitter:image", "twitter:image:src");
    if (!src || JUNK.test(src)) return null;

    const abs = new URL(src, url).href;
    if (!/^https:/.test(abs)) return null; // no mixed content on an https page

    const alt = pick(html, "og:image:alt", "twitter:image:alt");
    const w = Number(pick(html, "og:image:width")) || null;
    const h = Number(pick(html, "og:image:height")) || null;
    return { src: abs, alt: alt || null, w, h };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Resolves images for many stories at once, a few at a time to stay polite. */
export async function attachImages(stories, { concurrency = 5 } = {}) {
  const queue = [...stories];
  let done = 0;

  const worker = async () => {
    while (queue.length) {
      const s = queue.shift();
      s.image = await fetchImage(s.url);
      done++;
    }
  };

  await Promise.all(Array.from({ length: concurrency }, worker));
  return stories.filter((s) => s.image).length;
}
