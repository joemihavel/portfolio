import { createAmbientMusic, type AmbientState } from "./ambient-music";

/** A shared mute switch for quiet ambient music and distance-based scroll clicks. */
export function setupInterfaceSounds(buttons: HTMLButtonElement[], isTransitioning: () => boolean) {
  if (!buttons.length || !("AudioContext" in window)) return;
  let enabled = false;
  // Background sound requires a fresh, explicit speaker click. A preference
  // from an earlier visit must not turn ordinary page input into surprise audio.
  let context: AudioContext | null = null;
  let output: GainNode | null = null;
  let click: AudioBuffer | null = null;
  let ambient: ReturnType<typeof createAmbientMusic> | null = null;
  let ambientState: AmbientState = "idle";
  let gameActive = false;
  let previousY = scrollY;
  let distance = 0;
  let lastDirection = 0;
  let lastClick = -Infinity;
  let inputUntil = 0;
  let draggingScrollbar = false;
  const scrollStep = 84;
  const clickInterval = 80;
  const volume = .28;

  const updateButton = () => {
    buttons = [...document.querySelectorAll<HTMLButtonElement>(".folio-sound")];
    const audible = enabled && !gameActive && context?.state === "running";
    buttons.forEach(button => {
      button.setAttribute("aria-pressed", String(audible));
      button.setAttribute("aria-label", audible ? "Mute music and interface sounds" : "Unmute music and interface sounds");
      button.dataset.music = enabled ? ambientState : "muted";
      button.title = audible && ambientState === "loading" ? "Loading ambient music…" : audible ? "Mute music and interface sounds" : "Unmute music and interface sounds";
    });
    document.documentElement.dataset.ambient = enabled ? ambientState : "muted";
  };
  const unlock = async () => {
    if (!enabled || document.hidden || gameActive) return;
    try {
      if (!context || context.state === "closed") {
        ambient?.stop();
        context = new AudioContext({ latencyHint: "interactive" });
        context.addEventListener("statechange", () => {
          if (context?.state !== "running") ambient?.stop();
          else if (enabled && !document.hidden && !gameActive) ambient?.start();
          updateButton();
        });
        ambient = createAmbientMusic(context, state => { ambientState = state; updateButton(); });
        const filter = context.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 3600;
        filter.Q.value = .5;
        output = context.createGain();
        output.gain.value = volume;
        output.connect(filter).connect(context.destination);
        click = context.createBuffer(1, Math.ceil(context.sampleRate * .022), context.sampleRate);
        const samples = click.getChannelData(0);
        for (let index = 0; index < samples.length; index++) {
          const time = index / context.sampleRate;
          const envelope = Math.min(1, time / .0005) * Math.exp(-time / .004);
          samples[index] = ((Math.random() * 2 - 1) * .6 + Math.sin(time * Math.PI * 2800) * .2) * envelope;
        }
      }
      if (context.state !== "running") await context.resume();
      if (enabled && !document.hidden && !gameActive) ambient?.start();
      updateButton();
    } catch (_) { /* Sound remains optional if the browser cannot start audio. */ }
  };
  const playClick = () => {
    if (!enabled || gameActive || document.hidden || context?.state !== "running" || !output || !click) return;
    const now = performance.now();
    if (now - lastClick < clickInterval) return;
    lastClick = now;
    const source = context.createBufferSource();
    source.buffer = click;
    source.connect(output);
    source.onended = () => source.disconnect();
    source.start();
  };
  const resetScroll = () => { previousY = scrollY; distance = 0; lastDirection = 0; };
  const markScrollInput = () => {
    inputUntil = performance.now() + 1400;
    if (enabled && context?.state !== "running" && navigator.userActivation?.hasBeenActive) void unlock();
  };
  const scrollKeys = new Set(["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "]);

  document.addEventListener("click", event => {
    if (!(event.target instanceof Element) || !event.target.closest(".folio-sound")) return;
    enabled = !(enabled && context?.state === "running");
    updateButton();
    resetScroll();
    try { localStorage.setItem("folio-sound", enabled ? "on" : "off"); } catch (_) {}
    if (enabled) {
      if (output && context) output.gain.setTargetAtTime(volume, context.currentTime, .005);
      void unlock().then(playClick);
    } else {
      ambient?.stop();
      if (output && context) output.gain.setTargetAtTime(0, context.currentTime, .005);
    }
  });
  // Only user scrolling produces ticks; page restores and layout changes stay quiet.
  addEventListener("wheel", markScrollInput, { passive: true });
  addEventListener("touchmove", markScrollInput, { passive: true });
  document.addEventListener("pointerdown", event => {
    draggingScrollbar = !!(event.target as Element).closest(".folio-scrollbar");
    if (draggingScrollbar) markScrollInput();
    if (!(event.target as Element).closest(".folio-sound")) void unlock();
  }, { passive: true });
  document.addEventListener("pointerup", () => { draggingScrollbar = false; }, { passive: true });
  document.addEventListener("pointercancel", () => { draggingScrollbar = false; }, { passive: true });
  document.addEventListener("keydown", event => {
    if (scrollKeys.has(event.key) && !event.metaKey && !event.ctrlKey && !event.altKey && !(event.target as Element).closest("input, textarea, select, [contenteditable='true']")) markScrollInput();
    if (!(event.target as Element).closest(".folio-sound")) void unlock();
  });
  addEventListener("scroll", () => {
    const delta = scrollY - previousY;
    previousY = scrollY;
    if (!enabled || context?.state !== "running" || document.hidden || isTransitioning() || document.documentElement.dataset.view === "experimental" || (!draggingScrollbar && performance.now() > inputUntil)) {
      distance = 0;
      return;
    }
    const direction = Math.sign(delta);
    if (direction && direction !== lastDirection) distance = 0;
    if (direction) lastDirection = direction;
    distance += Math.abs(delta);
    if (distance >= scrollStep && performance.now() - lastClick >= clickInterval) {
      distance %= scrollStep;
      playClick();
    }
  }, { passive: true });
  addEventListener("resize", resetScroll, { passive: true });
  document.addEventListener("folio:tab-change", () => { resetScroll(); playClick(); });
  document.addEventListener("astro:before-preparation", () => { inputUntil = 0; resetScroll(); });
  document.addEventListener("astro:page-load", () => { resetScroll(); updateButton(); });
  document.addEventListener("folio:game", event => {
    gameActive = (event as CustomEvent<{ active: boolean }>).detail.active;
    resetScroll();
    ambient?.stop();
    if (context && context.state !== "closed") void context.suspend();
    // Closing the piano stays silent; never automatically restart page music.
    if (!gameActive) {
      enabled = false;
      try { localStorage.setItem("folio-sound", "off"); } catch (_) {}
    }
    updateButton();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) ambient?.stop();
    else if (enabled && context) void unlock();
  });
  addEventListener("pagehide", () => ambient?.stop());
  addEventListener("pageshow", event => { if (event.persisted && enabled && context) void unlock(); });
  updateButton();
}
