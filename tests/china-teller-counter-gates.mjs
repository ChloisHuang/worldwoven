// Regression boundary: a queued bank control must not outlive its physical
// teller/appointment, even before the next frame. The three other counters keep
// their legacy ownership and body loop when no binding is supplied.
import assert from 'node:assert/strict';
import {createCurrencyLedger} from '../source/game/currency-ledger.js';
import {createBankCounterService,createChinaMoneyHouseService} from '../source/game/china-money-house-service.js';
import {CHINA_MONEY_HOUSE as C} from '../source/game/china-money-house.js';
import {JAPAN_EXCHANGE_COUNTER} from '../source/game/japan-exchange-counter.js';
import {EGYPT_EXCHANGE_COUNTER} from '../source/game/egypt-exchange-counter.js';
import {FRANCE_EXCHANGE_COUNTER} from '../source/game/france-exchange-counter.js';

class Element {
 constructor(tag){this.tagName=tag;this.children=[];this.dataset={};this.attrs={};this.style={};this.listeners={};this.value='';this.disabled=false;}
 append(...els){this.children.push(...els);} replaceChildren(...els){this.children=els;}
 setAttribute(key,value){this.attrs[key]=value;} addEventListener(type,fn){this.listeners[type]=fn;}
 showModal(){this.open=true;} close(){this.open=false;} remove(){this.removed=true;}
}
const position=(x,y,z)=>({x,y,z,toArray(){return [this.x,this.y,this.z];}});
const actor=(id=C.stationId,point=C.points.teller,stationPoint=C.points.counter)=>{
 const label={textContent:'外部控制器 · 在岗'},n={alive:true,station:{id,position:stationPoint,ageYears:46},root:{position:position(...point),rotation:{y:1},userData:{tools:{cloth:{visible:true}}}},phase:0,walking:false,poseContext:{receptionWriting:true},label:{querySelector:()=>label},poses:0};
 n.animate=()=>n.poses++;return n;
};
const descendants=e=>[e,...e.children.flatMap(descendants)];
function harness({counter=C,legacy=false,noOriginal=false}={}){
 const doc={head:new Element('head'),body:new Element('body'),createElement:tag=>new Element(tag)},original=actor(counter.stationId,counter.points.teller,counter.points.counter),player={root:{position:position(...counter.points.counter)}};
 const h={doc,original,player,binding:{actor:original,holderId:original.station.id,revision:0,available:true},writes:0,opens:0,closes:0,poseCalls:0,seen:[],relationships:[],visible:true};
 h.ledger=createCurrencyLedger({saveState:()=>{h.writes++;return true;}});
 const options={npcs:noOriginal?[]:[original],lot:{moneyHouse:{},exchangeCounter:{}},getPlayer:()=>player,poseContext:()=>{h.poseCalls++;return {};},copperLedger:h.ledger,canSee:station=>{h.seen.push(station);return h.visible;},document:doc,getClock:()=>({seconds:50}),onRelationshipEvent:e=>{h.relationships.push(e);return {ok:true};},onOpen:()=>h.opens++,onClose:()=>h.closes++,counter,facilityKey:legacy?'exchangeCounter':'moneyHouse',...(!legacy?{counterBinding:()=>h.binding,bodyManaged:true}:{})};
 h.service=(legacy?createBankCounterService:createChinaMoneyHouseService)(options);h.dialog=doc.body.children[0];
 h.find=predicate=>descendants(h.dialog).find(predicate);h.button=action=>h.find(e=>e.dataset.moneyAction===action);h.input=label=>h.find(e=>e.attrs['aria-label']===label);
 h.text=()=>descendants(h.dialog).map(e=>[e.textContent||'',e.attrs['aria-label']||''].join(' ')).join('\n');
 h.allocate=value=>{const input=h.input('随身现金分配');input.value=String(value);input.oninput();};
 h.wage=()=>h.ledger.creditWageToBank({amount:20,receiptId:`counter-test:${counter.id}`,currency:counter.defaultCurrency||'copper',roleId:'test-role',slotId:'test-slot',day:1});
 h.replace=()=>{const next=actor('cn-replacement-teller',counter.points.teller,[100,0,100]);h.binding={actor:next,holderId:next.station.id,revision:h.binding.revision+1,available:true};return next;};
 return h;
}

{
 const h=harness();assert(h.service.open());const oldOpen=h.button('open');oldOpen.onclick();oldOpen.onclick();
 assert(h.ledger.balances().copper.accountOpened);assert.equal(h.writes,1);assert.equal(h.ledger.state().cash+h.ledger.state().bank,0,'Opening is still free');
 assert(h.wage().ok);assert.deepEqual([h.ledger.state().cash,h.ledger.state().bank],[0,20]);assert(h.text().includes('银行存款：20 文'),'Wage commits refresh the actual open bank');
 h.allocate(6);h.button('allocation').onclick();assert.deepEqual([h.ledger.state().cash,h.ledger.state().bank],[6,14]);
 h.allocate(4);h.button('allocation').onclick();assert.deepEqual([h.ledger.state().cash,h.ledger.state().bank],[4,16]);
 h.button('exchange').onclick();assert.deepEqual([h.ledger.balances().copper.cash,h.ledger.balances().japan.cash],[2,1]);
 assert(h.text().includes('免手续费'));assert(h.text().includes('固定游戏汇率：2 文中国铜钱 = 1 券日本票券'));
 const before=structuredClone({position:h.original.root.position.toArray(),yaw:h.original.root.rotation.y,walking:h.original.walking,label:h.original.label.querySelector().textContent,cloth:h.original.root.userData.tools.cloth.visible,context:h.original.poseContext});
 h.service.update(12,20,{conversationActorId:h.original.station.id});
 assert.deepEqual({position:h.original.root.position.toArray(),yaw:h.original.root.rotation.y,walking:h.original.walking,label:h.original.label.querySelector().textContent,cloth:h.original.root.userData.tools.cloth.visible,context:h.original.poseContext},before);
 assert.equal(h.original.poses,0);assert.equal(h.poseCalls,0,'Managed body never runs the old pose loop');
 h.service.dispose();assert.equal(h.original.poseContext.receptionWriting,true,'Disposal also leaves the external body context alone');
}

const changes={
 dead:h=>{h.original.alive=false;},left:h=>{h.original.root.position.z+=1;},reassigned:h=>h.replace(),revision:h=>{h.binding.revision++;},
 vacant:h=>{h.binding={actor:null,holderId:null,revision:1,available:false};},unavailable:h=>{h.binding.available=false;},
};
const controls={
 open:h=>h.button('open').onclick,
 allocation:h=>{h.allocate(3);return h.button('allocation').onclick;},exchange:h=>h.button('exchange').onclick,
 currency:h=>{const input=h.input('办理币种');input.value='japan';return input.onchange;},
 exchangeCurrency:h=>{const input=h.input('换成币种');input.value='france';return input.onchange;},
 allocationInput:h=>{const input=h.input('随身现金分配');input.value='4';return input.oninput;},
 exchangeInput:h=>{const input=h.input('交出兑换数目');input.value='4';return input.oninput;},
 allocationKeyboard:h=>{const input=h.input('随身现金分配');return ()=>input.listeners.keydown({stopPropagation(){}});},
 exchangeKeyboard:h=>{const input=h.input('交出兑换数目');return ()=>input.listeners.keydown({stopPropagation(){}});},
 close:h=>h.input('合上账簿').onclick,
};
for(const [change,mutate]of Object.entries(changes))for(const [control,capture]of Object.entries(controls)){
 const h=harness();if(control!=='open'){assert(h.wage().ok);assert(h.ledger.withdraw(6,'seed-withdraw','copper').ok);}
 assert(h.service.open());const callback=capture(h),before=h.ledger.state(),writes=h.writes;mutate(h);callback();
 assert.deepEqual(h.ledger.state(),before,`${change}/${control}: no queued callback can alter money before update`);assert.equal(h.writes,writes);
 assert.equal(h.service.isOpen(),false,`${change}/${control}: invalid session closes immediately`);assert.equal(h.relationships.length,0,'Stale/refused counter actions have no relationship effect');
 h.original.alive=true;h.original.root.position=position(...C.points.teller);h.binding={actor:h.original,holderId:h.original.station.id,revision:2,available:true};
 assert(h.service.open());const children=h.dialog.children;callback();assert(h.service.isOpen(),`${change}/${control}: stale callback cannot close the new session`);assert.equal(h.dialog.children,children,'Stale selectors and inputs cannot rerender the new session');assert.equal(h.writes,writes);
 h.service.dispose();
}

{
 const h=harness();assert(h.service.open());const replacement=h.replace();h.service.update(0,0);assert(!h.service.isOpen(),'Update closes a changed appointment without any DOM event');
 assert(!h.service.owns(h.original));assert(h.service.owns(replacement));assert.equal(h.service.socialStatus(h.original),null);assert.equal(h.service.state().actor.id,replacement.station.id);assert.equal(h.service.state().actor.ageYears,46);
 assert(h.service.open());assert(h.seen.every(station=>station.id===C.stationId&&station.position===C.points.counter),'Visibility remains attached to the original counter, never the new worker’s previous station');
 h.button('open').onclick();assert.equal(h.relationships.length,1);assert.equal(h.relationships[0].actorId,replacement.station.id);assert.deepEqual(h.relationships[0].participants,[replacement.station.id,'player'],'The real replacement teller receives credit, never the old role holder');
 h.binding.available=false;assert(h.service.owns(replacement));assert(h.service.socialStatus(replacement));h.service.update(0,0);assert(!h.service.isOpen());
 replacement.alive=false;assert(h.service.owns(replacement),'The external controller can still identify the dead current holder');assert(!h.service.open());
 h.binding={actor:null,holderId:null,revision:2,available:false};assert(!h.service.owns(h.original));assert(!h.service.owns(replacement));assert.equal(h.service.socialStatus(h.original),null);assert.equal(h.service.state().actor,null);assert(!h.service.open(),'An explicit vacancy never falls back to the original teller');
 h.service.dispose();
}

{
 const h=harness({noOriginal:true});assert(h.service,'A bound counter may exist without the original person');assert(h.service.open());assert(h.seen.every(station=>station.id===C.stationId));h.service.dispose();
}
for(const revision of [-1,.5,NaN,Infinity,undefined,null,'0',Number.MAX_SAFE_INTEGER+1]){
 const h=harness();h.binding.revision=revision;assert(!h.service.open(),`Reject invalid revision ${String(revision)}`);h.service.dispose();
}
for(const kind of ['holder','missing','floor','distance','nonfinite','unavailable']){
 const h=harness();if(kind==='holder')h.binding.holderId='cn-wrong-person';if(kind==='missing')h.binding.actor=null;if(kind==='floor')h.original.root.position.y+=.16;if(kind==='distance')h.original.root.position.x+=.151;if(kind==='nonfinite')h.original.root.position.z=NaN;if(kind==='unavailable')h.binding.available=false;
 assert(!h.service.open(),`Open verifies ${kind} before showing a bank`);assert.equal(h.opens,0);h.service.dispose();
}
{
 const h=harness();assert(h.service.open());h.original.root.position.x=C.points.abacus[0];h.original.root.position.z=C.points.teller[2]+.06;
 h.service.update(0,0);assert(h.service.isOpen(),'An already-bound session tolerates the existing short counter side-step');h.service.close();assert(!h.service.open(),'A new session waits for the teller to return within 0.15 m');
 h.original.root.position=position(...C.points.teller);assert(h.service.open());h.original.root.position.z+=.16;h.service.update(0,0);assert(!h.service.isOpen(),'The counter envelope does not include walking away from the desk');h.service.dispose();
}
{
 const h=harness();assert(h.service.open());h.original.alive=false;assert(h.wage().ok);assert(!h.service.isOpen(),'An external wage commit cannot rerender a dead teller session');assert.equal(h.ledger.state().bank,20,'Payroll remains independent of counter availability');h.service.dispose();
}
for(const counter of [JAPAN_EXCHANGE_COUNTER,EGYPT_EXCHANGE_COUNTER,FRANCE_EXCHANGE_COUNTER]){
 const h=harness({counter,legacy:true}),currency=counter.defaultCurrency;assert(h.service.open());h.button('open').onclick();assert(h.ledger.balances()[currency].accountOpened);assert(h.wage().ok);
 h.allocate(5);h.button('allocation').onclick();assert.deepEqual([h.ledger.balances()[currency].cash,h.ledger.balances()[currency].bank],[5,15]);
 h.allocate(2);h.button('allocation').onclick();assert.deepEqual([h.ledger.balances()[currency].cash,h.ledger.balances()[currency].bank],[2,18]);
 assert.equal(h.relationships.length,3);assert(h.relationships.every(e=>e.source===`bank-counter:${counter.id}`&&e.actorId===counter.stationId&&e.at===50));assert.deepEqual(h.relationships.map(e=>e.serviceKind),['open','withdraw','deposit']);
 const x=h.original.root.position.x;h.service.update(1,1);assert.notEqual(h.original.root.position.x,x);assert.equal(h.original.poses,1);assert.equal(h.poseCalls,1,'Default counters retain their original body and work loop');assert(h.service.owns(h.original));assert(h.service.isOpen());
 h.service.close();h.original.root.position.x+=2;assert(h.service.open(),'Legacy counters do not acquire the Chinese appointment gate');h.service.dispose();
}
console.log('PASS teller counter: free account, bank wages/transfers/FX, pre-update stale controls, actor/revision/availability/physical gates, replacement visibility, vacancy, external body ownership, three unchanged default counters');
