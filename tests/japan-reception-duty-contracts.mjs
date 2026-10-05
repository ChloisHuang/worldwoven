// Regressions found at real board/duty/employment save boundaries. Only actor
// movement and furniture visuals are stubbed; no browser or 3D engine is needed.
import assert from 'node:assert/strict';
import test from 'node:test';
import {createJapanServiceOrders,JAPAN_SERVICE_POINTS as P} from '../source/game/japan-service-orders.js';
import {createJapanReceptionDuty,JAPAN_RECEPTION_REGISTRY as REG} from '../source/game/japan-reception-duty.js';
import {createJapanReceptionEmployment} from '../source/game/japan-reception-employment.js';
import {createFormalCareers,JAPAN_RECEPTION_ROLE as ROLE} from '../source/game/formal-careers.js';
import {careerInterviewRoll} from '../source/game/career-applications.js';
import {GAME_MINUTES_PER_SECOND} from '../source/game/simulation-clock.js';

const clone=structuredClone,RECEIPT='jp-reception-labor-1';
const position=p=>({x:p[0],y:p[1],z:p[2],set(x,y,z){Object.assign(this,{x,y,z});},toArray(){return [this.x,this.y,this.z];}});
const actor=p=>({walking:false,ageYears:18,root:{position:position(p),rotation:{y:0}}});
function fixture({store={},clock={day:1,hour:6,seconds:0}}={}){
 const flags={board:false,employment:false},player=actor(REG),host=actor([-6.65,0,5.7]),tasks=new Map(),guests=new Map(),completed=[],released=[];
 const board=createJapanServiceOrders({worldSeed:1,saved:store.board,saveState:s=>{if(flags.board)return false;store.board=clone(s);return true;}});
 for(const v of board.state().visits)guests.set(v.id,actor(P.reception));
 const duty=createJapanReceptionDuty({board,actors:new Map([['jp-welcome',host]]),getPlayer:()=>player,
  assign(n,to,task){n.root.position.set(...to);tasks.set(n,task);},clear:n=>tasks.delete(n),unmount:()=>true,taskOf:n=>tasks.get(n),
  getStaffLife:()=>({recall:()=>true,state:()=>({active:null})}),customerActor:id=>guests.get(id),
  furniture:{facilities:{release:(...args)=>released.push(args)}},onComplete:(...args)=>completed.push(args)});
 let seed=1;while(careerInterviewRoll(seed,ROLE.id,clock.day)>=.6)seed++;
 const careers=createFormalCareers({worldSeed:seed,saved:store.careers,getClock:()=>clock,saveState:s=>{store.careers=clone(s);return true;}});
 const employment=createJapanReceptionEmployment({reception:duty,careers,getPlayer:()=>player,getClock:()=>clock,saved:store.employment,
  saveState:s=>{if(flags.employment)return false;store.receptionCheckpoint=duty.snapshot();store.employment=clone(s);return true;}});
 const hire=()=>{assert(careers.apply(ROLE.id,{ageYears:18}).ok);assert(careers.reviewApplication(ROLE.id,{ageYears:18,applicationId:careers.applicationResult(ROLE.id).id}).ok);};
 const start=()=>{hire();assert(employment.accept());duty.update(0);assert.equal(duty.dutyState().status,'active');};
 const spawn=()=>{const v=board.spawn({side:'men',appearance:{},name:'原来客',restPoint:[0,3.8,0],diningPoint:[1,3.8,0]});guests.set(v.id,actor(P.reception));assert(board.guestStep(v.id,'arrived',{position:P.reception}));return v;};
 const tick=(count=1)=>{for(let n=0;n<count;n++){clock.seconds+=.1;clock.hour+=.1*GAME_MINUTES_PER_SECOND/60;employment.update(.1);duty.update(.1);}};
 const begin=()=>{player.root.position.set(...P.registrar);const intent=employment.intent('task');assert(intent);assert(employment.executeIntent(intent));return intent;};
 return {store,clock,flags,player,host,board,duty,careers,employment,completed,released,hire,start,spawn,tick,begin};
}

test('draining checkpoint restores the original NPC claim before admitting the player',()=>{
 const f=fixture(),v=f.spawn(),job=f.board.jobs().find(j=>j.kind==='register');
 assert(f.board.claim(job.id,'jp-market-tea'));assert(f.duty.claimDuty(RECEIPT));f.duty.update(0);
 assert.equal(f.duty.dutyState().status,'draining');const savedBoard=f.board.state(),savedDuty=f.duty.snapshot();
 const re=fixture({store:{board:savedBoard}});
 // Match operations.restore: old board claims must exist before the lease.
 re.board.restoreClaims(savedBoard.claims);assert(re.duty.restore(savedDuty));re.duty.update(0);
 assert.equal(re.duty.dutyState().status,'draining');assert.deepEqual(re.board.state().claims.map(j=>[j.id,j.workerId]),[[job.id,'jp-market-tea']]);
 assert.equal(re.board.claim(job.id,'player'),null);assert.equal(re.board.setReceptionDuty(RECEIPT,'active'),false);
 assert(re.board.complete(job.id,'jp-market-tea',{position:P.registrar,guestPosition:P.reception}));re.duty.update(0);
 assert.equal(re.duty.dutyState().status,'active');assert.equal(re.board.getVisit(v.id).stage,'changing');assert.equal(re.board.state().items.filter(i=>i.kind==='token').length,1);
 assert.equal(re.board.receptionReceipts(RECEIPT).length,0,'the original NPC task is not player work');
});

test('temporary departure resumes the original token and records one real completion',()=>{
 const f=fixture();f.start();const v=f.spawn();f.begin();
 f.player.walking=true;f.tick();assert(f.duty.isActing(),'the final walking arrival frame waits instead of cancelling the action');assert.equal(f.duty.dutyState().step.elapsed,0);
 f.player.walking=false;f.tick(5);f.player.root.position.set(20,0,5);f.duty.update(.1);f.employment.update(.1);
 assert.equal(f.duty.dutyState().status,'paused');assert.equal(f.board.state().claims.length,0);assert.equal(f.board.receptionReceipts(RECEIPT).length,0,'a resumable pause must not seal a handoff review');
 assert.equal(f.board.getVisit(v.id).tokenId,null);assert.equal(f.careers.state().lastDuty.customerReviews.length,0);
 f.player.root.position.set(...REG);const resume=f.employment.intent('resume');assert(resume);assert(f.employment.executeIntent(resume));f.duty.update(0);f.begin();f.tick(30);
 assert.equal(f.board.getVisit(v.id).stage,'changing');assert.equal(f.board.state().items.filter(i=>i.kind==='token').length,1);
 assert.equal(f.board.receptionReceipts(RECEIPT).length,1);assert.equal(f.board.receptionReceipts(RECEIPT)[0].outcome,'completed');
 assert.equal(f.careers.state().lastDuty.customerReviews.length,1);assert.equal(f.careers.state().skillXP.writing,10);assert.equal(f.employment.state().job.completedTasks,1);
 f.tick(20);assert(f.careers.recordJapanReceptionReview(f.board.receptionReceipts(RECEIPT)[0]).replayed);
 assert.equal(f.careers.state().lastDuty.customerReviews.length,1);assert.equal(f.careers.state().skillXP.writing,10);assert.equal(f.employment.state().job.completedTasks,1);assert.equal(f.completed.length,1);
});

test('the first accepted-job save with desired:null reloads to an explicit resume',()=>{
 const f=fixture();f.hire();assert(f.employment.accept());
 // main captures the world inside saveState, before accept claims the desk.
 assert.equal(f.store.receptionCheckpoint.desired,null);assert.equal(f.store.employment.job.receiptId,RECEIPT);
 const re=fixture({store:clone(f.store),clock:clone(f.clock)});assert.equal(re.duty.dutyState().status,'paused');
 assert(re.duty.restore(f.store.receptionCheckpoint));assert.equal(re.duty.dutyState().status,'inactive');
 re.employment.update(0);assert.equal(re.duty.dutyState().receiptId,RECEIPT);assert.equal(re.duty.dutyState().status,'paused');
 const resume=re.employment.intent();assert.equal(resume.kind,'resume');assert(re.employment.executeIntent(resume));re.duty.update(0);
 assert.equal(re.duty.dutyState().status,'active');re.tick(12);assert(re.employment.state().job.coveredSeconds>0);assert.equal(re.employment.state().job.receiptId,RECEIPT);
 assert.equal(re.careers.state().lastDuty.workReceiptId,RECEIPT);assert.equal(re.careers.state().lastDuty.customerReviews.length,0);
});

test('failed board saves preserve the same token task and a restored single claim',()=>{
 const f=fixture();f.start();const first=f.spawn(),second=f.spawn(),intent=f.begin();f.flags.board=true;f.tick(30);
 assert.equal(f.board.getVisit(first.id).stage,'check-in');assert.equal(f.board.getVisit(first.id).tokenId,null);assert.equal(f.board.state().items.length,0);assert.equal(f.board.receptionReceipts(RECEIPT).length,0);assert(f.duty.isActing());
 assert.deepEqual(f.board.state().claims.map(j=>[j.id,j.workerId]),[[intent.work.jobId,'player']]);assert.equal(f.board.claim(intent.work.jobId,'jp-market-tea'),null);
 assert.equal(f.board.claim(`${second.id}:register`,'player'),null);assert.equal(f.board.claim(`${second.id}:register`,'jp-welcome'),null);
 assert.equal(f.careers.state().lastDuty.customerReviews.length,0);assert.equal(f.careers.state().skillXP.writing,0);assert.equal(f.completed.length,0);
 const checkpoint={board:f.board.state(),duty:f.duty.snapshot()},store={...clone(f.store),board:checkpoint.board};
 const re=fixture({store,clock:clone(f.clock)});re.player.root.position.set(...P.registrar);
 re.board.restoreClaims(checkpoint.board.claims);assert(re.duty.restore(checkpoint.duty));re.board.restoreClaims(checkpoint.board.claims);
 assert.deepEqual(re.board.state().claims.map(j=>[j.id,j.workerId]),[[intent.work.jobId,'player']]);assert(re.duty.isActing());
 re.tick(2);assert.equal(re.board.getVisit(first.id).stage,'changing');assert.equal(re.board.state().items.filter(i=>i.id===first.id+':token').length,1);
 assert.equal(re.board.receptionReceipts(RECEIPT).length,1);assert.equal(re.careers.state().lastDuty.customerReviews.length,1);assert.equal(re.careers.state().skillXP.writing,10);assert.equal(re.employment.state().job.completedTasks,1);
 assert.equal(re.employment.executeIntent(intent),false,'an old intent cannot issue the same token again');assert.equal(re.completed.length,1);assert.equal(re.released.length,1);assert.equal(re.board.state().claims.length,0);
});

test('player coverage keeps Koharu original leisure and Tomo luggage home with safe recall',async()=>{
 const {createJapanStaffLife}=await import('../source/game/japan-staff-life.js'),{createFacilityQueue}=await import('../source/game/npc-facilities.js');
 const actors=new Map(['jp-welcome','jp-market-tea'].map((id,i)=>{const n=actor(i?[24.8,0,7.6]:[-6.65,0,5.7]);n.station={id,npcName:id,npcAction:'tidy',npcLabel:i?'整理行李':'登记客簿'};n.home={toArray:()=>i?[24.8,0,7.6]:[-5.4,0,5.7]};return [id,n];}));
 const board=createJapanServiceOrders(),facilities=createFacilityQueue(),tasks=new Map();let covered=true;
 const life=createJapanStaffLife({actors,board,getReceptionCoverage:()=>covered,furniture:{items:[],facilities,releaseActor:id=>facilities.releaseActor(id)},assign:(n,to,t)=>tasks.set(n.station.id,{...t,to}),clear:n=>tasks.delete(n.station.id),unmount:()=>true,taskOf:n=>tasks.get(n.station.id),saved:{version:8,nextId:'jp-welcome',dueIn:0,breakDue:{'jp-welcome':0,'jp-market-tea':900}}});
 const done=id=>{const task=tasks.get(id);actors.get(id).root.position.set(...task.to);task.onDone?.();if(tasks.get(id)===task)tasks.delete(id);};
 life.update(.1,{hour:12});assert.equal(life.state().active.id,'jp-welcome');assert.equal(life.state().active.externalCoverage,true);assert(tasks.has('jp-welcome'));assert(!tasks.has('jp-market-tea'),'Tomo is not pulled out of the original luggage shop');assert.equal(life.idlePoint('jp-market-tea'),null);assert.equal(life.canWork('jp-market-tea'),true);
 assert.equal(life.canClaim('jp-market-tea','register'),false);assert.equal(life.canClaim('jp-welcome','checkout'),false);
 done('jp-welcome');life.update(.1,{hour:12});assert.equal(life.state().decisions.people['jp-welcome'].choices,1);assert.equal(life.state().active.choice.id,'tea','Koharu keeps the authored reachable tea choice');
 assert.equal(life.recall('jp-welcome'),false);assert.equal(life.state().active.phase,'returning');life.update(.1,{hour:12});done('jp-welcome');assert.equal(life.recall('jp-welcome'),true);assert.equal(life.state().interrupted,1);
 covered=false;assert.equal(life.canClaim('jp-welcome','register'),true);assert.equal(life.canClaim('jp-market-tea','register'),false);assert.equal(actors.size,2);life.dispose();board.dispose();
});
