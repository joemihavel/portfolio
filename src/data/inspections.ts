export type Inspection = {
  id: string;
  label: string;
  craft?: {
    typography?: string;
    layout?: string;
    spacing?: string;
    visual?: string;
  };
  build?: {
    technology?: string;
    component?: string;
    implementation?: string;
    responsive?: string;
  };
};

type Craft = NonNullable<Inspection["craft"]>;
export type InspectionDefinition = Omit<Inspection, "craft"> & {
  craft?: (element: HTMLElement) => Craft;
  craftLabels?: Partial<Record<keyof Craft, string>>;
  buildLabels?: Partial<Record<keyof NonNullable<Inspection["build"]>, string>>;
};

const px = (value: string) => `${Math.round(parseFloat(value) * 10) / 10}px`;
const type = (style: CSSStyleDeclaration) => `${style.fontFamily.split(",")[0].replaceAll('"', "")} · ${px(style.fontSize)} · ${style.fontWeight}`;
const color = (value: string) => {
  const rgb = value.match(/^rgb\((\d+),? (\d+),? (\d+)\)$/);
  return rgb ? `#${rgb.slice(1).map(channel => Number(channel).toString(16).padStart(2, "0")).join("").toUpperCase()}` : value;
};

// Add data-inspect="id" to a homepage element, then add its verified content here.
// Craft is resolved on selection so dimensions, typography and theme colors stay live.
export const inspections: InspectionDefinition[] = [
  {
    id: "hero-heading", label: "Hero heading",
    craft: element => {
      const style = getComputedStyle(element);
      return {
        typography: type(style),
        layout: `${style.textAlign === "center" ? "Centered" : style.textAlign} · ${style.maxWidth} max width`,
        spacing: `${px(style.lineHeight)} line height · ${px(style.letterSpacing)} tracking`,
        visual: color(style.color),
      };
    },
    craftLabels: { visual: "Color" },
    build: { technology: "Astro · CSS", component: "HeroScrambleText.astro", implementation: "CSS clamp() type; locally preloaded font files.", responsive: "Type and line height adjust below 600px." },
  },
  {
    id: "hero-layout", label: "Hero layout",
    craft: element => {
      const style = getComputedStyle(element);
      const heading = element.querySelector<HTMLElement>("h1")!;
      const copy = element.querySelector<HTMLElement>(".home-intro")!;
      return {
        layout: `Centered blocks · ${getComputedStyle(heading).maxWidth} title / ${getComputedStyle(copy).maxWidth} copy`,
        spacing: `${style.paddingTop} top inset · ${getComputedStyle(copy).marginTop} title-to-copy gap`,
      };
    },
    build: { technology: "Astro · CSS block layout", component: "index.astro · .home-hero", implementation: "Separate max-widths keep title and copy balanced.", responsive: "Hero padding changes at 900px and 600px." },
  },
  {
    id: "navigation", label: "Navigation",
    craft: element => {
      const link = getComputedStyle(element.querySelector("a")!);
      return { typography: type(link), layout: "Flex row · vertically centered", spacing: `${getComputedStyle(element).columnGap} between links`, visual: "Current page: underline + square brackets" };
    },
    build: { technology: "Astro · Flexbox", component: "PortfolioLayout.astro", implementation: "Shared navigation; aria-current marks the page.", responsive: "The header uses CSS Grid below 900px." },
  },
  {
    id: "contact-link", label: "Email link",
    craft: element => {
      const style = getComputedStyle(element);
      return { typography: type(style), visual: "Underline grows from the left", spacing: `${style.transitionDuration} · ${style.transitionTimingFunction}` };
    },
    craftLabels: { visual: "Treatment", spacing: "Motion" },
    buildLabels: { responsive: "Access" },
    build: { technology: "HTML · CSS", component: "index.astro · .home-intro", implementation: "mailto link; background-size animates the underline.", responsive: "Hover and keyboard focus share the underline." },
  },
  {
    id: "project-card", label: "Project card",
    craft: element => {
      const header = getComputedStyle(element.querySelector(".project-showcase-head")!);
      const image = getComputedStyle(element.querySelector("img")!);
      return { typography: type(getComputedStyle(element.querySelector("h2")!)), layout: "Flex header + full-width 16:9 image", spacing: `${header.paddingLeft} header inset · ${getComputedStyle(element).marginBottom} after card`, visual: `${image.borderRadius} image corners` };
    },
    build: { technology: "Astro · Flexbox", component: "index.astro · .project-showcase", implementation: "Array.map() repeats the same card markup.", responsive: "Header wraps and image corners shrink at 600px." },
  },
  {
    id: "entrance-motion", label: "Entrance motion",
    craft: () => {
      const root = getComputedStyle(document.documentElement);
      const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      return { visual: "Opacity fade · no position shift", spacing: reduced ? "Disabled · reduced motion" : `${root.getPropertyValue("--folio-entrance-duration").trim()} · ${root.getPropertyValue("--folio-entrance-easing").trim()}`, layout: "On load · follows the intro copy" };
    },
    craftLabels: { visual: "Motion", spacing: "Timing", layout: "Trigger" },
    build: { technology: "CSS keyframes · JavaScript", component: "PortfolioLayout.astro", implementation: "Measured text lines set the staggered fade delays.", responsive: "Entrance animation is removed for reduced motion." },
  },
  {
    id: "hero-media", label: "Portrait",
    craft: element => {
      const style = getComputedStyle(element);
      return { layout: `${px(style.width)} × ${px(style.height)} · inline with type`, visual: `${style.objectFit} crop · grayscale · ${style.borderRadius} corners` };
    },
    build: { technology: "HTML picture · WebP / PNG", component: "index.astro · hero portrait", implementation: "Picture source serves a still PNG for reduced motion.", responsive: "101 × 52px; 70 × 36px below 600px." },
  },
];

export function resolveInspection(definition: InspectionDefinition, element: HTMLElement): Inspection {
  return { id: definition.id, label: definition.label, build: definition.build, craft: definition.craft?.(element) };
}
