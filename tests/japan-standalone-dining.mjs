// Guards independent meal identity, durable payment and owned cancellation.
// Actual movement, kitchen timing and rendered poses are covered separately.
import assert from 'node:assert/strict';
import {createJapanServiceOrders,JAPAN_SERVICE_POINTS as P} from '../source/game/japan-service-orders.js';
import {createJapanPlayerService} from '../source/game/japan-player-service.js';
import {createJapanPlayerServiceUI} from '../source/game/japan-player-service-ui.js';
import {createCopperLedger} from '../source/game/copper-ledger.js';
import {createChinaTavernLabor} from '../source/game/china-tavern-labor.js';
import {createFacilityQueue} from '../source/game/npc-facilities.js';
const look={bodyPreset:'masculine-lean',wardrobePreset:'haori-trouser'};
const player={root:{position:{x:0,y:0,z:0},rotation:{y:0},userData:{appearance:look}}};
const move=p=>Object.assign(player.root.position,{x:p[0],y:p[1],z:p[2]});
let saved,money,failSave=false,mounted=null;
const copper=createCopperLedger({saveState:s=>{if(failSave)return false;money=s;}});
const host={root:{position:{x:24.1,y:.215,z:11.4}},station:{npcPosition:[24.1,.215,11.4]}};
const labor=createChinaTavernLabor({getPlayer:()=>player,host,copperLedger:copper,document:null});
for(let n=0;n<3;n++){
 move([22.35,.215,11.7]);assert(labor.accept());
 for(const p of [[19.3,.215,18.1],[22.7,.215,18.1]]){move(p);assert(labor.startCleaning());for(let i=0;i<51;i++)labor.update(.1);}
 move([22.35,.215,11.7]);assert(labor.claim());
}
assert.equal(copper.state().cash,36,'Wallet fixture earned via actual labor state machine');
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
 mounted=null;move(P[dish+'Counter']);const before=copper.state().cash;assert(service.orderDining(dish).ok);const held=copper.state().cash;assert(!service.orderDining(dish).ok);assert.equal(copper.state().cash,held,'Repeat click cannot debit twice');
 const v=deliver(dish);failSave=true;assert(!service.eat().ok);assert.equal(service.state().visit.stage,'meal-ready');failSave=false;
 assert(service.eat().ok);for(let i=0;i<62;i++)service.update(.1);assert.equal(service.state().visit,null);assert.equal(copper.state().cash,before-v.price);assert.equal(board.state().diningReceipts.at(-1).outcome,'ate');assert.deepEqual(board.state().diningReceipts.at(-1).participants,{cook:'jp-sushi',serve:'jp-ramen'});assert(!facilities.reservation(v.restSeatId,v.id));
}
mounted=null;move(P.sushiCounter);const beforeCancel=copper.state().cash;assert(service.orderDining('sushi').ok);const cancelled=service.state().visit;const cook=board.jobs().find(j=>j.visitId===cancelled.id);assert(board.claim(cook.id,'jp-sushi'));
failSave=true;assert(!service.cancel().ok);assert(service.state().visit);failSave=false;assert(service.cancel().ok);assert.equal(copper.state().cash,beforeCancel);assert(!board.state().claims.length);assert(board.getVisit(npc.id));
assert(copper.reserve(1,'unrelated-country-hold').ok);move(P.ramenCounter);assert(service.orderDining('ramen').ok);const pending=service.state().visit;
const restoredCopper=createCopperLedger({saved:money}),restored=createJapanServiceOrders({saved,worldSeed:29}),again=createJapanPlayerService({board:restored,furniture,copperLedger:restoredCopper,getPlayer:()=>player,getMounted:()=>mounted});
assert.equal(again.state().visit,null);assert.equal(restoredCopper.reservations().find(h=>h.id===pending.paymentId).status,'refunded');assert.equal(restoredCopper.reservations().find(h=>h.id==='unrelated-country-hold').status,'reserved');assert(restored.getVisit(npc.id));assert(!restored.jobs().some(j=>j.visitId===pending.id));
// UI labels and one confirmation request. Closing the menu never creates food.
function el(tag){return {tagName:tag,children:[],style:{},open:false,setAttribute(){},append(...x){this.children.push(...x);},replaceChildren(){this.children=[];},addEventListener(){},showModal(){this.open=true;},close(){this.open=false;},remove(){}};}
const doc={head:el('head'),body:el('body'),createElement:el},find=(e,p)=>p(e)?e:e.children.map(x=>find(x,p)).find(Boolean);
let travel;
const ui=createJapanPlayerServiceUI({service:again,furniture,getPlayer:()=>player,getMounted:()=>mounted,onNavigate:()=>{},onFurniture:i=>travel=i,onStand:()=>{},document:doc});
move(P.sushiCounter);ui.interact(ui.target());const dialog=find(doc.body,e=>e.tagName==='dialog');assert(find(dialog,e=>e.textContent==='随身余额：21 铜文'));assert(find(dialog,e=>e.textContent==='寿司拼盘 · 8 铜文'));const primary=find(dialog,e=>e.className==='jp-service-primary');assert.equal(primary.textContent,'确认预留 8 铜文 · 寿司拼盘');primary.onclick();assert.equal(again.state().visit?.dishId,'sushi');assert.equal(travel.id,'dining-sushi');assert.equal(again.state().visit.tokenId,null);ui.close();assert(again.state().visit);assert(again.cancel().ok);ui.dispose();
console.log('PASS: independent sushi/ramen, real earned copper, single hold, settle failure, owned cancel/reload, source participants and menu confirmation');
