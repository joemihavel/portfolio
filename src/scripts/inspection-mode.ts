import { inspections, resolveInspection, type Inspection, type InspectionDefinition } from "../data/inspections";

type Entry = { definition: InspectionDefinition; element: HTMLElement; marker: HTMLButtonElement; number: string };
type Tab = "craft" | "build";

export function createInspector() {
  const root = document.documentElement;
  const surface = document.querySelector<HTMLElement>("#folio-inspection")!;
  const toggle = document.querySelector<HTMLButtonElement>("[data-inspect-toggle]")!;
  const markers = surface.querySelector<HTMLElement>("[data-inspection-markers]")!;
  const panel = surface.querySelector<HTMLElement>("#inspection-panel")!;
  const hoverOutline = surface.querySelector<HTMLElement>("[data-inspection-hover]")!;
  const selectedOutline = surface.querySelector<HTMLElement>("[data-inspection-selection]")!;
  const fields = surface.querySelector<HTMLElement>("[data-inspection-fields]")!;
  const tabs = [...surface.querySelectorAll<HTMLButtonElement>("[data-inspection-tab]")];
  const status = document.querySelector<HTMLElement>("#inspection-status")!;
  const mobile = matchMedia("(max-width: 600px)");
  let enabled = false;
  let selected: Entry | null = null;
  let hovered: Entry | null = null;
  let activeTab: Tab = "craft";
  let annotation: Inspection | null = null;
  let frame = 0;
  let listeners: AbortController | null = null;

  const entries: Entry[] = inspections.flatMap((definition, index) => {
    const element = document.querySelector<HTMLElement>(`[data-inspect="${definition.id}"]`);
    if (!element) return [];
    const number = `[${String(index + 1).padStart(2, "0")}]`;
    const marker = document.createElement("button");
    marker.type = "button";
    marker.className = "inspection-marker";
    marker.textContent = number;
    marker.setAttribute("aria-label", `Inspect ${definition.label}`);
    marker.setAttribute("aria-controls", "inspection-panel");
    marker.setAttribute("aria-expanded", "false");
    const entry = { definition, element, marker, number };
    marker.addEventListener("click", () => open(entry));
    marker.addEventListener("focus", () => { hovered = entry; schedule(); });
    marker.addEventListener("blur", () => { hovered = null; schedule(); });
    marker.addEventListener("pointerenter", event => { if (event.pointerType !== "touch") { hovered = entry; schedule(); } });
    marker.addEventListener("pointerleave", () => { hovered = null; schedule(); });
    markers.append(marker);
    return [entry];
  });

  const visible = (element: HTMLElement) => {
    if (!element.getClientRects().length) return false;
    const bounds = element.getBoundingClientRect();
    return bounds.width > 0 && bounds.height > 0 && bounds.bottom > 0 && bounds.top < innerHeight && bounds.right > 0 && bounds.left < innerWidth;
  };
  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
  const outline = (box: HTMLElement, entry: Entry | null) => {
    box.hidden = !entry || !visible(entry.element);
    if (box.hidden || !entry) return;
    const bounds = entry.element.getBoundingClientRect();
    const left = Math.max(1, bounds.left - 4);
    const top = Math.max(1, bounds.top - 4);
    box.style.left = `${left}px`;
    box.style.top = `${top}px`;
    box.style.width = `${Math.min(innerWidth - 1, bounds.right + 4) - left}px`;
    box.style.height = `${Math.min(innerHeight - 1, bounds.bottom + 4) - top}px`;
  };
  const positionPanel = () => {
    if (!selected || panel.hidden || mobile.matches) return;
    const bounds = selected.element.getBoundingClientRect();
    const width = panel.offsetWidth;
    const height = panel.offsetHeight;
    const space = 16;
    let left = bounds.right + space;
    let top = bounds.top;
    if (left + width > innerWidth - space) {
      if (bounds.left - space - width >= space) left = bounds.left - space - width;
      else { left = innerWidth - width - space; top = bounds.bottom + space; }
    }
    panel.style.left = `${clamp(left, space, innerWidth - width - space)}px`;
    panel.style.top = `${clamp(top, space, innerHeight - height - 90)}px`;
  };
  function draw() {
    frame = 0;
    if (!enabled) return;
    const placed: { left: number; top: number; width: number; height: number }[] = [];
    for (const entry of entries) {
      entry.marker.hidden = !visible(entry.element);
      if (entry.marker.hidden) continue;
      const bounds = entry.element.getBoundingClientRect();
      const width = entry.marker.offsetWidth;
      const height = entry.marker.offsetHeight;
      let left = clamp(bounds.left - 4, 8, innerWidth - width - 8);
      const above = bounds.top - height - 2;
      const top = clamp(above >= 4 ? above : bounds.top >= 0 ? bounds.bottom + 4 : 6, 6, innerHeight - height - 70);
      // A marker near the top of the viewport must not cover its own navigation link.
      for (let attempt = 0; attempt < entries.length; attempt++) {
        if (!placed.some(box => left < box.left + box.width + 4 && left + width + 4 > box.left && top < box.top + box.height + 4 && top + height + 4 > box.top)) break;
        left = clamp(left + width + 8, 8, innerWidth - width - 8);
      }
      placed.push({ left, top, width, height });
      entry.marker.style.left = `${left}px`;
      entry.marker.style.top = `${top}px`;
    }
    const heading = document.querySelector("#home-title")?.getBoundingClientRect();
    const copy = document.querySelector(".home-intro")?.getBoundingClientRect();
    if (heading && copy) {
      surface.style.setProperty("--inspection-title-left", `${heading.left}px`);
      surface.style.setProperty("--inspection-title-right", `${heading.right}px`);
      surface.style.setProperty("--inspection-copy-left", `${copy.left}px`);
      surface.style.setProperty("--inspection-copy-right", `${copy.right}px`);
    }
    if (selected && !visible(selected.element)) close(false);
    outline(hoverOutline, hovered === selected ? null : hovered);
    outline(selectedOutline, selected);
    positionPanel();
  }
  function schedule() { if (enabled && !frame) frame = requestAnimationFrame(draw); }

  const fieldLabels: Record<string, string> = { typography: "Type", layout: "Layout", spacing: "Spacing", visual: "Details", technology: "Stack", component: "Component", implementation: "Technique", responsive: "Responsive" };
  const hasFields = (tab: Tab) => Object.values(annotation?.[tab] || {}).some(Boolean);
  function renderTab(tab: Tab) {
    if (!annotation || !hasFields(tab)) return;
    activeTab = tab;
    tabs.forEach(button => {
      const isActive = button.dataset.inspectionTab === tab;
      button.setAttribute("aria-selected", String(isActive));
      button.tabIndex = isActive ? 0 : -1;
    });
    surface.querySelector("#inspection-content")?.setAttribute("aria-labelledby", `inspection-tab-${tab}`);
    fields.replaceChildren();
    for (const [key, value] of Object.entries(annotation[tab]!).filter(([, value]) => Boolean(value)).slice(0, 4)) {
      const row = document.createElement("div");
      row.className = "inspection-field";
      const term = document.createElement("dt");
      const labels: Partial<Record<string, string>> | undefined = tab === "craft" ? selected?.definition.craftLabels : selected?.definition.buildLabels;
      term.textContent = labels?.[key] || fieldLabels[key];
      const detail = document.createElement("dd");
      detail.textContent = value;
      row.append(term, detail);
      fields.append(row);
    }
    positionPanel();
  }
  function refresh() {
    if (selected) { annotation = resolveInspection(selected.definition, selected.element); renderTab(activeTab); }
    schedule();
  }
  function open(entry: Entry) {
    if (!enabled) return;
    const next = resolveInspection(entry.definition, entry.element);
    if (![...Object.values(next.craft || {}), ...Object.values(next.build || {})].some(Boolean)) return;
    selected?.marker.setAttribute("aria-expanded", "false");
    selected = entry;
    hovered = null;
    annotation = next;
    surface.querySelector<HTMLElement>("[data-inspection-number]")!.textContent = entry.number;
    surface.querySelector<HTMLElement>("[data-inspection-title]")!.textContent = entry.definition.label;
    for (const tab of tabs) {
      tab.hidden = !hasFields(tab.dataset.inspectionTab as Tab);
    }
    entry.marker.setAttribute("aria-expanded", "true");
    panel.hidden = false;
    renderTab(hasFields(activeTab) ? activeTab : hasFields("craft") ? "craft" : "build");
    draw();
    tabs.find(tab => tab.getAttribute("aria-selected") === "true")?.focus({ preventScroll: true });
  }
  function close(restoreFocus = true) {
    const previous = selected;
    selected?.marker.setAttribute("aria-expanded", "false");
    selected = null;
    annotation = null;
    panel.hidden = true;
    selectedOutline.hidden = true;
    if (restoreFocus) (previous && !previous.marker.hidden ? previous.marker : toggle).focus({ preventScroll: true });
  }
  const findEntry = (target: EventTarget | null) => {
    const element = target instanceof Element ? target.closest<HTMLElement>("[data-inspect]") : null;
    return entries.find(entry => entry.element === element) || null;
  };
  const onClick = (event: MouseEvent) => {
    if (!(event.target instanceof Element) || surface.contains(event.target) || toggle.contains(event.target)) return;
    if (event.target.closest(".folio-mode")) { disable(false); return; }
    const entry = findEntry(event.target);
    const interactive = event.target.closest("a, button, input, select, textarea, [role=button]");
    // Existing navigation remains usable. Only explicitly annotated links are intercepted.
    if (interactive && !interactive.hasAttribute("data-inspect")) return;
    if (!entry || !window.getSelection()?.isCollapsed) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    open(entry);
  };
  const onPointer = (event: PointerEvent) => {
    if (event.pointerType === "touch") return;
    hovered = findEntry(event.target);
    schedule();
  };
  const resizeObserver = new ResizeObserver(refresh);
  const themeObserver = new MutationObserver(refresh);
  function enable() {
    if (enabled) return;
    enabled = true;
    surface.hidden = false;
    toggle.setAttribute("aria-pressed", "true");
    toggle.setAttribute("aria-label", "Exit Inspect Mode");
    toggle.title = "Exit Inspect Mode";
    root.dataset.inspection = "on";
    status.textContent = "Inspect Mode on. Choose a numbered detail to explore Craft and Build. Escape returns to reading.";
    listeners = new AbortController();
    const { signal } = listeners;
    document.addEventListener("click", onClick, { capture: true, signal });
    document.addEventListener("pointerover", onPointer, { passive: true, signal });
    document.addEventListener("pointerout", event => { hovered = findEntry(event.relatedTarget); schedule(); }, { passive: true, signal });
    document.addEventListener("keydown", event => { if (event.key === "Escape") { event.preventDefault(); disable(); } }, { signal });
    document.addEventListener("folio:tab-change", refresh, { signal });
    window.addEventListener("scroll", schedule, { passive: true, signal });
    window.addEventListener("resize", refresh, { passive: true, signal });
    window.addEventListener("pagehide", () => disable(false), { signal });
    entries.forEach(entry => resizeObserver.observe(entry.element));
    themeObserver.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    draw();
  }
  function disable(restoreFocus = true) {
    if (!enabled) return;
    enabled = false;
    close(false);
    hovered = null;
    surface.hidden = true;
    hoverOutline.hidden = true;
    toggle.setAttribute("aria-pressed", "false");
    toggle.setAttribute("aria-label", "Inspect my thinking");
    toggle.title = "Inspect my thinking";
    delete root.dataset.inspection;
    listeners?.abort();
    listeners = null;
    resizeObserver.disconnect();
    themeObserver.disconnect();
    cancelAnimationFrame(frame);
    frame = 0;
    status.textContent = "Reader Mode. Inspection off.";
    if (restoreFocus) toggle.focus({ preventScroll: true });
  }
  surface.querySelector("[data-inspection-close]")?.addEventListener("click", () => close());
  surface.querySelector("[data-inspection-exit]")?.addEventListener("click", () => disable());
  tabs.forEach(button => {
    button.addEventListener("click", () => renderTab(button.dataset.inspectionTab as Tab));
    button.addEventListener("keydown", event => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const available = tabs.filter(tab => !tab.hidden);
      const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? available.length - 1 : available.indexOf(button) + (event.key === "ArrowRight" ? 1 : -1);
      const next = available[(nextIndex + available.length) % available.length];
      renderTab(next.dataset.inspectionTab as Tab);
      next.focus({ preventScroll: true });
    });
  });
  return { enable, toggle: () => enabled ? disable() : enable() };
}
