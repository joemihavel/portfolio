let cleanup: (() => void) | undefined;
let registered = false;
function setup() {
  cleanup?.();
  const roots = [...document.querySelectorAll<HTMLElement>("[data-cx-cover]")];
  if (!roots.length) return;
  const controller = new AbortController();
  const { signal } = controller;
  const reduced = matchMedia("(prefers-reduced-motion:reduce)");
  const disposers: (() => void)[] = [];
  roots.forEach(root => {
    const stage = root.querySelector<HTMLElement>(".cx-stage")!;
    const cursor = root.querySelector<HTMLElement>("[data-cx-cursor]")!;
    const toggle = root.querySelector<HTMLButtonElement>("[data-cx-toggle]");
    let frame = 0, elapsed = 0, last = 0, previous = -1, visible = false, paused = false;
    const times = [0, 900, 1800, 4000, 4900, 5100, 5800, 6400];
    const render = (poster = false) => {
      const beat = poster ? 3 : times.findLastIndex(at => elapsed >= at);
      if (beat === previous) return;
      previous = beat;
      stage.dataset.mark = ["opening", "ticket", "open", "read", "close", "exit", "hide", "reset"][beat];
      stage.dataset.active = String(!poster && beat > 0 && beat < 6);
      stage.dataset.open = String(beat >= 2 && beat < 5);
      // The overview stays mounted throughout. No tab or record changes.
      stage.dataset.tasks = "false";
      stage.dataset.done = "false";
      const name = beat === 1 ? "ticket" : beat === 3 ? "close" : undefined;
      const target = name && stage.querySelector<HTMLElement>(`[data-cx-target="${name}"]`);
      if (target && !poster) {
        const box = target.getBoundingClientRect(), scene = stage.getBoundingClientRect(), scale = scene.width / stage.offsetWidth;
        cursor.style.transform = `translate(${(box.left + box.width * .55 - scene.left) / scale}px,${(box.top + box.height * .55 - scene.top) / scale}px)`;
      }
      if (beat === 7) cursor.style.transform = "translate(340px,510px)";
    };
    const tick = (now: number) => { if (last) elapsed = (elapsed + now - last) % 8500; last = now; render(); frame = requestAnimationFrame(tick); };
    const sync = () => {
      cancelAnimationFrame(frame); last = 0;
      const stopped = paused || !visible || document.hidden || reduced.matches;
      stage.dataset.paused = String(stopped);
      stage.getAnimations({subtree:true}).forEach(animation => { if (stopped) animation.pause(); else if (animation.playState === "paused") animation.play(); });
      if (reduced.matches) { previous = -1; render(true); }
      else if (!stopped) frame = requestAnimationFrame(tick);
    };
    const resize = new ResizeObserver(() => {
      const compact = root.clientWidth <= 600;
      root.style.aspectRatio = compact ? "358 / 390" : "1100 / 620";
      stage.style.setProperty("--cx-scale", String(root.clientWidth / (compact ? 358 : 1100)));
      // Remeasure only when the layout changes, rather than replaying a
      // pointer transition when an observer reports the same dimensions.
      if (previous < 0) render(reduced.matches);
    });
    resize.observe(root);
    const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }, { threshold:.1 });
    observer.observe(root);
    toggle?.addEventListener("click", () => { paused = !paused; toggle.dataset.paused = String(paused); toggle.setAttribute("aria-label", paused ? "Play animation" : "Pause animation"); toggle.title = paused ? "Play animation" : "Pause animation"; sync(); }, {signal});
    reduced.addEventListener("change", () => {previous = -1; sync();}, {signal});
    document.addEventListener("visibilitychange", sync, {signal});
    disposers.push(() => {cancelAnimationFrame(frame); resize.disconnect(); observer.disconnect(); stage.getAnimations({subtree:true}).forEach(animation => animation.cancel());});
  });
  cleanup = () => {controller.abort(); disposers.forEach(dispose => dispose());};
}
export function initializeCXCovers() {
  if (registered) return;
  registered = true;
  document.addEventListener("astro:page-load", setup);
  document.addEventListener("astro:before-swap", () => cleanup?.());
  setup();
}
