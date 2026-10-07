// Shared compact modal anatomy. Panels keep their own content and actions.
// Each consumer may append this sheet again. Keep width/overflow fallbacks below
// panel-local selectors so a later copy cannot replace its footer or scroll owner.
export const AIRY_PANEL_STYLE=`
.ww-airy-panel{overflow:hidden;max-height:calc(100dvh - 24px)}.ww-airy-panel[open]{display:flex;flex-direction:column}.ww-airy-panel-heading{flex:0 0 auto;padding-right:28px;margin-bottom:10px}.ww-airy-panel-heading h2{margin:0 0 4px}.ww-airy-panel-heading p{margin:0;font-size:11px;color:#789197}.ww-airy-panel-body{min-height:0;overscroll-behavior:contain;flex:1 1 auto}:where(.ww-airy-panel-body){overflow:auto}.ww-airy-panel-actions{flex:0 0 auto;margin-top:10px}.ww-airy-panel-actions:empty{display:none}.ww-airy-panel-actions :where(button){width:100%}@media(max-height:500px){.ww-airy-panel-heading{margin-bottom:8px}.ww-airy-panel-heading h2{font-size:18px}.ww-airy-panel-actions{margin-top:6px}}
`;
export function createAiryPanelParts(doc){
 const make=(tag,className)=>{const element=doc.createElement(tag);element.className=className;return element;};
 return {header:make('header','ww-airy-panel-heading'),body:make('div','ww-airy-panel-body'),actions:make('footer','ww-airy-panel-actions')};
}

// Keep the reader's place when a real service state change replaces a panel.
// Call only after the panel's visible-state signature changes. Unchanged frames
// do not write scrollTop or focus, so touch scrolling keeps its momentum.
export function preserveAiryPanelView(root,doc=globalThis.document){
 if(!root?.open)return ()=>{};
 const children=node=>Array.from(node.children||[]),tag=node=>String(node.tagName||'').toLowerCase();
 const attr=(node,key)=>node.getAttribute?.(key)||node.attrs?.[key]||'';
 const identity=node=>{
  const attrs=node.attributes?Array.from(node.attributes):Object.entries(node.attrs||{}).map(([name,value])=>({name,value}));
  const keyed=attrs.find(a=>a.name==='data-panel-key'||/^data-.*(?:focus|scroll)$/.test(a.name));
  return node.id?`#${node.id}`:keyed?`${keyed.name}=${keyed.value}`:`${tag(node)}.${node.className||''}${tag(node)==='details'?':'+(children(node).find(e=>tag(e)==='summary')?.textContent||''):''}`;
 };
 function entries(){const result=[];function visit(node,path){result.push({node,path});const counts=new Map();for(const child of children(node)){const key=identity(child),index=counts.get(key)||0;counts.set(key,index+1);visit(child,`${path}/${key}:${index}`);}}visit(root,'@');return result;}
 const before=entries(),active=before.find(({node})=>node===doc?.activeElement),focus=active?{path:active.path,label:attr(active.node,'aria-label'),text:tag(active.node)==='button'?active.node.textContent:null,start:active.node.selectionStart,end:active.node.selectionEnd,direction:active.node.selectionDirection}:null;
 const state=new Map(before.map(({node,path})=>[path,{top:node.scrollTop||0,left:node.scrollLeft||0,...(tag(node)==='details'?{open:node.open}:{})}]));
 return ()=>{
  const after=entries();
  for(const {node,path}of after){const prior=state.get(path);if(prior&&'open'in prior&&node.open!==prior.open)node.open=prior.open;}
  if(focus){const target=after.find(({node,path})=>path===focus.path&&attr(node,'aria-label')===focus.label&&(focus.text===null||node.textContent===focus.text))?.node;
   if(target&&!target.disabled){if(doc?.activeElement!==target)target.focus?.({preventScroll:true});if(Number.isInteger(focus.start)&&typeof target.setSelectionRange==='function'){try{target.setSelectionRange(focus.start,focus.end,focus.direction);}catch{ /* Number/range fields do not support a caret range. */ }}}
  }
  // Restore after focus and expanded details, including outer/nested scrollers.
  for(const {node,path}of after){const prior=state.get(path);if(!prior)continue;if((node.scrollTop||0)!==prior.top)node.scrollTop=prior.top;if((node.scrollLeft||0)!==prior.left)node.scrollLeft=prior.left;}
 };
}
