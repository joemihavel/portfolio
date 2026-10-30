import type { TransitionBeforeSwapEvent } from "astro:transitions/client";

export const folioRevealSelector = ".category-tabs, .project-showcase-head, .project-showcase > img, .project-cover-link, .archive-gallery > .archive-frame, .writing-card, .about-section:not(:first-child) > h2, .about-section:not(:first-child) .about-prose > p, .about-role, .about-skills > div, .folio-footer > p, .folio-copyright, .folio-footer-status";

/** One restrained dissolve between reading pages; canvas and theme motion stay independent. */
export function setupPageTransitions(synchronizeScroll: (destination: URL, navigationType: string) => void) {
  const root = document.documentElement;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  let navigation = 0;
  let destination: TransitionBeforeSwapEvent | null = null;

  document.addEventListener("astro:before-preparation", event => {
    navigation++;
    destination = null;
    const canvas = root.dataset.view === "experimental" || event.to.pathname === "/experimental-preview";
    if (!canvas && !reducedMotion.matches) root.dataset.folioRouteTransition = "dissolve";
    else delete root.dataset.folioRouteTransition;
  });

  document.addEventListener("astro:before-swap", event => {
    destination = event;
    const incoming = event.newDocument.documentElement;
    incoming.dataset.folioClientNavigation = "";
    // Astro restores the destination before page scripts run. Keep native hash
    // scrolling instant while Lenis resynchronizes with the new document.
    incoming.classList.add("lenis");
    if (root.dataset.folioRouteTransition) incoming.dataset.folioRouteTransition = root.dataset.folioRouteTransition;

    // Select the returning gallery before the browser captures the incoming page.
    if (incoming.dataset.view === "home") {
      const category = event.to.searchParams.get("category") || "case-studies";
      const tabs = [...event.newDocument.querySelectorAll<HTMLButtonElement>(".category-tab")];
      if (tabs.some(tab => tab.dataset.category === category)) {
        tabs.forEach(tab => {
          const selected = tab.dataset.category === category;
          tab.setAttribute("aria-selected", String(selected));
          tab.tabIndex = selected ? 0 : -1;
        });
        event.newDocument.querySelectorAll<HTMLElement>(".gallery-panel").forEach(panel => {
          panel.hidden = panel.id !== `panel-${category}`;
        });
        const picker = event.newDocument.querySelector<HTMLSelectElement>("#mobile-work-category");
        if (picker) picker.value = category;
      }
    }

    const current = navigation;
    void event.viewTransition.finished.finally(() => {
      if (current === navigation) delete root.dataset.folioRouteTransition;
    });
  });

  document.addEventListener("astro:after-swap", () => {
    if (!destination) return;
    synchronizeScroll(destination.to, destination.navigationType);
    // The route itself fades. Visible content must already be present in its
    // snapshot, rather than fading a second time when its observer starts.
    document.querySelectorAll<HTMLElement>(folioRevealSelector).forEach(target => {
      const bounds = target.getBoundingClientRect();
      if (bounds.width && bounds.bottom > 0 && bounds.top < innerHeight) target.classList.add("is-visible");
    });
  });
}
