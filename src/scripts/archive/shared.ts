export type Frame = HTMLElement;
export const node = (root: ParentNode, id: string) => root.querySelector<HTMLElement>(`[data-node-id="${id}"]`);
export const paragraphs = (root: ParentNode) => [...root.querySelectorAll<HTMLElement>('p')];
export const text = (root: ParentNode, value: string) => paragraphs(root).find(el => el.textContent?.trim() === value);
export const label = (root: ParentNode, value: string) => text(root,value)?.parentElement;

export function control(el: HTMLElement | null | undefined, name: string, action: (event: MouseEvent) => void, signal: AbortSignal) {
  if (!el || el.querySelector(':scope > .archive-hit-target')) return;
  el.dataset.archiveAction = name;
  if (el instanceof HTMLButtonElement) {
    el.type = 'button'; el.ariaLabel = name;
    el.addEventListener('click', event => { event.stopPropagation(); action(event); }, {signal});
    return el;
  }
  if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
  const button = document.createElement('button');
  button.type = 'button'; button.className = 'archive-hit-target'; button.ariaLabel = name;
  button.addEventListener('click', event => { event.stopPropagation(); action(event); }, {signal});
  el.append(button);
  return button;
}
export function toast(stage: Frame, message: string) {
  stage.querySelector('.archive-toast')?.remove();
  const el = document.createElement('div'); el.className = 'archive-toast'; el.setAttribute('role','status'); el.textContent = message;
  stage.append(el);
  setTimeout(()=>el.remove(),2200);
}
export function popover(stage: Frame, anchor: HTMLElement, title: string) {
  stage.querySelector('.archive-popover')?.remove();
  const el = document.createElement('section'); el.className = 'archive-popover'; el.setAttribute('role','dialog'); el.ariaLabel = title;
  const heading = document.createElement('h3'); heading.textContent = title; el.append(heading);
  const a = anchor.getBoundingClientRect(), b = stage.getBoundingClientRect(), scale = b.width / 1024;
  el.style.left = `${Math.max(90,Math.min(1024-335,(a.left-b.left)/scale))}px`;
  el.style.top = `${Math.max(65,Math.min(576-270,(a.bottom-b.top)/scale+8))}px`;
  stage.append(el);
  return el;
}
export function actionRow(parent: HTMLElement, actions: [string,()=>void][]) {
  const row = document.createElement('div'); row.className = 'archive-popover-actions';
  for (const [title,action] of actions) {const b=document.createElement('button'); b.type='button';b.textContent=title;b.addEventListener('click',action);row.append(b);}
  parent.append(row);
}
export function selectGroup(stage: Frame, values: string[], signal: AbortSignal, onChange?: (value: string) => void) {
  for (const value of values) {
    const target=label(stage,value);
    control(target,value,()=>{
      values.forEach(v=>{ const other=label(stage,v); if(other)other.dataset.archiveActive=String(v===value); });
      onChange?.(value);
    },signal);
  }
}

export function input(parent: HTMLElement, name: string, value = '', placeholder = '') {
  const el=document.createElement('input');el.className='archive-input';el.ariaLabel=name;el.value=value;el.placeholder=placeholder;parent.append(el);return el;
}
export {animate} from './motion';
export function localDownload(name: string, content: string, type: string) {
  const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
