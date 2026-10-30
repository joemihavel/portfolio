import { archiveImages, caseStudies } from "./portfolio-content";
import { securedStory } from "./secured-case-study";

const cxTitle = "How I mapped complex customer support workflows and turned them into a unified CX platform, designing and building the frontend to help teams manage tickets, tasks, and resolutions.";

export const caseStudyPages = caseStudies.map(index => {
  const number = String(index + 1).padStart(2, "0");
  return {
    number,
    slug: `case-study-${number}`,
    href: `/case-studies/case-study-${number}`,
    title: index === 0 ? securedStory.title : cxTitle,
    cardTitle: index === 0 ? securedStory.summary : cxTitle,
    description: index === 0 ? securedStory.summary : cxTitle,
    comingSoon: index === 1,
    cover: index === 0 ? "/images/secured/hero.png" : "/images/projects/hawkeye-cx-cover.png",
    coverAlt: index === 0 ? "Secured rent payment app: welcome, payments, and rent score" : "Flent Hawkeye CX platform showing tenant tickets, support queues, and resolution metrics",
    coverWidth: index === 0 ? 2564 : 3456,
    coverHeight: index === 0 ? 1443 : 1774,
    processImage: archiveImages[index],
    story: index === 0 ? securedStory : null,
  };
});

export const caseStudySections = [
  { id: "overview", label: "Overview" },
  { id: "challenge", label: "The challenge" },
  { id: "role", label: "My role" },
  { id: "process", label: "The process" },
  { id: "solution", label: "The solution" },
  { id: "reflection", label: "Outcomes & reflection" },
];
