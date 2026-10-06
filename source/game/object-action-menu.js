import {actionIconSvg,createContextualActionMenu} from './contextual-action-menu.js';
import {interactionIdentity} from './player-interaction-intents.js';

const overlaps=(a,b,gap=4)=>a.left<b.right+gap&&a.right>b.left-gap&&a.top<b.bottom+gap&&a.bottom>b.top-gap;
const write=(el,key,value)=>{if(el.style[key]!==value)el.style[key]=value;};
const hide=(el,value)=>{if(el.hidden!==value)el.hidden=value;};
// One object chooser, shared by every provider. Rows dispatch their original
// intent; this layer never buys, reserves, cancels, or chooses another actor.
export function createObjectActionMenu({button,root,document:doc=globalThis.document,onSelect,onOpen=()=>{},onClose=()=>{},resolveAnchor,projectAnchor,validate,layout,maxTargets=8}){
 const make=(tag,cls)=>{const el=doc.createElement(tag);el.className=cls;return el;};
 const layer=make('div','object-action-layer'),popover=make('div','object-action-popover'),heading=make('div','context-action-heading'),title=make('h2',''),closeButton=make('button','context-action-close'),list=make('div','context-action-list');
 layer.setAttribute('aria-label','附近物品和人物');popover.setAttribute('role','dialog');popover.setAttribute('aria-label','选择对象互动');popover.hidden=true;closeButton.type='button';closeButton.innerHTML=actionIconSvg('close');closeButton.setAttribute('aria-label','关闭互动选择');heading.append(title,closeButton);popover.append(heading,list);layer.append(popover);root.append(layer);
 let records=new Map(),all=[],active=null,signature='',generation=0,hidden=true,disposed=false;
 const controls=createContextualActionMenu({button,document:doc,onSelect,onOpen:()=>{close();onOpen();},onClose});
 function close(){if(!active)return;active=null;signature='';generation++;hide(popover,true);onClose();}
 function current(record,action){const live=records.get(record.id);return live===record&&live.visible&&live.actions.find(a=>interactionIdentity(a)===interactionIdentity(action));}
 function select(record,action){const live=current(record,action);if(!live||!validate(live,record.anchor))return false;close();controls.close();hide(record.button,true);record.visible=false;record.consumed=true;return onSelect(live);}
 function render(record){const next=record.actions.map(a=>[interactionIdentity(a),a.action].join('\u001f')).join('\u001e');if(next===signature)return;signature=next;generation++;const token=generation,scroll=list.scrollTop,focus=doc.activeElement?.getAttribute?.('data-context-action');let restore=null;list.replaceChildren();title.textContent=record.name;
  for(const action of record.actions){const row=make('button','context-action-row'),icon=make('span','context-action-icon'),text=make('span','');row.type='button';text.textContent=action.action||'互动';icon.innerHTML=actionIconSvg(action.social?'chat':'hand');row.setAttribute('data-context-action',interactionIdentity(action));row.append(icon,text);row.onclick=()=>{if(active===record.id&&token===generation&&!row.disabled)select(record,action);};list.append(row);if(focus===interactionIdentity(action))restore=row;}
  restore?.focus?.({preventScroll:true});if(list.scrollTop!==scroll)list.scrollTop=scroll;
 }
 function activate(record){if(!record||!record.visible||record.consumed||hidden)return false;if(record.actions.length===1)return select(record,record.actions[0]);controls.close();if(active===record.id){close();return true;}close();active=record.id;onOpen();render(record);hide(popover,false);project();return true;}
 function update(next,{hidden:suppressed=false}={}){
  all=next.filter(a=>a&&!a.menuHidden);hidden=suppressed;const ongoing=all.filter(a=>a.contextControl||a.continuation||a.playerService&&['stop','stand'].includes(a.serviceStep?.kind));controls.update(ongoing,{hidden:suppressed||!!active});
  const groups=new Map();for(const action of all){if(ongoing.includes(action)||action.furniture&&action.kind==='seat')continue;const anchor=resolveAnchor(action);if(!anchor)continue;let group=groups.get(anchor.id);if(!group){if(groups.size>=maxTargets)continue;group={id:anchor.id,anchor,name:anchor.actor?.station?.npcName||action.targetName||action.name||'互动',actions:[]};groups.set(anchor.id,group);}group.actions.push(action);}
  for(const [id,record]of records)if(!groups.has(id)){if(active===id)close();record.button.remove();records.delete(id);}
  for(const [id,group]of groups){let record=records.get(id);if(!record){const el=make('button','object-action-icon');el.type='button';el.hidden=true;el.dataset.objectTarget=id;layer.append(el);record={...group,button:el,visible:false,consumed:false};records.set(id,record);el.onclick=()=>activate(record);}else{record.anchor=group.anchor;record.actions=group.actions;record.name=group.name;record.consumed=false;}
   const label=group.name+' · '+(group.actions.length>1?'选择互动':group.actions[0].action||'互动'),kind=group.anchor.kind;
   if(record.button.dataset.actionIcon!==kind){record.button.innerHTML=actionIconSvg(kind);record.button.dataset.actionIcon=kind;}if(record.button.getAttribute('aria-label')!==label){record.button.setAttribute('aria-label',label);record.button.title=label;}record.button.setAttribute('aria-expanded',String(active===id));if(active===id)render(record);
  }
  if(hidden){close();for(const record of records.values()){hide(record.button,true);record.visible=false;}}
 }
 function project(){if(disposed)return;const frame=layout.frame(),hud=layout.rects(),used=[];
  for(const record of records.values()){
   const point=!hidden&&!record.consumed&&projectAnchor(record.anchor,record.actions[0]);let chosen=null;
   if(point?.visible){const shifts=point.nameRect?[(point.nameRect.right-point.x)+25,(point.nameRect.left-point.x)-25]:[0,36,-36];for(const dx of shifts){const x=Math.round(point.x+dx),y=Math.round(point.y),rect={left:x-22,right:x+22,top:y-22,bottom:y+22};if(rect.left<frame.left||rect.right>frame.right||rect.top<frame.top||rect.bottom>frame.bottom||hud.some(h=>overlaps(rect,h))||used.some(h=>overlaps(rect,h))||point.nameRect&&overlaps(rect,point.nameRect))continue;chosen={x,y,rect};break;}}
   record.visible=!!chosen;hide(record.button,!chosen||!!active);if(!chosen){if(active===record.id)close();continue;}record.projected=chosen;used.push(chosen.rect);write(record.button,'left',chosen.x+'px');write(record.button,'top',chosen.y+'px');
   if(active===record.id){const width=Math.min(280,frame.right-frame.left),height=Math.min(52+record.actions.length*46,frame.bottom-frame.top);let x=Math.min(frame.right-width,Math.max(frame.left,chosen.x+28)),y=Math.min(frame.bottom-height,Math.max(frame.top,chosen.y-height/2));const attempts=[{x,y},{x:chosen.x-width-28,y},{x:Math.min(frame.right-width,Math.max(frame.left,chosen.x-width/2)),y:chosen.y+28},{x:Math.min(frame.right-width,Math.max(frame.left,chosen.x-width/2)),y:chosen.y-height-28}];const place=attempts.find(p=>p.x>=frame.left&&p.x+width<=frame.right&&p.y>=frame.top&&p.y+height<=frame.bottom&&!hud.some(h=>overlaps({left:p.x,right:p.x+width,top:p.y,bottom:p.y+height},h)))||attempts[0];write(popover,'left',Math.round(place.x)+'px');write(popover,'top',Math.round(place.y)+'px');write(popover,'width',width+'px');write(popover,'maxHeight',(frame.bottom-place.y)+'px');}
  }
 }
 closeButton.onclick=close;doc.addEventListener('keydown',e=>{if(e.code==='Escape'&&active){e.preventDefault();close();}});
 return {update,project,close(){close();controls.close();},isOpen:()=>!!active||controls.isOpen(),actions:()=>all.slice(),activate(){if(controls.actions().length)return controls.activate();return activate([...records.values()].find(r=>r.visible));},activateTarget(id){return activate(records.get(id));},targets:()=>[...records.values()],dispose(){disposed=true;close();controls.dispose();layer.remove();}};
}
