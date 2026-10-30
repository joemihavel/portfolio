/** Static archive frames: scale the native design without attaching UI controls. */
let resize: ResizeObserver | undefined;

export function initializeArchiveFrames() {
  resize?.disconnect();
  const fit = (frame: HTMLElement) => {
    const stage = frame.querySelector<HTMLElement>(':scope > .archive-stage');
    if (stage && frame.clientWidth > 0) {
      const scale = frame.clientWidth / Number(stage.dataset.archiveWidth || 1024);
      stage.style.setProperty('--archive-scale', String(scale));
      if (frame.hasAttribute('data-archive-animated')) stage.style.height = `${frame.clientHeight / scale}px`;
    }
  };
  const frames = [...document.querySelectorAll<HTMLElement>('.archive-frame')];
  if (!frames.length) return;
  resize = new ResizeObserver(entries => entries.forEach(entry => fit(entry.target as HTMLElement)));
  frames.forEach(frame => { fit(frame); resize!.observe(frame); });
}

document.addEventListener('astro:before-swap', () => resize?.disconnect());
