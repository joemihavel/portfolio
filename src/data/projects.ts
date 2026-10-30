// Things built for their own sake. Shown on /play.
//
// `accent` is taken from the same palette the Meanwhile cards use, so the two
// parts of the site share a colour language rather than each inventing one.

export interface Project {
  slug: string;
  title: string;
  blurb: string;
  /** Shown in the coloured band at the top of the card. */
  label: string;
  status: "Live" | "Building" | "Archived" | "Someday";
  /** ISO date of the last meaningful change. Rendered as a day and month. */
  updated: string;
  tags: string[];
  /** Small facts along the bottom of the card. Kept stable, not live counts. */
  stats: string[];
  href: string;
  /** Cover art, shown in the frame at the top of the card. */
  cover?: string;
  accent: string;
  /** A slot with nothing in it yet: rendered as a card, but not a link. */
  placeholder?: boolean;
}

// Placeholders are deliberately anonymous — no invented names, no invented
// facts. They hold the shape of the row so it reads as a set rather than as a
// single project floating on its own.
const soon = (accent: string): Project => ({
  slug: "",
  title: "Coming soon",
  blurb: "",
  label: "Someday",
  status: "Someday",
  updated: "",
  tags: [],
  stats: [],
  href: "",
  accent,
  placeholder: true,
});

export const PROJECTS: Project[] = [
  {
    slug: "meanwhile-somewhere",
    title: "Meanwhile, Somewhere",
    blurb:
      "The internet is a lot. So this is a small corner of it that only carries good news — collected daily from a dozen feeds, filtered hard, and a wall anyone can leave a note or a scribble on.",
    label: "Good news, daily",
    status: "Live",
    updated: "2026-08-20",
    tags: ["Astro", "Cloudflare D1", "Canvas"],
    stats: ["10 sources", "174 countries", "£0 to run"],
    href: "/meanwhile-somewhere",
    cover: "/images/projects/meanwhile.svg",
    accent: "#7C3AED",
  },
  soon("#E4572E"),
  soon("#2A9D8F"),
  soon("#E9C46A"),
  soon("#4361EE"),
];
