let cleanup: (() => void) | undefined;
let registered = false;
function setup() {
  cleanup?.();
  const root = document.querySelector<HTMLElement>("[data-flent-foundations]");
  if (!root) return;
  const stage = root.querySelector<HTMLElement>(".ff-stage")!;
  const cursor = root.querySelector<HTMLElement>("[data-ff-cursor]")!;
  const toggle = root.querySelector<HTMLButtonElement>("[data-stage-toggle]")!;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const controller = new AbortController();
  const { signal } = controller;
  let visible = false, paused = false, elapsed = 0, last = 0, frame = 0, previous = -1;
  const render = () => {
    const beat = elapsed < 1000 ? 0 : elapsed < 3500 ? 1 : elapsed < 6500 ? 2 : elapsed < 9500 ? 3 : 4;
    if (beat === previous) return;
    previous = beat;
    const color = beat === 1 ? "#FF9A6D" : beat === 2 ? "#008E75" : "#15102E";
    stage.dataset.active = String(beat > 0 && beat < 4 && !reduced.matches);
    stage.dataset.mark = ["opening", "coral", "green", "ink", "reset"][beat];
    stage.dataset.selected = beat === 1 ? "coral" : beat === 2 ? "green" : beat === 3 ? "ink" : "";
    const target = stage.querySelector<HTMLElement>(`[data-color="${color}"]`)!;
    const bounds = target.getBoundingClientRect(), scene = stage.getBoundingClientRect();
    const scale = scene.width / stage.offsetWidth;
    cursor.style.transform = `translate(${(bounds.left + bounds.width * .65 - scene.left) / scale}px,${(bounds.top + bounds.height * .65 - scene.top) / scale}px)`;
    // Arrival is 800ms; the sample changes only after the pointer reaches
    // the token. A CSS delay keeps the relationship on the same clock.
    stage.style.setProperty("--ff-preview-ink", color);
  };
  const tick = (now: number) => { if (last) elapsed = (elapsed + now - last) % 12000; last = now; render(); frame = requestAnimationFrame(tick); };
  const sync = () => {
    cancelAnimationFrame(frame); last = 0;
    const stopped = paused || !visible || document.hidden || reduced.matches;
    stage.dataset.paused = String(stopped);
    stage.getAnimations({ subtree:true }).forEach(animation => { if (stopped) animation.pause(); else if (animation.playState === "paused") animation.play(); });
    if (reduced.matches) { elapsed = 10000; previous = -1; render(); }
    else if (!stopped) frame = requestAnimationFrame(tick);
  };
  const resize = new ResizeObserver(() => { const compact = matchMedia("(max-width:700px)").matches; const scale = root.clientWidth / (compact ? 358 : 920); stage.style.setProperty("--ff-scale", String(scale)); root.style.height = `${stage.offsetHeight * scale}px`; previous = -1; render(); });
  resize.observe(root);
  resize.observe(stage);
  const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }, { threshold:.15 });
  observer.observe(root);
  toggle.addEventListener("click", () => { paused = !paused; toggle.dataset.paused = String(paused); toggle.setAttribute("aria-label", paused ? "Play animation" : "Pause animation"); toggle.title = paused ? "Play animation" : "Pause animation"; sync(); }, { signal });
  reduced.addEventListener("change", sync, { signal });
  document.addEventListener("visibilitychange", sync, { signal });
  cleanup = () => { cancelAnimationFrame(frame); resize.disconnect(); observer.disconnect(); controller.abort(); };
}
export function initializeFlentFoundations() {
  if (registered) return;
  registered = true;
  document.addEventListener("astro:page-load", setup);
  document.addEventListener("astro:before-swap", () => cleanup?.());
  setup();
}
