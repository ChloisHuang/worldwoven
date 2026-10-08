// TR03 view regression: stale or repeated controls must never submit a newer
// journey, and failed saves cannot look like cleared checkpoints. This is a
// small simulated DOM test; exported real markup supports separate visual QA.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createTravelJourney} from '../source/game/travel-journey.js';
import {createTravelJourneyUI} from '../source/game/travel-journey-ui.js';

class Element{
 constructor(tag,doc){this.tag=tag;this.tagName=tag.toUpperCase();this.doc=doc;this.children=[];this.attrs={};this.listeners={};this.className='';this._text='';this.isConnected=true;this.scrollTop=0;this.scrollLeft=0;}
 set textContent(value){this._text=String(value);this.children=[];}
 get textContent(){return this._text+this.children.map(child=>child.textContent).join('');}
 append(...children){this.children.push(...children);}
 replaceChildren(...children){this._text='';this.children=children;}
 setAttribute(key,value){this.attrs[key]=String(value);}
 getAttribute(key){return this.attrs[key]??null;}
 addEventListener(key,handler){(this.listeners[key]??=[]).push(handler);}
 fire(key,event={}){for(const listener of this.listeners[key]||[])listener(event);}
 showModal(){this.open=true;}
 close(){this.open=false;this.fire('close');}
 focus(){this.doc.activeElement=this;}
 remove(){this.isConnected=false;}
}
function document(){const doc={};doc.createElement=tag=>new Element(tag,doc);doc.head=doc.createElement('head');doc.body=doc.createElement('body');return doc;}
const walk=root=>[root,...root.children.flatMap(walk)];
const find=(root,action)=>walk(root).find(node=>node.attrs['data-travel-action']===action);
const primary=root=>walk(root).filter(node=>node.className==='ww-airy-action');
const body=root=>walk(root).find(node=>node.attrs['data-panel-key']==='travel-body');
const esc=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const html=element=>`<${element.tag}${element.className?` class="${esc(element.className)}"`:''}${element.open?' open':''}${element.disabled?' disabled':''}${element.tag==='progress'?` max="${element.max}" value="${element.value}"`:''}${Object.entries(element.attrs).map(([key,value])=>` ${key}="${esc(value)}"`).join('')}>${element.tag==='style'?element._text:esc(element._text)}${element.children.map(html).join('')}</${element.tag}>`;
const css=fs.readFileSync(new URL('../source/game/travel-journey.css',import.meta.url),'utf8');
function exportState(name,f){
 if(!process.env.WW_TRAVEL_UI_EXPORT)return;
 fs.mkdirSync(process.env.WW_TRAVEL_UI_EXPORT,{recursive:true});
 const shared=f.doc.head.children.filter(node=>node.tag==='style').map(html).join('');
 fs.writeFileSync(`${process.env.WW_TRAVEL_UI_EXPORT}/${name}.html`,`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${fs.readFileSync(new URL('../source/game/game.css',import.meta.url),'utf8')}</style>${shared}<style>${css}</style></head><body style="background:#84a6a0">${html(f.dialog)}</body></html>`);
}
function fixture(options={}){
 const f={doc:document(),calls:[],fail:false,events:[],saved:null,viewOverride:null};
 f.ledger=createTravelJourney({initialRegion:options.initialRegion??'china',saved:options.saved??null,getClock:()=>({day:2,hour:9.5}),saveState:next=>{if(f.fail)return false;f.saved=structuredClone(next);return true;}});
 if(!options.saved&&options.begin!==false)assert(f.ledger.begin('japan').ok);
 f.ui=createTravelJourneyUI({document:f.doc,getView:()=>f.viewOverride||f.ledger.view(),
  onAction:(action,id)=>{f.calls.push([action,id]);const result=f.ledger.advance(id,action);f.reenter?.();return result;},
  onCancel:id=>{f.calls.push(['cancel',id]);return f.ledger.cancel(id);},
  onPassport:()=>f.events.push('passport'),onOpen:()=>f.events.push('open'),onClose:reason=>f.events.push(`close:${reason}`)});
 f.dialog=f.doc.body.children.find(node=>node.tag==='dialog');
 return f;
}

// All five stages retain readonly route identity, one main action and real
// ledger-derived stamp feedback. Rendering and progress never write the ledger.
{
 const f=fixture();assert(f.ui.open());
 const stages=['planned','departure-cleared','flying','entry-pending','entry-cleared'];
 const actions=['departure','board','land','entry','arrive'];
 for(const [index,stage]of stages.entries()){
  assert.equal(f.dialog.attrs['data-travel-stage'],stage);assert.equal(primary(f.dialog).length,1);
  assert(f.dialog.textContent.includes('中国'));assert(f.dialog.textContent.includes('日本'));assert(f.dialog.textContent.includes('旅程编号'));
  assert(!walk(f.dialog).some(node=>['input','select','textarea'].includes(node.tag)),'route and journey number are readonly');
  assert(!/travel-journey|departure-cleared|entry-pending|revision/.test(f.dialog.textContent));
  const before=f.ledger.snapshot();f.ui.update(0);assert.deepEqual(f.ledger.snapshot(),before);
  if(stage==='planned'){assert(find(f.dialog,'cancel'));assert(f.dialog.textContent.includes('旅行免费'));}
  else assert(!find(f.dialog,'cancel'),'departure prevents cancellation');
  if(stage==='flying'){
   assert(f.dialog.className.includes('is-flying'));assert(f.ui.setFlightProgress(.45,'travel-journey-1'));
   assert(f.dialog.textContent.includes('45%'));assert.equal(f.ledger.view().active.stage,'flying');
   assert.equal(f.ui.setFlightProgress(.7,'travel-journey-2'),false);assert(f.dialog.textContent.includes('45%'));
   f.ui.setFlightProgress(4);assert(f.dialog.textContent.includes('抵近目的地'));f.ui.setFlightProgress(-1);
   assert.equal(f.ui.setFlightProgress(Number.NaN),false);assert.deepEqual(f.ledger.snapshot(),before);
  }else assert(!f.dialog.className.includes('is-flying'));
  if(['departure-cleared','entry-pending','entry-cleared'].includes(stage))assert(f.dialog.textContent.includes('中国出境章已盖'));
  if(stage==='entry-cleared')assert(f.dialog.textContent.includes('日本入境章已盖'));
  exportState(stage,f);
  const control=find(f.dialog,actions[index]);assert(control);f.reenter=()=>control.onclick();control.onclick();f.reenter=null;control.onclick();
  assert.equal(f.calls.length,index+1,'reentrant and repeated old buttons dispatch only once');
  assert.deepEqual(f.calls.at(-1),[actions[index],'travel-journey-1']);
 }
 assert.equal(f.ledger.view().currentRegion,'japan');assert.equal(f.ledger.view().stamps.length,2);assert.equal(primary(f.dialog).length,0);
 assert(f.dialog.textContent.includes('先在地球仪选择目的地'));
 f.ui.dispose();assert.equal(f.ui.open(),false);
}

// Closing, escape and opening the real passport preserve the same interrupted
// journey. A new UI over the cold save resumes exactly where the ledger stopped.
{
 const f=fixture(),focus=f.doc.createElement('button');focus.focus();f.ui.open();
 const old=find(f.dialog,'departure');f.ui.close();old.onclick();assert.equal(f.calls.length,0);assert.equal(f.doc.activeElement,focus);
 f.ui.open();old.onclick();assert.equal(f.calls.length,0);find(f.dialog,'departure').onclick();
 const before=f.ledger.snapshot();let prevented=false;f.dialog.fire('cancel',{preventDefault:()=>{prevented=true;}});
 assert(prevented);assert(!f.ui.isOpen());assert.deepEqual(f.ledger.snapshot(),before);
 const resumed=fixture({saved:before});resumed.ui.open();assert.equal(resumed.dialog.attrs['data-travel-stage'],'departure-cleared');
 const staleBoard=find(resumed.dialog,'board');find(resumed.dialog,'passport').onclick();
 assert(!resumed.ui.isOpen());assert.deepEqual(resumed.events.slice(-2),['close:passport','passport']);staleBoard.onclick();assert.equal(resumed.calls.length,0);
 resumed.ui.open();assert.equal(resumed.dialog.attrs['data-travel-stage'],'departure-cleared');find(resumed.dialog,'board').onclick();resumed.ui.setFlightProgress(.38);
 resumed.ui.close();resumed.ui.open();assert(resumed.dialog.textContent.includes('38%'),'the host retains same-journey flight display progress');
 const oldLand=find(resumed.dialog,'land');resumed.ui.dispose();oldLand.onclick();assert.equal(resumed.calls.length,1);assert(resumed.events.includes('close:dispose'));
 f.ui.dispose();
}

// Only the planned stage offers cancellation, and both failed cancellation and
// every failed checkpoint retain the saved stage and provide a fresh retry.
{
 const cancelled=fixture();cancelled.ui.open();cancelled.fail=true;find(cancelled.dialog,'cancel').onclick();
 assert.equal(cancelled.ledger.view().active.stage,'planned');assert(cancelled.dialog.textContent.includes('尚未保存'));
 cancelled.fail=false;const button=find(cancelled.dialog,'cancel');button.onclick();button.onclick();assert.equal(cancelled.calls.length,2);assert.equal(cancelled.ledger.view().active,null);
 const f=fixture();f.ui.open();
 for(const action of ['departure','board','land','entry','arrive']){
  f.fail=true;const before=f.ledger.snapshot(),control=find(f.dialog,action),calls=f.calls.length;
  control.onclick();control.onclick();assert.equal(f.calls.length,calls+1);assert.deepEqual(f.ledger.snapshot(),before);
  assert(f.dialog.textContent.includes('旅程停留在原处'));assert.equal(find(f.dialog,action).disabled,false);
  f.fail=false;find(f.dialog,action).onclick();
 }
 assert.equal(f.ledger.view().currentRegion,'japan');f.ui.dispose();cancelled.ui.dispose();
}

// New revisions, replaced journeys and changed stages are checked at click time
// even if no frame update has yet detached the old button.
{
 const f=fixture();f.ui.open();let control=find(f.dialog,'departure');assert(f.ledger.cancel('travel-journey-1').ok);assert(f.ledger.begin('france').ok);
 control.onclick();assert.equal(f.calls.length,0);assert.equal(f.ledger.view().active.stage,'planned');assert(f.dialog.textContent.includes('法国'));
 control=find(f.dialog,'departure');assert(f.ledger.advance('travel-journey-2','departure').ok);control.onclick();assert.equal(f.calls.length,0);
 assert.equal(f.dialog.attrs['data-travel-stage'],'departure-cleared');f.ui.dispose();
 // The view provider may reuse a mutable object; capture primitives at render.
 const doc=document(),view={revision:4,active:{id:'travel-journey-1',from:'china',to:'japan',stage:'planned'},journeys:[],stamps:[]};let calls=0;
 const ui=createTravelJourneyUI({document:doc,getView:()=>view,onAction:()=>{calls++;return true;}});ui.open();const dialog=doc.body.children[0];
 control=find(dialog,'departure');view.revision++;control.onclick();assert.equal(calls,0);
 control=find(dialog,'departure');view.active.to='france';control.onclick();assert.equal(calls,0);
 control=find(dialog,'departure');ui.close();ui.open();control.onclick();assert.equal(calls,0);ui.dispose();
}

// An unknown starting country is never invented, and no exit stamp is inferred
// from the stage. Load failures disable writes while preserving readable help.
{
 const f=fixture({begin:false});f.ledger=createTravelJourney({initialRegion:null,getClock:()=>({day:0,hour:8}),saveState:()=>true});assert(f.ledger.begin('egypt').ok);
 f.ui.open();assert(f.dialog.textContent.includes('未登记'));assert(find(f.dialog,'departure').textContent.includes('确认启程'));
 find(f.dialog,'departure').onclick();assert(f.dialog.textContent.includes('未盖出境章'));assert.equal(f.ledger.view().stamps.length,0);
 f.viewOverride={...f.ledger.view(),loadError:'invalid-travel-journey'};f.ui.update();const calls=f.calls.length;assert(primary(f.dialog)[0].disabled);primary(f.dialog)[0].onclick();assert.equal(f.calls.length,calls);
 assert(f.dialog.textContent.includes('旅行记录暂时无法核对'));assert(find(f.dialog,'passport'));f.ui.dispose();
}

// Long user-facing errors belong to the existing body scroller; replacing
// content preserves its scroll position, and unchanged frames keep DOM nodes.
{
 const f=fixture();f.ui.open();const scroller=body(f.dialog);scroller.scrollTop=70;
 f.viewOverride={...f.ledger.view(),lastError:'这一步尚未保存，请保留当前旅程。\n'.repeat(80)};f.ui.update(0);
 assert.equal(body(f.dialog).scrollTop,70);const error=walk(body(f.dialog)).find(node=>node.attrs.role==='alert');assert.equal(error.textContent,f.viewOverride.lastError);
 const stable=body(f.dialog);f.ui.update(0);assert.equal(body(f.dialog),stable);exportState('long-error',f);
 // Assert the actual layout boundaries, not a simulated pixel claim. The
 // authored CSS keeps safe-area placement, one body scroller and fixed actions.
 assert(css.includes('var(--ww-ui-width'));assert(css.includes('var(--ww-ui-height'));
 assert.match(css,/\.ww-travel-dialog \.ww-travel-body\{[^}]*min-height:0;overflow:auto/);
 assert.match(css,/\.ww-travel-dialog \.ww-travel-actions\{[^}]*flex:0 0 auto/);
 assert.match(css,/\.ww-travel-dialog button\{[^}]*min-width:44px;min-height:44px/);
 assert.match(css,/\.ww-travel-dialog\.is-flying::backdrop\{background:transparent;backdrop-filter:none/);
 assert.match(css,/body dialog\.ww-travel-dialog\.is-flying\{inset:auto var\(--ww-ui-right,12px\) var\(--ww-ui-bottom,12px\) var\(--ww-ui-left,12px\)!important/);
 f.ui.dispose();
}

// Optional asynchronous host work still cannot submit twice or resurrect a
// closed view. The production ledger itself remains synchronous.
{
 const doc=document(),view={revision:1,active:{id:'travel-journey-1',from:'china',to:'japan',stage:'planned'},journeys:[],stamps:[]};let resolve,calls=0;
 const ui=createTravelJourneyUI({document:doc,getView:()=>view,onAction:()=>{calls++;return new Promise(done=>{resolve=done;});}});
 ui.open();const dialog=doc.body.children[0],control=find(dialog,'departure');control.onclick();control.onclick();assert.equal(calls,1);assert(primary(dialog)[0].disabled);
 ui.close();ui.open();assert(primary(dialog)[0].disabled);resolve({ok:false,code:'save-failed'});await Promise.resolve();
 assert(ui.isOpen());assert(!dialog.textContent.includes('尚未保存'));assert.equal(primary(dialog)[0].disabled,false);
 find(dialog,'departure').onclick();ui.close();resolve({ok:false,code:'save-failed'});await Promise.resolve();assert(!ui.isOpen());ui.dispose();
}
console.log('PASS TR03 journey UI: five stages, readonly route, durable stamp feedback, first journey with unknown origin, cancel/close/passport/cold resume, repeated/reentrant/stale controls, save failures, flight progress and scroll/error boundaries. Simulated DOM and authored CSS, not browser or iOS visual acceptance.');
