// Regression for the native picker escaping a rotated game document. Exercise
// real production controls with a finite event/DOM model, not browser geometry.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {enhanceGameSelect,closeGameSelects} from '../source/game/game-select.js';
import {createBankCounterService} from '../source/game/china-money-house-service.js';
import {CHINA_MONEY_HOUSE} from '../source/game/china-money-house.js';
import {JAPAN_EXCHANGE_COUNTER} from '../source/game/japan-exchange-counter.js';
import {FRANCE_EXCHANGE_COUNTER} from '../source/game/france-exchange-counter.js';
import {EGYPT_EXCHANGE_COUNTER} from '../source/game/egypt-exchange-counter.js';
import {createCurrencyLedger} from '../source/game/currency-ledger.js';
import {familyCases} from '../source/qa/mobile-family-fixture.js';
class E {
 constructor(tag,doc){Object.assign(this,{tagName:tag.toUpperCase(),ownerDocument:doc,children:[],attrs:{},style:{},dataset:{},listeners:new Map(),hidden:false,disabled:false,value:'',scrollTop:0,scrollLeft:0,clientHeight:120,offsetHeight:44,rect:{left:100,top:80,width:200,height:44}});}
 append(...nodes){for(const n of nodes){n.remove?.();this.children.push(n);n.parentElement=this;}}
 replaceChildren(...nodes){for(const n of this.children)n.parentElement=null;this.children=[];this.append(...nodes);}
 remove(){if(this.parentElement){const p=this.parentElement;p.children=p.children.filter(n=>n!==this);this.parentElement=null;}}
 get isConnected(){return this===this.ownerDocument?.body||this===this.ownerDocument?.head||!!this.parentElement?.isConnected;}
 get offsetTop(){return (this.parentElement?.children.indexOf(this)||0)*44+5;}
 get textContent(){return this._text??this.children.map(n=>n.textContent).join('');}set textContent(value){this._text=String(value);this.replaceChildren();}
 get attributes(){return Object.entries(this.attrs).map(([name,value])=>({name,value}));}
 setAttribute(k,v){this.attrs[k]=String(v);}getAttribute(k){return this.attrs[k]||null;}
 contains(n){return n===this||this.children.some(c=>c.contains(n));}
 querySelectorAll(selector){const matches=node=>selector.split(',').some(part=>part.startsWith('[')?node.getAttribute(part.slice(1,-1))!==null:node.tagName.toLowerCase()===part);return this.children.flatMap(n=>[...(matches(n)?[n]:[]),...n.querySelectorAll(selector)]);}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
 addEventListener(type,fn,capture=false){const list=this.listeners.get(type)||[];list.push({fn,capture});this.listeners.set(type,list);}
 removeEventListener(type,fn){this.listeners.set(type,(this.listeners.get(type)||[]).filter(l=>l.fn!==fn));}
 dispatchEvent(e){Object.defineProperty(e,'target',{value:this,configurable:true});this['on'+e.type]?.(e);for(const {fn}of this.listeners.get(e.type)||[])fn(e);return !e.defaultPrevented;}
 focus(){this.ownerDocument.activeElement=this;}getBoundingClientRect(){return {...this.rect,right:this.rect.left+this.rect.width,bottom:this.rect.top+this.rect.height};}
 showModal(){this.open=true;}close(){this.open=false;}
}
class Select extends E {
 get options(){return this.children.filter(n=>n.tagName==='OPTION');}
 get value(){return this._value||'';}set value(value){this._value=String(value);}
 get selectedIndex(){return this.options.findIndex(n=>n.value===this.value);}set selectedIndex(index){this._value=this.options[index]?.value||'';}
 get disabled(){return !!this._disabled;}set disabled(value){this._disabled=!!value;}
}
function documentFixture(){
 const doc={activeElement:null,listeners:new Map(),createElement:tag=>tag==='select'?new Select(tag,doc):new E(tag,doc),addEventListener:E.prototype.addEventListener,removeEventListener:E.prototype.removeEventListener};
 doc.body=new E('body',doc);doc.head=new E('head',doc);doc.defaultView={innerWidth:844,innerHeight:390,Event,listeners:new Map(),addEventListener:E.prototype.addEventListener,removeEventListener:E.prototype.removeEventListener};return doc;
}
const event=(target,key,extra={})=>({target,key,preventDefault(){this.prevented=true;},stopPropagation(){this.stopped=true;},stopImmediatePropagation(){this.stopped=this.immediate=true;},...extra});
const dispatch=(doc,type,e)=>{for(const {fn,capture}of [...(doc.listeners.get(type)||[])].sort((a,b)=>Number(b.capture)-Number(a.capture))){if(e.stopped&&!capture)break;fn(e);if(e.immediate)break;}return e;};
function control(doc,{count=9,host=doc.body}={}){
 const select=doc.createElement('select');select.setAttribute('aria-label','选择人物');for(let i=0;i<count;i++){const o=doc.createElement('option');o.value='person-'+i;o.textContent=i===4?'Beta':i===7?'Charlie':'Alpha '+i;select.append(o);}select.children[1].disabled=true;select.value='person-0';
 const ui=enhanceGameSelect(select,{document:doc});host.append(ui.element);return ui;
}
let doc=documentFixture(),ui=control(doc),events=[];
ui.select.oninput=()=>events.push('input:'+ui.select.value);ui.select.onchange=()=>events.push('change:'+ui.select.value);
assert(ui.select.hidden);assert.equal(ui.select.tabIndex,-1);assert.equal(ui.select.getAttribute('aria-hidden'),'true');assert.equal(ui.trigger.getAttribute('role'),'combobox');assert.equal(ui.trigger.children[0].textContent,'Alpha 0');
ui.trigger.onclick(event(ui.trigger));assert(ui.isOpen());assert.equal(ui.list.parentElement,doc.body);assert.equal(ui.list.getAttribute('role'),'listbox');assert.equal(ui.trigger.getAttribute('aria-expanded'),'true');assert.equal(doc.activeElement,ui.trigger);
let e=dispatch(doc,'keydown',event(ui.trigger,'ArrowDown'));assert(e.prevented&&e.stopped);assert.equal(ui.trigger.getAttribute('aria-activedescendant'),ui.list.children[2].id,'Disabled option skipped');
dispatch(doc,'keydown',event(ui.trigger,'Enter'));assert.equal(ui.select.value,'person-2');assert.deepEqual(events,['input:person-2','change:person-2']);assert(!ui.isOpen());assert.equal(doc.activeElement,ui.trigger);
ui.open();dispatch(doc,'keydown',event(ui.trigger,'End'));assert.equal(ui.trigger.getAttribute('aria-activedescendant'),ui.list.children[8].id);assert(ui.list.scrollTop>0,'Active option scrolls only the list');
e=dispatch(doc,'keydown',event(ui.trigger,'Escape'));assert(e.immediate&&e.prevented);assert.equal(ui.select.value,'person-2','Escape does not commit pending selection');assert(!ui.isOpen());
ui.open();dispatch(doc,'keydown',event(ui.trigger,'Home'));dispatch(doc,'keydown',event(ui.trigger,'b'));assert.equal(ui.trigger.getAttribute('aria-activedescendant'),ui.list.children[4].id);dispatch(doc,'keydown',event(ui.trigger,' '));assert.equal(ui.select.value,'person-4');
ui.open();e=dispatch(doc,'keydown',event(ui.trigger,'Tab'));assert(!e.prevented,'Tab keeps natural focus order');assert(!ui.isOpen());
ui.open();const before=events.length;ui.list.children[4].onclick(event(ui.list.children[4]));assert.equal(events.length,before,'Same option emits no redundant events');
ui.open();ui.list.children[1].onclick(event(ui.list.children[1]));assert(ui.isOpen());assert.equal(ui.select.value,'person-4');
ui.list.children[7].onclick(event(ui.list.children[7],null,{pointerType:'touch'}));assert.equal(ui.select.value,'person-7');assert(!ui.isOpen());
ui.select.selectedIndex=4;assert.equal(ui.select.value,'person-4');assert.equal(ui.trigger.children[0].textContent,'Beta','Native-style selectedIndex setter updates the visible choice');ui.select.value='person-0';assert.equal(ui.trigger.children[0].textContent,'Alpha 0','Programmatic value refreshes label');ui.open();ui.select.disabled=true;assert(ui.trigger.disabled);assert(!ui.isOpen());assert.equal(ui.open(),false);ui.select.disabled=false;
ui.open();e=event(ui.list,null,{pointerType:'touch'});ui.list.onpointerdown(e);assert(!e.prevented,'Touch drag may scroll options');assert(e.stopped);
dispatch(doc,'pointerdown',event(doc.body));assert(!ui.isOpen());ui.open();dispatch(doc,'focusin',event(doc.body));assert(!ui.isOpen());
ui.trigger.rect={left:790,top:310,width:150,height:44};ui.open();assert.equal(parseFloat(ui.list.style.left)+parseFloat(ui.list.style.width),832);assert(parseFloat(ui.list.style.top)<310,'Short landscape flips upward');
ui.trigger.rect.top=100;dispatch(doc,'scroll',event(doc.body));assert(parseFloat(ui.list.style.top)>=144,'Ancestor scroll repositions');
doc.documentElement={clientWidth:844,clientHeight:390};doc.defaultView.getComputedStyle=()=>({getPropertyValue:key=>({'--ww-safe-left':'59px','--ww-safe-right':'34px'})[key]||'0px'});
ui.trigger.rect={left:0,top:180,width:200,height:44};dispatch(doc,'scroll',event(doc.body));assert.equal(parseFloat(ui.list.style.left),71,'Rotated notch safe left plus shared gutter');ui.trigger.rect.left=800;dispatch(doc,'scroll',event(doc.body));assert.equal(parseFloat(ui.list.style.left)+parseFloat(ui.list.style.width),798,'Home-indicator safe right plus shared gutter');
doc.defaultView.visualViewport={offsetLeft:30,offsetTop:20,width:600,height:200};dispatch(doc,'scroll',event(doc.body));assert(parseFloat(ui.list.style.top)>=32);assert(parseFloat(ui.list.style.top)+parseFloat(ui.list.style.maxHeight)<=208,'Popup stays inside visual viewport intersected with safe layout');
const second=control(doc);second.open();assert(!ui.isOpen()&&second.isOpen(),'One open dropdown per document');closeGameSelects(second.element,doc);assert(!second.isOpen());assert.equal((doc.listeners.get('keydown')||[]).length,0,'Close removes document handlers');
const dialog=doc.createElement('dialog');doc.body.append(dialog);dialog.showModal();ui=control(doc,{host:dialog});ui.open();assert.equal(ui.list.parentElement,dialog,'List remains inside the modal top layer');closeGameSelects(dialog,doc);dialog.replaceChildren();assert.equal(ui.open(),false,'Detached controls cannot reopen');
// Every actual country counter constructs both game controls, and the custom
// choice still runs the existing change/render path with semantic focus kept.
const descendants=n=>[n,...n.children.flatMap(descendants)],position=p=>({x:p[0],y:p[1],z:p[2],toArray(){return p;}});
for(const C of [CHINA_MONEY_HOUSE,JAPAN_EXCHANGE_COUNTER,FRANCE_EXCHANGE_COUNTER,EGYPT_EXCHANGE_COUNTER]){
 doc=documentFixture();const player={root:{position:position(C.points.counter)}},teller={station:{id:C.stationId,position:C.points.counter},root:{position:position(C.points.teller),rotation:{y:0},userData:{}},animate(){}};
 const ledger=createCurrencyLedger({saveState:()=>true}),service=createBankCounterService({npcs:[teller],lot:{moneyHouse:{}},counter:C,getPlayer:()=>player,poseContext:()=>({}),copperLedger:ledger,bodyManaged:true,canSee:()=>true,document:doc});assert(service.open());
 const panel=doc.body.children[0],buttons=()=>descendants(panel).filter(n=>n.getAttribute('role')==='combobox');assert.equal(buttons().length,2,C.id+' both selectors migrated');assert(descendants(panel).filter(n=>n.tagName==='SELECT').every(n=>n.hidden&&n.tabIndex===-1));
 let trigger=buttons()[0];trigger.onclick(event(trigger));let list=descendants(panel).find(n=>n.getAttribute('role')==='listbox');assert(list);const choice=list.children.find(n=>n.getAttribute('aria-selected')!=='true');choice.onclick(event(choice));
 trigger=buttons()[0];assert.equal(doc.activeElement,trigger,C.id+' focus survives changed currency text and rerender');assert.equal(trigger.getAttribute('aria-expanded'),'false');
 trigger.onclick(event(trigger));service.close();assert(!descendants(panel).some(n=>n.getAttribute('role')==='listbox'));service.dispose();
}
// The actual family runtime also replaces its controls on each selection.
for(const fixture of familyCases){
 doc=documentFixture();globalThis.document=doc;const mounted=fixture.mount({document:doc});mounted.open();const panel=doc.body.children.find(n=>n.id==='family-life-panel'),combos=()=>descendants(panel).filter(n=>n.getAttribute('role')==='combobox');
 assert.equal(combos().length,2);let role=combos()[1];role.onclick(event(role));let list=doc.body.children.find(n=>n.getAttribute('role')==='listbox');list.children[1].onclick(event(list.children[1]));assert.equal(mounted.ui.ledger.view('player').reproductiveRole,'gestational');assert.equal(doc.activeElement,combos()[1],'Family role rerender retains visible trigger focus');
 let person=combos()[0];person.onclick(event(person));list=doc.body.children.find(n=>n.getAttribute('role')==='listbox');list.children[2].onclick(event(list.children[2]));assert.equal(combos().length,1);assert.equal(doc.activeElement,combos()[0],'Family person rerender retains trigger focus');
 panel.scrollTop=137;mounted.refreshDay();assert.equal(panel.scrollTop,137);assert.equal(doc.activeElement,combos()[0]);
 combos()[0].onclick(event(combos()[0]));dispatch(doc,'keydown',event(combos()[0],'Escape'));assert(mounted.ui.isOpen(),'First Escape only closes dropdown');assert(!doc.body.children.some(n=>n.getAttribute('role')==='listbox'));dispatch(doc,'keydown',event(combos()[0],'Escape'));assert(!mounted.ui.isOpen(),'Second Escape closes family panel');mounted.dispose();
}
delete globalThis.document;
// Inventory stays explicit: no new unenhanced native construction can bypass
// the game picker without updating this small source-backed integration check.
const consumers=['family-runtime.js','china-money-house-service.js'];
for(const name of fs.readdirSync(new URL('../source/game/',import.meta.url)).filter(n=>n.endsWith('.js'))){const src=fs.readFileSync(new URL('../source/game/'+name,import.meta.url),'utf8');if(/\b(?:createElement|make|el)\(['"]select['"]\)/.test(src)){assert(consumers.includes(name),name+' introduces a native select consumer');assert(src.includes('enhanceGameSelect('),name+' must enhance its model');}}
console.log('PASS game dropdown: hidden native model, input/change, touch/keyboard/disabled, focus/close/reentry/cleanup, short viewport placement, four production bank selectors, family person/role rerender/two-Escape flow and source inventory');
