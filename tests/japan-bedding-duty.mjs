import assert from 'node:assert/strict';
import {createJapanServiceOrders} from '../source/game/japan-service-orders.js';
import {createJapanLinenDuty} from '../source/game/japan-linen-duty.js';
import {createJapanBeddingReceiving} from '../source/game/japan-bedding-receiving.js';
import {JAPAN_BEDDING_POINTS as P} from '../source/game/japan-bedding.js';
import {validJapanLinenReceipt} from '../source/game/japan-linen-role.js';
const vec=a=>({x:a[0],y:a[1],z:a[2],toArray(){return [this.x,this.y,this.z]},set(...p){[this.x,this.y,this.z]=p;}}),actor=(id,p)=>({station:{id},root:{position:vec(p),rotation:{y:0}},route:[],walking:false});
const yuki=actor('jp-rest',[6.2,11.4,4.2]),nao=actor('jp-herb-workshop',P.receiving),player=actor('player',[5,11.4,3.9]),actors=new Map([[yuki.station.id,yuki],[nao.station.id,nao]]),tasks=new Map();let active=null,reject=false;
const life={recall:()=>true,canWork:()=>true,state:()=>({active})},board=createJapanServiceOrders({saveState:()=>!reject}),args={board,actors,assign:(n,to,t)=>tasks.set(n.station.id,{...t,to}),clear:n=>tasks.delete(n.station.id),unmount:()=>true,taskOf:n=>tasks.get(n.station.id),getStaffLife:()=>life,getPlayer:()=>player};
const duty=createJapanLinenDuty(args),receiving=createJapanBeddingReceiving(args);
active={id:'jp-incense',reliefId:'jp-herb-workshop'};receiving.update();assert.equal(tasks.has('jp-herb-workshop'),false,'original apothecary relief wins over new stock work');active=null;
receiving.update();let task=tasks.get(nao.station.id);assert.equal(task.beddingKind,'receive');assert.notEqual(task.onDone(),false);tasks.delete(nao.station.id);assert.equal(board.bedding.state().sets[1].carryOwner,nao.station.id);receiving.update();task=tasks.get(nao.station.id);assert.equal(task.beddingKind,'store');nao.root.position.set(...task.to);assert.notEqual(task.onDone(),false);tasks.delete(nao.station.id);
for(let i=0;i<102;i++)board.bedding.observeUse(.1,true);board.bedding.observeUse(0,false);
const rid='jp-linen-labor-1';duty.requestMeeting(true);duty.update(.1);assert(duty.claimDuty(rid));duty.update(.1);assert(duty.dutyActive(rid));duty.requestMeeting(false);
for(const kind of ['collect','wash','hang','take','fold','restock']){
 if(kind==='take')for(let i=0;i<81;i++)duty.update(.1);
 const w=duty.workIntent(rid);assert(w?.bedding,'original bedding enters existing Yuki job');assert.equal(w.kind,kind);player.root.position.set(...w.position);assert(duty.executeWork(w,rid));duty.update(.1);assert(duty.isActing(),'no instant clicked completion');
 if(kind==='wash'){const old=board.bedding.snapshot();reject=true;for(let i=0;i<45;i++)duty.update(.1);assert.deepEqual(board.bedding.snapshot(),old);assert(duty.isActing());reject=false;}
 for(let i=0;i<45;i++)duty.update(.1);assert.equal(duty.isActing(),false);
}
assert.equal(board.bedding.state().sets[0].stage,'clean');assert.equal(board.linenReceipts(rid).length,1);assert(validJapanLinenReceipt(board.linenReceipts(rid)[0]));assert.equal(board.linenWork().length,6,'six original towels are still their own identities');assert(duty.canEndDuty(rid));assert(duty.releaseDuty(rid));
receiving.update();receiving.update();task=tasks.get(nao.station.id);assert.equal(task.beddingKind,'pickup');nao.root.position.set(...task.to);assert.notEqual(task.onDone(),false);tasks.delete(nao.station.id);receiving.update();assert.equal(tasks.get(nao.station.id).beddingKind,'install');
board.bedding.observeUse(.1,true);receiving.update();task=tasks.get(nao.station.id);assert.equal(task.beddingKind,'return','a newly occupied bare futon returns carried bedding instead of holding Nao forever');nao.root.position.set(...task.to);assert.notEqual(task.onDone(),false);tasks.delete(nao.station.id);assert.equal(board.bedding.state().sets[0].stage,'clean');assert.equal(receiving.blocksWorker(nao.station.id),false);
console.log('PASS original Nao relief, physical finite receiving, existing Yuki player job with timed six-step bedding work and save retry, unchanged towels, single receipt, occupied futon return without trapping clerk');
// Actual staff-life selection cannot hand off a worker carrying the cover,
// but receives a scheduling opportunity as soon as it is laid down to air.
{
 const {createJapanStaffLife}=await import('../source/game/japan-staff-life.js');
 const {createFacilityQueue}=await import('../source/game/npc-facilities.js');
 const b=createJapanServiceOrders(),t=new Map(),y=actor('jp-rest',[2.5,7.6,-11.8]),m=actor('jp-women-onsen',[1.35,3.8,-2.16]);
 for(const n of [y,m]){n.home=n.root.position;n.root.userData={appearance:{}};n.station.npcName=n.station.id;}
 const aa=new Map([[y.station.id,y],[m.station.id,m]]),facilities=createFacilityQueue();let d;
 const common={actors:aa,board:b,assign:(n,to,task)=>t.set(n.station.id,{...task,to}),clear:n=>t.delete(n.station.id),unmount:()=>true,taskOf:n=>t.get(n.station.id)};
 const l=createJapanStaffLife({...common,worldSeed:1,furniture:{items:[],facilities,releaseActor:id=>facilities.releaseActor(id)},saved:{version:8,nextId:'jp-rest',dueIn:0,breakDue:{'jp-rest':0,'jp-women-onsen':10000}},getMeetingHeld:id=>id==='jp-rest'&&d?.holdsHost()});
 d=createJapanLinenDuty({...common,getStaffLife:()=>l});
 for(let i=0;i<102;i++)b.bedding.observeUse(.1,true);b.bedding.observeUse(0,false);
 for(const stage of ['collected','wet','drying']){
  d.update(.1);const task=t.get(y.station.id);assert(task?.linenWork);l.update(.1,{});assert.equal(l.state().active,null,'break must wait for real linen task and cargo');y.root.position.set(...task.to);assert.notEqual(task.onDone(),false);t.delete(y.station.id);assert.equal(b.bedding.state().sets[0].stage,stage);
 }
 d.update(.1);assert.equal(t.has(y.station.id),false,'one safe no-cargo scheduling opportunity');l.update(.1,{});assert.equal(l.state().active.id,'jp-rest');assert.equal(l.state().active.phase,'handoff');assert.equal(b.bedding.state().sets[0].carryOwner,null);
 console.log('PASS real staff-life defers Yuki meal/rest handoff while collecting/carrying and takes safe airing opportunity without starvation');
}
{
 const {createFormalCareers}=await import('../source/game/formal-careers.js'),{careerInterviewRoll}=await import('../source/game/career-applications.js'),{createCurrencyLedger}=await import('../source/game/currency-ledger.js'),{GAME_MINUTES_PER_SECOND}=await import('../source/game/simulation-clock.js');
 const clock={day:0,hour:6,seconds:0};let seed=1;while(careerInterviewRoll(seed,'jp-linen-service',0)>=.2)seed++;
 const initial=createFormalCareers({getClock:()=>clock,saveState:()=>true}).state();initial.skills.ritual=1;const bank=createCurrencyLedger({saveState:()=>true});let saved;
 let careers=createFormalCareers({saved:initial,worldSeed:seed,getClock:()=>clock,creditWageToBank:bank.creditWageToBank,saveState:s=>{saved=structuredClone(s);return true;}});
 assert(careers.apply('jp-linen-service',{ageYears:18}).ok);assert(careers.reviewApplication('jp-linen-service',{ageYears:18,applicationId:careers.applicationResult('jp-linen-service').id}).ok);assert(careers.beginDuty({receiptId:rid}).ok);
 const receipt=board.linenReceipts(rid)[0];assert.equal(careers.recordJapanLinenReview(receipt).xpGained,10);assert.equal(careers.recordJapanLinenReview(receipt).xpGained,0);assert.equal(bank.state().balances.japan.bank,0,'bedding actions do not mint piecework money');
 careers=createFormalCareers({saved,worldSeed:seed,getClock:()=>clock,creditWageToBank:bank.creditWageToBank,saveState:s=>{saved=structuredClone(s);return true;}});assert.equal(careers.state().loadError,null);assert(careers.recordJapanLinenReview(receipt).replayed);
 clock.hour=12;clock.seconds=6*60/GAME_MINUTES_PER_SECOND;assert(careers.laborEvent('completed',{roleId:'jp-linen-service',receiptId:rid,coveredSeconds:clock.seconds,completedTasks:1}).ok);assert(careers.laborEvent('inspected',{roleId:'jp-linen-service',receiptId:rid}).ok);assert(careers.settle().ok);assert.equal(bank.state().balances.japan.bank,7);careers.settle();assert.equal(bank.state().balances.japan.bank,7);
 console.log('PASS actual bedding-ledger receipt reaches original formal career once, cold XP replay and fixed-time Japanese bank wages unchanged');
}
{
 const first=createJapanServiceOrders();assert(first.bedding.receive('jp-bedding-2','incoming',{expectedCycle:0,position:P.receiving}));
 const restored=createJapanServiceOrders({saved:first.state()}),tt=new Map(),n=actor('jp-herb-workshop',[4,0,-30]);
 const r=createJapanBeddingReceiving({board:restored,actors:new Map([[n.station.id,n]]),assign:(a,to,t)=>tt.set(a.station.id,{...t,to}),clear:a=>tt.delete(a.station.id),taskOf:a=>tt.get(a.station.id),getStaffLife:()=>life});
 assert.equal(restored.bedding.state().sets[1].carryOwner,n.station.id);r.update();assert.equal(tt.get(n.station.id).beddingKind,'store');assert.deepEqual(tt.get(n.station.id).to,P.restock);assert.equal(restored.bedding.state().sets.length,2);
 console.log('PASS cold original Nao cargo retains same unique set and resumes store journey without receiving or creating a second copy');
}
{
 const {createJapanStaffLife}=await import('../source/game/japan-staff-life.js'),{createFacilityQueue}=await import('../source/game/npc-facilities.js');
 const b=createJapanServiceOrders(),t=new Map(),y=actor('jp-rest',P.guest),m=actor('jp-women-onsen',[1.35,3.8,-2.16]);for(const n of [y,m]){n.home=n.root.position;n.root.userData={appearance:{}};n.station.npcName=n.station.id;}
 const aa=new Map([[y.station.id,y],[m.station.id,m]]),facilities=createFacilityQueue();let d;
 const common={actors:aa,board:b,assign:(n,to,task)=>t.set(n.station.id,{...task,to}),clear:n=>t.delete(n.station.id),unmount:()=>true,taskOf:n=>t.get(n.station.id)};
 const l=createJapanStaffLife({...common,worldSeed:1,furniture:{items:[],facilities,releaseActor:id=>facilities.releaseActor(id)},saved:{version:8,nextId:'jp-rest',dueIn:0,breakDue:{'jp-rest':0,'jp-women-onsen':10000}},getMeetingHeld:id=>id==='jp-rest'&&d?.holdsHost()});d=createJapanLinenDuty({...common,getStaffLife:()=>l});
 for(let i=0;i<102;i++)b.bedding.observeUse(.1,true);b.bedding.observeUse(0,false);d.update(.1);assert(t.get(y.station.id)?.linenWork);assert(d.holdsHost());
 b.bedding.observeUse(.1,true);d.update(.1);assert.equal(t.has(y.station.id),false,'new occupant cancels unladen original collection before stripping');assert.equal(d.holdsHost(),false);l.update(.1,{});assert.equal(l.state().active.id,y.station.id);assert.equal(l.state().active.phase,'handoff');assert.equal(b.bedding.state().sets[0].stage,'dirty');assert.equal(b.bedding.state().sets[0].carryOwner,null);
 console.log('PASS newly occupied futon cancels unladen collect task, preserves dirty cover and lets original staff-life handoff proceed');
}
