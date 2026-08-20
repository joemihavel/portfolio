// Minimal RSS/Atom reader.
//
// Deliberately dependency-free and regex-based rather than a real XML parser.
// Feeds here are a known, fixed set of well-formed WordPress-style RSS, and
// keeping this at zero dependencies means the GitHub Action needs no install
// step and there is no supply chain to audit for a script that runs unattended
// every day.

const UA = "MeanwhileSomewhereBot/0.1 (+https://joemihavel.com/meanwhile-somewhere)";

const ENTITIES = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  hellip: "…", mdash: "—", ndash: "–", rsquo: "’", lsquo: "‘",
  ldquo: "“", rdquo: "”", eacute: "é", egrave: "è", uuml: "ü", ouml: "ö",
};

export function decode(s = "") {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}

export const stripHtml = (s = "") =>
  decode(s.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();

// WordPress appends "The post <title> appeared first on <site>." to every RSS
// excerpt. Left in, it eats a third of the card and repeats the headline back
// at the reader.
export const stripBoilerplate = (s = "") =>
  s
    .replace(/\s*The post .*? appeared first on .*$/i, "")
    // Leading all-caps bylines: The Optimist Daily opens every excerpt with
    // "THE OPTIMIST DAILY EDITORIAL TEAM", which reads as shouting on a card.
    .replace(/^(?:[A-Z][A-Z'’-]*\s+){2,}(?=[A-Z][a-z])/, "")
    .replace(/^(BY|By)\s+[A-Z][\w.'’-]*(?:\s+[A-Z][\w.'’-]*){0,3}\s*[—–-]?\s*/, "")
    // Bracketed credit lines: "[By Christian Honce | UK College of Medicine]".
    .replace(/^\[[^\]]{0,120}\]\s*/, "")
    .replace(/\s*(Continue reading|Read more|The post)\s*[.…]*\s*$/i, "")
    .replace(/\s*\[…\]\s*$/, "…")
    .trim();

const unwrap = (s = "") =>
  s.replace(/^\s*<!\[CDATA\[/, "").replace(/\]\]>\s*$/, "").trim();

// Non-greedy, and tolerant of attributes on the tag (<link rel="..">).
const tag = (xml, name) => {
  const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  return m ? unwrap(m[1]) : "";
};

const allTags = (xml, name) => {
  const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "gi");
  return [...xml.matchAll(re)].map((m) => unwrap(m[1]));
};

export function parseFeed(xml) {
  // <entry> covers Atom; the shapes overlap enough for the fields we want.
  const blocks = [
    ...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi),
    ...xml.matchAll(/<entry(?:\s[^>]*)?>([\s\S]*?)<\/entry>/gi),
  ].map((m) => m[1]);

  return blocks.map((b) => {
    // Atom puts the URL in an attribute instead of the element body.
    const link = tag(b, "link") || (b.match(/<link[^>]*href="([^"]+)"/i)?.[1] ?? "");
    return {
      title: stripHtml(tag(b, "title")),
      link: decode(link).trim(),
      published: tag(b, "pubDate") || tag(b, "published") || tag(b, "updated"),
      // content:encoded is usually the full article; description is the excerpt
      // we actually want, so it is preferred.
      summary: stripBoilerplate(stripHtml(tag(b, "description") || tag(b, "summary"))),
      categories: allTags(b, "category").map(stripHtml).filter(Boolean),
    };
  });
}

export async function fetchFeed(url, { timeoutMs = 20000 } = {}) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA, accept: "application/rss+xml, application/xml, text/xml, */*" },
      signal: ctl.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return parseFeed(await res.text());
  } finally {
    clearTimeout(timer);
  }
}
