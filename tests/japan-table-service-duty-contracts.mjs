// A kitchen shift must keep one original meal through preparation, storage
// failures and handover, while Daichi still physically delivers the same tray.
import assert from 'node:assert/strict';
import test from 'node:test';
import {createJapanServiceOrders,JAPAN_SERVICE_POINTS as P} from '../source/game/japan-service-orders.js';
import {createJapanTableServiceDuty,JAPAN_TABLE_SERVICE_REGISTRY as REG} from '../source/game/japan-table-service-duty.js';
import {createJapanTableServiceEmployment} from '../source/game/japan-table-service-employment.js';
import {createFormalCareers,JAPAN_TABLE_SERVICE_ROLE as ROLE} from '../source/game/formal-careers.js';
import {createCurrencyLedger} from '../source/game/currency-ledger.js';
import {careerInterviewRoll} from '../source/game/career-applications.js';
import {GAME_MINUTES_PER_SECOND} from '../source/game/simulation-clock.js';
const clone=structuredClone,RECEIPT='jp-table-service-labor-1',HOME=[4.35,0,-11.3];
const position=p=>({x:p[0],y:p[1],z:p[2],set(x,y,z){Object.assign(this,{x,y,z});},toArray(){return [this.x,this.y,this.z];}}),actor=p=>({walking:false,ageYears:18,root:{position:position(p),rotation:{y:0}}});
function fixture({store={},clock={day:1,hour:6,seconds:0}}={}){
 const flags={board:false,employment:false,career:false},player=actor(REG),host=actor(HOME),tasks=new Map(),completed=[];
 const fails=(key,state)=>typeof flags[key]==='function'?flags[key](state):flags[key];
 const board=createJapanServiceOrders({worldSeed:1,capacity:8,preservePhysical:true,saved:store.board,saveState:s=>{if(fails('board',s))return false;store.board=clone(s);return true;}});
 const staff={active:null},duty=createJapanTableServiceDuty({board,actors:new Map([['jp-ramen',host]]),getPlayer:()=>player,customerActor:id=>actor(board.getVisit(id)?.diningPoint||[0,0,0]),assign(n,to,task){n.root.position.set(...to);tasks.set(n,task);},clear:n=>tasks.delete(n),unmount:()=>true,taskOf:n=>tasks.get(n),getStaffLife:()=>({recall:()=>true,state:()=>staff}),onComplete:(...args)=>completed.push(args)});
 let seed=1;while(careerInterviewRoll(seed,ROLE.id,clock.day)>=.6)seed++;
 const initial=createFormalCareers({getClock:()=>clock,saveState:()=>true}).state();initial.skills.cooking=initial.skills.ritual=1;
 const bank=createCurrencyLedger({saved:store.currency,saveState:s=>{store.currency=clone(s);}});
 const careers=createFormalCareers({worldSeed:seed,saved:store.careers??initial,getClock:()=>clock,saveState:s=>{if(fails('career',s))return false;store.careers=clone(s);return true;},creditWageToBank:bank.creditWageToBank});
 const employment=createJapanTableServiceEmployment({tableService:duty,careers,getPlayer:()=>player,getClock:()=>clock,saved:store.employment,saveState:s=>{if(fails('employment',s))return false;store.duty=duty.snapshot();store.employment=clone(s);return true;}});
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
 const begin=(key=null)=>{const intent=employment.intent(key?'task:'+key:'task');assert(intent);player.root.position.set(...intent.position);assert(employment.executeIntent(intent));return intent;};
 const finishStep=(key=null)=>{const intent=begin(key);tick(Math.ceil(intent.work.duration*10)+2);return intent;};
 const evidence=v=>({receiptId:RECEIPT,visitId:v.id,number:v.number,tokenId:v.tokenId,dishId:v.dishId||'ramen',itemId:v.id+':meal',position:P[v.dishId==='sushi'?'sushiTableService':'kitchen']});
 const checkpoint=()=>({store:{...clone(store),board:board.state()},duty:duty.snapshot(),attendance:employment.snapshot(),clock:clone(clock),player:player.root.position.toArray()});
 return {store,clock,flags,player,host,staff,board,duty,careers,bank,employment,completed,hire,start,spawn,tick,begin,finishStep,evidence,checkpoint};
}
function restore(s){const f=fixture({store:clone(s.store),clock:clone(s.clock)});f.player.root.position.set(...s.player);f.board.restoreClaims(s.store.board.claims);assert(f.duty.restore(s.duty));f.board.restoreClaims(s.store.board.claims);assert(f.employment.restore(s.attendance));return f;}
const meals=(f,v)=>f.board.state().items.filter(i=>i.id===v.id+':meal');

const cook=(f,v)=>{assert(f.board.claim(v.id+':cook','jp-sushi'));assert(f.board.complete(v.id+':cook','jp-sushi',{position:P[v.dishId==='sushi'?'sushiKitchen':'kitchen']}));return f.board.getVisit(v.id);};
const choose=(f,kind,id=null)=>f.duty.workChoices(RECEIPT).find(w=>w.kind===kind&&(!id||w.targetVisitId===id));
const consume=(f,v)=>assert(f.board.guestStep(v.id,'ate',{position:v.diningPoint}));

test('original Daichi claim drains, only service is lent, and same plate is served, eaten and washed before XP',()=>{
 const f=fixture(),v=cook(f,f.spawn());assert(f.board.claim(v.id+':serve','jp-ramen'));assert(f.board.pickup(v.id+':serve','jp-ramen',{position:P[v.dishId==='sushi'?'sushiPickup':'kitchenPickup']}));f.start();assert.equal(f.duty.dutyState().status,'draining');
 assert(f.board.complete(v.id+':serve','jp-ramen',{position:v.servePoint,guestPosition:v.diningPoint,itemId:v.mealId,tokenId:v.tokenId}));f.duty.update(0);assert.equal(f.duty.dutyState().status,'active');consume(f,v);f.finishStep();f.finishStep();assert.equal(f.careers.state().skillXP.ritual,0,'cleaning an NPC-served plate does not forge the full service receipt');
 const original=cook(f,f.spawn());for(const id of ['jp-ramen','jp-sushi'])assert.equal(f.board.claim(original.id+':serve',id),null);
 assert.equal(f.duty.blocksWorker('jp-sushi','cook'),false);assert.equal(f.duty.coversWorker('jp-ramen'),true);assert.equal(f.duty.coversWorker('jp-sushi'),false);
 const pickup=f.finishStep();assert.equal(pickup.work.kind,'pickup');assert(f.duty.held());const stale=f.employment.intent('task');f.finishStep();assert.equal(f.employment.executeIntent(stale),false);assert.equal(f.board.getVisit(original.id).stage,'eating');assert.equal(f.careers.state().skillXP.ritual,0);consume(f,original);assert.equal(f.board.getVisit(original.id).mealConsumed,true);assert.equal(meals(f,original)[0].dirty,true);
 assert.equal(f.finishStep().work.kind,'collect');assert.equal(f.finishStep().work.kind,'wash');assert.equal(meals(f,original).length,1);assert.equal(meals(f,original)[0].location.type,'used');assert.equal(f.careers.state().skillXP.ritual,10);assert.equal(f.employment.state().job.completedTasks,1);assert.equal(f.employment.state().job.stage,'working');
 assert.equal(f.board.guestStep(original.id,'ate',{position:original.diningPoint}),false);assert.equal(f.bank.state().balances.japan.cash,0);
});

test('two real original plates and tables remain selectable; wrong table rejection can be physically recovered and corrected',()=>{
 const f=fixture();f.start();const a=cook(f,f.spawn()),b=cook(f,f.spawn());assert.equal(f.employment.taskChoices().length,2);assert(f.employment.taskChoices().every(c=>c.action.includes('原单')));
 f.finishStep(choose(f,'pickup',b.id).key);assert.equal(f.duty.workChoices(RECEIPT).length,2);const bad=choose(f,'serve',a.id);f.finishStep(bad.key);const item=meals(f,b)[0];assert.equal(item.location.id,'wrong-table');assert.equal(item.location.targetVisitId,a.id);assert.equal(f.board.getVisit(a.id).stage,'waiting-meal');assert.equal(f.board.getVisit(b.id).stage,'waiting-meal');assert.equal(f.careers.state().lastDuty.customerReviews.at(-1).score,-1);assert.equal(f.careers.state().skillXP.ritual,0);
 const g=restore(f.checkpoint());assert.equal(g.employment.state().job.completedTasks,0);assert.equal(g.careers.state().lastDuty.customerReviews.length,1);assert.equal(g.finishStep().work.kind,'retrieve');g.finishStep(choose(g,'serve',b.id).key);consume(g,b);g.finishStep(choose(g,'collect',b.id).key);g.finishStep(choose(g,'wash',b.id).key);assert.equal(g.careers.state().lastDuty.customerReviews.length,2);assert.equal(g.careers.state().skillXP.ritual,10);assert.equal(g.board.getVisit(a.id).stage,'waiting-meal');assert.equal(g.board.state().diningReceipts.length,0);assert.equal(g.bank.history().length,0);
});

test('pickup, rejection, consuming and wash saves roll back original entity; held reload and evaluation writes replay once',()=>{
 const f=fixture();f.start();const a=cook(f,f.spawn()),b=cook(f,f.spawn());f.begin();f.flags.board=true;f.tick(12);assert.equal(f.duty.held(),false);f.flags.board=false;f.tick();assert(f.duty.held());const g=restore(f.checkpoint());assert.equal(meals(g,a)[0].location.id,'player');assert.equal(g.finishStep(choose(g,'serve',b.id).key).work.targetVisitId,b.id);assert.equal(g.careers.state().lastDuty.customerReviews.length,1);g.finishStep();
 const correct=g.begin(choose(g,'serve',a.id).key);g.flags.board=true;g.tick(15);assert(g.duty.held());assert.equal(g.board.getVisit(a.id).stage,'waiting-meal');g.flags.board=false;g.tick();assert.equal(g.board.getVisit(a.id).stage,'eating');g.flags.board=true;assert.equal(g.board.guestStep(a.id,'ate',{position:a.diningPoint}),false);assert.equal(g.board.getVisit(a.id).stage,'eating');assert.equal(meals(g,a)[0].dirty,undefined);g.flags.board=false;consume(g,a);g.finishStep();g.begin();g.flags.board=true;g.tick(23);assert(g.duty.held());assert.equal(g.board.getVisit(a.id).mealWashed,undefined);g.flags.board=false;g.flags.career=true;g.tick(2);assert.equal(g.board.getVisit(a.id).mealWashed,true);assert.equal(g.careers.state().skillXP.ritual,0);g.flags.career=false;g.flags.employment=true;g.tick(2);assert.equal(g.careers.state().skillXP.ritual,10);g.flags.employment=false;g.tick(2);const h=restore(g.checkpoint());h.tick(2);assert.equal(h.careers.state().skillXP.ritual,10);assert.equal(h.employment.state().job.completedTasks,1);assert.equal(h.careers.state().lastDuty.customerReviews.length,2);
});

test('carried pause and cancel return the same original tray only at source, with terminal save retry',()=>{
 const f=fixture();f.start();const a=cook(f,f.spawn());f.finishStep();f.player.root.position.set(0,0,35);f.tick();assert.equal(f.duty.dutyState().status,'paused');const covered=f.employment.state().job.coveredSeconds;f.tick(20);assert.equal(f.employment.state().job.coveredSeconds,covered);assert(f.duty.held());assert.equal(f.duty.releaseDuty(RECEIPT),false);
 const g=restore(f.checkpoint());assert(g.duty.held());const cancel=g.employment.intent('cancel');g.player.root.position.set(...cancel.position);g.flags.board=true;assert.equal(g.employment.executeIntent(cancel),false);assert(g.duty.held());g.flags.board=false;g.flags.employment=s=>s.job===null;g.tick(2);assert.equal(meals(g,a)[0].location.type,'point');assert.equal(meals(g,a)[0].location.id,a.dishId==='sushi'?'sushiPickup':'kitchenPickup');const h=restore(g.checkpoint());h.tick(2);assert.equal(h.employment.state().job,null);assert.equal(h.board.state().claims.length,0);assert(h.board.claim(a.id+':serve','jp-ramen'));assert.equal(h.careers.state().skillXP.ritual,0);assert.equal(h.bank.history().length,0);
});

test('a departed original customer leaves the same dirty plate available and saved until its single wash',()=>{
 const f=fixture();f.start();const v=cook(f,f.spawn());f.finishStep();f.finishStep();consume(f,v);assert(f.board.guestStep(v.id,'returned-to-desk',{position:P.reception}));assert(f.board.claim(v.id+':checkout','jp-welcome'));assert(f.board.complete(v.id+':checkout','jp-welcome',{position:P.registrar,guestPosition:P.reception,tokenId:v.tokenId}));assert(f.board.guestStep(v.id,'left',{position:P.departure}));f.board.forgetFinished([v.id]);assert(f.board.getVisit(v.id));const g=restore(f.checkpoint());assert(g.board.getVisit(v.id));g.finishStep();g.finishStep();assert.equal(g.employment.state().job.completedTasks,1);assert.equal(g.board.getVisit(v.id),null,'washing retires an already departed visitor without waiting for a vanished actor');assert.equal(g.careers.state().skillXP.ritual,10);
});

test('Daichi returns before explicit end, continuous actual attendance is paid once in the Japanese bank',()=>{
 const f=fixture();f.start();f.tick(1720);f.player.root.position.set(...REG);assert(f.employment.endShift());assert.equal(f.employment.state().job.stage,'ready');assert.equal(f.board.staffDuty('tableService'),null);assert(f.employment.claim());assert.equal(f.bank.state().balances.japan.bank,2);assert.equal(f.bank.state().balances.copper.bank,0);assert.equal(f.employment.claim(),false);assert.equal(f.bank.history().filter(t=>t.action==='wage').length,1);
});
test('Daichi is released to the existing staff life, while Haru breaks still require real Daichi cooking relief',async()=>{
 const {createJapanStaffLife}=await import('../source/game/japan-staff-life.js'),{createFacilityQueue}=await import('../source/game/npc-facilities.js');
 for(const worker of ['jp-ramen','jp-sushi']){
  const f=fixture();f.start();const homes={'jp-ramen':HOME,'jp-sushi':[4.35,0,-11.3]},actors=new Map(Object.entries(homes).map(([id,p])=>{const n=actor(p);n.station={id,npcName:id,npcAction:'ramen',npcLabel:'等候餐单'};n.home={toArray:()=>p.slice()};return [id,n];}));
  const tasks=new Map(),facilities=createFacilityQueue(),serving={idle:false,label:'送原客餐盘'};if(worker==='jp-ramen')tasks.set('jp-sushi',serving);
  const life=createJapanStaffLife({actors,board:f.board,getExternalCoverage:(id,kind)=>f.duty.coversWorker(id,kind),furniture:{items:[],facilities,releaseActor:id=>facilities.releaseActor(id)},assign:(n,to,t)=>tasks.set(n.station.id,{...t,to}),clear:n=>tasks.delete(n.station.id),unmount:()=>true,taskOf:n=>tasks.get(n.station.id),saved:{version:8,nextId:worker,dueIn:0,breakDue:{'jp-ramen':worker==='jp-ramen'?0:900,'jp-sushi':worker==='jp-sushi'?0:900}}});
  const done=id=>{const t=tasks.get(id);assert(t);actors.get(id).root.position.set(...t.to);assert.notEqual(t.onDone?.(),false);if(tasks.get(id)===t)tasks.delete(id);};
  assert.equal(f.duty.coversWorker('jp-ramen'),true);assert.equal(f.duty.coversWorker('jp-sushi'),false);for(const id of Object.keys(homes)){assert.equal(f.duty.coversWorker(id,'serve'),true);assert.equal(f.duty.coversWorker(id,'cook'),false);assert.equal(life.canClaim(id,'serve'),false);}
  life.update(.1,{hour:12});assert.equal(life.state().active.id,worker);assert.equal(life.state().active.phase,'handoff');assert.equal(life.state().active.externalCoverage,worker==='jp-ramen');
  if(worker==='jp-ramen'){assert.equal(tasks.get('jp-sushi'),serving);done('jp-ramen');assert.equal(life.canWork('jp-sushi'),true);assert.equal(life.canClaim('jp-sushi','cook'),true);}
  else{assert(tasks.get('jp-ramen').label.includes('厨房制作班'));assert.equal(life.canWork('jp-ramen'),false);f.staff.active=life.state().active;assert.equal(f.duty.blocksWorker('jp-ramen','cook'),true);done('jp-sushi');assert.equal(life.state().active.phase,'handoff');done('jp-ramen');f.staff.active=life.state().active;assert.equal(f.duty.blocksWorker('jp-ramen','cook'),false);assert.equal(life.canWork('jp-ramen'),true);assert.equal(life.canClaim('jp-ramen','cook'),true);assert.equal(life.canClaim('jp-ramen','serve'),false);const v=f.spawn();assert(f.board.claim(v.id+':cook','jp-ramen'));assert(f.board.complete(v.id+':cook','jp-ramen',{position:P[v.dishId==='sushi'?'sushiKitchen':'kitchen']}));assert.equal(meals(f,v).length,1);}
  life.dispose();f.board.dispose();
 }
});



test('a real sushi plate rejected by a ramen customer is a wrong-dish complaint; failed save cannot create phantom rejection',()=>{
 let f=fixture();f.start();const originals=[f.spawn({pauseAtRest:true}),f.spawn({pauseAtRest:true})],s=f.checkpoint();
 for(const [i,v]of originals.entries())s.store.board.visits.find(row=>row.id===v.id).diningTaste=i?{sushi:.9,ramen:.1}:{sushi:.1,ramen:.9};
 f=restore(s);const orders=originals.map(v=>{assert(f.board.guestStep(v.id,'rested',{position:v.restPoint}));assert(f.board.guestStep(v.id,'sat-to-eat',{position:v.diningPoint}));return cook(f,f.board.getVisit(v.id));});const [ramen,sushi]=orders;assert.equal(ramen.dishId,'ramen');assert.equal(sushi.dishId,'sushi');f.finishStep(choose(f,'pickup',sushi.id).key);f.begin(choose(f,'serve',ramen.id).key);f.flags.board=true;f.tick(15);assert(f.duty.held());assert.equal(f.board.state().tableReceipts.length,0);f.flags.board=false;f.tick(2);assert.equal(f.board.state().tableReceipts.length,1);assert.equal(f.board.state().tableReceipts[0].reasonCode,'wrong-dish');assert.equal(f.careers.state().lastDuty.customerReviews.at(-1).score,-1);assert.equal(f.board.getVisit(ramen.id).mealConsumed,undefined);assert.equal(f.board.getVisit(sushi.id).mealConsumed,undefined);assert.equal(f.bank.history().length,0);
});
