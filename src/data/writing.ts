import { writingImage } from "./portfolio-content";

export const writingPages = [
  { title: "Getting closer to code", tags: ["AI", "Codex"] },
  { title: "Making sense of messy problems", tags: ["Product design", "Process"] },
  { title: "The details that make an interface", tags: ["Craft", "Interfaces"] },
  { title: "Building what I design", tags: ["Design", "Code"] },
].map((article, index) => ({
  ...article,
  number: String(index + 1).padStart(2, "0"),
  slug: `writing-${String(index + 1).padStart(2, "0")}`,
  href: `/writing/writing-${String(index + 1).padStart(2, "0")}`,
  image: writingImage,
}));

export const writingSections = [
  { id: "introduction", label: "Introduction" },
  { id: "idea", label: "The idea" },
  { id: "practice", label: "In practice" },
  { id: "thoughts", label: "Closing thoughts" },
];
