import {safeUiRect} from './viewport-layout.js';
// The native select remains only a hidden value/event model. Every visible
// control and option lives in the game document, including a rotated iframe.
const controls=new WeakMap(),documents=new WeakMap();
let nextId=0;
const STYLE=`
.ww-game-select{display:block;min-width:0;width:100%}.ww-game-select>select{display:none!important}
:where(.ww-game-select) .ww-game-select-trigger{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;min-width:0;min-height:44px;margin:0;padding:9px 12px;border:1px solid #b9d2c5;border-radius:8px;background:linear-gradient(120deg,#fffaf0,#edf4e8);box-shadow:inset 0 0 0 2px #fffdf480;color:#254e55;font:inherit;font-weight:600;text-align:left;cursor:pointer;touch-action:manipulation;letter-spacing:inherit;transform:none}
.ww-game-select-label{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ww-game-select-arrow{flex:0 0 auto;color:#638b81;font-size:15px;line-height:1}.ww-game-select-trigger[aria-expanded=true] .ww-game-select-arrow{transform:rotate(180deg)}
:where(.ww-game-select) .ww-game-select-trigger:focus-visible{outline:2px solid #4d8e88;outline-offset:2px}:where(.ww-game-select) .ww-game-select-trigger:disabled{opacity:.45;cursor:default}
.ww-game-select-list{position:fixed;z-index:1000;box-sizing:border-box;margin:0;padding:5px;border:1px solid #a9c9bc;border-radius:10px;background:#f8fbef;box-shadow:0 9px 28px #213c4a33,inset 0 0 0 2px #fffdf4;color:#254e55;font-family:Georgia,"Songti SC","Noto Serif CJK SC",serif;font-size:16px;line-height:1.35;overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain;touch-action:pan-y;-webkit-overflow-scrolling:touch;scrollbar-width:thin;scrollbar-color:#92b9ab #eff4e8}
.ww-game-select-list[hidden]{display:none!important}.ww-game-select-option{box-sizing:border-box;display:flex;align-items:center;gap:9px;min-height:44px;padding:9px 10px;border:1px solid transparent;border-radius:6px;cursor:pointer;overflow-wrap:anywhere;user-select:none;-webkit-user-select:none}.ww-game-select-option::before{content:'✧';flex:0 0 16px;color:#91ab98}.ww-game-select-option[aria-selected=true]::before{content:'✓';color:#467963}.ww-game-select-option[data-active=true]{border-color:#a1c7b6;background:#dfefe0}.ww-game-select-option[aria-disabled=true]{opacity:.4;cursor:default}
`;
const tag=n=>String(n?.tagName||n?.tag||'').toLowerCase();
const contains=(root,node)=>root===node||!!root?.contains?.(node)||Array.from(root?.children||[]).some(child=>contains(child,node));
const attr=(node,key)=>node.getAttribute?.(key)||node.attrs?.[key]||'';
function context(doc){
 let state=documents.get(doc);if(state)return state;
 const style=doc.createElement('style');style.textContent=STYLE;(doc.head||doc.body).append(style);
 state={active:null};documents.set(doc,state);return state;
}
function optionsOf(select){
 if(select.options)return Array.from(select.options);
 const visit=node=>Array.from(node.children||[]).flatMap(child=>tag(child)==='option'?[child]:visit(child));return visit(select);
}
const optionValue=option=>String(option.value??option.textContent??'');
const optionDisabled=option=>!!option.disabled||tag(option.parentElement)==='optgroup'&&option.parentElement.disabled;

// Close before replacing a panel so no detached trigger keeps a portal, event
// listeners or focus. Each document has at most one open game dropdown.
export function closeGameSelects(root,doc=root?.ownerDocument||globalThis.document){
 const active=documents.get(doc)?.active;if(active&&(!root||contains(root,active.element)))active.close();
}

export function enhanceGameSelect(select,{document:doc=select.ownerDocument||globalThis.document,id:controlId}={}){
 if(controls.has(select))return controls.get(select);
 const state=context(doc),win=doc.defaultView||globalThis.window||globalThis;
 const make=(tagName,className)=>{const node=doc.createElement(tagName);node.className=className;return node;};
 const element=make('span','ww-game-select'),trigger=make('button','ww-game-select-trigger'),label=make('span','ww-game-select-label'),arrow=make('span','ww-game-select-arrow');
 const list=make('div','ww-game-select-list'),id=controlId||`ww-game-select-${++nextId}`;
 trigger.type='button';trigger.id=id;trigger.setAttribute('role','combobox');trigger.setAttribute('aria-haspopup','listbox');trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls',id+'-list');
 const labelText=attr(select,'aria-label');trigger.setAttribute('aria-label',labelText);list.setAttribute('aria-label',labelText);list.id=id+'-list';list.setAttribute('role','listbox');list.hidden=true;
 const familyKey=attr(select,'data-family-key');if(familyKey)trigger.setAttribute('data-family-key',familyKey);
 trigger.setAttribute('data-panel-key',labelText||id);arrow.textContent='⌄';arrow.setAttribute('aria-hidden','true');trigger.append(label,arrow);
 select.hidden=true;select.tabIndex=-1;select.setAttribute('aria-hidden','true');select.setAttribute('tabindex','-1');element.append(select,trigger);
 let opened=false,rows=[],active=-1,typeahead='',typedAt=0,observer=null;
 const enabled=()=>optionsOf(select).map((option,index)=>!optionDisabled(option)&&!option.hidden?index:-1).filter(index=>index>=0);
 const chosen=()=>{const all=optionsOf(select);return all.findIndex(option=>optionValue(option)===String(select.value));};
 function refresh(){
  const selected=optionsOf(select)[chosen()];label.textContent=selected?.label||selected?.textContent||'请选择';trigger.disabled=!!select.disabled;trigger.setAttribute('aria-disabled',String(!!select.disabled));
  if(opened&&select.disabled){close();return;}
  if(opened){renderRows();position();}
 }
 function watchProperty(name){
  let owner=select,descriptor;while(owner&&!descriptor){descriptor=Object.getOwnPropertyDescriptor(owner,name);owner=Object.getPrototypeOf(owner);}
  if(descriptor?.configurable===false)return;
  if(descriptor?.get&&descriptor?.set)Object.defineProperty(select,name,{configurable:true,get:()=>descriptor.get.call(select),set:value=>{descriptor.set.call(select,value);refresh();}});
  else if(!descriptor||'value'in descriptor){let value=select[name];Object.defineProperty(select,name,{configurable:true,get:()=>value,set:next=>{value=next;refresh();}});}
 }
 function scrollActive(){
  const row=rows[active];if(!row||!Number.isFinite(row.offsetTop)||!list.clientHeight)return;
  const top=row.offsetTop,bottom=top+row.offsetHeight;if(top<list.scrollTop)list.scrollTop=top;else if(bottom>list.scrollTop+list.clientHeight)list.scrollTop=bottom-list.clientHeight;
 }
 function markActive(index){
  active=index;for(let i=0;i<rows.length;i++)rows[i].setAttribute('data-active',String(i===active));
  trigger.setAttribute('aria-activedescendant',rows[active]?.id||'');scrollActive();
 }
 function renderRows(){
  const current=chosen(),all=optionsOf(select),valid=enabled();if(!valid.includes(active))active=valid.includes(current)?current:valid[0]??-1;
  const top=list.scrollTop||0;rows=all.map((option,index)=>{
   const row=make('div','ww-game-select-option');row.id=`${id}-option-${index}`;row.setAttribute('role','option');row.setAttribute('aria-selected',String(index===current));row.setAttribute('aria-disabled',String(optionDisabled(option)));row.setAttribute('data-active',String(index===active));row.hidden=!!option.hidden;row.textContent=option.label||option.textContent||optionValue(option);
   row.onpointermove=e=>{if(e.pointerType!=='touch'&&!optionDisabled(option))markActive(index);};
   row.onclick=e=>{e?.preventDefault?.();e?.stopPropagation?.();commit(index);};return row;
  });list.replaceChildren(...rows);list.scrollTop=top;
 }
 function viewport(){
  const root=doc.documentElement,layout={left:0,top:0,width:root?.clientWidth||win.innerWidth||800,height:root?.clientHeight||win.innerHeight||600},v=win.visualViewport;
  const visual=v?{left:v.offsetLeft||0,top:v.offsetTop||0,width:v.width,height:v.height}:layout,style=root&&win.getComputedStyle?.(root);
  const safe=Object.fromEntries(['left','right','top','bottom'].map(side=>[side,parseFloat(style?.getPropertyValue(`--ww-safe-${side}`))||0]));return safeUiRect(visual,layout,safe);
 }
 function position(){
  if(!opened)return;if(select.isConnected===false||trigger.isConnected===false){close();return;}
  const rect=trigger.getBoundingClientRect?.();if(!rect)return;
  const view=viewport(),gap=5,right=view.right,bottom=view.bottom,rectBottom=rect.bottom??rect.top+rect.height;
  const width=Math.min(Math.max(rect.width,176),view.width),left=Math.max(view.left,Math.min(rect.left,right-width));
  const below=Math.max(0,bottom-rectBottom-gap),above=Math.max(0,rect.top-view.top-gap),desired=Math.min(286,optionsOf(select).filter(o=>!o.hidden).length*44+12),up=below<Math.min(desired,132)&&above>below;
  const height=Math.min(desired,up?above:below),top=up?rect.top-gap-height:rectBottom+gap;
  list.style.left=left+'px';list.style.top=Math.max(view.top,Math.min(top,bottom-height))+'px';list.style.width=width+'px';list.style.maxHeight=Math.max(0,height)+'px';
 }
 function close({focus=false}={}){
  if(!opened)return;opened=false;list.hidden=true;list.remove();trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-activedescendant','');if(state.active===api)state.active=null;
  doc.removeEventListener?.('pointerdown',outside,true);doc.removeEventListener?.('focusin',focusOutside,true);doc.removeEventListener?.('keydown',openKey,true);doc.removeEventListener?.('scroll',scroll,true);win.removeEventListener?.('resize',position);win.removeEventListener?.('blur',blur);win.visualViewport?.removeEventListener?.('resize',position);win.visualViewport?.removeEventListener?.('scroll',position);
  if(focus&&!trigger.disabled&&trigger.isConnected!==false)trigger.focus?.({preventScroll:true});
 }
 function open(){
  if(select.disabled||!enabled().length||trigger.isConnected===false)return false;
  state.active?.close();refresh();opened=true;state.active=api;active=chosen();renderRows();
  // A modal's top layer makes body portals inert; keep its menu in that dialog.
  let host=trigger.parentElement,dialog=null;while(host){if(tag(host)==='dialog'){dialog=host;break;}host=host.parentElement;}
  (dialog||doc.body).append(list);list.hidden=false;trigger.setAttribute('aria-expanded','true');position();markActive(active);trigger.focus?.({preventScroll:true});
  doc.addEventListener?.('pointerdown',outside,true);doc.addEventListener?.('focusin',focusOutside,true);doc.addEventListener?.('keydown',openKey,true);doc.addEventListener?.('scroll',scroll,true);win.addEventListener?.('resize',position);win.addEventListener?.('blur',blur);win.visualViewport?.addEventListener?.('resize',position);win.visualViewport?.addEventListener?.('scroll',position);return true;
 }
 function emit(type){const EventType=doc.defaultView?.Event||globalThis.Event;if(select.dispatchEvent&&EventType)select.dispatchEvent(new EventType(type,{bubbles:true}));else select['on'+type]?.({type,target:select});}
 function commit(index){
  const option=optionsOf(select)[index];if(!opened||select.disabled||!option||optionDisabled(option)||option.hidden||trigger.isConnected===false)return;
  const value=optionValue(option),changed=String(select.value)!==value;select.value=value;close({focus:true});refresh();if(changed){emit('input');emit('change');}
 }
 function step(delta){const valid=enabled(),index=valid.indexOf(active);markActive(valid[Math.max(0,Math.min(valid.length-1,index+delta))]??-1);}
 function search(key){
  const now=Date.now();typeahead=now-typedAt>700?key:typeahead+key;typedAt=now;
  const text=typeahead.toLocaleLowerCase(),query=[...text].every(c=>c===text[0])?text[0]:text,all=optionsOf(select),valid=enabled();
  const start=valid.indexOf(active),ordered=[...valid.slice(start+1),...valid.slice(0,start+1)];const index=ordered.find(i=>(all[i].label||all[i].textContent||'').trim().toLocaleLowerCase().startsWith(query));if(index!==undefined)markActive(index);
 }
 function key(e){
  const name=e.key||e.code;if(name==='Tab'){close();return;}
  if(name==='Escape'&&opened){e.preventDefault?.();e.stopImmediatePropagation?.();close({focus:true});return;}
  if(['ArrowDown','ArrowUp','Home','End','Enter',' ','Space'].includes(name)){
   e.preventDefault?.();e.stopPropagation?.();const wasOpen=opened;if(!opened)open();if(!opened)return;
   if(name==='Home')markActive(enabled()[0]??-1);else if(name==='End')markActive(enabled().at(-1)??-1);else if(name==='ArrowDown'&&wasOpen)step(1);else if(name==='ArrowUp'&&wasOpen)step(-1);else if(wasOpen&&['Enter',' ','Space'].includes(name))commit(active);
  }else if(name?.length===1&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault?.();e.stopPropagation?.();if(!opened)open();search(name);}
 }
 function openKey(e){if(contains(element,e.target)||contains(list,e.target)){key(e);if(e.key!=='Tab')e.stopPropagation?.();}}
 function outside(e){if(!contains(element,e.target)&&!contains(list,e.target))close();}
 function focusOutside(e){if(!contains(element,e.target)&&!contains(list,e.target))close();}
 function scroll(e){if(!contains(list,e.target))position();}
 function blur(){close();}
 trigger.onclick=e=>{e?.preventDefault?.();e?.stopPropagation?.();opened?close():open();};trigger.onkeydown=e=>{if(!opened)key(e);};
 list.onpointerdown=e=>{e.stopPropagation?.();if(e.pointerType==='mouse')e.preventDefault?.();};list.onclick=e=>e.stopPropagation?.();
 select.addEventListener?.('input',refresh);select.addEventListener?.('change',refresh);
 watchProperty('value');watchProperty('selectedIndex');watchProperty('disabled');
 const Observer=doc.defaultView?.MutationObserver;if(Observer){observer=new Observer(refresh);observer.observe(select,{attributes:true,childList:true,subtree:true,characterData:true});}
 const api={element,select,trigger,list,refresh,open,close,isOpen:()=>opened,dispose(){close();observer?.disconnect();select.removeEventListener?.('input',refresh);select.removeEventListener?.('change',refresh);controls.delete(select);}};
 controls.set(select,api);refresh();return api;
}
