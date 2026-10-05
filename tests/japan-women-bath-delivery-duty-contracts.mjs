// Women share the real service ledger, dispatch corner and employment engine.
// These boundaries catch side leakage and lost/duplicated original pouches when
// the new role drains, saves, pauses or hands work back to Mei and Yuki.
import assert from 'node:assert/strict';
import test from 'node:test';
import {createJapanServiceOrders,JAPAN_SERVICE_POINTS as P} from '../source/game/japan-service-orders.js';
import {createJapanBathDeliveryDuty,JAPAN_WOMEN_BATH_DELIVERY_REGISTRY as REG} from '../source/game/japan-bath-delivery-duty.js';
import {createJapanBathDeliveryEmployment} from '../source/game/japan-bath-delivery-employment.js';
import {createFormalCareers,JAPAN_WOMEN_BATH_DELIVERY_ROLE as ROLE} from '../source/game/formal-careers.js';
import {careerInterviewRoll} from '../source/game/career-applications.js';
import {GAME_MINUTES_PER_SECOND} from '../source/game/simulation-clock.js';
import {createJapanStaffLife} from '../source/game/japan-staff-life.js';
import {createFacilityQueue} from '../source/game/npc-facilities.js';

const clone=structuredClone,RECEIPT='jp-women-bath-delivery-labor-1',HOME=[1.4,3.8,6.2];
const position=p=>({x:p[0],y:p[1],z:p[2],set(x,y,z){Object.assign(this,{x,y,z});},toArray(){return [this.x,this.y,this.z];}});
const actor=p=>({walking:false,ageYears:18,root:{position:position(p),rotation:{y:0}}});
function fixture({store={},clock={day:1,hour:6,seconds:0}}={}){
 const flags={board:false,employment:false,career:false},player=actor(REG),host=actor(HOME),tasks=new Map(),guests=new Map(),completed=[];
 const fails=(key,state)=>typeof flags[key]==='function'?flags[key](state):flags[key];
 const board=createJapanServiceOrders({worldSeed:1,capacity:8,preservePhysical:true,saved:store.board,saveState:s=>{if(fails('board',s))return false;store.board=clone(s);return true;}});
 for(const v of board.state().visits)guests.set(v.id,actor(v.position));
 const duty=createJapanBathDeliveryDuty({side:'women',board,actors:new Map([['jp-women-onsen',host]]),getPlayer:()=>player,
  assign(n,to,task){n.root.position.set(...to);tasks.set(n,task);},clear:n=>tasks.delete(n),unmount:()=>true,taskOf:n=>tasks.get(n),
  getStaffLife:()=>({recall:()=>true,state:()=>({active:null})}),customerActor:id=>guests.get(id),onComplete:(...args)=>completed.push(args)});
 let seed=1;while(careerInterviewRoll(seed,ROLE.id,clock.day)>=.6)seed++;
 const initial=createFormalCareers({getClock:()=>clock,saveState:()=>true}).state();initial.skills.ritual=1;
 const careers=createFormalCareers({worldSeed:seed,saved:store.careers??initial,getClock:()=>clock,saveState:s=>{if(fails('career',s))return false;store.careers=clone(s);return true;}});
 const employment=createJapanBathDeliveryEmployment({side:'women',delivery:duty,careers,getPlayer:()=>player,getClock:()=>clock,saved:store.employment,
  saveState:s=>{if(fails('employment',s))return false;store.employment=clone(s);return true;}});
 const start=()=>{assert(careers.apply(ROLE.id,{ageYears:18}).ok);assert(careers.reviewApplication(ROLE.id,{ageYears:18,applicationId:careers.applicationResult(ROLE.id).id}).ok);assert(employment.accept());duty.update(0);assert.equal(employment.state().job.receiptId,RECEIPT);};
 const spawn=({side='women',wait=true}={})=>{
  const v=board.spawn({side,appearance:{},name:side==='women'?'原女汤客':'原男汤客',restPoint:[0,3.8,0],diningPoint:[1,3.8,0]});assert(v);guests.set(v.id,actor(P.reception));
  assert(board.guestStep(v.id,'arrived',{position:P.reception}));assert(board.claim(v.id+':register','jp-welcome'));
  assert(board.complete(v.id+':register','jp-welcome',{position:P.registrar,guestPosition:P.reception}));assert(board.claim(v.id+':prepare','jp-incense'));
  assert(board.complete(v.id+':prepare','jp-incense',{position:P.apothecary}));
  if(wait){assert(board.guestStep(v.id,'changed',{position:P[side+'Changing']}));assert(board.guestStep(v.id,'washed',{position:P[side+'Washing']}));guests.get(v.id).root.position.set(...P[side+'Receive']);}
  return board.getVisit(v.id);
 };
 const tick=(count=1)=>{for(let n=0;n<count;n++){clock.seconds+=.1;clock.hour+=.1*GAME_MINUTES_PER_SECOND/60;employment.update(.1);duty.update(.1);}};
 const begin=()=>{const intent=employment.intent('task');assert(intent);player.root.position.set(...intent.position);assert(employment.executeIntent(intent));return intent;};
 const cargo=v=>board.state().items.find(i=>i.id===v.mixtureId);
 const evidence=(v,patch={})=>({receiptId:RECEIPT,visitId:v.id,number:v.number,tokenId:v.tokenId,itemId:v.mixtureId,position:P[v.side+'Service'],guestPosition:P[v.side+'Receive'],...patch});
 const checkpoint=()=>{board.checkpoint(Object.fromEntries([...guests].map(([id,n])=>[id,n.root.position.toArray()])));return {store:{...clone(store),board:board.state()},duty:duty.snapshot(),attendance:employment.snapshot(),clock:clone(clock),player:player.root.position.toArray()};};
 return {store,clock,flags,player,host,board,duty,careers,employment,completed,guests,start,spawn,tick,begin,cargo,evidence,checkpoint};
}
function restore(saved){const f=fixture({store:clone(saved.store),clock:clone(saved.clock)});f.player.root.position.set(...saved.player);f.board.restoreClaims(saved.store.board.claims);assert(f.duty.restore(saved.duty));f.board.restoreClaims(saved.store.board.claims);assert(f.employment.restore(saved.attendance));return f;}
const playerClaims=f=>f.board.state().claims.filter(j=>j.workerId==='player');

test('Mei finishes her original carried order before women lease exclusivity; men keep their queue and shared dispatch turn',()=>{
 const f=fixture(),old=f.spawn(),men=f.spawn({side:'men'}),next=f.spawn();
 assert.deepEqual(REG,[0,3.8,6.2]);assert.equal(f.duty.hostId,'jp-women-onsen');assert.equal(f.duty.meetingReady(),true);
 assert(f.board.claim(old.id+':deliverMix','jp-women-onsen'));assert(f.board.pickup(old.id+':deliverMix','jp-women-onsen',{position:P.apothecaryPickup}));
 f.start();assert.equal(f.duty.dutyState().status,'draining');assert.equal(f.board.setStaffDuty('womenDelivery',RECEIPT,'active'),false);assert.equal(f.board.claim(next.id+':deliverMix','player'),null);
 const re=restore(f.checkpoint());re.duty.update(0);assert.equal(re.duty.dutyState().status,'draining');assert.deepEqual(re.cargo(old).location,{type:'worker',id:'jp-women-onsen'});
 assert(re.board.complete(old.id+':deliverMix','jp-women-onsen',re.evidence(old)));re.duty.update(0);assert.equal(re.duty.dutyState().status,'active');
 assert.deepEqual(re.host.root.position.toArray(),HOME);assert.equal(re.duty.workReceipts(RECEIPT).length,0);assert.equal(re.board.staffDuty('menDelivery'),null);
 for(const id of ['jp-women-onsen','jp-rest'])assert.equal(re.board.claim(next.id+':deliverMix',id),null);
 assert.equal(re.board.claim(men.id+':deliverMix','player'),null);assert.equal(re.duty.blocksWorker('jp-onsen'),false);assert.equal(re.duty.blocksWorker('jp-steam'),false);
 assert(re.board.claim(men.id+':deliverMix','jp-onsen'));assert.equal(re.board.claim(next.id+':deliverMix','player'),null,'one original dispatch reservation at a time');
 assert(re.board.pickup(men.id+':deliverMix','jp-onsen',{position:P.apothecaryPickup}));assert(re.board.claim(next.id+':deliverMix','player'),'the successful men pickup frees dispatch before delivery');
 assert(re.board.complete(men.id+':deliverMix','jp-onsen',re.evidence(men)));assert.equal(re.duty.workReceipts(RECEIPT).length,0);assert.equal(re.board.state().visits.length,3);
});

test('women pickup and delivery retry failed saves with original identity and exactly one review and care award',()=>{
 const f=fixture();f.start();const v=f.spawn({wait:false}),pickup=f.begin();assert.equal(pickup.work.kind,'pickup');
 for(const patch of [{number:v.number+1},{tokenId:'another-token'},{itemId:'another-mixture'},{receiptId:'jp-bath-delivery-labor-1'}])assert.equal(f.board.pickup(pickup.work.jobId,'player',f.evidence(v,{position:P.apothecaryPickup,...patch})),false);
 f.flags.board=true;f.tick(12);assert.deepEqual(f.cargo(v).location,{type:'point',id:'apothecaryPickup'});assert.equal(playerClaims(f).length,1);assert.equal(f.duty.workReceipts(RECEIPT).length,0);assert.equal(f.completed.length,0);
 f.flags.board=false;f.tick(2);assert.deepEqual(f.cargo(v).location,{type:'worker',id:'player'});assert.equal(f.completed.filter(([,kind])=>kind==='pickup').length,1);assert.equal(f.employment.executeIntent(pickup),false);
 const delivery=f.begin();assert.deepEqual(delivery.position,P.womenService);f.tick(20);assert.equal(f.duty.dutyState().step.elapsed,0);
 assert(f.board.guestStep(v.id,'changed',{position:P.womenChanging}));assert(f.board.guestStep(v.id,'washed',{position:P.womenWashing}));f.guests.get(v.id).root.position.set(...P.menReceive);f.tick(20);assert.equal(f.duty.dutyState().step.elapsed,0);
 for(const patch of [{visitId:'jp-visitor-1-999'},{number:v.number+1},{tokenId:'another-token'},{itemId:'another-mixture'},{position:P.menService},{guestPosition:P.menReceive}])assert.equal(f.board.complete(delivery.work.jobId,'player',f.evidence(v,patch)),false);
 f.guests.get(v.id).root.position.set(...P.womenReceive);f.flags.board=true;f.tick(20);assert.deepEqual(f.cargo(v).location,{type:'worker',id:'player'});assert.equal(playerClaims(f).length,1);assert.equal(f.careers.state().skillXP.care,0);assert.equal(f.duty.workReceipts(RECEIPT).length,0);
 f.flags.board=false;f.flags.career=true;f.tick(3);assert.deepEqual(f.cargo(v).location,{type:'point',id:'womenService'});assert.equal(playerClaims(f).length,0);assert.equal(f.duty.workReceipts(RECEIPT).length,1);assert.equal(f.careers.state().skillXP.care,0);assert.equal(f.employment.state().job.completedTasks,0);
 f.flags.career=false;f.flags.employment=true;f.tick(2);assert.equal(f.careers.state().skillXP.care,10);assert.equal(f.careers.state().lastDuty.customerReviews.length,1);assert.equal(f.employment.state().job.completedTasks,0);
 f.flags.employment=false;f.tick(2);assert.equal(f.employment.state().job.completedTasks,1);assert.equal(f.completed.filter(([,kind])=>kind==='deliverMix').length,1);assert.equal(f.employment.executeIntent(delivery),false);
 const receipt=f.duty.workReceipts(RECEIPT)[0];assert.equal(receipt.side,'women');assert.equal(receipt.workReceiptId,RECEIPT);assert.equal(receipt.visitId,v.id);assert.equal(receipt.number,v.number);assert.equal(receipt.tokenId,v.tokenId);assert.equal(receipt.itemId,v.mixtureId);assert.equal(receipt.outcome,'completed');
 const re=restore(f.checkpoint());re.tick(12);assert.equal(re.duty.workReceipts(RECEIPT).length,1);assert.equal(re.careers.state().skillXP.care,10);assert.equal(re.employment.state().job.completedTasks,1);assert.equal(re.completed.length,0);assert.equal(re.board.state().items.filter(i=>i.id===v.mixtureId).length,1);
});

test('leaving with a women pouch preserves custody across pause-save failure and reload until explicit same-shift resume',()=>{
 const f=fixture();f.start();const v=f.spawn(),next=f.spawn();f.begin();f.tick(12);f.player.root.position.set(20,0,5);
 f.flags.board=true;f.tick();assert.equal(f.duty.dutyState().status,'active');assert.deepEqual(f.cargo(v).location,{type:'worker',id:'player'});assert.equal(playerClaims(f).length,1);
 f.flags.board=false;f.tick();assert.equal(f.duty.dutyState().status,'paused');assert.equal(f.duty.isCovering(),false);assert.equal(f.duty.blocksWorker('jp-women-onsen'),false);
 const covered=f.employment.state().job.coveredSeconds;f.tick(20);assert.equal(f.employment.state().job.coveredSeconds,covered);assert.equal(f.duty.workReceipts(RECEIPT).length,0);
 assert.equal(f.board.claim(v.id+':deliverMix','jp-women-onsen'),null,'Mei cannot take the original pouch still held by the player');assert(f.board.claim(next.id+':deliverMix','jp-women-onsen'),'Mei can resume other original women orders');
 const re=restore(f.checkpoint());assert.equal(re.duty.dutyState().status,'paused');assert.equal(re.employment.state().job.receiptId,RECEIPT);assert.deepEqual(re.cargo(v).location,{type:'worker',id:'player'});assert.equal(playerClaims(re).length,1);
 re.player.root.position.set(...REG);re.tick(2);assert.equal(re.duty.dutyState().status,'paused');const resume=re.employment.intent();assert.equal(resume.kind,'resume');assert(re.employment.executeIntent(resume));re.duty.update(0);assert.equal(re.duty.dutyState().status,'draining');
 assert(re.board.pickup(next.id+':deliverMix','jp-women-onsen',{position:P.apothecaryPickup}));assert(re.board.complete(next.id+':deliverMix','jp-women-onsen',re.evidence(next)));re.duty.update(0);assert.equal(re.duty.dutyState().status,'active');
 const delivery=re.begin();assert.equal(delivery.work.kind,'deliverMix');assert.equal(delivery.work.itemId,v.mixtureId);re.tick(20);assert.equal(re.duty.workReceipts(RECEIPT).length,1);assert.equal(re.duty.workReceipts(RECEIPT)[0].visitId,v.id);assert.equal(re.completed.filter(([,kind])=>kind==='pickup').length,0);assert.equal(re.careers.state().skillXP.care,10);
});

test('physical women handover retries board and employment saves, then returns the same pouch to the natural crew',()=>{
 const f=fixture();f.start();const v=f.spawn();f.begin();f.tick(12);f.employment.stopActivity();f.player.root.position.set(...REG);
 const cancel=f.employment.intent('cancel');assert.deepEqual(cancel.position,P.apothecaryPickup);assert.equal(f.employment.executeIntent(cancel),false);assert.deepEqual(f.cargo(v).location,{type:'worker',id:'player'});
 f.player.root.position.set(...P.apothecaryPickup);f.flags.board=true;assert.equal(f.employment.executeIntent(cancel),false);assert.deepEqual(f.cargo(v).location,{type:'worker',id:'player'});assert.equal(playerClaims(f).length,1);assert.equal(f.duty.workReceipts(RECEIPT).length,0);
 f.flags.board=false;f.flags.employment=s=>s.job===null;assert.equal(f.employment.executeIntent(cancel),false);assert.deepEqual(f.cargo(v).location,{type:'point',id:'apothecaryPickup'});assert.equal(playerClaims(f).length,0);assert.equal(f.duty.workReceipts(RECEIPT).length,1);assert.equal(f.duty.workReceipts(RECEIPT)[0].outcome,'handoff');assert.equal(f.careers.state().skillXP.care,0);
 const re=restore(f.checkpoint());re.tick(2);assert.equal(re.employment.state().job,null);assert.equal(re.duty.dutyState().status,'inactive');assert.equal(re.duty.workReceipts(RECEIPT).length,1);assert.equal(re.careers.state().lastDuty.customerReviews.length,1);assert.equal(re.careers.state().skillXP.care,0);assert.equal(re.employment.executeIntent(cancel),false);
 assert(re.board.claim(v.id+':deliverMix','jp-women-onsen'));assert(re.board.pickup(v.id+':deliverMix','jp-women-onsen',{position:P.apothecaryPickup}));assert(re.board.complete(v.id+':deliverMix','jp-women-onsen',re.evidence(v)));assert.equal(re.board.state().items.filter(i=>i.id===v.mixtureId).length,1);assert.equal(re.duty.workReceipts(RECEIPT).length,1);
});

test('women player coverage frees Mei while Yuki keeps her room work; ordinary Mei/Yuki relief resumes afterward',()=>{
 const homes={'jp-onsen':[-9.15,3.8,-3.7],'jp-steam':[6.05,11.4,-11.6],'jp-women-onsen':[4.3,3.8,1.4],'jp-rest':[2.5,7.6,-11.8]};
 const actors=new Map(Object.entries(homes).map(([id,p])=>{const n=actor(p);n.station={id,npcName:id,npcAction:'tidy',npcLabel:id==='jp-rest'?'整理客房被褥':'照看原岗位'};n.home={toArray:()=>p.slice()};return [id,n];}));
 const board=createJapanServiceOrders(),facilities=createFacilityQueue(),tasks=new Map(),roomTask={idle:true,label:'整理客房被褥'},boilerTask={idle:true,label:'照看原锅炉'};tasks.set('jp-rest',roomTask);tasks.set('jp-steam',boilerTask);let covered=true;
 const life=createJapanStaffLife({actors,board,getExternalCoverage:id=>covered&&['jp-women-onsen','jp-rest'].includes(id),furniture:{items:[],facilities,releaseActor:id=>facilities.releaseActor(id)},assign:(n,to,t)=>tasks.set(n.station.id,{...t,to}),clear:n=>tasks.delete(n.station.id),unmount:()=>true,taskOf:n=>tasks.get(n.station.id),saved:{version:8,nextId:'jp-women-onsen',dueIn:0,breakDue:{'jp-women-onsen':0,'jp-rest':9000,'jp-onsen':9000,'jp-steam':9000}}});
 const done=id=>{const t=tasks.get(id);assert(t);actors.get(id).root.position.set(...t.to);assert.notEqual(t.onDone?.(),false);if(tasks.get(id)===t)tasks.delete(id);};
 life.update(.1,{hour:12});assert.equal(life.state().active.id,'jp-women-onsen');assert.equal(life.state().active.externalCoverage,true);assert.equal(tasks.get('jp-rest'),roomTask);assert.equal(life.idlePoint('jp-rest'),null);assert.equal(life.idleTask('jp-rest'),null);assert.equal(life.canClaim('jp-rest','deliverMix'),false);assert.equal(life.canClaim('jp-women-onsen','deliverMix'),false);assert.equal(life.canClaim('jp-onsen','deliverMix'),true);assert.equal(life.canClaim('jp-steam','deliverMix'),false);
 done('jp-women-onsen');life.update(.1,{hour:12});assert.equal(life.state().active.choice.id,'tea');assert.equal(tasks.get('jp-rest'),roomTask);assert.equal(tasks.get('jp-steam'),boilerTask);
 done('jp-women-onsen');life.update(.1,{hour:12});done('jp-women-onsen');assert.equal(life.state().active,null);assert.equal(life.state().completed,1);assert.equal(tasks.get('jp-rest'),roomTask);
 covered=false;life.update(901,{hour:12});assert.equal(life.state().active.id,'jp-women-onsen');assert.equal(life.state().active.externalCoverage,false);assert.equal(life.state().active.phase,'handoff');assert.equal(life.canClaim('jp-rest','deliverMix'),false);assert(tasks.get('jp-rest').staffLife);assert.notEqual(tasks.get('jp-rest'),roomTask);
 done('jp-women-onsen');done('jp-rest');life.update(.1,{hour:12});assert.equal(life.canClaim('jp-rest','deliverMix'),true);assert.equal(life.canWork('jp-women-onsen'),false);assert.equal(life.canClaim('jp-onsen','deliverMix'),true);assert.equal(tasks.get('jp-steam'),boilerTask);assert.equal(actors.size,4);life.dispose();board.dispose();
});
