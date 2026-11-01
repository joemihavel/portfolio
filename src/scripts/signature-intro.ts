import { createIntroCat } from './intro-cat';

let cleanup: (() => void) | undefined;

export function initializeSignatureIntro() {
  cleanup?.();
  const root = document.documentElement;
  const overlay = document.querySelector<HTMLElement>('#signature-intro');
  const site = document.querySelector<HTMLElement>('.folio-site');
  if (!overlay || !site || !root.classList.contains('folio-intro-active')) return;

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const desktopIntro = matchMedia('(min-width: 701px) and (hover: hover) and (pointer: fine)');
  const controller = new AbortController();
  const {signal} = controller;
  const details = overlay.querySelector<HTMLElement>('.signature-intro-details');
  const cursorHint = overlay.querySelector<HTMLElement>('.intro-cat-speech');
  const speechCopy = cursorHint?.querySelector<HTMLElement>('.intro-cat-speech-copy');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const enterButton = overlay.querySelector<HTMLButtonElement>('[data-intro-enter]');
  const silentButton = overlay.querySelector<HTMLButtonElement>('[data-intro-silent]');
  const paths = [...overlay.querySelectorAll<SVGPathElement>('[data-signature-stroke]')];
  const pen = overlay.querySelector<SVGCircleElement>('[data-signature-pen]');
  const lengths = paths.map(path => path.getTotalLength());
  const totalLength = lengths.reduce((total, length) => total + length, 0);
  const drawingDuration = 1140;
  const penLift = Math.min(14, drawingDuration * .16 / Math.max(1, paths.length - 1));
  const inkDuration = drawingDuration - penLift * (paths.length - 1);
  let cursor = 0;
  const strokes = paths.map((path, index) => {
    const duration = lengths[index] / totalLength * inkDuration;
    const stroke = {path, length: lengths[index], start: cursor, duration};
    cursor += duration + penLift;
    return stroke;
  });
  let frame = 0;
  let holdTimer = 0;
  let hintTimer = 0;
  let hintPositionFrame = 0;
  let idleSpeechTimer = 0;
  let hasPlayed = false;
  let idleSince = 0;
  let lastPointerActivity = 0;
  let hintObserver: MutationObserver | undefined;
  let pointer = {x:innerWidth / 2,y:innerHeight / 2};
  let hintAnchor = {...pointer};
  let hintDismissed = false;
  let finished = false;
  let returnFocus = false;
  let activeStroke = -1;
  let curtain: Animation | undefined;
  let arrival: Animation | undefined;
  let stopCat: (() => void) | undefined;
  const setOverlay = (active: boolean) => document.dispatchEvent(new CustomEvent('folio:overlay', {detail:{active}}));

  const finish = () => {
    if (finished) return;
    finished = true;
    if (cleanup === finish) cleanup = undefined;
    cancelAnimationFrame(frame);
    clearTimeout(holdTimer);
    clearTimeout(hintTimer);
    clearTimeout(idleSpeechTimer);
    cancelAnimationFrame(hintPositionFrame);
    hintObserver?.disconnect();
    clearTimeout(Number(root.dataset.folioIntroFailsafe));
    delete root.dataset.folioIntroFailsafe;
    curtain?.cancel();
    arrival?.cancel();
    stopCat?.();
    root.classList.remove('folio-intro-active');
    site.inert = false;
    const focusWasInside = returnFocus || overlay.contains(document.activeElement);
    overlay.remove();
    controller.abort();
    setOverlay(false);
    if (focusWasInside && document.visibilityState === 'visible') {
      site.querySelector<HTMLElement>('#main-content')?.focus({preventScroll:true});
    }
  };
  cleanup = finish;
  if (!paths.length || !details || !enterButton || !silentButton || reducedMotion.matches || !desktopIntro.matches) { finish(); return; }

  site.inert = true;
  overlay.dataset.introStage = 'writing';
  setOverlay(true);
  overlay.focus({preventScroll:true});
  const dismissHint = () => {
    hintDismissed = true;
    if (cursorHint) cursorHint.hidden = true;
  };
  const positionHint = () => {
    if (!cursorHint) return;
    const cat = overlay.querySelector<HTMLElement>('#oneko');
    if (!cat) return;
    const catBounds = cat.getBoundingClientRect();
    const bounds = cursorHint.getBoundingClientRect();
    const faceX = catBounds.left + catBounds.width * .5;
    const faceY = catBounds.top + catBounds.height * .36;
    let left = faceX + 12;
    let top = faceY - bounds.height + 3;
    let side = 'right';
    if (left + bounds.width > innerWidth - 10) {
      left = faceX - bounds.width - 12;
      side = 'left';
      if (left < 10) {
        left = Math.min(innerWidth - bounds.width - 10, Math.max(10, faceX - bounds.width / 2));
        top = catBounds.top - bounds.height - 6;
        side = 'above';
      }
    }
    cursorHint.dataset.side = side;
    cursorHint.style.left = `${left}px`;
    cursorHint.style.top = `${Math.max(10, Math.min(innerHeight - bounds.height - 10, top))}px`;
  };
  const showSpeech = (message: 'move' | 'idle') => {
    if (!cursorHint || !speechCopy) return;
    if (cursorHint.dataset.message !== message) {
      cursorHint.dataset.message = message;
      speechCopy.textContent = message === 'idle' ? 'tell your cat i said pspsps' : 'move your cursor';
    }
    cursorHint.hidden = false;
    positionHint();
  };
  const updateIdleSpeech = () => {
    if (!hasPlayed || finished || !cursorHint || overlay.dataset.introStage !== 'ready') return;
    const state = overlay.querySelector<HTMLElement>('#oneko')?.dataset.nekoState;
    if (state !== 'idle') {
      idleSince = 0;
      clearTimeout(idleSpeechTimer);
      idleSpeechTimer = 0;
      cursorHint.hidden = true;
      return;
    }
    const now = performance.now();
    if (!idleSince) idleSince = now;
    const remaining = Math.max(idleSince + 600, lastPointerActivity + 650) - now;
    if (remaining > 0) {
      if (!idleSpeechTimer) idleSpeechTimer = window.setTimeout(() => { idleSpeechTimer = 0; updateIdleSpeech(); }, remaining);
      return;
    }
    showSpeech('idle');
  };
  const recordPlay = () => {
    dismissHint();
    if (overlay.dataset.introStage !== 'ready') return;
    hasPlayed = true;
    idleSince = 0;
    lastPointerActivity = performance.now();
    clearTimeout(idleSpeechTimer);
    idleSpeechTimer = window.setTimeout(() => { idleSpeechTimer = 0; updateIdleSpeech(); }, 650);
  };
  overlay.addEventListener('pointermove', event => {
    const distance = Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y);
    pointer = {x:event.clientX,y:event.clientY};
    if (overlay.dataset.introStage === 'ready' && (hasPlayed ? distance > 1 : Math.hypot(pointer.x - hintAnchor.x, pointer.y - hintAnchor.y) > 12)) recordPlay();
  }, {signal,passive:true});
  overlay.addEventListener('pointerdown', recordPlay, {signal,passive:true});
  window.addEventListener('resize', () => {
    cancelAnimationFrame(hintPositionFrame);
    if (cursorHint && !cursorHint.hidden) hintPositionFrame = requestAnimationFrame(positionHint);
  }, {signal,passive:true});
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); enter(false); return; }
    if (event.key === 'Enter' && !event.repeat && (document.activeElement === overlay || document.activeElement === enterButton) && overlay.dataset.introStage === 'ready') {
      event.preventDefault(); enter(true); return;
    }
    if (event.key !== 'Tab') return;
    const controls = [...overlay.querySelectorAll<HTMLButtonElement>('button')].filter(button => !button.closest('[inert]'));
    if (!controls.length) { event.preventDefault(); return; }
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === overlay)) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === overlay)) {
      event.preventDefault(); first.focus();
    }
  }, {signal});
  document.addEventListener('astro:before-preparation', finish, {signal});
  window.addEventListener('pagehide', finish, {once:true,signal});
  reducedMotion.addEventListener('change', event => { if (event.matches) finish(); }, {signal});
  desktopIntro.addEventListener('change', event => { if (!event.matches) finish(); }, {signal});

  const reveal = () => {
    if (finished || overlay.dataset.introStage === 'exit') return;
    cancelAnimationFrame(frame);
    clearTimeout(holdTimer);
    clearTimeout(hintTimer);
    clearTimeout(idleSpeechTimer);
    hintObserver?.disconnect();
    cancelAnimationFrame(hintPositionFrame);
    dismissHint();
    // Skipping while the name is still being written should leave a finished signature.
    paths.forEach(path => { path.style.strokeDashoffset = '0'; path.style.opacity = '1'; });
    stopCat?.();
    returnFocus = overlay.contains(document.activeElement);
    overlay.inert = true;
    overlay.dataset.introStage = 'exit';
    if (pen) pen.style.opacity = '0';
    curtain = overlay.animate([{transform:'translateY(0)'},{transform:'translateY(-100%)'}], {duration:510,easing:'cubic-bezier(.76,0,.24,1)',fill:'forwards'});
    arrival = site.animate([{transform:'translateY(56px)'},{transform:'translateY(0)'}], {duration:510,easing:'cubic-bezier(.22,1,.36,1)',fill:'forwards'});
    void curtain.finished.then(finish, finish);
  };
  const enter = (withAudio: boolean) => {
    if (finished || overlay.dataset.introStage === 'exit') return;
    if (withAudio) enterButton.dataset.pressed = '';
    // Dispatch synchronously within the click / key gesture to unlock browser audio.
    document.dispatchEvent(new CustomEvent('folio:sound-preference', {detail:{enabled:withAudio}}));
    reveal();
  };
  enterButton.addEventListener('click', () => enter(true), {signal});
  silentButton.addEventListener('click', () => enter(false), {signal});
  const showEntrance = () => {
    if (finished) return;
    overlay.dataset.introStage = 'ready';
    details.inert = false;
    hintAnchor = {...pointer};
    // The boot watchdog is only for a failed script, never a time limit on this choice.
    clearTimeout(Number(root.dataset.folioIntroFailsafe));
    delete root.dataset.folioIntroFailsafe;
    stopCat = createIntroCat(overlay);
    const cat = overlay.querySelector('#oneko');
    if (cat) {
      hintObserver = new MutationObserver(() => {
        if (cursorHint && !cursorHint.hidden) positionHint();
        updateIdleSpeech();
      });
      hintObserver.observe(cat, {attributes:true,attributeFilter:['style','data-neko-state']});
    }
    hintTimer = window.setTimeout(() => {
      if (finished || hintDismissed || !finePointer.matches || !cursorHint || overlay.dataset.introStage !== 'ready') return;
      showSpeech('move');
    }, 700);
  };
  const started = performance.now() + 84;
  const draw = (now: number) => {
    if (finished || !root.classList.contains('folio-intro-active')) { finish(); return; }
    const elapsed = now - started;
    if (elapsed >= drawingDuration) {
      paths.forEach(path => { path.style.strokeDashoffset = '0'; path.style.opacity = '1'; });
      if (pen) pen.style.opacity = '0';
      overlay.dataset.introStage = 'written';
      holdTimer = window.setTimeout(showEntrance, 96);
      return;
    }
    let writing = false;
    for (let index = 0; index < strokes.length; index++) {
      const stroke = strokes[index];
      if (elapsed < stroke.start) break;
      const progress = Math.min(1, (elapsed - stroke.start) / stroke.duration);
      if (index >= activeStroke) {
        const eased = progress * progress * (3 - 2 * progress);
        stroke.path.style.opacity = '1';
        stroke.path.style.strokeDashoffset = String(1 - eased);
        if (progress < 1 && pen) {
          const point = stroke.path.getPointAtLength(eased * stroke.length);
          pen.setAttribute('cx', String(point.x)); pen.setAttribute('cy', String(point.y));
          writing = true;
        }
        activeStroke = index;
      }
    }
    if (pen) pen.style.opacity = writing ? '1' : '0';
    frame = requestAnimationFrame(draw);
  };
  frame = requestAnimationFrame(draw);
}
