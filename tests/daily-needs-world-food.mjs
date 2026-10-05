// Existing Japanese item/paid-order and bath-token food events feed the same
// player identity. This is source logic, not another country-rendering matrix.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createDailyNeeds,DAILY_NEEDS_HOUR as H} from '../source/game/daily-needs.js';
import {createCurrencyLedger} from '../source/game/currency-ledger.js';
import {createJapanServiceOrders,JAPAN_SERVICE_POINTS as P} from '../source/game/japan-service-orders.js';
import {createJapanPlayerService} from '../source/game/japan-player-service.js';
import {createFacilityQueue} from '../source/game/npc-facilities.js';
const look={bodyPreset:'masculine-lean',wardrobePreset:'haori-trouser'};
const player={root:{position:{x:0,y:0,z:0},rotation:{y:0},userData:{appearance:look}}};
const move=p=>Object.assign(player.root.position,{x:p[0],y:p[1],z:p[2]});
const mealSeed={version:1,people:{player:{foodAge:12*H,toiletAge:0,receipts:{}}}};
const seats=['sushi','ramen'].map((dish,i)=>({id:'dining-'+dish,kind:'seat',diningKind:dish,center:[i?4.1:-6.56,0,i?4.75:-1.29],position:[i?4.1:-6.56,0,i?5.69:-.35],anchor:[i?4.1:-6.56,0,i?4.85:-1.19],seatY:.739}));
const bench={id:'bath-bench',kind:'seat',center:[-7.7,3.8,7.55],position:[-7.7,3.8,6.61],anchor:[-7.7,3.8,7.39],seatY:4.365};
function fixture(){
 const clock={seconds:0},needs=createDailyNeeds({saved:mealSeed,getClock:()=>clock}),ledger=createCurrencyLedger({saveState:()=>true});needs.enter('japan');
 // A finite pre-existing earned balance; the tested two meals must spend all
 // 14 coins. Production code adds no coins, supply shortcuts or replacement food.
 assert(ledger.earn(14,'test-preexisting-work-receipt').ok);
 const facilities=createFacilityQueue(),furniture={items:[...seats,bench],facilities,releaseActor:id=>facilities.releaseActor(id)};
 let mounted=null,stored,fail=false;
 const saveState=s=>{if(fail)return false;stored=structuredClone(s);needs.japanMealReceipts(s.playerMealReceipts,ledger.reservations());return true;};
 const board=createJapanServiceOrders({worldSeed:29,saveState}),service=createJapanPlayerService({board,furniture,copperLedger:ledger,getPlayer:()=>player,getMounted:()=>mounted});
 const tick=n=>{for(let i=0;i<n;i++){clock.seconds+=.1;needs.update();service.update(.1);}};
 const job=(id,kind,worker,evidence)=>{const j=board.jobs().find(j=>j.visitId===id&&j.kind===kind);assert(j,kind);assert(board.claim(j.id,worker));if(['serve','deliverMix'].includes(kind))assert(board.pickup(j.id,worker,{position:P[j.from]}));assert(board.complete(j.id,worker,evidence(j)));};
 function deliver(){const v=service.state().visit;job(v.id,'cook','jp-sushi',j=>({position:P[j.to]}));mounted=seats.find(s=>s.diningKind===v.dishId);move(mounted.anchor);tick(1);job(v.id,'serve','jp-ramen',j=>({position:v.servePoint,guestPosition:v.diningPoint,itemId:j.itemId,tokenId:null}));return v;}
 return {needs,ledger,board,service,clock,job,tick,deliver,get stored(){return stored;},saveState,mount:s=>{mounted=s;move(s.anchor);},fail:v=>fail=v,unmount:()=>mounted=null,furniture};
}

test('paid sushi and ramen need actual complete eating, survive retire/reload, and never replay',()=>{
 const f=fixture();for(const dish of['sushi','ramen']){
  f.clock.seconds+=24*H;f.needs.update();f.unmount();move(P[dish+'Counter']);assert(f.service.orderDining(dish).ok);const v=f.deliver(),before=f.needs.hunger('player');
  assert.equal(before,1,'delivery alone does not feed');assert(f.service.eat().ok);f.tick(20);assert.equal(f.needs.hunger('player'),before,'partial eating does not feed');
  move([0,0,30]);f.tick(1);assert.equal(f.service.state().activity,null);assert.equal(f.needs.hunger('player'),before,'walking away interrupts');f.mount(seats.find(s=>s.diningKind===dish));assert(f.service.eat().ok);f.tick(61);
  assert(f.needs.hunger('player')<.001);const receipt=f.stored.playerMealReceipts[0];assert.equal(receipt.mealId,v.id+':meal');assert.equal(receipt.paymentReceipt,v.paymentId);assert.equal(f.needs.japanMealReceipts([receipt],f.ledger.reservations()),false);
  const restored=createJapanServiceOrders({saved:f.stored,worldSeed:29});assert.deepEqual(restored.state().playerMealReceipts,[receipt]);
  const freshNeeds=createDailyNeeds({saved:f.needs.snapshot()});assert.equal(freshNeeds.japanMealReceipts([receipt],f.ledger.reservations()),false);
 }
 assert.equal(f.ledger.balances().copper.cash,0);assert.equal(f.ledger.reservations().filter(h=>h.status==='settled').length,2);
});

test('rejected source save grants no relief; retry retains the same consumed item',()=>{
 const f=fixture();move(P.sushiCounter);assert(f.service.orderDining('sushi').ok);f.deliver();assert(f.service.eat().ok);f.fail(true);f.tick(61);assert.equal(f.needs.hunger('player'),1);
 const pending=f.board.state().playerMealReceipts[0];assert(pending);f.fail(false);f.board.checkpoint();assert.equal(f.needs.hunger('player'),0);assert.equal(f.stored.playerMealReceipts[0].id,pending.id);
 const untreated=createDailyNeeds({saved:mealSeed});assert.equal(untreated.japanMealReceipts([pending],[]),false,'a priced meal cannot relieve without its settled payment');
});

test('existing bath-token meal is real food and uses the original kitchen item receipt',()=>{
 const f=fixture(),b=f.board,v=b.spawn({customerType:'player',name:'你',side:'men',appearance:look,restPoint:bench.anchor,diningPoint:bench.anchor,restSeatId:bench.id});
 assert(b.guestStep(v.id,'arrived',{position:P.playerReception}));f.job(v.id,'register','jp-welcome',()=>({position:P.registrar,guestPosition:P.playerReception}));f.job(v.id,'prepare','jp-incense',()=>({position:P.apothecary}));
 let current=b.getVisit(v.id);f.job(v.id,'deliverMix','jp-onsen',j=>({position:P.menService,itemId:j.itemId,tokenId:current.tokenId}));
 for(const[event,position]of[['changed',P.menChanging],['washed',P.menWashing],['collect-blend',P.menReceive]])assert(b.guestStep(v.id,event,{position}));
 const seatId=v.poolId+'-seat-1';assert(b.guestStep(v.id,'bath-mounted',{poolId:v.poolId,seatId}));assert(b.guestStep(v.id,'bathed',{seatId}));assert(b.guestStep(v.id,'dried',{position:P.menChanging}));assert(b.guestStep(v.id,'rested',{position:bench.anchor}));assert(b.guestStep(v.id,'sat-to-eat',{position:bench.anchor}));b.setPlayerDiningPresent(v.id,true);
 f.job(v.id,'cook','jp-ramen',()=>({position:P.kitchen}));current=b.getVisit(v.id);f.job(v.id,'serve','jp-sushi',j=>({position:current.servePoint,guestPosition:bench.anchor,itemId:j.itemId,tokenId:current.tokenId}));
 f.mount(bench);assert(f.service.eat().ok);f.tick(61);assert(f.needs.hunger('player')<.001);const receipt=f.stored.playerMealReceipts[0];assert.equal(receipt.supplyKind,'bath-meal');assert.equal(receipt.paymentReceipt,current.tokenId);assert.equal(receipt.mealId,current.mealId);assert.equal(f.ledger.balances().copper.cash,14,'the existing included bath meal creates no extra payment or free coin');
});

test('French cake gives bounded food relief, and foreign receipts cannot be forged from readiness',()=>{
 const f=fixture(),r={source:'france-tea-food',id:'france-tea-1-consumed',number:1,actorId:'player',orderId:'france-tea-1',mealId:'france-tea-1-tray',dishId:'tea-cake',supplyReceipt:'france-tea-1',completed:true};
 assert.equal(f.needs.mealReceipts([{...r,completed:false}]),false);assert.equal(f.needs.mealReceipts([{...r,mealId:'not-prepared'}]),false);assert(f.needs.mealReceipts([r]));assert.equal(f.needs.hunger('player'),.875);assert.equal(f.needs.mealReceipts([r]),false);
 for(const hours of[0,1,2]){
  const m=createDailyNeeds({saved:{version:1,people:{player:{foodAge:hours*H,receipts:{}}}}});assert(m.mealReceipts([r]));
  assert(Math.abs(m.hunger('player')-Math.max(0,hours*2-3)/24)<1e-12,'small snack subtracts three hours across migration offset, never a whole meal');
 }
});


test('French completed private-use receipts retain one player identity across countries and reload',()=>{
 const clock={seconds:0};let saved,fail=false;
 const needs=createDailyNeeds({saved:{version:1,people:{player:{foodAge:12*H,toiletAge:25*H,receipts:{'japan-toilet':4}}}},getClock:()=>clock,saveState:s=>{if(fail)return false;saved=s;return true;}});
 needs.enter('france');const receipt={id:'france-toilet-1',number:1,actorId:'player',source:'france-toilet',facilityId:'fr-royal-bath-toilet',completed:true};
 assert.equal(needs.toiletReceipt({...receipt,completed:false}),false);
 assert.equal(needs.toiletReceipt({...receipt,facilityId:'royal-bath'}),false);
 fail=true;assert.equal(needs.toiletReceipt(receipt),false);assert.equal(needs.read('player').toilet,1);
 fail=false;assert.equal(needs.toiletReceipt(receipt),true);assert.equal(needs.read('player').toilet,0);assert.equal(needs.hunger('player'),1);
 needs.leave();clock.seconds+=1000;needs.enter('japan');assert.equal(needs.read('player').toilet,0,'unloaded time never advances physiology');
 assert.equal(needs.toiletReceipt(receipt),false);const restored=createDailyNeeds({saved,getClock:()=>clock});restored.enter('china');
 assert.equal(restored.toiletReceipt(receipt),false);assert.equal(restored.snapshot().people.player.receipts['japan-toilet'],4);assert.equal(restored.snapshot().people.player.receipts['france-toilet'],1);
});
