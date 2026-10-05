// Original board/duty/employment boundaries: failed custody saves, physical
// same-number delivery, reload and safe handover must not lose or duplicate work.
// Only movement/furniture are stubbed; tokens, mixtures, claims and reviews use
// the real service ledger and formal career modules.
import assert from 'node:assert/strict';
import test from 'node:test';
import {createJapanServiceOrders,JAPAN_SERVICE_POINTS as P} from '../source/game/japan-service-orders.js';
import {createJapanBathDeliveryDuty,JAPAN_BATH_DELIVERY_REGISTRY as REG} from '../source/game/japan-bath-delivery-duty.js';
import {createJapanBathDeliveryEmployment} from '../source/game/japan-bath-delivery-employment.js';
import {createFormalCareers,JAPAN_BATH_DELIVERY_ROLE as ROLE} from '../source/game/formal-careers.js';
import {careerInterviewRoll} from '../source/game/career-applications.js';
import {GAME_MINUTES_PER_SECOND} from '../source/game/simulation-clock.js';

const clone=structuredClone,RECEIPT='jp-bath-delivery-labor-1';
const position=p=>({x:p[0],y:p[1],z:p[2],set(x,y,z){Object.assign(this,{x,y,z});},toArray(){return [this.x,this.y,this.z];}});
const actor=p=>({walking:false,ageYears:18,root:{position:position(p),rotation:{y:0}}});
function fixture({store={},clock={day:1,hour:6,seconds:0}}={}){
 const flags={board:false,employment:false,career:false},player=actor(REG),host=actor([-3.8,3.8,6.2]),tasks=new Map(),guests=new Map(),completed=[];
 const fails=(key,state)=>typeof flags[key]==='function'?flags[key](state):flags[key];
 const board=createJapanServiceOrders({worldSeed:1,capacity:8,preservePhysical:true,saved:store.board,saveState:s=>{if(fails('board',s))return false;store.board=clone(s);return true;}});
 for(const v of board.state().visits)guests.set(v.id,actor(v.position));
 const duty=createJapanBathDeliveryDuty({board,actors:new Map([['jp-onsen',host]]),getPlayer:()=>player,
  assign(n,to,task){n.root.position.set(...to);tasks.set(n,task);},clear:n=>tasks.delete(n),unmount:()=>true,taskOf:n=>tasks.get(n),
  getStaffLife:()=>({recall:()=>true,state:()=>({active:null})}),customerActor:id=>guests.get(id),onComplete:(...args)=>completed.push(args)});
 let seed=1;while(careerInterviewRoll(seed,ROLE.id,clock.day)>=.6)seed++;
 const initial=createFormalCareers({getClock:()=>clock,saveState:()=>true}).state();initial.skills.ritual=1;
 const careers=createFormalCareers({worldSeed:seed,saved:store.careers??initial,getClock:()=>clock,saveState:s=>{if(fails('career',s))return false;store.careers=clone(s);return true;}});
 const employment=createJapanBathDeliveryEmployment({delivery:duty,careers,getPlayer:()=>player,getClock:()=>clock,saved:store.employment,
  saveState:s=>{if(fails('employment',s))return false;store.deliveryCheckpoint=duty.snapshot();store.employment=clone(s);return true;}});
 const hire=()=>{assert(careers.apply(ROLE.id,{ageYears:18}).ok);assert(careers.reviewApplication(ROLE.id,{ageYears:18,applicationId:careers.applicationResult(ROLE.id).id}).ok);};
 const start=()=>{hire();assert(employment.accept());duty.update(0);};
 const spawn=({side='men',wait=true}={})=>{
  const v=board.spawn({side,appearance:{},name:side==='men'?'原男汤客':'原女汤客',restPoint:[0,3.8,0],diningPoint:[1,3.8,0]});assert(v);guests.set(v.id,actor(P.reception));
  assert(board.guestStep(v.id,'arrived',{position:P.reception}));assert(board.claim(v.id+':register','jp-welcome'));
  assert(board.complete(v.id+':register','jp-welcome',{position:P.registrar,guestPosition:P.reception}));assert(board.claim(v.id+':prepare','jp-incense'));
  assert(board.complete(v.id+':prepare','jp-incense',{position:P.apothecary}));
  if(wait){assert(board.guestStep(v.id,'changed',{position:P[side+'Changing']}));assert(board.guestStep(v.id,'washed',{position:P[side+'Washing']}));guests.get(v.id).root.position.set(...P[side+'Receive']);}
  return board.getVisit(v.id);
 };
 const tick=(count=1)=>{for(let n=0;n<count;n++){clock.seconds+=.1;clock.hour+=.1*GAME_MINUTES_PER_SECOND/60;employment.update(.1);duty.update(.1);}};
 const begin=()=>{const intent=employment.intent('task');assert(intent);player.root.position.set(...intent.position);assert(employment.executeIntent(intent));return intent;};
 const cargo=v=>board.state().items.find(i=>i.id===v.mixtureId);
 const evidence=(v,patch={})=>({receiptId:RECEIPT,visitId:v.id,number:v.number,tokenId:v.tokenId,itemId:v.mixtureId,position:P.menService,guestPosition:P.menReceive,...patch});
 const checkpoint=()=>{board.checkpoint(Object.fromEntries([...guests].map(([id,n])=>[id,n.root.position.toArray()])));return {store:{...clone(store),board:board.state()},duty:duty.snapshot(),attendance:employment.snapshot(),clock:clone(clock),player:player.root.position.toArray()};};
 return {store,clock,flags,player,host,board,duty,careers,employment,completed,guests,hire,start,spawn,tick,begin,cargo,evidence,checkpoint};
}
function restore(saved){const f=fixture({store:clone(saved.store),clock:clone(saved.clock)});f.player.root.position.set(...saved.player);f.board.restoreClaims(saved.store.board.claims);assert(f.duty.restore(saved.duty));f.board.restoreClaims(saved.store.board.claims);assert(f.employment.restore(saved.attendance));return f;}
const playerClaims=f=>f.board.state().claims.filter(j=>j.workerId==='player');

test('original NPC delivery drains across reload before player ownership; women retain their original queue',()=>{
 const f=fixture(),old=f.spawn(),women=f.spawn({side:'women'}),next=f.spawn();
 assert(f.board.claim(old.id+':deliverMix','jp-onsen'));assert(f.board.pickup(old.id+':deliverMix','jp-onsen',{position:P.apothecaryPickup}));
 f.start();assert.equal(f.duty.dutyState().status,'draining');assert.equal(f.board.claim(next.id+':deliverMix','player'),null);assert.equal(f.board.setStaffDuty('menDelivery',RECEIPT,'active'),false);
 const re=restore(f.checkpoint());re.duty.update(0);assert.equal(re.duty.dutyState().status,'draining');assert.equal(re.board.state().claims[0].workerId,'jp-onsen');
 assert(re.board.complete(old.id+':deliverMix','jp-onsen',re.evidence(old)));re.duty.update(0);assert.equal(re.duty.dutyState().status,'active');assert.equal(re.duty.workReceipts(RECEIPT).length,0);
 for(const id of ['jp-onsen','jp-steam'])assert.equal(re.board.claim(next.id+':deliverMix',id),null);
 assert.equal(re.board.claim(women.id+':deliverMix','player'),null);assert(re.board.claim(women.id+':deliverMix','jp-women-onsen'));
 assert.equal(re.board.claim(next.id+':deliverMix','player'),null,'the existing shared dispatch point still admits one carrier at a time');
 assert(re.board.pickup(women.id+':deliverMix','jp-women-onsen',{position:P.apothecaryPickup}));assert(re.board.complete(women.id+':deliverMix','jp-women-onsen',re.evidence(women,{position:P.womenService,guestPosition:P.womenReceive})));
 assert(re.board.claim(next.id+':deliverMix','player'));assert.equal(re.duty.workReceipts(RECEIPT).length,0);assert.equal(re.board.state().visits.length,3);
});

test('pickup rejects another visit or number and retries failed persistence without dropping the original pouch',()=>{
 const f=fixture();f.start();const v=f.spawn(),intent=f.begin();assert.equal(intent.work.kind,'pickup');
 const proof=f.evidence(v,{position:P.apothecaryPickup});
 for(const patch of [{visitId:'jp-visitor-1-999'},{number:v.number+1},{tokenId:'another-token'},{itemId:'another-mixture'},{receiptId:'jp-bath-delivery-labor-2'}])assert.equal(f.board.pickup(intent.work.jobId,'player',{...proof,...patch}),false);
 f.player.walking=true;f.tick(3);assert.equal(f.duty.dutyState().step.elapsed,0);f.player.walking=false;
 f.flags.board=true;f.tick(12);assert.deepEqual(f.cargo(v).location,{type:'point',id:'apothecaryPickup'});assert.equal(playerClaims(f).length,1);assert(f.duty.isActing());
 assert.equal(f.duty.workReceipts(RECEIPT).length,0);assert.equal(f.careers.state().skillXP.care,0);assert.equal(f.completed.length,0);
 f.flags.board=false;f.tick(2);assert.deepEqual(f.cargo(v).location,{type:'worker',id:'player'});assert.equal(f.completed.filter(([,kind])=>kind==='pickup').length,1);assert.equal(f.employment.executeIntent(intent),false);
 assert.equal(f.board.pickup(intent.work.jobId,'player',proof),false);assert.equal(f.board.state().items.filter(i=>i.id===v.mixtureId).length,1);assert.equal(f.cargo(v).tokenId,v.tokenId);
 assert.equal(f.board.state().items.find(i=>i.id===v.tokenId).location.id,v.id);assert.equal(f.employment.state().job.completedTasks,0);assert.equal(f.careers.state().skillXP.care,0);
});

test('delivery waits for the original waiting-bath guest and commits one claim, receipt and review atomically',()=>{
 const f=fixture();f.start();const v=f.spawn({wait:false});f.begin();f.tick(12);const intent=f.begin();assert.equal(intent.work.kind,'deliverMix');f.tick(20);
 assert.equal(f.board.getVisit(v.id).stage,'changing');assert.equal(f.duty.dutyState().step.elapsed,0);assert.deepEqual(f.cargo(v).location,{type:'worker',id:'player'});
 assert(f.board.guestStep(v.id,'changed',{position:P.menChanging}));assert(f.board.guestStep(v.id,'washed',{position:P.menWashing}));
 f.guests.get(v.id).root.position.set(...P.womenReceive);f.tick(20);assert.equal(f.duty.dutyState().step.elapsed,0);
 for(const patch of [{visitId:'jp-visitor-1-999'},{number:v.number+1},{tokenId:'wrong-token'},{itemId:'wrong-mixture'},{guestPosition:P.womenReceive},{position:P.womenService}])assert.equal(f.board.complete(intent.work.jobId,'player',f.evidence(v,patch)),false);
 f.guests.get(v.id).root.position.set(...P.menReceive);f.flags.board=true;f.tick(20);
 assert.deepEqual(f.cargo(v).location,{type:'worker',id:'player'});assert.equal(playerClaims(f).length,1);assert.equal(f.duty.workReceipts(RECEIPT).length,0);assert.equal(f.careers.state().lastDuty.customerReviews.length,0);assert.equal(f.careers.state().skillXP.care,0);
 f.flags.board=false;f.tick(3);assert.deepEqual(f.cargo(v).location,{type:'point',id:'menService'});assert.equal(playerClaims(f).length,0);assert.equal(f.duty.workReceipts(RECEIPT).length,1);
 const receipt=f.duty.workReceipts(RECEIPT)[0];assert.equal(receipt.customerId,v.id);assert.equal(receipt.number,v.number);assert.equal(receipt.tokenId,v.tokenId);assert.equal(receipt.itemId,v.mixtureId);assert.equal(receipt.outcome,'completed');
 assert.equal(f.careers.state().lastDuty.customerReviews.length,1);assert.equal(f.careers.state().skillXP.care,10);assert.equal(f.employment.state().job.completedTasks,1);assert.equal(f.completed.filter(([,kind])=>kind==='deliverMix').length,1);
 assert.equal(f.employment.executeIntent(intent),false);assert.equal(f.board.complete(intent.work.jobId,'player',f.evidence(v)),false);f.tick(12);assert.equal(f.careers.state().skillXP.care,10);
});

test('full carry save restores custody and pending delivery without replaying pickup or career credit',()=>{
 const f=fixture();f.start();const v=f.spawn();f.begin();f.tick(12);f.begin();f.tick(5);const checkpoint=f.checkpoint();
 const re=restore(checkpoint);assert.deepEqual(re.cargo(v).location,{type:'worker',id:'player'});assert.equal(playerClaims(re).length,1);assert.equal(re.duty.dutyState().step.kind,'deliverMix');
 re.flags.employment=true;re.tick(20);assert.equal(re.duty.workReceipts(RECEIPT).length,1);assert.equal(re.careers.state().skillXP.care,10);assert.equal(re.employment.state().job.completedTasks,0,'career receipt may persist before employment retry');
 assert.equal(re.completed.filter(([,kind])=>kind==='pickup').length,0);assert.equal(re.completed.filter(([,kind])=>kind==='deliverMix').length,1);
 re.flags.employment=false;re.tick(2);assert.equal(re.employment.state().job.completedTasks,1);assert.equal(re.careers.state().lastDuty.customerReviews.length,1);assert.equal(re.careers.state().skillXP.care,10);
 const final=restore(re.checkpoint());final.tick(15);assert.equal(final.duty.workReceipts(RECEIPT).length,1);assert.equal(final.careers.state().skillXP.care,10);assert.equal(final.employment.state().job.completedTasks,1);assert.equal(final.completed.length,0);assert.equal(final.board.state().items.filter(i=>i.id===v.mixtureId).length,1);
});

test('terminal cancel returns the original pouch only at dispatch and survives board and final employment save failures',()=>{
 const f=fixture();f.start();const v=f.spawn();f.begin();f.tick(12);f.begin();f.tick(3);f.employment.stopActivity();assert.equal(f.duty.isActing(),false);
 f.player.root.position.set(20,0,5);const covered=f.employment.state().job.coveredSeconds;f.tick(20);assert.equal(f.employment.state().job.coveredSeconds,covered);assert.deepEqual(f.cargo(v).location,{type:'worker',id:'player'});assert.equal(playerClaims(f).length,1,'leaving with a pouch cannot teleport it back to dispatch');f.player.root.position.set(...REG);
 assert.equal(f.employment.endShift(),false);let cancel=f.employment.intent('cancel');assert.deepEqual(cancel.position,P.apothecaryPickup);assert.equal(f.employment.executeIntent(cancel),false);assert.deepEqual(f.cargo(v).location,{type:'worker',id:'player'});
 f.player.root.position.set(...P.apothecaryPickup);f.flags.board=true;assert.equal(f.employment.executeIntent(cancel),false);assert.deepEqual(f.cargo(v).location,{type:'worker',id:'player'});assert.equal(playerClaims(f).length,1);assert.equal(f.duty.workReceipts(RECEIPT).length,0);
 f.flags.board=false;f.flags.employment=s=>s.job===null;assert.equal(f.employment.executeIntent(cancel),false);assert.deepEqual(f.cargo(v).location,{type:'point',id:'apothecaryPickup'});assert.equal(playerClaims(f).length,0);
 assert.equal(f.duty.workReceipts(RECEIPT).length,1);assert.equal(f.duty.workReceipts(RECEIPT)[0].outcome,'handoff');assert.equal(f.careers.state().skillXP.care,0);assert.equal(f.careers.state().lastDuty.customerReviews.length,1);
 f.flags.employment=false;f.tick(2);assert.equal(f.employment.state().job,null);assert.equal(f.employment.executeIntent(cancel),false);assert.equal(f.careers.state().skillXP.care,0);assert.equal(f.duty.workReceipts(RECEIPT).length,1);assert.equal(f.board.state().items.filter(i=>i.id===v.mixtureId).length,1);assert(f.board.claim(v.id+':deliverMix','jp-onsen'));
});

test('failed shift handover preserves the pending original order and grants no delivery XP',()=>{
 const f=fixture();f.start();const v=f.spawn();f.flags.board=true;assert.equal(f.employment.endShift(),false);assert.equal(f.duty.dutyState().status,'active');assert.equal(f.duty.workReceipts(RECEIPT).length,0);assert.deepEqual(f.cargo(v).location,{type:'point',id:'apothecaryPickup'});
 f.flags.board=false;assert(f.employment.endShift());assert.equal(f.employment.state().job.stage,'ready');assert.equal(f.careers.state().lastDuty.customerReviews.length,1);assert.equal(f.careers.state().lastDuty.customerReviews[0].bathDeliveryReceipt.outcome,'handoff');assert.equal(f.careers.state().skillXP.care,0);assert.equal(f.employment.endShift(),false);
 assert.equal(f.duty.workReceipts(RECEIPT).length,1);assert(f.board.claim(v.id+':deliverMix','jp-onsen'));assert.equal(f.careers.state().skillXP.care,0);
});

test('leaving before pickup pauses without evaluation and requires explicit same-shift resume',()=>{
 const f=fixture();f.start();const v=f.spawn();f.begin();f.tick(3);f.player.root.position.set(20,0,5);f.tick();
 assert.equal(f.duty.dutyState().status,'paused');assert.equal(playerClaims(f).length,0);assert.deepEqual(f.cargo(v).location,{type:'point',id:'apothecaryPickup'});assert.equal(f.duty.workReceipts(RECEIPT).length,0);assert.equal(f.careers.state().skillXP.care,0);
 const covered=f.employment.state().job.coveredSeconds;f.tick(20);assert.equal(f.employment.state().job.coveredSeconds,covered);
 assert(f.board.claim(v.id+':deliverMix','jp-onsen'));assert(f.board.releaseWorker('jp-onsen'));f.player.root.position.set(...REG);f.tick();assert.equal(f.duty.dutyState().status,'paused');
 const resume=f.employment.intent();assert.equal(resume.kind,'resume');assert(f.employment.executeIntent(resume));f.duty.update(0);assert.equal(f.duty.dutyState().status,'active');assert.equal(f.employment.state().job.receiptId,RECEIPT);
 f.begin();f.tick(12);f.begin();f.tick(20);assert.equal(f.duty.workReceipts(RECEIPT).length,1);assert.equal(f.careers.state().skillXP.care,10);assert.equal(f.employment.state().job.completedTasks,1);
});

test('the first accepted-job checkpoint restores to explicit resume even before the duty lease existed',()=>{
 const f=fixture();f.hire();assert(f.employment.accept());assert.equal(f.store.deliveryCheckpoint.desired,null);
 const re=fixture({store:clone(f.store),clock:clone(f.clock)});assert(re.duty.restore(f.store.deliveryCheckpoint));re.employment.update(0);assert.equal(re.duty.dutyState().status,'paused');assert.equal(re.duty.dutyState().receiptId,RECEIPT);
 const resume=re.employment.intent();assert.equal(resume.kind,'resume');assert(re.employment.executeIntent(resume));re.duty.update(0);assert.equal(re.duty.dutyState().status,'active');assert.equal(re.careers.state().lastDuty.workReceiptId,RECEIPT);assert.equal(re.careers.state().lastDuty.customerReviews.length,0);
});

test('player coverage frees the original Sora for staff life, preserves Nagi boiler work and leaves Mei/Yuki coverage intact',async()=>{
 const {createJapanStaffLife}=await import('../source/game/japan-staff-life.js'),{createFacilityQueue}=await import('../source/game/npc-facilities.js');
 const homes={'jp-onsen':[-3.8,3.8,6.2],'jp-steam':[-15,0,-10],'jp-women-onsen':[-.6,3.8,6.2],'jp-rest':[6,3.8,6.2]};
 const actors=new Map(Object.entries(homes).map(([id,p])=>{const n=actor(p);n.station={id,npcName:id,npcAction:'tidy',npcLabel:id==='jp-steam'?'照看原锅炉':'整理原布巾'};n.home={toArray:()=>p.slice()};return [id,n];}));
 const board=createJapanServiceOrders(),facilities=createFacilityQueue(),tasks=new Map(),boilerTask={idle:true,label:'照看原锅炉'};tasks.set('jp-steam',boilerTask);let covered=true;
 const life=createJapanStaffLife({actors,board,getExternalCoverage:id=>covered&&['jp-onsen','jp-steam'].includes(id),furniture:{items:[],facilities,releaseActor:id=>facilities.releaseActor(id)},assign:(n,to,t)=>tasks.set(n.station.id,{...t,to}),clear:n=>tasks.delete(n.station.id),unmount:()=>true,taskOf:n=>tasks.get(n.station.id),saved:{version:8,nextId:'jp-onsen',dueIn:0,breakDue:{'jp-onsen':0,'jp-steam':900,'jp-women-onsen':1,'jp-rest':900}}});
 const done=id=>{const t=tasks.get(id);assert(t);actors.get(id).root.position.set(...t.to);assert.notEqual(t.onDone?.(),false);if(tasks.get(id)===t)tasks.delete(id);};
 life.update(.1,{hour:12});assert.equal(life.state().active.id,'jp-onsen');assert.equal(life.state().active.externalCoverage,true);assert.equal(tasks.get('jp-steam'),boilerTask);assert.equal(life.idlePoint('jp-steam'),null);assert.equal(life.canClaim('jp-steam','deliverMix'),false);assert.equal(life.canClaim('jp-onsen','deliverMix'),false);assert.equal(life.canClaim('jp-women-onsen','deliverMix'),true);assert.equal(life.canClaim('jp-rest','deliverMix'),false);
 done('jp-onsen');life.update(.1,{hour:12});assert.equal(life.state().active.choice.id,'tea');assert.equal(life.state().decisions.people['jp-onsen'].choices,1);assert.equal(tasks.get('jp-steam'),boilerTask);
 assert.equal(life.recall('jp-onsen'),false);life.update(.1,{hour:12});done('jp-onsen');assert.equal(life.recall('jp-onsen'),true);assert.equal(life.state().interrupted,1);assert.equal(tasks.get('jp-steam'),boilerTask);
 life.update(1,{hour:12});assert.equal(life.state().active.id,'jp-women-onsen');assert.equal(life.state().active.externalCoverage,false);assert(tasks.has('jp-women-onsen'));assert(tasks.has('jp-rest'));done('jp-women-onsen');done('jp-rest');life.update(.1,{hour:12});assert.equal(life.canClaim('jp-rest','deliverMix'),true);assert.equal(life.canClaim('jp-onsen','deliverMix'),false);covered=false;assert.equal(life.canClaim('jp-onsen','deliverMix'),true);assert.equal(tasks.get('jp-steam'),boilerTask);assert.equal(actors.size,4);life.dispose();board.dispose();
});

test('carried-pouch pause retains custody while the original crew can claim other live orders',()=>{
 const f=fixture();f.start();const v=f.spawn(),women=f.spawn({side:'women'}),next=f.spawn();f.begin();f.tick(12);
 assert(f.board.claim(women.id+':deliverMix','jp-women-onsen'),'successful pickup frees the shared dispatch corner before delivery');
 assert(f.board.pickup(women.id+':deliverMix','jp-women-onsen',{position:P.apothecaryPickup}));
 f.player.root.position.set(20,0,5);f.tick();assert.equal(f.duty.dutyState().status,'paused');assert.equal(f.duty.isCovering(),false);assert.equal(f.duty.blocksWorker('jp-onsen'),false);
 assert.deepEqual(f.cargo(v).location,{type:'worker',id:'player'});assert.equal(f.board.claim(v.id+':deliverMix','jp-onsen'),null,'the same original pouch is still with its carrier');
 assert(f.board.claim(next.id+':deliverMix','jp-onsen'),'Sora can cover a different real guest while the player is away');
 const re=restore(f.checkpoint());assert.equal(re.duty.dutyState().status,'paused');assert.deepEqual(re.cargo(v).location,{type:'worker',id:'player'});assert.equal(playerClaims(re).length,1);
 re.player.root.position.set(...REG);assert(re.employment.executeIntent(re.employment.intent('resume')));re.duty.update(0);assert.equal(re.duty.dutyState().status,'draining');
 assert(re.board.pickup(next.id+':deliverMix','jp-onsen',{position:P.apothecaryPickup}));assert(re.board.complete(next.id+':deliverMix','jp-onsen',re.evidence(next)));re.duty.update(0);assert.equal(re.duty.dutyState().status,'active');
 re.begin();re.tick(20);assert.equal(re.duty.workReceipts(RECEIPT).length,1);assert.equal(re.duty.workReceipts(RECEIPT)[0].visitId,v.id);assert.equal(re.completed.filter(([,kind])=>kind==='pickup').length,0);
});
