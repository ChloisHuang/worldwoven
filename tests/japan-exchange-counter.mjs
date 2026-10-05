// This adapter test catches wrong local-currency defaults, remote opening and
// repeated transfers when another physical counter joins the shared account.
// A third physical counter must select the local bucket without minting money,
// changing the shared ledger or accepting a stale/remote confirmation.
import assert from 'node:assert/strict';
import {createCurrencyLedger} from '../source/game/currency-ledger.js';
import {createBankCounterService} from '../source/game/china-money-house-service.js';
import {JAPAN_EXCHANGE_COUNTER as C,japanExchangeStation,japanExchangeAppearance} from '../source/game/japan-exchange-counter.js';
import {playerStationIntent,chooseNearbyInteraction} from '../source/game/player-interaction-intents.js';
class Element {
 constructor(tag){this.tagName=tag;this.children=[];this.dataset={};this.attrs={};this.style={};this.listeners={};}
 append(...els){this.children.push(...els);} replaceChildren(...els){this.children=els;}
 setAttribute(k,v){this.attrs[k]=v;} addEventListener(k,v){this.listeners[k]=v;}
 showModal(){this.open=true;} close(){this.open=false;} remove(){this.removed=true;}
}
const doc={head:new Element('head'),body:new Element('body'),createElement:tag=>new Element(tag)};
const position=(...p)=>({x:p[0],y:p[1],z:p[2],toArray(){return [this.x,this.y,this.z];}});
const player={root:{position:position(0,0,32)}},poses=[],teller={station:japanExchangeStation(),characterScale:.96,phase:0,root:{position:position(...C.points.teller),rotation:{y:C.tellerYaw},userData:{}},animate(t,walking,action,context){poses.push({walking,action,context:{...context}});}};
let visible=true,saved,writes=0,reject=false;const ledger=createCurrencyLedger({saveState:next=>{if(reject)return false;saved=next;writes++;}});
const options={npcs:[teller],lot:{exchangeCounter:C},counter:C,facilityKey:'exchangeCounter',getPlayer:()=>player,poseContext:()=>({}),copperLedger:ledger,canSee:()=>visible,document:doc};
assert.equal(createBankCounterService({...options,lot:{moneyHouse:{}}}),null,'Local facility must exist');
const service=createBankCounterService(options),dialog=doc.body.children[0];
const intent=playerStationIntent(teller.station),chair={id:'ramen-chair',position:[6,0,5.7],interactionRadius:2.8};
assert(intent);assert.equal(chooseNearbyInteraction([chair,intent],position(...C.points.counter),()=>true).id,C.stationId,'Short counter approach takes priority over an adjacent optional chair');
assert.equal(chooseNearbyInteraction([chair,intent],position(...chair.position),()=>true).id,chair.id,'Moving to the reception chair retains its interaction');
assert.equal(playerStationIntent({id:'cn-money-house-teller'}).priority,10,'China retains its current default priority');
const all=e=>[e,...e.children.flatMap(all)],find=fn=>all(dialog).find(fn),button=id=>find(e=>e.dataset.moneyAction===id),input=label=>find(e=>e.attrs['aria-label']===label),text=()=>all(dialog).map(e=>e.textContent||'').join(' ');
assert(service.owns(teller)&&service.ownsStation(C.stationId));assert(!service.ownsStation('cn-money-house-teller'));
assert.equal(service.open(),false);assert.equal(writes,0);assert.equal(ledger.balances().japan.cash,0);
player.root.position=position(...C.points.counter);visible=false;assert.equal(service.open(),false);visible=true;
player.root.position.y+=3;assert.equal(service.open(),false);player.root.position=position(...C.points.counter);
assert(service.open());assert.equal(input('办理币种').value,'japan');assert.equal(input('换成币种').value,'copper');
assert.equal(dialog.attrs['aria-label'],C.name+'账簿');assert(button('open'));assert(input('随身现金分配').disabled);
const wage={amount:20,receiptId:'jp-frontdesk:earned-shift:1',currency:'japan',roleId:'jp-frontdesk-assistant',slotId:'frontdesk-shift',day:1};
assert(ledger.creditWageToBank(wage).ok);assert.equal(ledger.balances().japan.bank,20);assert.equal(ledger.balances().japan.cash,0);
input('随身现金分配').value='6';input('随身现金分配').oninput();const stale=button('allocation');assert.equal(writes,1,'Preview is not a transfer');
reject=true;stale.onclick();assert.equal(ledger.balances().japan.bank,20);assert(text().includes('这笔尚未记入'));reject=false;
input('随身现金分配').value='6';input('随身现金分配').oninput();button('allocation').onclick();stale.onclick();
assert.deepEqual([ledger.balances().japan.cash,ledger.balances().japan.bank],[6,14]);
assert(all(dialog).some(e=>e.tagName==='img'&&e.src.endsWith('/currency/japan.webp')),'Uses the original Japanese ticket artwork');
const exchange=button('exchange');exchange.onclick();exchange.onclick();
assert.deepEqual([ledger.balances().japan.cash,ledger.balances().copper.cash],[4,4]);assert.equal(writes,3);
assert.equal(ledger.history().filter(r=>r.action==='exchange').length,1);
const away=button('allocation');player.root.position.z-=2;service.update(.1,.1);assert(!service.isOpen());away.onclick();assert.equal(writes,3);
player.root.position=position(...C.points.counter);assert(service.open());input('随身现金分配').value='11';input('随身现金分配').oninput();service.close();assert.equal(ledger.balances().japan.cash,4,'Closing discards preview');
assert(ledger.creditWageToBank(wage).replayed);assert.equal(writes,3);
const restored=createCurrencyLedger({saved,saveState(){}});assert.equal(restored.balances().japan.bank,14);assert.equal(restored.balances().copper.cash,4);assert.equal(restored.balances().france.cash,0);
// The actor works wholly inside the staff bay, with local forward reach for
// the south-facing desk. Talking pauses hands/feet and then returns to work.
for(let i=0;i<160;i++){service.update(.1,i*.1);assert(teller.root.position.x>=C.points.ledger[0]&&teller.root.position.x<=C.points.counting[0]);assert.equal(teller.root.position.z,C.points.teller[2]);assert(Math.hypot(teller.root.position.x-C.points.counter[0],teller.root.position.z-C.points.counter[2])>1.8);}
assert(poses.some(p=>p.action==='calligraphy'&&p.context.workDistance>0));assert(poses.some(p=>p.action==='tidy'&&p.context.workDistance>0));
const before=teller.root.position.toArray();service.update(1,20,{conversationActorId:C.stationId});assert.deepEqual(teller.root.position.toArray(),before);assert.equal(poses.at(-1).action,null);assert.equal(service.state().actor.activity,'和来客交谈');
service.update(.1,20.1);assert.notEqual(service.state().actor.activity,'和来客交谈');
const original={skin:42,hair:31,eyeColor:18};assert.strictEqual(japanExchangeAppearance('japan','jp-ramen',original),original);assert.equal(japanExchangeAppearance('japan',C.stationId,original).skin,42);assert.equal(C.role.ageYears,42);
service.dispose();assert(dialog.removed);assert.equal(service.open(),false);
console.log('PASS Japan counter: shared Japanese wages, confirmed withdrawal/FX, original ticket, failed/stale/remote/cancel guards, persisted four buckets, and bounded teller work/conversation');
