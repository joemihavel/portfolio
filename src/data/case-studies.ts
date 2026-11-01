import { archiveImages, caseStudies } from "./portfolio-content";
import { securedStory } from "./secured-case-study";
import { flentSystem } from "./flent-system";

const cxTitle = "How I designed and built a unified platform to streamline tickets, tasks, and resolutions.";

export const caseStudyPages = caseStudies.map(index => {
  const number = String(index + 1).padStart(2, "0");
  return {
    number,
    slug: `case-study-${number}`,
    href: `/case-studies/case-study-${number}`,
    kind: index === 0 ? "secured" : index === 1 ? "flent-system" : "cx",
    title: index === 0 ? securedStory.title : index === 1 ? flentSystem.title : cxTitle,
    cardTitle: index === 0 ? securedStory.summary : index === 1 ? flentSystem.title : cxTitle,
    description: index === 0 ? securedStory.summary : index === 1 ? flentSystem.summary : cxTitle,
    comingSoon: index === 2,
    cover: index === 0 ? "/images/secured/hero.png" : index === 1 ? "/images/flent-system/foundations.png" : "/images/projects/hawkeye-cx-cover.png",
    coverAlt: index === 0 ? "Secured rent payment app: welcome, payments, and rent score" : index === 1 ? "Flent design system: inputs, navigation, selection, and feedback components" : "Flent Hawkeye CX platform showing tenant tickets, support queues, and resolution metrics",
    coverWidth: index === 0 ? 2564 : index === 1 ? 920 : 3456,
    coverHeight: index === 0 ? 1443 : index === 1 ? 520 : 1774,
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
