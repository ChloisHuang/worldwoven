import {groupInteractions,interactionIdentity,interactionIcon} from './player-interaction-intents.js';

const paths={
 document:'<path d="M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h7"/>',
 meal:'<path d="M3 13h18M5 13a7 7 0 0 1 14 0M12 4v2M4 17h16"/>',
 home:'<path d="m3 11 9-8 9 8M5 10v11h14V10M10 21v-7h4v7"/>',
 bed:'<path d="M3 5v16M3 15h18v6M3 9h6v6M9 11h10v4"/>',
 book:'<path d="M12 5C8 3 5 3 3 4v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-2-1-5-1-9 1v15"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
 chair:'<path d="M6 3v10h12V3M6 8h12M4 13h16v4H4zM6 17v4m12-4v4"/>',
 chat:'<path d="M20 11a8 7 0 0 1-8 7H8l-5 3 1.5-5A6.8 6.8 0 0 1 4 6a9 9 0 0 1 13-1M8 10h.01M12 10h.01M16 10h.01"/>',
 hand:'<path d="M8 12V5a2 2 0 0 1 4 0v6-7a2 2 0 0 1 4 0v8-5a2 2 0 0 1 4 0v7c0 5-3 7-7 7-3 0-4-1-6-4l-3-4a2 2 0 0 1 3-2l2 2"/>',
 more:'<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
 close:'<path d="m6 6 12 12M6 18 18 6"/>',
};
export const actionIconSvg=kind=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[kind]||paths.hand}</svg>`;

// The stable dialog and scroll area are created once. Only a changed set of
// action identities/labels replaces rows; movement never rebuilds this UI.
export function createContextualActionMenu({button,document:doc=globalThis.document,onSelect,onOpen=()=>{},onClose=()=>{}}){
 const make=(tag,cls,text)=>{const e=doc.createElement(tag);if(cls)e.className=cls;if(text)e.textContent=text;return e;};
 const dialog=make('dialog','context-action-menu'),header=make('div','context-action-heading'),title=make('h2',null,'附近可做的事'),closeButton=make('button','context-action-close'),list=make('div','context-action-list');
 dialog.id='context-action-menu';dialog.setAttribute('aria-label','选择附近的互动');closeButton.type='button';closeButton.setAttribute('aria-label','关闭互动选择');closeButton.innerHTML=actionIconSvg('close');header.append(title,closeButton);dialog.append(header,list);doc.body.append(dialog);
 let actions=[],signature='',rendered='',buttonKey='',generation=0,disposed=false,rows=[];
 const close=()=>{generation++;rendered='';if(dialog.open){dialog.close();button.setAttribute('aria-expanded','false');onClose();}};
 function select(action){if(disposed)return false;const current=actions.find(item=>interactionIdentity(item)===interactionIdentity(action));if(!current)return false;close();actions=[];signature='';button.hidden=true;return onSelect(current);}
 function render(){if(signature===rendered)return;rendered=signature;generation++;const token=generation,scroll=list.scrollTop,focusKey=doc.activeElement?.getAttribute?.('data-context-action');let focusTarget=null;list.replaceChildren();rows=[];
  for(const group of groupInteractions(actions)){const section=make('section','context-action-group'),label=make('h3',null,group.name);section.append(label);
   for(const action of group.actions){const row=make('button','context-action-row'),icon=make('span','context-action-icon'),text=make('span',null,action.action||'互动');row.type='button';const key=interactionIdentity(action);row.setAttribute('data-context-action',key);row.setAttribute('aria-label',`${group.name} · ${action.action||'互动'}`);icon.innerHTML=actionIconSvg(interactionIcon(action));row.append(icon,text);row.onclick=()=>{if(dialog.open&&token===generation&&!row.disabled)select(action);};section.append(row);rows.push(row);if(focusKey===key)focusTarget=row;}
   list.append(section);
  }
  if(dialog.open)focusTarget?.focus?.({preventScroll:true});
  if(list.scrollTop!==scroll)list.scrollTop=scroll;
 }
 function update(next,{hidden=false}={}){
  // Seat entry stays on its world dot; standing uses movement or the keyboard.
  const nextActions=next.filter(item=>item&&!item.menuHidden&&(!item.furniture||item.kind!=='seat'||item.contextControl));if(dialog.open){const remaining=new Map(nextActions.map(item=>[interactionIdentity(item),item]));actions=actions.flatMap(item=>{const key=interactionIdentity(item),current=remaining.get(key);remaining.delete(key);return current?[current]:item.social&&item.actor?[{...item,action:'打个招呼 · 靠近后交谈'}]:[];}).concat([...remaining.values()]);}else actions=nextActions;signature=actions.map(item=>[interactionIdentity(item),item.targetKey||'',item.targetName||item.name,interactionIcon(item),item.action].join('\u001f')).join('\u001e');
  if(hidden||!actions.length){button.hidden=true;if(dialog.open)close();return;}
  const many=actions.length>1,icon=many?'more':interactionIcon(actions[0]),label=many?'选择附近的互动':`${actions[0].name||''} · ${actions[0].action||'互动'}`,key=icon+'|'+label;
  button.hidden=!!dialog.open;if(key!==buttonKey){buttonKey=key;button.innerHTML=actionIconSvg(icon);button.setAttribute('aria-label',label+'（E）');button.title=label+' · E';button.dataset.actionIcon=icon;button.setAttribute('aria-haspopup',many?'dialog':'false');button.setAttribute('aria-controls',dialog.id);}
  if(dialog.open)render();
 }
 function activate(){if(disposed||!actions.length||button.hidden)return false;if(actions.length===1)return select(actions[0]);onOpen();render();dialog.showModal();button.hidden=true;button.setAttribute('aria-expanded','true');return true;}
 closeButton.onclick=close;dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
 dialog.addEventListener('click',event=>{if(event.target===dialog)close();});
 button.setAttribute('aria-keyshortcuts','E');button.onclick=activate;
 return {update,activate,close,handlePad(index){if(!dialog.open)return false;if(index===1){close();return true;}if(index===0){(doc.activeElement===closeButton?closeButton:rows.includes(doc.activeElement)?doc.activeElement:rows[0])?.onclick?.();return true;}if([12,13].includes(index)){const options=[...rows,closeButton],i=options.indexOf(doc.activeElement);options[(i+(index===12?-1:1)+options.length)%options.length]?.focus?.({preventScroll:true});return true;}return false;},isOpen:()=>!!dialog.open,actions:()=>actions.slice(),dispose(){disposed=true;close();dialog.remove();}};
}
