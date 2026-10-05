// Real property and ledger services; only the DOM/storage surface is simulated.
import assert from 'node:assert/strict';
import {createGameCurrencyLedger} from '../../source/game/currency-ledger.js';
import {createChinaTavernProperty} from '../../source/game/china-tavern-property.js';
import {createChinaTavernPropertyUI} from '../../source/game/china-tavern-property-ui.js';
export class Element {
 constructor(tag){this.tag=tag;this.children=[];this.attributes={};this.style={};this.className='';this._text='';this.open=false;}
 set textContent(v){this._text=String(v);this.children=[];}get textContent(){return this._text+this.children.map(e=>e.textContent).join('');}
 append(...items){this.children.push(...items);}replaceChildren(...items){this._text='';this.children=items;}setAttribute(k,v){this.attributes[k]=String(v);}getAttribute(k){return this.attributes[k]??null;}
 addEventListener(k,fn){this[k]=fn;}showModal(){this.open=true;}close(){this.open=false;}remove(){}
}
export const walk=e=>[e,...e.children.flatMap(walk)];
export function fixture({bank=900,broken=false}={}) {
 let saved={visited:[],stamps:{},chinaServiceWorld:{till:0},copperLedger:{version:1,cash:50,bank,accountOpened:true,nextTransaction:1,transactions:[]}},durable,failure=null,property,writes=0;
 const flags={available:true,nearby:true},clock={day:0},notifications=[],doc={head:new Element('head'),body:new Element('body'),createElement:t=>new Element(t)};
 if(broken)saved.chinaTavernProperty={version:0};durable=structuredClone(saved);
 const storage={setItem(key,json){if(failure==='throw')throw Error('quota');if(failure==='false')return false;durable=JSON.parse(json);saved=structuredClone(durable);writes++;}};
 const ledger=createGameCurrencyLedger({saved,storage,transactionParticipant:tx=>property.prepareCurrencyCommit(tx)});
 property=createChinaTavernProperty({saved:saved.chinaTavernProperty,copperLedger:ledger,getClock:()=>clock,getTill:()=>saved.chinaServiceWorld.till,worldSeed:1,saveState(next){return storage.setItem('worlds-days-v1',JSON.stringify({...saved,chinaTavernProperty:next}));}});
 const ui=createChinaTavernPropertyUI({property,document:doc,canOperate:()=>flags.available,isNearby:()=>flags.nearby,notify:text=>notifications.push(text)}),dialog=doc.body.children[0];
 const buttons=()=>walk(dialog).filter(e=>e.tag==='button'),byText=text=>buttons().find(e=>e.textContent===text),primary=()=>buttons().find(e=>e.className.includes('cn-property-primary')),input=()=>walk(dialog).find(e=>e.tag==='input');
 const click=e=>{assert(e,'control exists');assert(!e.disabled,`${e.textContent} enabled`);e.onclick();},enter=value=>{input().value=String(value);input().oninput();};
 const willing=()=>{for(let n=0;n<8;n++){assert(property.refreshDay().ok);if(property.state().market.willing)return;clock.day++;}throw Error('no consenting seller');};
 const buy=()=>{willing();ui.open();click(primary());assert.equal(property.state().market.application.status,'accepted');click(primary());assert.equal(property.state().ownerId,'player');};
 const offers=()=>buttons().filter(e=>e.attributes['aria-label']?.includes('出价'));
 return {doc,dialog,property,ledger,ui,flags,clock,notifications,buttons,byText,primary,input,click,enter,willing,buy,offers,get durable(){return structuredClone(durable);},get writes(){return writes;},set failure(v){failure=v;}};
}
