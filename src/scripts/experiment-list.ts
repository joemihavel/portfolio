let cleanup: (() => void) | undefined;
export function initializeExperimentList() {
  cleanup?.();
  const list = document.querySelector<HTMLElement>('[data-experiment-list]');
  const preview = list?.querySelector<HTMLElement>('[data-experiment-hover-preview]');
  const image = preview?.querySelector('img');
  const caption = preview?.querySelector<HTMLElement>('[data-experiment-hover-caption]');
  if (!list || !preview || !image) return;
  const hover = matchMedia('(hover: hover) and (pointer: fine)');
  const controller = new AbortController();
  const {signal} = controller;
  let frame = 0, token = 0, x = 0, y = 0;
  const place = () => {
    frame = 0;
    const width = preview.offsetWidth, height = preview.offsetHeight || width * 9 / 16;
    const left = x + width + 24 <= innerWidth - 16 ? x + 24 : x - width - 24;
    const top = Math.max(16, Math.min(innerHeight - height - 16, y - height / 2));
    preview.style.transform = `translate3d(${Math.max(16, left)}px,${top}px,0)`;
  };
  const hide = () => {token++; preview.classList.remove('is-visible'); cancelAnimationFrame(frame); frame = 0;};
  for (const row of list.querySelectorAll<HTMLElement>('[data-experiment-thumbnail]')) {
    row.addEventListener('pointerenter', async event => {
      if (!hover.matches || event.pointerType === 'touch') return;
      const current = ++token;
      x = event.clientX; y = event.clientY; place();
      image.src = row.dataset.experimentThumbnail!;
      if (caption) {caption.textContent = row.dataset.experimentDescription || ''; caption.hidden = !caption.textContent;}
      await image.decode().catch(() => {});
      if (current === token) {place(); preview.classList.add('is-visible');}
    }, {signal});
    row.addEventListener('pointermove', event => {
      x = event.clientX; y = event.clientY;
      if (hover.matches && !frame) frame = requestAnimationFrame(place);
    }, {signal});
    row.addEventListener('pointerleave', hide, {signal});
  }
  window.addEventListener('scroll', hide, {capture: true, passive: true, signal});
  window.addEventListener('blur', hide, {signal});
  window.addEventListener('resize', hide, {signal});
  document.addEventListener('click', hide, {signal});
  document.addEventListener('visibilitychange', hide, {signal});
  cleanup = () => {hide(); controller.abort();};
}
document.addEventListener('astro:before-swap', () => {cleanup?.(); cleanup = undefined;});
