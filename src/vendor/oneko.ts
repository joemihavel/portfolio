/*! @license MIT
Copyright © 2022 adryd

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
/**
 * oneko.js by adryd — MIT, see licenses/oneko-MIT.txt.
 * Vendored from https://github.com/adryd325/oneko.js/tree/5281d057c4ea9bd4f6f997ee96ba30491aed16c0
 *
 * The original sprite map, movement/idle algorithms, and 100ms timing are retained.
 * Integration changes: exported mount/cleanup, intro-local pointer listeners,
 * initial placement, no saved positions, touch input, resize bounds, uniform scale,
 * and a rendered-state attribute for the intro's speech bubble.
 */
export function mountOneko(container: HTMLElement, spriteUrl: string, spriteScale = 1, startY = innerHeight / 2) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};
  const controller = new AbortController();
  const {signal} = controller;
  const nekoEl = document.createElement('div');
  let disposed = false;
  let animationFrame = 0;
  const nekoSize = 32 * spriteScale;
  const nekoRadius = nekoSize / 2;
  let nekoPosX = innerWidth / 2;
  let nekoPosY = Math.max(nekoRadius, Math.min(innerHeight - nekoRadius, startY));
  let mousePosX = nekoPosX;
  let mousePosY = nekoPosY;
  let frameCount = 0;
  let idleTime = 0;
  let idleAnimation: string | null = null;
  let idleAnimationFrame = 0;
  const nekoSpeed = 10 * spriteScale;
  const spriteSets: Record<string, number[][]> = {
    idle: [[-3, -3]],
    alert: [[-7, -3]],
    scratchSelf: [
      [-5, 0],
      [-6, 0],
      [-7, 0],
    ],
    scratchWallN: [
      [0, 0],
      [0, -1],
    ],
    scratchWallS: [
      [-7, -1],
      [-6, -2],
    ],
    scratchWallE: [
      [-2, -2],
      [-2, -3],
    ],
    scratchWallW: [
      [-4, 0],
      [-4, -1],
    ],
    tired: [[-3, -2]],
    sleeping: [
      [-2, 0],
      [-2, -1],
    ],
    N: [
      [-1, -2],
      [-1, -3],
    ],
    NE: [
      [0, -2],
      [0, -3],
    ],
    E: [
      [-3, 0],
      [-3, -1],
    ],
    SE: [
      [-5, -1],
      [-5, -2],
    ],
    S: [
      [-6, -3],
      [-7, -2],
    ],
    SW: [
      [-5, -3],
      [-6, -1],
    ],
    W: [
      [-4, -2],
      [-4, -3],
    ],
    NW: [
      [-1, 0],
      [-1, -1],
    ],
  };

  function init() {
    nekoEl.id = 'oneko';
    nekoEl.ariaHidden = 'true';
    nekoEl.style.width = `${nekoSize}px`;
    nekoEl.style.height = `${nekoSize}px`;
    nekoEl.style.position = 'fixed';
    nekoEl.style.pointerEvents = 'none';
    nekoEl.style.imageRendering = 'pixelated';
    nekoEl.style.left = `${nekoPosX - nekoRadius}px`;
    nekoEl.style.top = `${nekoPosY - nekoRadius}px`;
    nekoEl.style.zIndex = '2147483647';
    nekoEl.style.backgroundImage = `url(${spriteUrl})`;
    nekoEl.style.backgroundSize = `${256 * spriteScale}px ${128 * spriteScale}px`;
    setSprite('idle', 0);
    container.appendChild(nekoEl);
    const follow = (event: PointerEvent) => {
      mousePosX = event.clientX;
      mousePosY = event.clientY;
    };
    const overlay = container.closest<HTMLElement>('.signature-intro') || container;
    overlay.addEventListener('pointermove', follow, {signal,passive:true});
    overlay.addEventListener('pointerdown', follow, {signal,passive:true});
    window.addEventListener('resize', () => {
      nekoPosX = Math.min(Math.max(nekoRadius, nekoPosX), innerWidth - nekoRadius);
      nekoPosY = Math.min(Math.max(nekoRadius, nekoPosY), innerHeight - nekoRadius);
      mousePosX = Math.min(Math.max(nekoRadius, mousePosX), innerWidth - nekoRadius);
      mousePosY = Math.min(Math.max(nekoRadius, mousePosY), innerHeight - nekoRadius);
      nekoEl.style.left = `${nekoPosX - nekoRadius}px`;
      nekoEl.style.top = `${nekoPosY - nekoRadius}px`;
    }, {signal,passive:true});
    animationFrame = requestAnimationFrame(onAnimationFrame);
  }

  let lastFrameTimestamp: number | undefined;

  function onAnimationFrame(timestamp: number) {
    // Stops execution if the neko element is removed from DOM
    if (disposed || !nekoEl.isConnected) {
      return;
    }
    if (!lastFrameTimestamp) {
      lastFrameTimestamp = timestamp;
    }
    if (timestamp - lastFrameTimestamp > 100) {
      lastFrameTimestamp = timestamp;
      frame();
    }
    animationFrame = window.requestAnimationFrame(onAnimationFrame);
  }

  function setSprite(name: string, frame: number) {
    const sprite = spriteSets[name][frame % spriteSets[name].length];
    nekoEl.style.backgroundPosition = `${sprite[0] * nekoSize}px ${sprite[1] * nekoSize}px`;
    if (nekoEl.dataset.nekoState !== name) nekoEl.dataset.nekoState = name;
  }

  function resetIdleAnimation() {
    idleAnimation = null;
    idleAnimationFrame = 0;
  }

  function idle() {
    idleTime += 1;

    // every ~ 20 seconds
    if (
      idleTime > 10 &&
      Math.floor(Math.random() * 200) == 0 &&
      idleAnimation == null
    ) {
      let avalibleIdleAnimations = ["sleeping", "scratchSelf"];
      if (nekoPosX < nekoSize) {
        avalibleIdleAnimations.push("scratchWallW");
      }
      if (nekoPosY < nekoSize) {
        avalibleIdleAnimations.push("scratchWallN");
      }
      if (nekoPosX > window.innerWidth - nekoSize) {
        avalibleIdleAnimations.push("scratchWallE");
      }
      if (nekoPosY > window.innerHeight - nekoSize) {
        avalibleIdleAnimations.push("scratchWallS");
      }
      idleAnimation =
        avalibleIdleAnimations[
          Math.floor(Math.random() * avalibleIdleAnimations.length)
        ];
    }

    switch (idleAnimation) {
      case "sleeping":
        if (idleAnimationFrame < 8) {
          setSprite("tired", 0);
          break;
        }
        setSprite("sleeping", Math.floor(idleAnimationFrame / 4));
        if (idleAnimationFrame > 192) {
          resetIdleAnimation();
        }
        break;
      case "scratchWallN":
      case "scratchWallS":
      case "scratchWallE":
      case "scratchWallW":
      case "scratchSelf":
        setSprite(idleAnimation, idleAnimationFrame);
        if (idleAnimationFrame > 9) {
          resetIdleAnimation();
        }
        break;
      default:
        setSprite("idle", 0);
        return;
    }
    idleAnimationFrame += 1;
  }

  function frame() {
    frameCount += 1;
    const diffX = nekoPosX - mousePosX;
    const diffY = nekoPosY - mousePosY;
    const distance = Math.sqrt(diffX ** 2 + diffY ** 2);

    if (distance < nekoSpeed || distance < 48 * spriteScale) {
      idle();
      return;
    }

    idleAnimation = null;
    idleAnimationFrame = 0;

    if (idleTime > 1) {
      setSprite("alert", 0);
      // count down after being alerted before moving
      idleTime = Math.min(idleTime, 7);
      idleTime -= 1;
      return;
    }

    let direction;
    direction = diffY / distance > 0.5 ? "N" : "";
    direction += diffY / distance < -0.5 ? "S" : "";
    direction += diffX / distance > 0.5 ? "W" : "";
    direction += diffX / distance < -0.5 ? "E" : "";
    setSprite(direction, frameCount);

    nekoPosX -= (diffX / distance) * nekoSpeed;
    nekoPosY -= (diffY / distance) * nekoSpeed;

    nekoPosX = Math.min(Math.max(nekoRadius, nekoPosX), window.innerWidth - nekoRadius);
    nekoPosY = Math.min(Math.max(nekoRadius, nekoPosY), window.innerHeight - nekoRadius);

    nekoEl.style.left = `${nekoPosX - nekoRadius}px`;
    nekoEl.style.top = `${nekoPosY - nekoRadius}px`;
  }

  init();
  return () => {
    disposed = true;
    cancelAnimationFrame(animationFrame);
    controller.abort();
    nekoEl.remove();
  };
}
