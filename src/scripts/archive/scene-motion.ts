import {animate, animateNumber, drawChart, enterItems, reducedMotion, traceOutline} from './motion';

type Scene = {play: () => void; finish: () => void};
const node = (stage: HTMLElement, id: string) => stage.querySelector<HTMLElement>(`[data-node-id="${id}"]`);
const elements = (root: HTMLElement | null, selector: string) => root ? [...root.querySelectorAll<HTMLElement>(selector)] : [];

/** The frame stays visible by default. Only measured UI details receive entry motion. */
export function sceneMotion(frame: HTMLElement, stage: HTMLElement, index: number, signal: AbortSignal): Scene {
  let animations: Animation[] = [], finishes: (() => void)[] = [], entered = false;
  const finish = () => {
    animations.forEach(a => { try { a.finish(); } catch {} a.cancel(); });
    finishes.forEach(fn => fn()); animations = []; finishes = [];
  };
  const keep = (items: (Animation | undefined)[]) => animations.push(...items.filter((a): a is Animation => !!a));
  const count = (id: string, delay = 0) => {
    const el = node(stage, id); if (!el) return;
    const final = el.textContent || '', match = final.match(/[\d,]+/); if (!match) return;
    const value = Number(match[0].replaceAll(',',''));
    const format = (n: number) => n === value ? final : final.replace(match[0], n.toLocaleString('en-US'));
    finishes.push(animateNumber(el, value, format, signal, {from:0, duration:360, delay}));
  };
  const play = () => {
    finish(); entered = true;
    if (signal.aborted || reducedMotion()) return;
    stage.dataset.archiveMotionScene = ['payments','kanban','calendar','heatmap','editor','analytics','attendance'][index - 1];
    switch (index) {
      case 1: {
        // Financial hierarchy: balances first, then the transaction timeline.
        count('12:2995', 30); count('12:2998', 65);
        keep(enterItems(elements(node(stage,'12:3002'), ':scope > div').slice(0,5), signal, 26, 3));
        break;
      }
      case 2: {
        // Read status columns left-to-right, then their first visible tasks.
        ['12:3127','12:3255','12:3459'].forEach((id,column) => {
          const cards = elements(node(stage,id), '[data-archive-card]').slice(0,4);
          cards.forEach((card,row) => keep([animate(card, signal,
            [{opacity:0, translate:'0px 5px'}, {opacity:1, translate:'0px 0px'}],
            {duration:260, delay:column*48+row*24, fill:'backwards'}, 'entrance')]));
        });
        break;
      }
      case 3: {
        // Keep the grid still; appointments arrive in reading order.
        const events = elements(node(stage,'12:3819'),'p').filter(p => /^meeting \d+$/i.test(p.textContent?.trim()||'')).map(p=>p.parentElement!);
        keep(enterItems(events, signal, 20, 3));
        break;
      }
      case 4: {
        // Activity populates chronologically across the original heatmap.
        const months = elements(node(stage,'12:3932'),':scope > div');
        keep(enterItems(months,signal,24,0));
        keep(enterItems(elements(node(stage,'12:4344'),':scope > div').slice(1,3), signal, 36, 3));
        break;
      }
      case 5: {
        // Establish the selected block, then reveal its property controls.
        const selected = node(stage,'12:5323');
        if (selected) keep([traceOutline(stage,selected,signal)]);
        keep(enterItems(elements(node(stage,'12:5338'),':scope > div').slice(0,3),signal,40,3));
        break;
      }
      case 6: keep([drawChart(stage,signal)]); break;
      case 7: {
        // Workforce overview: summary totals, then employee records.
        ['12:5975','12:5979','12:5984','12:5989','12:5994'].forEach((id,i)=>count(id,i*22));
        const rows = elements(node(stage,'12:5997'), ':scope > div').slice(1).filter(row=>row.querySelector('img')).slice(0,5);
        keep(enterItems(rows,signal,24,3));
        break;
      }
    }
  };
  // First click/keypress completes the introduction before any real data changes.
  stage.addEventListener('pointerdown',finish,{signal,capture:true});
  stage.addEventListener('keydown',finish,{signal,capture:true});
  const observer = new IntersectionObserver(entries => {
    if (!entered && entries.some(entry=>entry.isIntersecting && entry.intersectionRatio >= .16)) {
      observer.disconnect(); play();
    }
  }, {threshold:.16});
  observer.observe(frame);
  signal.addEventListener('abort',()=>{observer.disconnect();finish();},{once:true});
  return {play, finish};
}
