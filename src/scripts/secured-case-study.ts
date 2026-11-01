let cleanup: (() => void) | undefined;
let registered = false;

function setup() {
  cleanup?.();
  const root = document.querySelector<HTMLElement>("[data-secured-case]");
  if (!root) return;

  const controller = new AbortController();
  const { signal } = controller;
  const figures = [...root.querySelectorAll<HTMLElement>(".secured-media")];
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

  const play = (video: HTMLVideoElement) => {
    video.muted = true;
    if (!video.getAttribute("src")) video.src = video.dataset.videoSrc!;
    void video.play().catch(() => { /* Keep the poster if playback is interrupted. */ });
  };

  const freeze = (image: HTMLImageElement) => {
    if (!image.dataset.animatedSrc) image.dataset.animatedSrc = image.currentSrc || image.src;
    if (image.dataset.poster) {
      image.src = image.dataset.poster;
      return;
    }
    if (!image.complete || !image.naturalWidth) {
      image.addEventListener("load", () => {
        if (image.dataset.paused === "true") freeze(image);
      }, { once: true, signal });
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(image, 0, 0);
    image.src = canvas.toDataURL("image/png");
  };

  const setPaused = (container: HTMLElement, paused: boolean) => {
    container.classList.toggle("is-motion-paused", paused);
    container.classList.toggle("is-motion-playing", !paused);
    container.querySelectorAll<HTMLVideoElement>("video").forEach(video => {
      video.dataset.paused = String(paused);
      if (paused) video.pause();
      else play(video);
    });
    container.querySelectorAll<HTMLImageElement>("img[data-animated]").forEach(image => {
      image.dataset.paused = String(paused);
      if (paused) freeze(image);
      else if (image.dataset.animatedSrc) image.src = image.dataset.animatedSrc;
    });
    const button = container.querySelector<HTMLButtonElement>("[data-case-motion]");
    if (button) {
      button.dataset.paused = String(paused);
      button.textContent = paused ? "Play" : "Pause";
      button.setAttribute("aria-label", `${paused ? "Play" : "Pause"} animation`);
    }
  };

  figures.forEach(figure => {
    figure.querySelector<HTMLButtonElement>("[data-case-motion]")?.addEventListener("click", event => {
      const button = event.currentTarget as HTMLButtonElement;
      setPaused(figure, button.dataset.paused !== "true");
    }, { signal });
    if (reducedMotion.matches) setPaused(figure, true);
  });

  const motionObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const video = entry.target as HTMLVideoElement;
      if (entry.isIntersecting && video.dataset.paused !== "true") play(video);
      else video.pause();
    });
  }, { rootMargin: "200px" });
  const videos = [...root.querySelectorAll<HTMLVideoElement>("video")];
  videos.forEach(video => {
    // A native GIF remains available if an embedded browser cannot decode MP4.
    video.addEventListener("error", () => {
      const image = document.createElement("img");
      image.src = video.dataset.gifSrc!;
      image.alt = video.getAttribute("aria-label") || "";
      image.style.cssText = video.style.cssText;
      image.dataset.animated = "true";
      image.dataset.poster = video.poster;
      video.replaceWith(image);
    }, { once: true, signal });
    motionObserver.observe(video);
  });

  const applyMotionPreference = () => {
    setPaused(root, reducedMotion.matches);
    figures.forEach(figure => setPaused(figure, reducedMotion.matches));
  };
  if (reducedMotion.matches) applyMotionPreference();
  reducedMotion.addEventListener("change", applyMotionPreference, { signal });

  cleanup = () => {
    motionObserver.disconnect();
    videos.forEach(video => video.pause());
    controller.abort();
    cleanup = undefined;
  };
}

export function initializeCaseStudy() {
  if (!registered) {
    document.addEventListener("astro:page-load", setup);
    document.addEventListener("astro:before-swap", () => cleanup?.());
    registered = true;
  }
  setup();
}
