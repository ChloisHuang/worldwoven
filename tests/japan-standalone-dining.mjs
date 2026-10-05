// Guards independent meal identity, durable payment and owned cancellation.
// Actual movement, kitchen timing and rendered poses are covered separately.
import assert from 'node:assert/strict';
import {createJapanServiceOrders,JAPAN_SERVICE_POINTS as P} from '../source/game/japan-service-orders.js';
import {createJapanPlayerService} from '../source/game/japan-player-service.js';
import {createJapanPlayerServiceUI} from '../source/game/japan-player-service-ui.js';
import {createCurrencyLedger} from '../source/game/currency-ledger.js';
import {createCopperLedger} from '../source/game/copper-ledger.js';
import {createFacilityQueue} from '../source/game/npc-facilities.js';
const look={bodyPreset:'masculine-lean',wardrobePreset:'haori-trouser'};
const player={root:{position:{x:0,y:0,z:0},rotation:{y:0},userData:{appearance:look}}};
const move=p=>Object.assign(player.root.position,{x:p[0],y:p[1],z:p[2]});
let saved,money,failSave=false,mounted=null;
const copper=createCurrencyLedger({saveState:s=>{if(failSave)return false;money=s;}});
assert(copper.creditWageToBank({amount:84,receiptId:'completed-shift',currency:'copper',roleId:'tavern-helper',slotId:'tavern-helper-slot',day:1}).ok);
assert(copper.withdraw(84,'withdraw-earned-wage','copper').ok);
assert(copper.exchange({quote:copper.quoteExchange({from:'copper',to:'japan',amount:72}).quote,requestId:'local-ticket-exchange'}).ok);
assert.equal(copper.balances().japan.cash,36);
const seats=['sushi','ramen'].map((dish,i)=>({id:'dining-'+dish,kind:'seat',diningKind:dish,center:[i?4.1:-6.56,0,i?4.75:-1.29],position:[i?4.1:-6.56,0,i?5.69:-.35],anchor:[i?4.1:-6.56,0,i?4.85:-1.19],seatY:.739}));
const bench={id:'bath-bench',kind:'seat',center:[-7.7,3.8,7.55],position:[-7.7,3.8,6.61],anchor:[-7.7,3.8,7.39],seatY:4.365};
const facilities=createFacilityQueue(),furniture={items:[...seats,bench],facilities,releaseActor:id=>facilities.releaseActor(id)};
const board=createJapanServiceOrders({worldSeed:29,saveState:s=>saved=s});
const npc=board.spawn({name:'guest',appearance:look,side:'men',restPoint:bench.anchor,diningPoint:bench.anchor});
const service=createJapanPlayerService({board,furniture,copperLedger:copper,getPlayer:()=>player,getMounted:()=>mounted});
function deliver(dish){
 const v=service.state().visit;assert.equal(v.orderKind,'dining');assert.equal(v.tokenId,null);assert.equal(v.mixtureId,null);assert.equal(v.side,undefined);
 assert.equal(board.jobs().filter(j=>j.visitId===v.id).length,1);
 const cook=board.jobs().find(j=>j.visitId===v.id);assert.equal(cook.kind,'cook');assert(board.claim(cook.id,'jp-sushi'));assert(board.complete(cook.id,'jp-sushi',{position:P[cook.to]}));
 assert(!board.jobs().some(j=>j.visitId===v.id&&j.kind==='serve'),'Server waits for actual diner');
 mounted=seats.find(s=>s.diningKind===dish);move(mounted.anchor);service.update(.1);
 const serve=board.jobs().find(j=>j.visitId===v.id&&j.kind==='serve');assert(board.claim(serve.id,'jp-ramen'));assert(board.pickup(serve.id,'jp-ramen',{position:P[serve.from]}));
 assert(!board.complete(serve.id,'jp-ramen',{position:v.servePoint,guestPosition:v.diningPoint,itemId:'wrong',tokenId:null}));
 assert(board.complete(serve.id,'jp-ramen',{position:v.servePoint,guestPosition:v.diningPoint,itemId:serve.itemId,tokenId:null}));
 return v;
}
move([0,0,30]);assert(!service.orderDining('sushi').ok);
for(const dish of ['sushi','ramen']){
 mounted=null;move(P[dish+'Counter']);const before=copper.balances().japan.cash;assert(service.orderDining(dish).ok);const held=copper.balances().japan.cash;assert(!service.orderDining(dish).ok);assert(!service.register('cloud-leaf').ok,'A dining order cannot be relabeled as a bath registration');assert.equal(copper.balances().japan.cash,held,'Repeat click cannot debit twice');
 const v=deliver(dish);failSave=true;assert(!service.eat().ok);assert.equal(service.state().visit.stage,'meal-ready');failSave=false;
 assert(service.eat().ok);for(let i=0;i<62;i++)service.update(.1);assert.equal(service.state().visit,null);assert.equal(copper.balances().japan.cash,before-v.price);assert.equal(board.state().diningReceipts.at(-1).outcome,'ate');assert.deepEqual(board.state().diningReceipts.at(-1).participants,{cook:'jp-sushi',serve:'jp-ramen'});assert(!facilities.reservation(v.restSeatId,v.id));
}
mounted=null;move(P.sushiCounter);const beforeCancel=copper.balances().japan.cash;assert(service.orderDining('sushi').ok);const cancelled=service.state().visit;const cook=board.jobs().find(j=>j.visitId===cancelled.id);assert(board.claim(cook.id,'jp-sushi'));
failSave=true;assert(!service.cancel().ok);assert(service.state().visit);failSave=false;assert(service.cancel().ok);assert.equal(copper.balances().japan.cash,beforeCancel);assert(!board.state().claims.length);assert(board.getVisit(npc.id));
assert(copper.reserve(1,'unrelated-country-hold').ok);move(P.ramenCounter);assert(service.orderDining('ramen').ok);const pending=service.state().visit;
const pendingCook=board.jobs().find(j=>j.visitId===pending.id&&j.kind==='cook');assert(board.claim(pendingCook.id,'jp-sushi'));assert(board.complete(pendingCook.id,'jp-sushi',{position:P[pendingCook.to]}));mounted=seats[1];move(mounted.anchor);service.update(.1);const pendingServe=board.jobs().find(j=>j.visitId===pending.id&&j.kind==='serve');assert(board.claim(pendingServe.id,'jp-ramen'));assert(board.pickup(pendingServe.id,'jp-ramen',{position:P[pendingServe.from]}));mounted=null;
const restoredCopper=createCurrencyLedger({saved:money,saveState:()=>{}}),restored=createJapanServiceOrders({saved,worldSeed:29}),again=createJapanPlayerService({board:restored,furniture,copperLedger:restoredCopper,getPlayer:()=>player,getMounted:()=>mounted});
assert.equal(again.state().visit,null);assert.equal(restoredCopper.reservations().find(h=>h.id===pending.paymentId).status,'refunded');assert.equal(restoredCopper.reservations().find(h=>h.id==='unrelated-country-hold').status,'reserved');assert(restored.getVisit(npc.id));assert(!restored.jobs().some(j=>j.visitId===pending.id));assert(!restored.state().items.some(i=>i.visitId===pending.id),'Reload removes only the abandoned meal cargo');
// UI labels and one confirmation request. Closing the menu never creates food.
function el(tag){return {tagName:tag,children:[],style:{},open:false,setAttribute(){},append(...x){this.children.push(...x);},replaceChildren(){this.children=[];},addEventListener(){},showModal(){this.open=true;},close(){this.open=false;},remove(){}};}
const doc={head:el('head'),body:el('body'),createElement:el},find=(e,p)=>p(e)?e:e.children.map(x=>find(x,p)).find(Boolean);
let travel;
const ui=createJapanPlayerServiceUI({service:again,furniture,getPlayer:()=>player,getMounted:()=>mounted,onNavigate:()=>{},onFurniture:i=>travel=i,onStand:()=>{},document:doc});
move(P.sushiCounter);ui.interact(ui.target());const dialog=find(doc.body,e=>e.tagName==='dialog');assert(find(dialog,e=>e.textContent==='日本票券 · 随身 22 券'));assert(find(dialog,e=>e.textContent==='寿司拼盘 · 8 券'));const primary=find(dialog,e=>e.className?.split(' ').includes('jp-service-primary'));assert.equal(primary.textContent,'确认预留 8 券 · 寿司拼盘');primary.onclick();assert.equal(again.state().visit?.dishId,'sushi');assert.equal(travel.id,'dining-sushi');assert.equal(again.state().visit.tokenId,null);ui.close();assert(again.state().visit);assert(again.cancel().ok);ui.dispose();
console.log('PASS: independent sushi/ramen, real earned/exchanged local tickets, single hold, settle failure, owned cancel/reload, source participants and menu confirmation');
assert.equal(copper.state().cash,11,'Dining and refunds do not consume the remaining copper; only the unrelated hold does');
assert.equal(board.state().diningReceipts.find(r=>r.outcome==='ate').currency,'japan');
assert.equal(board.state().diningReceipts.find(r=>r.outcome==='ate').price,8);
for(const paid of [false,true]){
 const old=createCopperLedger();assert(old.earn(20,'legacy-meal-earn').ok);const paymentId=`jp-dining-old-${paid}`;assert(old.reserve(8,paymentId).ok);if(paid)assert(old.settle(paymentId).ok);
 const oldBoard=createJapanServiceOrders({worldSeed:9}),seat=seats[0];const v=oldBoard.spawnDining({appearance:look,dishId:'sushi',currency:'copper',price:8,paymentId,position:P.sushiCounter,restPoint:seat.anchor,diningPoint:seat.anchor,servePoint:seat.anchor,mealPoint:seat.anchor,restSeatId:seat.id});
 const oldSaved=oldBoard.state();delete oldSaved.visits[0].currency;oldSaved.visits[0].stage='meal-ready';oldSaved.visits[0].mealId='old-meal';oldSaved.items.push({id:'old-meal',visitId:v.id,kind:'meal',location:{type:'point',id:'dining'}});
 const migrated=createCurrencyLedger({saved:old.state(),saveState:()=>{}}),b=createJapanServiceOrders({saved:oldSaved,worldSeed:9,preservePhysical:true});mounted=seat;move(seat.anchor);
 const s=createJapanPlayerService({board:b,furniture,copperLedger:migrated,getPlayer:()=>player,getMounted:()=>mounted,continuity:{version:1}});
 assert.equal(s.state().currency,'copper');assert.equal(s.state().visit.price,8);assert.equal(s.state().cash,12);
 const oldUI=createJapanPlayerServiceUI({service:s,furniture,getPlayer:()=>player,getMounted:()=>mounted,onFurniture:()=>{},onStand:()=>{},document:doc});oldUI.open();const oldDialog=doc.body.children.filter(e=>e.tagName==='dialog').at(-1);assert(find(oldDialog,e=>e.textContent==='中国铜钱 · 随身 12 铜文'));oldUI.close();oldUI.dispose();
 if(paid){assert(s.eat().ok);s.stopActivity();assert(s.eat().ok);assert.equal(migrated.state().cash,12,'Replayed first bite cannot debit a settled old order again');}
 assert(s.cancel().ok);assert.equal(migrated.state().cash,paid?12:20);assert.equal(migrated.balances().japan.cash,0);assert.equal(migrated.history().filter(t=>t.action==='reserve').length,1);b.dispose();oldBoard.dispose();mounted=null;
}
{
 const onlyCopper=createCurrencyLedger({saveState:()=>{}});assert(onlyCopper.earn(100,'other-currency-cash').ok);const b=createJapanServiceOrders({worldSeed:99}),s=createJapanPlayerService({board:b,furniture,copperLedger:onlyCopper,getPlayer:()=>player});move(P.sushiCounter);
 assert.equal(s.state().cash,0);assert.equal(s.orderDining('sushi').ok,false);assert.equal(b.state().visits.length,0);assert.equal(onlyCopper.reservations().length,0);assert(facilities.state().every(f=>!f.owner));b.dispose();
}
console.log('PASS saved Japan price/currency, legacy copper meal receipt/UI, settled first-bite replay, original-currency refunds, and local insufficient funds without seats');
