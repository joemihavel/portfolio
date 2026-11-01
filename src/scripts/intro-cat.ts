import { mountOneko } from '../vendor/oneko';

/** Original oneko.js sprites and behaviour, scoped to the welcome screen. */
export function createIntroCat(overlay: HTMLElement) {
  const container = overlay.querySelector<HTMLElement>('.intro-cat-mount');
  const name = overlay.querySelector<HTMLElement>('.signature-intro-mark');
  const startY = innerHeight / 2 - (name?.offsetHeight || 0) / 2 - 60;
  return container ? mountOneko(container, '/images/intro/oneko.gif', 3, startY) : () => {};
}
