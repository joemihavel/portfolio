let cleanup: (() => void) | undefined;
let registered = false;

function setup() {
  cleanup?.();
  const root = document.querySelector<HTMLElement>("[data-secured-case]");
  const viewer = document.querySelector<HTMLDialogElement>("[data-case-viewer]");
  if (!root || !viewer) return;

  const controller = new AbortController();
  const { signal } = controller;
  const figures = [...root.querySelectorAll<HTMLElement>(".secured-media")];
  const content = viewer.querySelector<HTMLElement>("[data-case-viewer-content]")!;
  const viewerMotion = viewer.querySelector<HTMLButtonElement>("[data-case-viewer-motion]")!;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  let previousFocus: HTMLElement | null = null;
  let previousOverflow = "";
  let locked = false;

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

  const render = (figure: HTMLElement) => {
    const art = figure.querySelector<HTMLElement>(".secured-media-art")!.cloneNode(true) as HTMLElement;
    const paused = reducedMotion.matches || figure.querySelector<HTMLElement>("[data-case-motion]")?.dataset.paused === "true";
    art.querySelectorAll<HTMLVideoElement>("video").forEach(video => {
      video.autoplay = !paused;
      if (paused) video.removeAttribute("src");
    });
    art.querySelectorAll<HTMLImageElement>("img").forEach(image => {
      image.loading = "eager";
      image.alt = "";
      if (!reducedMotion.matches && image.dataset.animatedSrc) image.src = image.dataset.animatedSrc;
    });
    content.replaceChildren(art);
    viewer.setAttribute("aria-label", figure.querySelector("button")?.getAttribute("aria-label")?.replace(/^Enlarge: /, "") || "Expanded project image");
    viewerMotion.hidden = !art.querySelector("img[data-animated], video, [data-cover-screen]");
    viewerMotion.dataset.paused = String(paused);
    viewerMotion.textContent = paused ? "Play" : "Pause";
    setPaused(content, paused);
  };

  const unlock = () => {
    if (!locked) return;
    document.body.style.overflow = previousOverflow;
    locked = false;
    document.dispatchEvent(new CustomEvent("folio:overlay", { detail: { active: false } }));
    content.replaceChildren();
    if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
  };

  figures.forEach(figure => {
    figure.querySelector<HTMLButtonElement>("[data-case-enlarge]")?.addEventListener("click", event => {
      previousFocus = event.currentTarget as HTMLElement;
      previousOverflow = document.body.style.overflow;
      locked = true;
      render(figure);
      viewer.showModal();
      document.body.style.overflow = "hidden";
      document.dispatchEvent(new CustomEvent("folio:overlay", { detail: { active: true } }));
      viewer.querySelector<HTMLButtonElement>("[data-case-close]")?.focus({ preventScroll: true });
    }, { signal });
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

  viewerMotion.addEventListener("click", () => {
    const paused = viewerMotion.dataset.paused !== "true";
    setPaused(content, paused);
    viewerMotion.dataset.paused = String(paused);
    viewerMotion.textContent = paused ? "Play" : "Pause";
  }, { signal });
  root.querySelectorAll<HTMLButtonElement>("[data-case-inline-motion]").forEach(button => {
    if (reducedMotion.matches) setPaused(button, true);
    button.addEventListener("click", () => {
      const paused = button.querySelector<HTMLImageElement>("img")?.dataset.paused !== "true";
      setPaused(button, paused);
      button.setAttribute("aria-label", `${paused ? "Play" : "Pause"} reaction animation`);
    }, { signal });
  });
  viewer.querySelector("[data-case-close]")?.addEventListener("click", () => viewer.close(), { signal });
  viewer.addEventListener("close", unlock, { signal });
  viewer.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      viewer.close();
      return;
    }
  }, { signal });
  viewer.addEventListener("click", event => {
    if (event.target !== viewer) return;
    const bounds = viewer.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) viewer.close();
  }, { signal });

  cleanup = () => {
    if (viewer.open) viewer.close();
    unlock();
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
