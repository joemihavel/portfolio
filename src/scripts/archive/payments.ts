import {animateNumber, reflow} from './motion';
import {node,label,control,popover,actionRow,input,animate,type Frame} from './shared';
export function payments(stage: Frame,signal: AbortSignal) {
  const names=['Instalment 1','Equipment Repair','Hotel Rent','Video Wall','Drone Coverage'];
  const list=node(stage,'12:3002')!;const rows=[...list.children].slice(0,5) as HTMLElement[];
  const paid=new Set([4]);let filter='all';const iconSources=rows.map(row=>row.querySelector<HTMLImageElement>('img')?.src);
  const applyFilter=()=>reflow(stage,rows,()=>rows.forEach((row,i)=>row.classList.toggle('archive-hidden',filter==='paid'?!paid.has(i):filter==='unpaid'?paid.has(i):false)),signal);
  const summary=()=>{const currency=(n:number)=>`₹ ${n.toLocaleString('en-IN')}`;animateNumber(node(stage,'12:2995'),123456+(paid.size-1)*123456,currency,signal);animateNumber(node(stage,'12:2998'),Math.max(0,123456-(paid.size-1)*123456),currency,signal);};
  names.forEach((name,i)=>{const target=label(stage,name)!;control(target,`View ${name}`,()=>{
    const panel=popover(stage,target,name);const desc=document.createElement('p');desc.textContent=`₹ 123,456 · ${paid.has(i)?'Paid':'Awaiting payment'}`;panel.append(desc);
    actionRow(panel,[['Close',()=>panel.remove()],[paid.has(i)?'Mark unpaid':'Mark paid',()=>{paid.has(i)?paid.delete(i):paid.add(i);const title=target.querySelector('p');if(title)title.style.color=paid.has(i)?'#4aa764':'';const icon=rows[i].querySelector<HTMLImageElement>('img');if(icon)icon.src=(paid.has(i)?iconSources[4]:iconSources[i])||icon.src;target.dataset.paid=String(paid.has(i));summary();applyFilter();animate(icon,signal,[{opacity:.3,scale:'.8'},{opacity:1,scale:'1'}],{duration:180});panel.remove();}]]);
  },signal);});
  control(node(stage,'12:2993'),'Filter paid payments',()=>{filter=filter==='paid'?'all':'paid';applyFilter();},signal);
  control(node(stage,'12:2996'),'Filter unpaid payments',()=>{filter=filter==='unpaid'?'all':'unpaid';applyFilter();},signal);
  control(label(stage,'Show (12) more'),'Show more payments',()=>{
    const panel=popover(stage,label(stage,'Show (12) more')!,'Payments');
    names.forEach((name,i)=>{const b=document.createElement('button');b.type='button';b.textContent=`${name} · ${paid.has(i)?'Paid':'Unpaid'}`;b.style.cssText='display:block;width:100%;text-align:left;margin-top:6px';b.onclick=()=>{panel.remove();(label(stage,name)?.querySelector('button') as HTMLButtonElement)?.click();};panel.append(b);});
  },signal);
  control(label(stage,'Share Invite'),'Share invite',()=>{const panel=popover(stage,label(stage,'Share Invite')!,'Share invite');input(panel,'Workspace invitation',location.href);actionRow(panel,[['Close',()=>panel.remove()],['Copy',async()=>{try{await navigator.clipboard.writeText(location.href);panel.querySelector('h3')!.textContent='Invite copied';}catch{panel.querySelector('input')?.select();}}]]);},signal);
  control(label(stage,'Create Workspace'),'Create workspace',()=>{const panel=popover(stage,label(stage,'Create Workspace')!,'Create workspace');const field=input(panel,'Workspace name','','Workspace name');actionRow(panel,[['Cancel',()=>panel.remove()],['Create',()=>{if(!field.value.trim())return;node(stage,'12:2990')!.textContent=field.value.trim().slice(0,50);panel.remove();}]]);field.focus();},signal);
  list.dataset.archivePaymentList='';
}
