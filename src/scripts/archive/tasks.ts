import {animateNumber, reflow} from './motion';
import {node,text,label,paragraphs,control,popover,actionRow,input,type Frame} from './shared';
export function tasks(stage: Frame,signal: AbortSignal) {
  const board=node(stage,'12:3126')!;
  const columns=['12:3127','12:3255','12:3459'].map(id=>node(stage,id)!);
  const lists=['12:3132','12:3260','12:3464'].map(id=>node(stage,id)!);
  const counts=['12:3131','12:3259','12:3463'].map(id=>node(stage,id)!);
  let dragged: HTMLElement | null=null;
  const statusIcons=lists.map(list=>list.querySelector<HTMLImageElement>(':scope > div:first-child > div:first-child img')?.src);
  const allCards=()=>[...stage.querySelectorAll<HTMLElement>('[data-archive-card]')];
  const update=()=>lists.forEach((list,i)=>animateNumber(counts[i],list.querySelectorAll('[data-archive-card]').length,String,signal,{duration:180}));
  const move=(card: HTMLElement,to: number)=>reflow(stage,allCards(),()=>{lists[to].prepend(card);const status=card.querySelector<HTMLElement>(':scope > div:first-child');if(status){status.style.color=['#a6a6a6','#3f8ae2','#2c9a4b'][to];const icon=status.querySelector('img');if(icon&&statusIcons[to])icon.src=statusIcons[to]!;}card.style.backgroundColor=['rgba(42,42,42,.16)','rgba(2,121,187,.04)','rgba(44,154,75,.04)'][to];update();},signal);
  const wire=(card: HTMLElement)=>{
    card.dataset.archiveCard='';card.draggable=true;
    card.addEventListener('dragstart',event=>{dragged=card;card.classList.add('is-dragging');event.dataTransfer?.setData('text/plain','task');},{signal});
    card.addEventListener('dragend',()=>{card.classList.remove('is-dragging');columns.forEach(col=>col.classList.remove('is-drop-target'));dragged=null;},{signal});
    const title=paragraphs(card).find(p=>p.textContent?.trim()&&!p.textContent.includes('JM'))!;
    title.dataset.archiveTaskTitle='';
    control(title.parentElement,`Edit task: ${title.textContent?.trim()}`,()=>{
      const panel=popover(stage,title,'Task');const field=input(panel,'Task title',title.textContent?.trim());
      const select=document.createElement('select');select.className='archive-input';select.ariaLabel='Task status';['Pending','In progress','Done'].forEach((name,i)=>select.add(new Option(name,String(i))));select.value=String(lists.findIndex(l=>l.contains(card)));panel.append(select);
      actionRow(panel,[['Cancel',()=>panel.remove()],['Save',()=>{if(!field.value.trim())return;title.textContent=field.value.trim().slice(0,80);move(card,Number(select.value));panel.remove();}]]);
    },signal);
    const icon=card.firstElementChild as HTMLElement;
    control(icon,'Move task to next status',()=>move(card,(lists.findIndex(l=>l.contains(card))+1)%3),signal);
  };
  lists.forEach((list,i)=>{
    [...list.children].forEach(card=>wire(card as HTMLElement));
    columns[i].dataset.archiveColumn=String(i);
    columns[i].addEventListener('dragover',event=>{event.preventDefault();columns[i].classList.add('is-drop-target');},{signal});
    columns[i].addEventListener('dragleave',()=>columns[i].classList.remove('is-drop-target'),{signal});
    columns[i].addEventListener('drop',event=>{event.preventDefault();columns[i].classList.remove('is-drop-target');if(dragged)move(dragged,i);},{signal});
  });
  const create=(anchor: HTMLElement)=>{const panel=popover(stage,anchor,'New task');const field=input(panel,'Task title','','Task title');actionRow(panel,[['Cancel',()=>panel.remove()],['Create',()=>{if(!field.value.trim())return;const card=lists[0].firstElementChild!.cloneNode(true) as HTMLElement;card.querySelectorAll('button').forEach(b=>b.remove());card.querySelectorAll('[data-archive-action]').forEach(e=>e.removeAttribute('data-archive-action'));card.querySelector<HTMLElement>('[data-archive-task-title]')!.textContent=field.value.trim().slice(0,80);card.querySelectorAll('[data-node-id]').forEach(el=>el.removeAttribute('data-node-id'));card.removeAttribute('data-node-id');reflow(stage,[card,...allCards()],()=>{lists[0].prepend(card);wire(card);update();},signal);panel.remove();}]]);field.focus();};
  control(label(stage,'Create New'),'Create task',()=>create(label(stage,'Create New')!),signal);
  stage.querySelectorAll<HTMLElement>('[data-node-id="12:3253"],[data-node-id="12:3457"],[data-node-id="12:3589"]').forEach(el=>control(el,'Add task',()=>create(el),signal));
  control(label(stage,'List View'),'List view',()=>reflow(stage,allCards(),()=>{board.classList.add('archive-list-view');lists.forEach(list=>list.style.maxHeight='none');board.parentElement!.style.overflowY='auto';board.parentElement!.style.maxHeight='400px';},signal),signal);
  control(label(stage,'Board View'),'Board view',()=>reflow(stage,allCards(),()=>{board.classList.remove('archive-list-view');lists.forEach(list=>list.style.maxHeight='');board.parentElement!.style.overflowY='';board.parentElement!.style.maxHeight='';},signal),signal);
  const search=text(stage,'Search..');if(search){const field=input(search.parentElement!,'Search tasks','','Search..');field.classList.add('archive-search-tasks');search.replaceWith(field);field.addEventListener('input',()=>reflow(stage,allCards(),()=>lists.forEach(list=>list.querySelectorAll<HTMLElement>('[data-archive-card]').forEach(card=>card.classList.toggle('archive-hidden',!card.textContent?.toLowerCase().includes(field.value.toLowerCase())))),signal),{signal});}
}
