import {drawChart, reflow} from './motion';
import {node,label,paragraphs,control,popover,animate,type Frame} from './shared';
export function productivity(stage: Frame,signal: AbortSignal) {
 const table=node(stage,'12:5584')!;const rows=[...node(stage,'12:5596')!.children] as HTMLElement[];
 const statuses=['ALL','PENDING','TO DO','IN PROGRESS','IN REVIEW','DONE','OVERDUE'];
 const status=(row: HTMLElement)=>paragraphs(row).find(p=>statuses.slice(1).includes(p.textContent?.trim()||''));
 const filters=node(stage,'12:5554') || label(stage,'ALL')!.parentElement!;
 statuses.forEach(value=>{const p=paragraphs(filters).find(p=>p.textContent?.trim()===value);control(p?.parentElement,`Filter ${value.toLowerCase()}`,()=>{reflow(stage,rows,()=>rows.forEach(row=>row.classList.toggle('archive-hidden',value!=='ALL'&&status(row)?.textContent?.trim()!==value)),signal);paragraphs(filters).filter(p=>statuses.includes(p.textContent?.trim()||'')).forEach(p=>p.parentElement!.dataset.archiveActive=String(p.textContent?.trim()===value));},signal);});
 rows.forEach(row=>{const p=status(row);if(!p)return;control(p.parentElement,'Change task status',()=>{const panel=popover(stage,p,'Task status');statuses.slice(1).forEach(value=>{const b=document.createElement('button');b.type='button';b.textContent=value;b.style.cssText='display:block;margin-top:5px;width:100%;text-align:left';b.onclick=()=>{p.textContent=value;panel.remove();animate(row,signal,[{opacity:.4},{opacity:1}]);};panel.append(b);});},signal);});
 table.style.maxHeight='300px';table.setAttribute('data-lenis-prevent','');
 const chart=node(stage,'12:5548')!;chart.dataset.archiveChart='';
 const marker=document.createElement('div');marker.className='archive-chart-cursor archive-hidden';const tooltip=document.createElement('span');marker.append(tooltip);chart.append(marker);
 const path=chart.querySelector<SVGPathElement>('path');
 chart.addEventListener('pointermove',event=>{const rect=chart.getBoundingClientRect();const fraction=Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width));const x=fraction*534.219;let y=75;
   if(path){let lo=0,hi=path.getTotalLength();for(let n=0;n<16;n++){const mid=(lo+hi)/2;const point=path.getPointAtLength(mid);if(point.x<x)lo=mid;else hi=mid;}y=path.getPointAtLength((lo+hi)/2).y;}
   marker.classList.remove('archive-hidden');marker.style.left=`${fraction*100}%`;tooltip.textContent=`${Math.round((1-y/154.768)*1000)} tasks`;tooltip.style.top=`${y}px`;
 },{signal});chart.addEventListener('pointerleave',()=>marker.classList.add('archive-hidden'),{signal});
 const year=paragraphs(stage).find(p=>p.textContent?.trim()==='2024');control(year?.parentElement,'Choose year',()=>{const panel=popover(stage,year!,'Year');for(const value of ['2023','2024','2025']){const b=document.createElement('button');b.type='button';b.textContent=value;b.onclick=()=>{year!.textContent=value;drawChart(stage,signal);panel.remove();};panel.append(b);}},signal);

}
