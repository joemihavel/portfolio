// Stageshow's named targets, retained surfaces, and causal loop, using the
// site's native Astro/DOM stack. No React runtime or animation dependency.
let cleanup: (() => void) | undefined;
let registered = false;

function setup() {
  cleanup?.();
  const roots = [...document.querySelectorAll<HTMLElement>("[data-flent-cover]")];
  if (!roots.length) return;
  const controller = new AbortController();
  const { signal } = controller;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const disposers: (() => void)[] = [];

  roots.forEach(root => {
    const stage = root.querySelector<HTMLElement>(".flent-stage")!;
    const cursor = stage.querySelector<HTMLElement>("[data-fc-cursor]")!;
    const email = stage.querySelector<HTMLElement>("[data-email-value]")!;
    let visible = false;
    let userPaused = false;
    let frame = 0;
    let elapsed = 0;
    let last = 0;
    let previousBeat = -1;
    let previousText = "";
    const slow = Math.max(1, (window as Window & { __stageshow?: { slow?: number } }).__stageshow?.slow || 1);
    const duration = 14500;
    const times = [0, 700, 1400, 2600, 3400, 4500, 5400, 6100, 7100, 8000, 8800, 11000, 11900, 12700];

    const moveTo = (name: string) => {
      const target = stage.querySelector<HTMLElement>(`[data-target="${name}"]`);
      if (!target || target.getClientRects().length === 0) return;
      const bounds = target.getBoundingClientRect();
      const scene = stage.getBoundingClientRect();
      const scale = scene.width / stage.offsetWidth;
      cursor.style.transform = `translate(${(bounds.left + bounds.width * .7 - scene.left) / scale}px,${(bounds.top + bounds.height * .6 - scene.top) / scale}px)`;
    };
    const set = (name: string, value: boolean) => { stage.dataset[name] = String(value); };
    const render = (time: number, poster = false) => {
      let beat = times.findLastIndex(at => time >= at);
      if (poster) beat = 10;
      const typing = time >= 1400 && time < 2600;
      const text = poster || (time >= 2600 && time < 12700) ? "maya@flent.in" : typing ? "maya@flent.in".slice(0, Math.floor((time - 1400) / 75)) : "Your email";
      if (text !== previousText) { email.textContent = text || "\u00a0"; previousText = text; }
      if (beat === previousBeat && !poster) return;
      previousBeat = beat;
      stage.dataset.mark = ["opening", "focus", "type", "select", "date", "book", "press", "drawer", "review", "confirm", "success", "close", "reset", "opening"][beat];
      stage.dataset.beat = String(beat);
      set("active", !poster && beat > 0);
      set("emailFocus", beat >= 1 && beat < 3);
      set("chipSelected", beat >= 3 && beat < 13);
      set("dateSelected", poster || (beat >= 4 && beat < 13));
      set("booking", beat === 6 || beat === 9);
      set("drawer", beat >= 7 && beat < 11);
      set("complete", poster || (beat >= 10 && beat < 13));
      if (poster) set("drawer", false);
      const targets: Record<number, string> = { 1:"email", 3:"chip", 4:root.dataset.layout === "compact" ? "book" : "date", 5:"book", 6:"book", 7:"book", 8:"confirm", 9:"confirm", 10:"close", 12:"reset", 13:"reset" };
      if (targets[beat] && !poster) moveTo(targets[beat]);
      if (beat === 6 || beat === 9 || beat === 11 || beat === 13) {
        const target = stage.querySelector<HTMLElement>(`[data-target="${beat === 6 ? "book" : beat === 9 ? "confirm" : beat === 11 ? "close" : "reset"}"]`);
        target?.animate([{ transform:"scale(1)" }, { transform:"scale(.97)" }, { transform:"scale(1)" }], { duration:220 * slow, easing:"ease-out" });
      }
    };
    const tick = (now: number) => {
      if (last) elapsed = (elapsed + (now - last) / slow) % duration;
      last = now;
      render(elapsed);
      frame = requestAnimationFrame(tick);
    };
    const sync = () => {
      cancelAnimationFrame(frame);
      last = 0;
      const paused = !visible || userPaused || document.hidden || reduced.matches;
      stage.dataset.paused = String(paused);
      stage.getAnimations({ subtree:true }).forEach(animation => {
        if (paused) animation.pause();
        else if (animation.playState === "paused") animation.play();
      });
      if (reduced.matches) render(9000, true);
      else if (!paused) frame = requestAnimationFrame(tick);
    };
    const resize = new ResizeObserver(() => {
      const compact = root.clientWidth <= 540;
      root.dataset.layout = compact ? "compact" : "wide";
      root.style.aspectRatio = compact ? "358 / 390" : "920 / 520";
      stage.style.setProperty("--fc-scale", String(root.clientWidth / (compact ? 358 : 920)));
      previousBeat = -1;
      render(reduced.matches ? 9000 : elapsed, reduced.matches);
    });
    resize.observe(root);
    const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }, { threshold:.1 });
    observer.observe(root);
    const toggle = root.querySelector<HTMLButtonElement>("[data-stage-toggle]");
    toggle?.addEventListener("click", () => {
      userPaused = !userPaused;
      toggle.dataset.paused = String(userPaused);
      toggle.setAttribute("aria-label", userPaused ? "Play animation" : "Pause animation");
      toggle.title = userPaused ? "Play animation" : "Pause animation";
      sync();
    }, { signal });
    document.addEventListener("visibilitychange", sync, { signal });
    reduced.addEventListener("change", () => { previousBeat = -1; sync(); }, { signal });
    disposers.push(() => { cancelAnimationFrame(frame); resize.disconnect(); observer.disconnect(); stage.getAnimations({ subtree:true }).forEach(animation => animation.cancel()); });
  });
  cleanup = () => { controller.abort(); disposers.forEach(dispose => dispose()); };
}

export function initializeFlentCovers() {
  if (registered) return;
  registered = true;
  document.addEventListener("astro:page-load", setup);
  document.addEventListener("astro:before-swap", () => cleanup?.());
  setup();
}
