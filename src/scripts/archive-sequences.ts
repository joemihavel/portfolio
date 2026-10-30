/** Playback of the fifteen Flent Charter prototypes, using their source states.
 * Only visible previews run. The twelve earlier archive interfaces stay static.
 */
type TextStep = { at: number; width: number; height: number; texts: {text: string; width: number; height: number}[] };
type Actor = { id: string; steps: TextStep[]; duration: number; loop: boolean };
type Scene = { id: string; hold: number; transition: {duration: number; easing: string} | null; actors: Actor[] };
type Box = { x: number; y: number; width: number; height: number };
type Snapshot = { element: HTMLElement; box: Box; parent?: string; paint: Record<string, string> };
type TextTarget = { actor: Actor; root: HTMLElement; text: HTMLElement; scaleX: number; scaleY: number; step: number };
const PAINT = ['backgroundColor', 'borderColor', 'borderRadius', 'color', 'opacity'] as const;
const EASINGS: Record<string, string> = { LINEAR: 'linear', EASE_OUT: 'cubic-bezier(0,0,.58,1)', EASE_IN: 'cubic-bezier(.42,0,1,1)', EASE_IN_AND_OUT: 'cubic-bezier(.42,0,.58,1)' };

function snapshot(live: HTMLElement, scale: number): Map<string, Snapshot> {
  const result = new Map<string, Snapshot>();
  const origin = live.getBoundingClientRect();
  for (const element of live.querySelectorAll<HTMLElement>('[data-motion-key]')) {
    const key = element.dataset.motionKey!;
    const rect = element.getBoundingClientRect();
    const css = getComputedStyle(element);
    if (css.display === 'contents') continue;
    result.set(key, {
      element,
      box: {x: (rect.x - origin.x) / scale, y: (rect.y - origin.y) / scale, width: rect.width / scale, height: rect.height / scale},
      parent: element.parentElement?.closest<HTMLElement>('[data-motion-key]')?.dataset.motionKey,
      paint: Object.fromEntries(PAINT.map(property => [property, css[property]])),
    });
  }
  return result;
}

class SequencePlayer {
  readonly live: HTMLElement;
  readonly scenes: Scene[];
  readonly templates: Map<string, HTMLTemplateElement>;
  visible = false;
  reduced = false;
  ready = false;
  loading?: Promise<void>;
  elapsed = 0;
  entered = 0;
  next = 0;
  index = 0;
  animations: Animation[] = [];
  targets: TextTarget[] = [];

  constructor(readonly root: HTMLElement) {
    this.live = root.querySelector<HTMLElement>('[data-scene-live]')!;
    this.scenes = JSON.parse(root.querySelector('[data-scene-timeline]')!.textContent!);
    this.templates = new Map([...root.querySelectorAll<HTMLTemplateElement>('template[data-scene-template]')].map(t => [t.dataset.sceneTemplate!, t]));
    this.next = this.scenes[0].hold;
    root.dataset.sceneState = this.scenes[0].id;
    this.prepareText();
  }

  load(fonts: Promise<unknown>): Promise<void> {
    if (this.loading) return this.loading;
    const urls = new Set<string>();
    for (const template of this.templates.values()) for (const image of template.content.querySelectorAll('img')) urls.add(image.src);
    this.loading = Promise.all([
      fonts,
      ...[...urls].map(async src => {const image = new Image(); image.src = src; await image.decode().catch(() => {});}),
    ]).then(() => {this.ready = true;});
    return this.loading;
  }

  prepareText() {
    this.targets = [];
    for (const actor of this.scenes[this.index].actors) {
      const root = this.live.querySelector<HTMLElement>(`[data-motion-actor="${actor.id}"]`);
      const text = root?.querySelector<HTMLElement>('[data-node-id]');
      if (!root || !text || !actor.steps.length) continue;
      const css = getComputedStyle(root);
      this.targets.push({actor, root, text, scaleX: parseFloat(css.width) / actor.steps[0].width, scaleY: parseFloat(css.height) / actor.steps[0].height, step: -1});
    }
  }

  updateText(time: number, complete = false) {
    for (const target of this.targets) {
      const {actor} = target;
      const local = actor.loop && time > actor.duration ? time % actor.duration : time;
      let index = complete ? actor.steps.length - 1 : 0;
      if (!complete) for (let i = 1; i < actor.steps.length && actor.steps[i].at <= local; i++) index = i;
      if (target.step === index) continue;
      target.step = index;
      const step = actor.steps[index];
      target.root.style.width = `${step.width * target.scaleX}px`;
      target.root.style.height = `${step.height * target.scaleY}px`;
      target.text.textContent = step.texts.map(t => t.text).join('\n');
      target.text.style.whiteSpace = 'pre-wrap';
      target.text.style.width = `${step.texts[0].width * target.scaleX}px`;
      // Multi-paragraph source text is one Figma text layer, not nested paragraphs.
      if (getComputedStyle(target.text).lineHeight === '0px') target.text.style.lineHeight = 'normal';
    }
  }

  mount(index: number, duration = 0, easing = 'EASE_OUT') {
    this.animations.forEach(a => a.cancel());
    this.animations = [];
    const width = Number(this.root.dataset.sourceWidth);
    const scale = this.root.getBoundingClientRect().width / width;
    const before = duration && scale ? snapshot(this.live, scale) : new Map<string, Snapshot>();
    this.live.replaceChildren(this.templates.get(this.scenes[index].id)!.content.cloneNode(true));
    this.index = index;
    this.root.dataset.sceneState = this.scenes[index].id;
    this.prepareText();
    if (!duration || !scale) return;
    const after = snapshot(this.live, scale);
    const options: KeyframeAnimationOptions = {duration, easing: EASINGS[easing] || 'ease-out', fill: 'none'};
    for (const [key, current] of after) {
      const previous = before.get(key);
      if (!previous) {
        if (!current.parent || before.has(current.parent)) this.animations.push(current.element.animate([{opacity: 0}, {opacity: current.paint.opacity}], options));
        continue;
      }
      if (current.box.width < .1 || current.box.height < .1 || previous.box.width < .1 || previous.box.height < .1) continue;
      const oldParent = current.parent ? before.get(current.parent) : undefined;
      const newParent = current.parent ? after.get(current.parent) : undefined;
      const parentX = oldParent && newParent && newParent.box.width ? oldParent.box.width / newParent.box.width : 1;
      const parentY = oldParent && newParent && newParent.box.height ? oldParent.box.height / newParent.box.height : 1;
      const dx = (previous.box.x - (oldParent?.box.x || 0)) / parentX - (current.box.x - (newParent?.box.x || 0));
      const dy = (previous.box.y - (oldParent?.box.y || 0)) / parentY - (current.box.y - (newParent?.box.y || 0));
      const sx = previous.box.width / current.box.width / parentX;
      const sy = previous.box.height / current.box.height / parentY;
      const start: Keyframe = {}, end: Keyframe = {};
      if (Math.abs(dx) > .05 || Math.abs(dy) > .05 || Math.abs(sx - 1) > .002 || Math.abs(sy - 1) > .002) {
        start.transform = `translate(${dx}px,${dy}px) scale(${sx},${sy})`;
        end.transform = 'none';
        current.element.style.transformOrigin = '0 0';
      }
      for (const property of PAINT) if (previous.paint[property] !== current.paint[property]) {start[property] = previous.paint[property]; end[property] = current.paint[property];}
      if (Object.keys(start).length) this.animations.push(current.element.animate([start, end], options));
    }
  }

  tick(delta: number) {
    this.elapsed += delta;
    if (this.elapsed >= this.next) {
      const outgoing = this.scenes[this.index];
      const duration = outgoing.transition?.duration ?? this.scenes[0].transition?.duration ?? 300;
      const index = (this.index + 1) % this.scenes.length;
      this.mount(index, duration, outgoing.transition?.easing);
      this.entered = this.elapsed + duration;
      this.next = this.entered + this.scenes[index].hold;
    }
    this.updateText(Math.max(0, this.elapsed - this.entered));
  }

  setRunning(running: boolean) {
    this.root.dataset.playback = this.reduced ? 'reduced' : running ? 'playing' : this.visible && !this.ready ? 'preparing' : 'paused';
    for (const animation of this.animations) if (animation.playState !== 'finished' && animation.playState !== 'idle') running ? animation.play() : animation.pause();
  }

  setReduced(reduced: boolean) {
    this.reduced = reduced;
    this.elapsed = this.entered = 0;
    this.mount(reduced ? this.scenes.length - 1 : 0);
    this.next = this.scenes[this.index].hold;
    if (reduced) this.updateText(0, true);
  }

  dispose() {this.animations.forEach(a => a.cancel());}
}

let dispose: (() => void) | undefined;
export function initializeArchiveSequences() {
  dispose?.();
  const roots = [...document.querySelectorAll<HTMLElement>('[data-archive-sequence]')];
  if (!roots.length) return;
  const players = roots.map(root => new SequencePlayer(root));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let fonts: Promise<unknown> | undefined;
  const loadFonts = () => fonts ??= Promise.all(['ArchiveInter', 'ArchiveDMSans', 'ArchiveDMMono'].map(font => document.fonts.load(`400 16px ${font}`)));
  let disposed = false;
  let frame = 0, previous = 0;
  const active = () => !document.hidden && !reduced.matches && players.some(p => p.visible && p.ready);
  const tick = (now: number) => {
    frame = 0;
    if (!active()) {previous = 0; return;}
    const delta = previous ? Math.min(now - previous, 100) : 0;
    previous = now;
    players.forEach(player => {if (player.visible && player.ready) player.tick(delta);});
    frame = requestAnimationFrame(tick);
  };
  const sync = () => {
    if (disposed) return;
    players.forEach(player => {
      if (player.reduced !== reduced.matches) player.setReduced(reduced.matches);
      player.setRunning(player.visible && player.ready && !document.hidden && !reduced.matches);
    });
    if (active() && !frame) {previous = 0; frame = requestAnimationFrame(tick);}
    else if (!active() && frame) {cancelAnimationFrame(frame); frame = previous = 0;}
  };
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const player = players.find(p => p.root === entry.target)!;
      player.visible = entry.isIntersecting;
      if (player.visible && !player.ready) void player.load(loadFonts()).then(sync);
    }
    sync();
  }, {threshold: .01});
  players.forEach(player => {player.setReduced(reduced.matches); observer.observe(player.root);});
  const changeMotion = () => {players.forEach(p => p.setReduced(reduced.matches)); sync();};
  reduced.addEventListener('change', changeMotion);
  document.addEventListener('visibilitychange', sync);
  sync();
  dispose = () => {
    disposed = true;
    observer.disconnect();
    cancelAnimationFrame(frame);
    players.forEach(p => p.dispose());
    reduced.removeEventListener('change', changeMotion);
    document.removeEventListener('visibilitychange', sync);
  };
}
document.addEventListener('astro:before-swap', () => {dispose?.(); dispose = undefined;});
