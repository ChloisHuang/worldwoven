import {actionIconSvg,createContextualActionMenu} from './contextual-action-menu.js';
import {interactionIdentity,interactionIcon,interactionCategory} from './player-interaction-intents.js';
import {isObjectlessInteraction} from '../../game/object-interaction-anchors.js';

const overlaps=(a,b,gap=4)=>a.left<b.right+gap&&a.right>b.left-gap&&a.top<b.bottom+gap&&a.bottom>b.top-gap;
const write=(el,key,value)=>{if(el.style[key]!==value)el.style[key]=value;};
const hide=(el,value)=>{if(el.hidden!==value)el.hidden=value;};
// One object chooser, shared by every provider. Rows dispatch their original
// intent; this layer never buys, reserves, cancels, or chooses another actor.
export function createObjectActionMenu({button,root,document:doc=globalThis.document,onSelect,onOpen=()=>{},onClose=()=>{},resolveAnchor,projectAnchor,validate,layout,maxTargets=8,getGamepads=()=>{try{return globalThis.navigator?.getGamepads?.()||[];}catch{return [];}}}){
 const make=(tag,cls)=>{const el=doc.createElement(tag);el.className=cls;return el;};
 const layer=make('div','object-action-layer'),popover=make('div','object-action-popover'),heading=make('div','context-action-heading'),title=make('h2',''),closeButton=make('button','context-action-close'),list=make('div','context-action-list');
 layer.setAttribute('aria-label','附近物品和人物');popover.setAttribute('role','dialog');popover.setAttribute('aria-label','选择对象互动');popover.hidden=true;closeButton.type='button';closeButton.innerHTML=actionIconSvg('close');closeButton.setAttribute('aria-label','关闭互动选择');heading.append(title,closeButton);popover.append(heading,list);layer.append(popover);root.append(layer);
 let records=new Map(),all=[],active=null,signature='',generation=0,hidden=true,disposed=false,selectedId=null,menuPlace=null,rows=[],gamepadDown=new Set();
 const controls=createContextualActionMenu({button,document:doc,onSelect,onOpen:()=>{close();onOpen();},onClose});
 function close(){if(!active)return;active=null;menuPlace=null;signature='';generation++;hide(popover,true);onClose();}
 function current(record,action){const live=records.get(record.id);return live===record&&live.visible&&live.actions.find(a=>interactionIdentity(a)===interactionIdentity(action));}
 function select(record,action){const live=current(record,action);if(!live||!validate(live,record.anchor))return false;close();controls.close();hide(record.button,true);record.visible=false;record.consumed=true;return onSelect(live);}
 function render(record){const next=record.actions.map(a=>[interactionIdentity(a),a.action,a.status].join('\u001f')).join('\u001e');if(next===signature)return;signature=next;generation++;const token=generation,scroll=list.scrollTop,focus=doc.activeElement?.getAttribute?.('data-context-action');let restore=null;list.replaceChildren();rows=[];title.textContent=record.name;
  const groups=new Map();for(const action of record.actions){const category=interactionCategory(action);if(!groups.has(category))groups.set(category,[]);groups.get(category).push(action);}
  for(const [category,actions]of groups){const section=make('section','context-action-group'),label=make('h3','');label.textContent=category;section.append(label);
   for(const action of actions){const row=make('button','context-action-row'),icon=make('span','context-action-icon'),text=make('span','object-action-copy'),label=make('span','object-action-label');row.type='button';label.textContent=action.action||'互动';text.append(label);if(action.status){const note=make('small','');note.textContent=action.status;text.append(note);}icon.innerHTML=actionIconSvg(interactionIcon(action));row.setAttribute('data-context-action',interactionIdentity(action));row.append(icon,text);row.onclick=()=>{if(active===record.id&&token===generation&&!row.disabled)select(record,action);};section.append(row);rows.push(row);if(focus===interactionIdentity(action))restore=row;}list.append(section);
  }
  restore?.focus?.({preventScroll:true});if(list.scrollTop!==scroll)list.scrollTop=scroll;
 }
 function activate(record){if(!record||records.get(record.id)!==record||!record.visible||record.consumed||hidden)return false;if(record.actions.length===1)return select(record,record.actions[0]);controls.close();if(active===record.id){close();return true;}close();if(onOpen(record)===false)return false;active=record.id;selectedId=record.id;render(record);hide(popover,false);project();rows[0]?.focus?.({preventScroll:true});return true;}
 function update(next,{hidden:suppressed=false}={}){
  all=next.filter(a=>a&&!a.menuHidden);hidden=suppressed;const ongoing=all.filter(a=>isObjectlessInteraction(a)||a.playerService&&['stop','stand'].includes(a.serviceStep?.kind));controls.update(ongoing,{hidden:suppressed||!!active});
  const groups=new Map();for(const action of all){if(ongoing.includes(action)||action.furniture&&action.kind==='seat')continue;const anchor=resolveAnchor(action);if(!anchor)continue;let group=groups.get(anchor.id);if(!group){group={id:anchor.id,anchor,name:anchor.actor?.station?.npcName||action.targetName||action.name||'互动',actions:[]};groups.set(anchor.id,group);}group.actions.push(action);}
  const retained=[...records.keys()].filter(id=>groups.has(id)),order=[...retained,...groups.keys()].filter((id,i,a)=>a.indexOf(id)===i).slice(0,maxTargets);for(const id of [...groups.keys()])if(!order.includes(id))groups.delete(id);
  for(const [id,record]of records)if(!groups.has(id)){if(active===id)close();record.button.remove();records.delete(id);}
  for(const [id,group]of groups){let record=records.get(id);if(!record){const el=make('button','object-action-icon');el.type='button';el.hidden=true;el.dataset.objectTarget=id;layer.append(el);record={...group,button:el,visible:false,consumed:false};records.set(id,record);el.onclick=()=>activate(record);}else{record.anchor=group.anchor;const remaining=new Map(group.actions.map(a=>[interactionIdentity(a),a]));record.actions=record.actions.flatMap(a=>{const key=interactionIdentity(a),next=remaining.get(key);remaining.delete(key);return next?[next]:[];}).concat([...remaining.values()]);record.name=group.name;record.consumed=false;}
   record.button.dataset.choiceCount=record.actions.length>1?`${record.actions.length}项`:'';
   const primary=record.actions.find(a=>!a.social)||record.actions[0],summary=record.actions.length>1?`${primary.action||'互动'} · ${record.actions.length}项`:primary.action||'互动',label=group.name+' · '+summary,kind=interactionIcon(primary),buttonKey=kind+'|'+label;
   if(record.button.dataset.actionLabel!==buttonKey){const icon=make('span','object-target-symbol'),copy=make('span','object-target-copy'),name=make('strong',''),hint=make('span','');icon.innerHTML=actionIconSvg(kind);name.textContent=group.name;hint.textContent=summary;copy.append(name,hint);record.button.replaceChildren(icon,copy);record.button.dataset.actionIcon=kind;record.button.dataset.actionLabel=buttonKey;}if(record.button.getAttribute('aria-label')!==label){record.button.setAttribute('aria-label',label);record.button.title=label+' · Tab切换目标 · E选择';}if(record.button.getAttribute('aria-expanded')!==String(active===id))record.button.setAttribute('aria-expanded',String(active===id));if(active===id)render(record);
  }
  if(hidden){close();for(const record of records.values()){hide(record.button,true);record.visible=false;}}
 }
 function project(){if(disposed)return;pollGamepad();const frame=layout.frame(),hud=layout.rects(),used=[];
  for(const record of records.values()){
   const point=!hidden&&!controls.isOpen()&&!record.consumed&&projectAnchor(record.anchor,record.actions[0]);let chosen=null;
   if(point?.visible){const width=Math.min(184,frame.right-frame.left),height=48;
    const base=point.nameRect?{x:point.nameRect.right+6+width/2,y:point.y}:{x:point.x+width/2+12,y:point.y};
    const options=[base,{x:(point.nameRect?.left??point.x)-6-width/2,y:point.y},{x:point.x,y:(point.nameRect?.bottom??point.y)+30},{x:point.x,y:(point.nameRect?.top??point.y)-30}];
    options.push(...[frame.left+width/2,frame.right-width/2,...hud.flatMap(h=>[h.left-width/2-5,h.right+width/2+5])].map(x=>({x,y:point.y})));
    const order=[record.slot,...options.map((_,i)=>i)].filter((v,i,a)=>v!==undefined&&a.indexOf(v)===i);
    for(const slot of order){const p=options[slot],x=Math.round(p.x),y=Math.round(p.y),rect={left:x-width/2,right:x+width/2,top:y-height/2,bottom:y+height/2};if(rect.left<frame.left||rect.right>frame.right||rect.top<frame.top||rect.bottom>frame.bottom||hud.some(h=>overlaps(rect,h))||used.some(h=>overlaps(rect,h))||point.nameRect&&overlaps(rect,point.nameRect))continue;chosen={x,y,rect};record.slot=slot;break;}
   }
   // A valid open target must not close because its name or another HUD box
   // moved over the small marker. The menu has its own fixed, safe placement.
   if(!chosen&&point?.visible&&active===record.id&&record.projected)chosen=record.projected;
   record.visible=!!chosen;hide(record.button,!chosen||!!active);if(!chosen){if(active===record.id)close();continue;}record.projected=chosen;used.push(chosen.rect);write(record.button,'left',chosen.x+'px');write(record.button,'top',chosen.y+'px');
   if(active===record.id){
    let place=menuPlace&&menuPlace.x>=frame.left&&menuPlace.x+menuPlace.width<=frame.right&&menuPlace.y>=frame.top&&menuPlace.y+menuPlace.height<=frame.bottom&&!hud.some(h=>overlaps({left:menuPlace.x,right:menuPlace.x+menuPlace.width,top:menuPlace.y,bottom:menuPlace.y+menuPlace.height},h))?menuPlace:null;for(const width of place?[]:[...new Set([Math.min(320,frame.right-frame.left),Math.min(220,frame.right-frame.left)])]){for(const height of [...new Set([Math.min(78+record.actions.length*52+new Set(record.actions.map(interactionCategory)).size*24,frame.bottom-frame.top),Math.min(144,frame.bottom-frame.top)])]){
     const x=Math.min(frame.right-width,Math.max(frame.left,chosen.x+28)),y=Math.min(frame.bottom-height,Math.max(frame.top,chosen.y-height/2));
     const attempts=[{x,y},{x:chosen.x-width-28,y},{x:Math.min(frame.right-width,Math.max(frame.left,chosen.x-width/2)),y:chosen.y+28},{x:Math.min(frame.right-width,Math.max(frame.left,chosen.x-width/2)),y:chosen.y-height-28}];
     const found=attempts.find(p=>p.x>=frame.left&&p.x+width<=frame.right&&p.y>=frame.top&&p.y+height<=frame.bottom&&!hud.some(h=>overlaps({left:p.x,right:p.x+width,top:p.y,bottom:p.y+height},h)));
     if(found){place={...found,width,height};break;}
    }if(place)break;}
    // In a short landscape viewport the four object-adjacent spots can
    // all touch HUD chrome even though a clear gap remains a little farther
    // away. Search the HUD edges before abandoning a visible, tapped object.
    if(!place){
     for(const height of [...new Set([Math.min(78+record.actions.length*52+new Set(record.actions.map(interactionCategory)).size*24,frame.bottom-frame.top),Math.min(240,frame.bottom-frame.top),Math.min(180,frame.bottom-frame.top),Math.min(144,frame.bottom-frame.top),Math.min(98,frame.bottom-frame.top)])]){
     for(const width of [...new Set([Math.min(280,frame.right-frame.left),Math.min(220,frame.right-frame.left),Math.min(180,frame.right-frame.left)])]){
      const xs=[frame.left,frame.right-width,...hud.flatMap(h=>[h.left-width-5,h.right+5])],ys=[frame.top,frame.bottom-height,...hud.flatMap(h=>[h.top-height-5,h.bottom+5])];
      const attempts=xs.flatMap(x=>ys.map(y=>({x,y}))).filter(p=>p.x>=frame.left&&p.x+width<=frame.right&&p.y>=frame.top&&p.y+height<=frame.bottom&&!hud.some(h=>overlaps({left:p.x,right:p.x+width,top:p.y,bottom:p.y+height},h)));
      attempts.sort((a,b)=>Math.hypot(a.x+width/2-chosen.x,a.y+height/2-chosen.y)-Math.hypot(b.x+width/2-chosen.x,b.y+height/2-chosen.y));
      if(attempts[0]){place={...attempts[0],width,height};break;}
     }if(place)break;}
    }
    if(!place){close();continue;}
    menuPlace=place;write(popover,'left',Math.round(place.x)+'px');write(popover,'top',Math.round(place.y)+'px');write(popover,'width',place.width+'px');write(popover,'maxHeight',place.height+'px');
   }
  }
  const visible=[...records.values()].filter(r=>r.visible);if(!visible.some(r=>r.id===selectedId))selectedId=visible[0]?.id||null;for(const record of records.values())record.button.setAttribute('data-selected',String(record.id===selectedId));
 }
 // Dismissal owns this Escape. Otherwise it bubbles to the game after close()
 // and the same key can leave the country or cancel an ongoing action.
 function cycle(delta){const available=[...records.values()].filter(r=>r.visible);if(!available.length)return false;const index=available.findIndex(r=>r.id===selectedId);selectedId=available[(index+delta+available.length)%available.length].id;for(const record of records.values())record.button.setAttribute('data-selected',String(record.id===selectedId));return true;}
 const onKeyDown=e=>{if(hidden||disposed)return;for(const record of records.values())record.button.dataset.inputMode='keyboard';if(e.code==='Escape'&&active){e.preventDefault();e.stopPropagation();close();return;}
  if(active&&['ArrowDown','ArrowUp','Tab'].includes(e.code)){e.preventDefault();e.stopPropagation();const buttons=[...rows,closeButton],delta=e.code==='ArrowUp'||e.shiftKey?-1:1,index=buttons.indexOf(doc.activeElement);buttons[(index+delta+buttons.length)%buttons.length]?.focus?.({preventScroll:true});return;}
  if(active&&['KeyE','Enter','Space'].includes(e.code)){e.preventDefault();e.stopPropagation();(doc.activeElement===closeButton?closeButton:rows.includes(doc.activeElement)?doc.activeElement:rows[0])?.onclick?.();return;}
  if(!active&&e.code==='Tab'&&cycle(e.shiftKey?-1:1)){e.preventDefault();e.stopPropagation();}
 };
 function pollGamepad(){const pad=Array.from(getGamepads()).find(p=>p?.connected!==false&&p?.mapping==='standard'),down=new Set();if(pad)for(const index of [0,1,12,13,14,15])if(pad.buttons[index]?.pressed)down.add(index);const pressed=[...down].filter(index=>!gamepadDown.has(index));gamepadDown=down;if(hidden)return;
  for(const index of pressed){for(const record of records.values())record.button.dataset.inputMode='gamepad';if(controls.isOpen()){controls.handlePad(index);continue;}if(active){if(index===1)close();else if(index===0)(doc.activeElement===closeButton?closeButton:rows.includes(doc.activeElement)?doc.activeElement:rows[0])?.onclick?.();else if([12,13].includes(index))onKeyDown({code:index===12?'ArrowUp':'ArrowDown',preventDefault(){},stopPropagation(){}});}else if(index===0){if(controls.actions().length)controls.activate();else activate(records.get(selectedId));}else if([12,13,14,15].includes(index))cycle([12,14].includes(index)?-1:1);}
 }
 closeButton.onclick=close;doc.addEventListener('keydown',onKeyDown);
 return {update,project,close(){close();controls.close();},isOpen:()=>!!active||controls.isOpen(),actions:()=>all.slice(),activeTarget:()=>records.get(active)||null,activate(){if(controls.actions().length)return controls.activate();return activate(records.get(selectedId)||[...records.values()].find(r=>r.visible));},cycleTarget:cycle,activateTarget(id){return activate(records.get(id));},targets:()=>[...records.values()],dispose(){disposed=true;close();doc.removeEventListener('keydown',onKeyDown);controls.dispose();layer.remove();}};
}
