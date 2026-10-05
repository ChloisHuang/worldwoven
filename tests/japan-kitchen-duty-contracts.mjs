// A kitchen shift must keep one original meal through preparation, storage
// failures and handover, while Daichi still physically delivers the same tray.
import assert from 'node:assert/strict';
import test from 'node:test';
import {createJapanServiceOrders,JAPAN_SERVICE_POINTS as P} from '../source/game/japan-service-orders.js';
import {createJapanKitchenDuty,JAPAN_KITCHEN_REGISTRY as REG} from '../source/game/japan-kitchen-duty.js';
import {createJapanKitchenEmployment} from '../source/game/japan-kitchen-employment.js';
import {createFormalCareers,JAPAN_KITCHEN_ROLE as ROLE} from '../source/game/formal-careers.js';
import {createCurrencyLedger} from '../source/game/currency-ledger.js';
import {careerInterviewRoll} from '../source/game/career-applications.js';
import {GAME_MINUTES_PER_SECOND} from '../source/game/simulation-clock.js';
const clone=structuredClone,RECEIPT='jp-kitchen-labor-1',HOME=[-2.75,0,-12.05];
const position=p=>({x:p[0],y:p[1],z:p[2],set(x,y,z){Object.assign(this,{x,y,z});},toArray(){return [this.x,this.y,this.z];}}),actor=p=>({walking:false,ageYears:18,root:{position:position(p),rotation:{y:0}}});
function fixture({store={},clock={day:1,hour:6,seconds:0}}={}){
 const flags={board:false,employment:false,career:false},player=actor(REG),host=actor(HOME),tasks=new Map(),completed=[];
 const fails=(key,state)=>typeof flags[key]==='function'?flags[key](state):flags[key];
 const board=createJapanServiceOrders({worldSeed:1,capacity:8,preservePhysical:true,saved:store.board,saveState:s=>{if(fails('board',s))return false;store.board=clone(s);return true;}});
 const staff={active:null},duty=createJapanKitchenDuty({board,actors:new Map([['jp-sushi',host]]),getPlayer:()=>player,assign(n,to,task){n.root.position.set(...to);tasks.set(n,task);},clear:n=>tasks.delete(n),unmount:()=>true,taskOf:n=>tasks.get(n),getStaffLife:()=>({recall:()=>true,state:()=>staff}),onComplete:(...args)=>completed.push(args)});
 let seed=1;while(careerInterviewRoll(seed,ROLE.id,clock.day)>=.6)seed++;
 const initial=createFormalCareers({getClock:()=>clock,saveState:()=>true}).state();initial.skills.cooking=initial.skills.ritual=1;
 const bank=createCurrencyLedger({saved:store.currency,saveState:s=>{store.currency=clone(s);}});
 const careers=createFormalCareers({worldSeed:seed,saved:store.careers??initial,getClock:()=>clock,saveState:s=>{if(fails('career',s))return false;store.careers=clone(s);return true;},creditWageToBank:bank.creditWageToBank});
 const employment=createJapanKitchenEmployment({kitchen:duty,careers,getPlayer:()=>player,getClock:()=>clock,saved:store.employment,saveState:s=>{if(fails('employment',s))return false;store.duty=duty.snapshot();store.employment=clone(s);return true;}});
 const hire=()=>{assert(careers.apply(ROLE.id,{ageYears:18}).ok);assert(careers.reviewApplication(ROLE.id,{ageYears:18,applicationId:careers.applicationResult(ROLE.id).id}).ok);};
 const start=()=>{hire();assert(employment.accept());duty.update(0);};
 const spawn=({pauseAtRest=false}={})=>{
  const v=board.spawn({side:'men',appearance:{},name:'原点餐来客',restPoint:[0,3.8,0],diningPoint:[1,3.8,0]});
  assert(board.guestStep(v.id,'arrived',{position:P.reception}));assert(board.claim(v.id+':register','jp-welcome'));assert(board.complete(v.id+':register','jp-welcome',{position:P.registrar,guestPosition:P.reception}));
  assert(board.claim(v.id+':prepare','jp-incense'));assert(board.complete(v.id+':prepare','jp-incense',{position:P.apothecary}));let ready=board.getVisit(v.id);
  assert(board.claim(v.id+':deliverMix','jp-onsen'));assert(board.pickup(v.id+':deliverMix','jp-onsen',{position:P.apothecaryPickup}));assert(board.complete(v.id+':deliverMix','jp-onsen',{position:P.menService,itemId:ready.mixtureId,tokenId:ready.tokenId}));
  for(const [event,point]of [['changed',P.menChanging],['washed',P.menWashing]])assert(board.guestStep(v.id,event,{position:point}));
  const seatId=ready.poolId+'-seat-1';assert(board.guestStep(v.id,'bath-mounted',{poolId:ready.poolId,seatId}));assert(board.guestStep(v.id,'bathed',{seatId}));
  assert(board.guestStep(v.id,'dried',{position:P.menChanging}));if(pauseAtRest)return board.getVisit(v.id);
  for(const [event,point]of [['rested',v.restPoint],['sat-to-eat',v.diningPoint]])assert(board.guestStep(v.id,event,{position:point}));
  return board.getVisit(v.id);
 };
 const tick=(n=1)=>{for(let i=0;i<n;i++){clock.seconds+=.1;clock.hour+=.1*GAME_MINUTES_PER_SECOND/60;employment.update(.1);duty.update(.1);}};
 const begin=()=>{const intent=employment.intent('task');assert(intent);player.root.position.set(...intent.position);assert(employment.executeIntent(intent));return intent;};
 const finishStep=()=>{const intent=begin();tick(Math.ceil(intent.work.duration*10)+2);return intent;};
 const evidence=v=>({receiptId:RECEIPT,visitId:v.id,number:v.number,tokenId:v.tokenId,dishId:v.dishId||'ramen',itemId:v.id+':meal',position:P[v.dishId==='sushi'?'sushiKitchen':'kitchen']});
 const checkpoint=()=>({store:{...clone(store),board:board.state()},duty:duty.snapshot(),attendance:employment.snapshot(),clock:clone(clock),player:player.root.position.toArray()});
 return {store,clock,flags,player,host,staff,board,duty,careers,bank,employment,completed,hire,start,spawn,tick,begin,finishStep,evidence,checkpoint};
}
function restore(s){const f=fixture({store:clone(s.store),clock:clone(s.clock)});f.player.root.position.set(...s.player);f.board.restoreClaims(s.store.board.claims);assert(f.duty.restore(s.duty));f.board.restoreClaims(s.store.board.claims);assert(f.employment.restore(s.attendance));return f;}
const meals=(f,v)=>f.board.state().items.filter(i=>i.id===v.id+':meal');
function deliver(f,v,worker='jp-ramen'){
 const meal=f.board.getVisit(v.id),pickup=P[meal.dishId==='sushi'?'sushiPickup':'kitchenPickup'];
 assert(f.board.claim(v.id+':serve',worker));assert.equal(f.board.complete(v.id+':serve',worker,{position:meal.servePoint,itemId:meal.mealId,tokenId:meal.tokenId,guestPosition:meal.diningPoint}),false,'delivery cannot precede physical pickup');
 assert(f.board.pickup(v.id+':serve',worker,{position:pickup}));assert(f.board.complete(v.id+':serve',worker,{position:meal.servePoint,itemId:meal.mealId,tokenId:meal.tokenId,guestPosition:meal.diningPoint}));
 assert.equal(meals(f,v)[0].location.id,'dining');
}

test('in-flight original cooking drains; one player cooking seat leaves original Daichi delivery live',()=>{
 const f=fixture(),v=f.spawn();assert(f.board.claim(v.id+':cook','jp-sushi'));f.start();assert.equal(f.duty.dutyState().status,'draining');
 const g=restore(f.checkpoint());g.duty.update(0);assert.equal(g.duty.dutyState().status,'draining');assert(g.board.complete(v.id+':cook','jp-sushi',{position:P.kitchen}));g.duty.update(0);assert.equal(g.duty.dutyState().status,'active');deliver(g,v);assert.equal(g.careers.state().skillXP.cooking,0);
 const orders=[g.spawn(),g.spawn()];
 for(const [index,order]of orders.entries()){
  const dishId=order.dishId;assert(['sushi','ramen'].includes(dishId));assert.equal(g.board.getVisit(order.id).dishId,dishId,'the original NPC order retains its own selected dish');
  for(const id of ['jp-sushi','jp-ramen'])assert.equal(g.board.claim(order.id+':cook',id),null);
  for(const phase of ['checked','cooked','plated']){const work=g.begin();assert.equal(work.work.kind,phase);if(index===0)assert.equal(g.board.claim(orders[1].id+':cook','player'),null,'the player holds only one cooking task at a time');g.tick(Math.ceil(work.work.duration*10)+2);assert.equal(g.board.getVisit(order.id).cooking.phase,phase);assert.equal(g.careers.state().skillXP.cooking,index*10);assert.equal(g.board.jobs().some(j=>j.id===order.id+':serve'),false);if(phase!=='checked')assert.equal(meals(g,order).length,1);}
  assert.equal(g.finishStep().work.kind,'dispatch');assert.equal(g.board.getVisit(order.id).mealId,order.id+':meal');assert.equal(meals(g,order).length,1);assert.equal(g.board.state().kitchenReceipts.filter(r=>r.visitId===order.id).length,1);assert.equal(g.board.getVisit(order.id).stage,'waiting-meal','cooking XP is earned before the guest eats');deliver(g,order);
 }
 assert.equal(g.careers.state().skillXP.cooking,20);assert.equal(g.employment.state().job.completedTasks,2);assert.equal(g.employment.state().job.stage,'working');assert.equal(g.board.state().playerMealReceipts.length,0);
});

test('saved tastes choose both dishes on original guest orders and keep their own preparation and pickup',()=>{
 const f=fixture();f.start();const originals=[f.spawn({pauseAtRest:true}),f.spawn({pauseAtRest:true})],saved=f.checkpoint();
 // The two guests reached resting through the original bath flow. These saved
 // preferences select their menu without inventing visitors, orders or meals.
 for(const [i,v]of originals.entries())saved.store.board.visits.find(row=>row.id===v.id).diningTaste=i===0?{sushi:.9,ramen:.1}:{sushi:.1,ramen:.9};
 const g=restore(saved);
 for(const [i,v]of originals.entries()){
  assert(g.board.guestStep(v.id,'rested',{position:v.restPoint}));assert(g.board.guestStep(v.id,'sat-to-eat',{position:v.diningPoint}));const dishId=i===0?'sushi':'ramen';assert.equal(g.board.getVisit(v.id).dishId,dishId);
  for(const phase of ['checked','cooked','plated','dispatch']){const step=g.finishStep();assert.equal(step.work.kind,phase);assert.equal(step.work.dishId,dishId);assert.equal(step.work.itemId,v.id+':meal');assert.deepEqual(step.position,P[phase==='dispatch'?dishId==='sushi'?'sushiPickup':'kitchenPickup':dishId==='sushi'?'sushiKitchen':'kitchen']);}
  assert.equal(g.duty.workReceipts(RECEIPT).at(-1).dishId,dishId);assert.equal(meals(g,v).length,1);deliver(g,v);
 }
 assert.equal(g.careers.state().skillXP.cooking,20);
});

test('mismatched original evidence and partial/final save failures keep one meal and award XP once after reload',()=>{
 const f=fixture();f.start();const v=f.spawn(),proof=f.evidence(v);f.begin();
 for(const patch of [{number:999},{tokenId:'wrong'},{dishId:'sushi'},{itemId:'wrong'},{visitId:'wrong'}])assert.equal(f.board.cookWork(v.id+':cook','player','checked',{...proof,...patch}),false);
 assert.equal(f.board.cookWork(v.id+':cook','player','plated',proof),false);f.flags.board=true;f.tick(15);assert.equal(f.board.getVisit(v.id).cooking,undefined);f.flags.board=false;f.tick();assert.equal(f.board.getVisit(v.id).cooking.phase,'checked');
 f.finishStep();assert.equal(meals(f,v).length,1);assert.equal(meals(f,v)[0].preparation,'cooked');assert.equal(f.careers.state().skillXP.cooking,0);
 const g=restore(f.checkpoint());assert.equal(g.board.getVisit(v.id).cooking.phase,'cooked');g.finishStep();assert.equal(meals(g,v)[0].preparation,'plated');
 assert.equal(g.board.complete(v.id+':cook','player',g.evidence(v)),false,'the finished meal must go to the original pickup, not remain at the cooktop');g.begin();g.flags.board=true;g.tick(12);assert.equal(g.board.getVisit(v.id).mealId,null);assert.equal(meals(g,v).length,1);assert.equal(g.duty.workReceipts(RECEIPT).length,0);
 g.flags.board=false;g.flags.career=true;g.tick(2);assert.equal(g.duty.workReceipts(RECEIPT).length,1);assert.equal(g.careers.state().skillXP.cooking,0);g.flags.career=false;g.flags.employment=true;g.tick(2);assert.equal(g.careers.state().skillXP.cooking,10);g.flags.employment=false;g.tick(2);assert.equal(g.employment.state().job.completedTasks,1);
 const final=restore(g.checkpoint());final.tick(12);assert.equal(final.careers.state().skillXP.cooking,10);assert.equal(final.employment.state().job.completedTasks,1);assert.equal(meals(final,v).length,1);deliver(final,v);
});

test('leaving pauses attendance, gives the same half meal back to Haru and requires an explicit return',()=>{
 const f=fixture();f.start();const v=f.spawn();f.finishStep();f.finishStep();f.player.root.position.set(0,0,0);f.tick();assert.equal(f.duty.dutyState().status,'paused');const covered=f.employment.state().job.coveredSeconds;f.tick(20);assert.equal(f.employment.state().job.coveredSeconds,covered);assert.equal(meals(f,v).length,1);assert.equal(f.duty.workReceipts(RECEIPT).length,0);
 assert(f.board.claim(v.id+':cook','jp-sushi'));f.flags.board=true;assert.equal(f.board.complete(v.id+':cook','jp-sushi',{position:P.kitchen}),false);assert.equal(f.board.getVisit(v.id).mealId,null);f.flags.board=false;assert(f.board.complete(v.id+':cook','jp-sushi',{position:P.kitchen}));assert.equal(meals(f,v).length,1);assert.equal(meals(f,v)[0].preparation,undefined);assert.equal(f.careers.state().skillXP.cooking,0);
 f.player.root.position.set(...REG);f.tick();assert.equal(f.duty.dutyState().status,'paused');assert(f.employment.executeIntent(f.employment.intent('resume')));f.duty.update(0);assert.equal(f.duty.dutyState().status,'active');assert.equal(f.employment.state().job.receiptId,RECEIPT);
});

test('cancel and terminal save failure preserve the half meal, one handoff review and no cooking XP',()=>{
 const f=fixture();f.start();const v=f.spawn();f.finishStep();f.finishStep();f.player.root.position.set(...REG);f.flags.board=true;assert.equal(f.employment.executeIntent(f.employment.intent('cancel')),false);assert.equal(f.employment.state().job.handoff,'cancel');assert.equal(f.board.state().claims.length,1);
 f.flags.board=false;f.flags.employment=s=>s.job===null;f.tick();assert.equal(f.board.state().claims.length,0);assert.equal(f.duty.workReceipts(RECEIPT).at(-1).outcome,'handoff');assert.equal(f.careers.state().skillXP.cooking,0);
 const g=restore(f.checkpoint());g.tick(2);assert.equal(g.employment.state().job,null);assert.equal(meals(g,v).length,1);assert(g.board.claim(v.id+':cook','jp-sushi'));assert(g.board.complete(v.id+':cook','jp-sushi',{position:P.kitchen}));assert.equal(meals(g,v).length,1);assert.equal(g.careers.state().lastDuty.customerReviews.length,1);assert.equal(g.bank.state().balances.japan.bank,0);
});

test('first accepted checkpoint requires resume, handover cannot reopen work and onsite wages settle once',()=>{
 const f=fixture();f.hire();assert(f.employment.accept());assert.equal(f.store.duty.desired,null);
 const g=fixture({store:clone(f.store)});g.duty.restore(f.store.duty);g.employment.update(0);assert.equal(g.duty.dutyState().status,'paused');assert(g.employment.executeIntent(g.employment.intent('resume')));g.duty.update(0);
 g.tick(1720);g.player.root.position.set(0,0,0);g.tick();const covered=g.employment.state().job.coveredSeconds;g.tick(100);assert.equal(g.employment.state().job.coveredSeconds,covered);g.player.root.position.set(...REG);assert(g.employment.executeIntent(g.employment.intent('resume')));g.duty.update(0);
 const v=g.spawn();g.flags.career=s=>s.lastDuty?.stage==='inspection';assert.equal(g.employment.endShift(),false);const h=restore(g.checkpoint());h.tick(2);assert.equal(h.employment.state().job.stage,'ready');assert.equal(h.employment.intent('task'),null);assert.equal(h.duty.workReceipts(RECEIPT).length,1);assert(h.board.claim(v.id+':cook','jp-sushi'));
 assert(h.employment.claim());assert.equal(h.bank.state().balances.japan.bank,3);assert.equal(h.careers.state().lastDuty.wage,3,'unserved handoff changes review only; pay uses the actual two onsite hours');assert.equal(h.employment.claim(),false);assert.equal(h.bank.history().filter(t=>t.action==='wage').length,1);
});

test('an unconsumed self order blocks starting, including when its original meal is ready',()=>{
 const f=fixture();f.hire();const self=f.board.spawnDining({appearance:{},dishId:'sushi',paymentId:'jp-dining-1',position:P.sushiCounter,restPoint:[-4,0,0],diningPoint:[-4,0,0],servePoint:[-3.3,0,-.85],mealPoint:[-4,1,0],restSeatId:'player-seat'});assert(self);
 assert.equal(f.employment.accept(),false);assert.equal(f.careers.state().lastDuty,null);assert.equal(f.board.staffDuty('kitchen'),null);assert(f.board.setPlayerDiningPresent(self.id,true));assert(f.board.claim(self.id+':cook','jp-sushi'));assert(f.board.complete(self.id+':cook','jp-sushi',{position:P.sushiKitchen}));deliver(f,self);assert.equal(f.employment.accept(),false);assert.equal(f.board.state().kitchenReceipts.length,0);
 assert(f.board.guestStep(self.id,'begin-eating',{position:self.diningPoint}));assert(f.board.guestStep(self.id,'ate',{position:self.diningPoint}));assert(f.employment.accept());assert.equal(f.board.state().kitchenReceipts.length,0);assert.equal(f.careers.state().skillXP.cooking,0);
});

test('only Haru has whole-role coverage; Daichi breaks retain a physical Haru handover for serving',async()=>{
 const {createJapanStaffLife}=await import('../source/game/japan-staff-life.js'),{createFacilityQueue}=await import('../source/game/npc-facilities.js');
 for(const worker of ['jp-sushi','jp-ramen']){
  const f=fixture();f.start();const homes={'jp-sushi':HOME,'jp-ramen':[4.35,0,-11.3]},actors=new Map(Object.entries(homes).map(([id,p])=>{const n=actor(p);n.station={id,npcName:id,npcAction:'ramen',npcLabel:'等候餐单'};n.home={toArray:()=>p.slice()};return [id,n];}));
  const tasks=new Map(),facilities=createFacilityQueue(),serving={idle:false,label:'送原客餐盘'};if(worker==='jp-sushi')tasks.set('jp-ramen',serving);
  const life=createJapanStaffLife({actors,board:f.board,getExternalCoverage:(id,kind)=>f.duty.coversWorker(id,kind),furniture:{items:[],facilities,releaseActor:id=>facilities.releaseActor(id)},assign:(n,to,t)=>tasks.set(n.station.id,{...t,to}),clear:n=>tasks.delete(n.station.id),unmount:()=>true,taskOf:n=>tasks.get(n.station.id),saved:{version:8,nextId:worker,dueIn:0,breakDue:{'jp-sushi':worker==='jp-sushi'?0:900,'jp-ramen':worker==='jp-ramen'?0:900}}});
  const done=id=>{const t=tasks.get(id);assert(t);actors.get(id).root.position.set(...t.to);assert.notEqual(t.onDone?.(),false);if(tasks.get(id)===t)tasks.delete(id);};
  assert.equal(f.duty.coversWorker('jp-sushi'),true);assert.equal(f.duty.coversWorker('jp-ramen'),false);for(const id of Object.keys(homes)){assert.equal(f.duty.coversWorker(id,'cook'),true);assert.equal(f.duty.coversWorker(id,'serve'),false);assert.equal(life.canClaim(id,'cook'),false);}
  life.update(.1,{hour:12});assert.equal(life.state().active.id,worker);assert.equal(life.state().active.phase,'handoff');assert.equal(life.state().active.externalCoverage,worker==='jp-sushi');
  if(worker==='jp-sushi'){assert.equal(tasks.get('jp-ramen'),serving);done('jp-sushi');assert.equal(life.canWork('jp-ramen'),true);assert.equal(life.canClaim('jp-ramen','serve'),true);}
  else{assert(tasks.get('jp-sushi').label.includes('送餐班'));assert.equal(life.canWork('jp-sushi'),false);f.staff.active=life.state().active;assert.equal(f.duty.blocksWorker('jp-sushi','serve'),true);done('jp-ramen');assert.equal(life.state().active.phase,'handoff');done('jp-sushi');f.staff.active=life.state().active;assert.equal(f.duty.blocksWorker('jp-sushi','serve'),false);assert.equal(life.canWork('jp-sushi'),true);assert.equal(life.canClaim('jp-sushi','serve'),true);assert.equal(life.canClaim('jp-sushi','cook'),false);const v=f.spawn();for(let i=0;i<4;i++)f.finishStep();deliver(f,v,'jp-sushi');assert.equal(meals(f,v)[0].location.id,'dining');}
  life.dispose();f.board.dispose();
 }
});


test('a kitchen interview reserves its host before a new paired break can borrow the same person',async()=>{
 const {createJapanStaffLife}=await import('../source/game/japan-staff-life.js'),{createFacilityQueue}=await import('../source/game/npc-facilities.js');
 const homes={'jp-sushi':HOME,'jp-ramen':[4.35,0,-11.3]},actors=new Map(Object.entries(homes).map(([id,p])=>{const n=actor(p);n.station={id,npcName:id};n.home={toArray:()=>p.slice()};return [id,n];})),tasks=new Map(),facilities=createFacilityQueue(),board=createJapanServiceOrders();let meeting=true;
 const life=createJapanStaffLife({actors,board,getMeetingHeld:id=>meeting&&id==='jp-sushi',furniture:{items:[],facilities,releaseActor:id=>facilities.releaseActor(id)},assign:(n,to,t)=>tasks.set(n.station.id,{...t,to}),clear:n=>tasks.delete(n.station.id),unmount:()=>true,taskOf:n=>tasks.get(n.station.id),saved:{version:8,nextId:'jp-ramen',dueIn:0,breakDue:{'jp-sushi':900,'jp-ramen':0}}});
 life.update(.1);assert.equal(life.state().active,null);assert.equal(tasks.size,0);meeting=false;life.update(.1);assert.equal(life.state().active.id,'jp-ramen');assert.equal(life.state().active.phase,'handoff');assert(tasks.has('jp-sushi'));life.dispose();board.dispose();
});
