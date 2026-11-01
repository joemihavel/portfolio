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
  const tooltip = list.querySelector<HTMLElement>('#experiment-action-tooltip');
  let tooltipIcon: HTMLElement | undefined;
  let tooltipLink: HTMLElement | undefined;
  let tooltipTimer = 0;
  const hideTooltip = () => {
    clearTimeout(tooltipTimer);
    if (tooltip) tooltip.hidden = true;
    tooltipIcon?.removeAttribute('data-tooltip-open');
    if (tooltipLink && tooltip) {
      const remaining = (tooltipLink.getAttribute('aria-describedby') || '').split(/\s+/).filter(id => id && id !== tooltip.id).join(' ');
      if (remaining) tooltipLink.setAttribute('aria-describedby', remaining);
      else tooltipLink.removeAttribute('aria-describedby');
    }
    tooltipIcon = tooltipLink = undefined;
  };
  const showTooltip = (icon: HTMLElement, link: HTMLElement) => {
    if (!tooltip || icon.classList.contains('is-disabled')) return;
    hideTooltip();
    tooltipIcon = icon; tooltipLink = link;
    tooltip.textContent = icon.dataset.tooltip || '';
    tooltip.hidden = false;
    icon.setAttribute('data-tooltip-open', '');
    link.setAttribute('aria-describedby', [link.getAttribute('aria-describedby'), tooltip.id].filter(Boolean).join(' '));
    const bounds = icon.getBoundingClientRect();
    tooltip.style.left = `${Math.max(12, Math.min(innerWidth - tooltip.offsetWidth - 12, bounds.left + bounds.width / 2 - tooltip.offsetWidth / 2))}px`;
    tooltip.style.top = `${bounds.top >= tooltip.offsetHeight + 18 ? bounds.top - tooltip.offsetHeight - 6 : bounds.bottom + 6}px`;
  };
  const leaveTooltip = () => {
    clearTimeout(tooltipTimer);
    tooltipTimer = window.setTimeout(() => {
      if (!tooltipIcon?.matches(':hover') && !tooltipLink?.matches(':focus-visible') && !tooltip?.matches(':hover')) hideTooltip();
    }, 100);
  };
  for (const icon of list.querySelectorAll<HTMLElement>('.experiment-icon[data-tooltip]')) {
    const link = icon.closest<HTMLElement>('a');
    if (!link) continue;
    icon.addEventListener('pointerenter', event => { if (hover.matches && event.pointerType !== 'touch') showTooltip(icon, link); }, {signal});
    icon.addEventListener('pointerleave', leaveTooltip, {signal});
    link.addEventListener('focus', () => { if (link.matches(':focus-visible')) showTooltip(icon, link); }, {signal});
    link.addEventListener('blur', leaveTooltip, {signal});
  }
  tooltip?.addEventListener('pointerenter', () => clearTimeout(tooltipTimer), {signal});
  tooltip?.addEventListener('pointerleave', leaveTooltip, {signal});
  document.addEventListener('keydown', event => { if (event.key === 'Escape') hideTooltip(); }, {signal});
  let frame = 0, token = 0, x = 0, y = 0;
  const place = () => {
    frame = 0;
    const width = preview.offsetWidth, height = preview.offsetHeight || width * 9 / 16;
    const left = x + width + 24 <= innerWidth - 16 ? x + 24 : x - width - 24;
    const top = Math.max(16, Math.min(innerHeight - height - 16, y - height / 2));
    preview.style.transform = `translate3d(${Math.max(16, left)}px,${top}px,0)`;
  };
  const hide = () => {token++; preview.classList.remove('is-visible'); cancelAnimationFrame(frame); frame = 0;};
  const hideOverlays = () => {hide(); hideTooltip();};
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
  window.addEventListener('scroll', hideOverlays, {capture: true, passive: true, signal});
  window.addEventListener('blur', hideOverlays, {signal});
  window.addEventListener('resize', hideOverlays, {signal});
  document.addEventListener('click', hideOverlays, {signal});
  document.addEventListener('visibilitychange', hideOverlays, {signal});
  cleanup = () => {hideOverlays(); controller.abort();};
}
document.addEventListener('astro:before-swap', () => {cleanup?.(); cleanup = undefined;});
