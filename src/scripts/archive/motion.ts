/** Functional UI motion: feedback, hierarchy, and continuity. No idle loops. */
// On hold while we revisit the motion direction. Interactions apply immediately.
export const ARCHIVE_ANIMATIONS_ENABLED = false;
export const motion = {
  fast: 120, state: 220, layout: 300, panel: 320, draw: 480,
  out: 'cubic-bezier(0.2, 0, 0, 1)',
  change: 'cubic-bezier(0.4, 0, 0.2, 1)',
  exit: 'cubic-bezier(0.4, 0, 1, 1)',
} as const;

type Scope = { animations: Set<Animation>; finishes: Set<() => void> };
const scopes = new WeakMap<AbortSignal, Scope>();
const channels = new WeakMap<Element, Map<string, Animation>>();
const counters = new WeakMap<HTMLElement, {stop: () => void; finish: () => void}>();
export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function scope(signal: AbortSignal) {
  const existing = scopes.get(signal);
  if (existing) return existing;
  const state: Scope = {animations: new Set(), finishes: new Set()};
  scopes.set(signal, state);
  const finish = () => {
    [...state.finishes].forEach(fn => fn());
    [...state.animations].forEach(a => a.cancel());
    state.animations.clear();
  };
  signal.addEventListener('abort', finish, {once: true});
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', event => {
    if (event.matches) finish();
  }, {signal});
  return state;
}

export function animate(
  el: Element | null | undefined, signal: AbortSignal, keyframes: Keyframe[],
  options: KeyframeAnimationOptions = {}, channel = 'feedback',
) {
  if (!ARCHIVE_ANIMATIONS_ENABLED || !el || signal.aborted || reducedMotion()) return;
  const state = scope(signal);
  let active = channels.get(el);
  if (!active) { active = new Map(); channels.set(el, active); }
  active.get(channel)?.cancel();
  const animation = el.animate(keyframes, {duration: motion.state, easing: motion.out, ...options});
  active.set(channel, animation); state.animations.add(animation);
  const release = () => {
    state.animations.delete(animation);
    if (active.get(channel) === animation) active.delete(channel);
  };
  void animation.finished.then(release, release);
  return animation;
}

export function animateNumber(
  el: HTMLElement | null | undefined, value: number, format: (value: number) => string,
  signal: AbortSignal, options: {from?: number; duration?: number; delay?: number} = {},
) {
  if (!el) return () => {};
  counters.get(el)?.stop();
  const from = options.from ?? Number((el.textContent || '').replace(/[^\d.-]/g, ''));
  const final = () => { el.textContent = format(value); };
  if (!ARCHIVE_ANIMATIONS_ENABLED || signal.aborted || reducedMotion() || from === value) { final(); return final; }
  const state = scope(signal);
  const start = performance.now() + (options.delay || 0), duration = options.duration || 360;
  let frame = 0, done = false;
  const stop = () => { done = true; cancelAnimationFrame(frame); state.finishes.delete(finish); counters.delete(el); };
  const finish = () => { if (done) return; stop(); final(); };
  const tick = (now: number) => {
    if (done) return;
    const progress = Math.max(0, Math.min(1, (now - start) / duration));
    el.textContent = format(Math.round(from + (value - from) * (1 - Math.pow(1 - progress, 3))));
    if (progress < 1) frame = requestAnimationFrame(tick);
    else finish();
  };
  state.finishes.add(finish); counters.set(el, {stop, finish});
  el.style.fontVariantNumeric = 'tabular-nums';
  frame = requestAnimationFrame(tick);
  return finish;
}

type Rect = {x: number; y: number; width: number; height: number};
function rectInStage(stage: HTMLElement, el: Element): Rect | undefined {
  const origin = stage.getBoundingClientRect(), box = el.getBoundingClientRect();
  const scale = origin.width / 1024;
  if (!scale || !box.width || !box.height || getComputedStyle(el).display === 'none') return;
  return {x: (box.left - origin.left) / scale, y: (box.top - origin.top) / scale, width: box.width / scale, height: box.height / scale};
}

function clipGhost(stage: HTMLElement, original: HTMLElement, ghost: HTMLElement, box: Rect) {
  let left = 0, top = 0, right = 1024, bottom = 576;
  for (let parent = original.parentElement; parent && parent !== stage; parent = parent.parentElement) {
    const style = getComputedStyle(parent), bounds = rectInStage(stage,parent);
    if (!bounds) continue;
    if (/hidden|clip|auto|scroll/.test(style.overflowX)) { left = Math.max(left,bounds.x); right = Math.min(right,bounds.x+bounds.width); }
    if (/hidden|clip|auto|scroll/.test(style.overflowY)) { top = Math.max(top,bounds.y); bottom = Math.min(bottom,bounds.y+bounds.height); }
  }
  if (right <= box.x || bottom <= box.y || left >= box.x+box.width || top >= box.y+box.height) return false;
  ghost.style.clipPath = `inset(${Math.max(0,top-box.y)}px ${Math.max(0,box.x+box.width-right)}px ${Math.max(0,box.y+box.height-bottom)}px ${Math.max(0,left-box.x)}px)`;
  return true;
}

/** Measure the current visual positions before interruption, then play the new layout. */
export function reflow(stage: HTMLElement, elements: HTMLElement[], mutate: () => void, signal: AbortSignal) {
  if (!ARCHIVE_ANIMATIONS_ENABLED || signal.aborted || reducedMotion() || !stage.getBoundingClientRect().width) { mutate(); return; }
  stage.querySelectorAll('.archive-motion-ghost').forEach(ghost => {
    ghost.getAnimations().forEach(animation => animation.cancel()); ghost.remove();
  });
  const previous = new Map(elements.map(el => [el, rectInStage(stage, el)]));
  const before = new Map([...previous].filter((entry): entry is [HTMLElement, Rect] => !!entry[1]));
  const ghosts = new Map<HTMLElement, HTMLElement>();
  // Clone before mutating text/removing nodes; these copies never receive input or focus.
  for (const [el, box] of before) {
    const clone = el.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('[data-node-id], [data-archive-card]').forEach(node => {
      node.removeAttribute('data-node-id'); node.removeAttribute('data-archive-card');
    });
    clone.removeAttribute('data-node-id'); clone.removeAttribute('data-archive-card');
    clone.classList.add('archive-motion-ghost'); clone.inert = true; clone.ariaHidden = 'true';
    Object.assign(clone.style, {position:'absolute', left:`${box.x}px`, top:`${box.y}px`, width:`${box.width}px`, height:`${box.height}px`, margin:'0', zIndex:'20', pointerEvents:'none'});
    if (clipGhost(stage,el,clone,box)) ghosts.set(el, clone);
    channels.get(el)?.get('layout')?.cancel();
  }
  mutate();
  const after = new Map(elements.map(el => [el, el.isConnected ? rectInStage(stage, el) : undefined]));
  let entering = 0;
  for (const el of elements) {
    const a = before.get(el), b = after.get(el);
    if (a && b) {
      const x = a.x - b.x, y = a.y - b.y;
      if (Math.abs(x) + Math.abs(y) > .5) animate(el, signal,
        [{translate:`${x}px ${y}px`}, {translate:'0px 0px'}],
        {duration:motion.layout, easing:motion.out}, 'layout');
    } else if (a && !b) {
      const ghost = ghosts.get(el); if (!ghost) continue; stage.append(ghost);
      const exit = animate(ghost, signal, [{opacity:1, translate:'0px 0px'}, {opacity:0, translate:'0px -4px'}], {duration:160, easing:motion.exit}, 'layout');
      if (exit) void exit.finished.then(() => ghost.remove(), () => ghost.remove());
      else ghost.remove();
    } else if (!a && b) {
      animate(el, signal, [{opacity:0, translate:'0px 5px'}, {opacity:1, translate:'0px 0px'}], {duration:motion.state, delay:Math.min(entering++ * 18, 72), fill:'backwards'}, 'layout');
    }
  }
}

export function enterItems(elements: Element[], signal: AbortSignal, step = 24, distance = 4) {
  return elements.map((el, i) => animate(el, signal,
    [{opacity:0, translate:`0px ${distance}px`}, {opacity:1, translate:'0px 0px'}],
    {duration:260, delay:Math.min(i * step, 180), fill:'backwards'}, 'entrance'));
}

/** A short travelling outline connects the previous selection with its destination. */
export function selection(stage: HTMLElement, from: HTMLElement | null | undefined, to: HTMLElement, signal: AbortSignal, radius = '3px') {
  const a = from && rectInStage(stage, from), b = rectInStage(stage, to);
  if (!ARCHIVE_ANIMATIONS_ENABLED || !b || reducedMotion() || signal.aborted) return;
  stage.querySelector('.archive-selection-trail')?.remove();
  const trail = document.createElement('div'); trail.className = 'archive-selection-trail'; trail.ariaHidden = 'true';
  Object.assign(trail.style, {left:`${b.x}px`, top:`${b.y}px`, width:`${b.width}px`, height:`${b.height}px`, borderRadius:radius});
  stage.append(trail);
  const animation = animate(trail, signal,
    [{translate:`${a ? a.x - b.x : 0}px ${a ? a.y - b.y : 0}px`, opacity:.8}, {translate:'0px 0px', opacity:0}],
    {duration:motion.layout}, 'selection');
  if (animation) void animation.finished.then(() => trail.remove(), () => trail.remove());
  else trail.remove();
}

export function directional(el: HTMLElement, signal: AbortSignal, direction: number, distance = 12) {
  return animate(el, signal,
    [{opacity:.25, translate:`${Math.sign(direction) * distance}px 0px`}, {opacity:1, translate:'0px 0px'}],
    {duration:motion.state}, 'navigation');
}

export function resizeCanvas(el: HTMLElement, styles: {width: string; left: string}, signal: AbortSignal) {
  const current = getComputedStyle(el), width = current.width, left = current.left;
  Object.assign(el.style, styles);
  return animate(el, signal, [{width, left}, styles], {duration:motion.layout, easing:motion.change}, 'resize');
}

export function drawChart(stage: HTMLElement, signal: AbortSignal) {
  if (!ARCHIVE_ANIMATIONS_ENABLED) return;
  const path = stage.querySelector<SVGPathElement>('[data-archive-chart] path');
  if (!path) return;
  const length = path.getTotalLength();
  return animate(path, signal,
    [{strokeDasharray:`${length}`, strokeDashoffset:`${length}`}, {strokeDasharray:`${length}`, strokeDashoffset:'0'}],
    {duration:motion.draw, easing:motion.change}, 'chart');
}

export function traceOutline(stage: HTMLElement, target: HTMLElement, signal: AbortSignal) {
  const box = rectInStage(stage, target);
  if (!ARCHIVE_ANIMATIONS_ENABLED || !box || reducedMotion() || signal.aborted) return;
  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.classList.add('archive-outline-trace'); svg.setAttribute('aria-hidden','true');
  svg.setAttribute('viewBox',`0 0 ${box.width} ${box.height}`);
  Object.assign(svg.style,{left:`${box.x}px`,top:`${box.y}px`,width:`${box.width}px`,height:`${box.height}px`});
  const rect = document.createElementNS('http://www.w3.org/2000/svg','rect');
  for (const [name,value] of Object.entries({x:'1',y:'1',width:String(box.width-2),height:String(box.height-2),rx:'4',pathLength:'1'})) rect.setAttribute(name,value);
  svg.append(rect); stage.append(svg);
  const draw = animate(rect,signal,[{strokeDasharray:'1',strokeDashoffset:'1'},{strokeDasharray:'1',strokeDashoffset:'0'}],{duration:motion.panel},'selection');
  if(draw)void draw.finished.then(()=>svg.remove(),()=>svg.remove());else svg.remove();
  return draw;
}
