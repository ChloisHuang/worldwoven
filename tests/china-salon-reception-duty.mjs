import assert from 'node:assert/strict';
import {createChinaSalonReceptionDuty,CHINA_SALON_RECEPTION_POINTS as P} from '../source/game/china-salon-reception-duty.js';
import {createSalonReceptionSlot,SALON_RECEPTION_ROLE as R} from '../source/game/china-salon-reception-role.js';
import {CHINA_OFFICIAL_IDS} from '../source/game/china-official-economy.js';
import {SALON_ROOMS} from '../source/game/china-tavern-salon-rooms.js';
const ID='cn-salon-reception-labor-1';
const actor=(id,p)=>({station:{id},alive:true,root:{position:{x:p[0],y:p[1],z:p[2]},rotation:{y:0}},route:[],locomotion:{walkSpeed:1.3},animate(){}});
function fixture(saved=null){
 const host=actor(R.incumbentId,P.home),player=actor('player',P.registry);let boundary=true,done=null,fail=false,finishFail=false,personal=null,acting=false,stored=saved,moveCount=0;
 const slot=createSalonReceptionSlot({saved:saved?.chinaSalonReceptionSlot,resolveActor:()=>host,getPlayer:()=>player,canAssign:()=>true,canRelease:()=>boundary});
 const salon={receptionist:host,receptionWorkBoundary:()=>boundary,receptionPersonalState:()=>personal,receptionPlayerActing:()=>acting,stopReceptionPlayerWork(){acting=false;},receptionPlayerIntent:()=>null,receptionPlayerCompleted:()=>done,
  finishReceptionPlayerOrder(id){if(finishFail||done?.sessionId!==id)return false;done=null;boundary=true;return true;},cancelReceptionPlayerOrder(){done=null;boundary=true;return true;}};
 const options={salon,slot,npcs:[host],getPlayer:()=>player,getClock:()=>({hour:12,day:1}),saved:saved?.duty,saveState(next,patch){if(fail)return false;stored={...stored,duty:structuredClone(next),...structuredClone(patch)};return true;},planPath:(_,to)=>[to],doors:{routeStep(route,pos){if(route[0]&&Math.hypot(pos.x-route[0].x,pos.z-route[0].z)<.04)route.shift();return {waypoint:route[0]};}},moveActor(n,x,z){n.root.position.x+=x;n.root.position.z+=z;moveCount++;}};
 const duty=createChinaSalonReceptionDuty(options);
 return {host,player,slot,salon,duty,get stored(){return structuredClone(stored);},get moveCount(){return moveCount;},set boundary(v){boundary=v;},set done(v){done=v;boundary=false;},set fail(v){fail=v;},set finishFail(v){finishFail=v;},set personal(v){personal=v;},tick(n=1){for(let i=0;i<n;i++)duty.update(.1,i*.1);}};
}
const f=fixture();assert(f.duty.meetingReady());assert(f.duty.claimDuty(ID));assert(f.duty.handoffPending());assert.equal(f.slot.state().holderId,R.incumbentId);
f.boundary=false;f.tick(30);assert.equal(f.moveCount,0,'old session drains before any NPC relocation');
f.boundary=true;f.personal={task:{actorId:R.incumbentId,phase:'meal'}};f.tick(30);assert.equal(f.moveCount,0,'personal trip keeps ownership');f.personal=null;
f.fail=true;f.tick(30);assert(f.moveCount>0);assert.equal(f.slot.state().holderId,R.incumbentId,'failed atomic save cannot adopt player');assert.equal(f.duty.snapshot().status,'handoff');
f.fail=false;f.tick();assert.equal(f.slot.state().holderId,'player');assert.equal(f.slot.state().revision,1);assert.equal(f.duty.snapshot().status,'working');assert.equal(f.stored.chinaSalonReceptionSlot.holderId,'player');assert(f.duty.dutyActive(ID));
const restored=fixture(f.stored);assert.equal(restored.duty.state().lastError,null);assert(restored.duty.dutyActive(ID));assert(restored.duty.holdDuty(ID));assert.equal(restored.duty.snapshot().status,'working','cold employment hold must not restart handoff');
f.player.root.position.x=30;assert(!f.duty.dutyActive(ID));assert.equal(f.duty.dutyState().status,'paused');Object.assign(f.player.root.position,{x:P.home[0],y:P.home[1],z:P.home[2]});
const proof={kind:'salon-reception-work',version:1,sessionId:'cn-salon-npc-1',actorId:'player',roleId:R.id,slotId:R.slotId,holderRevision:1,contractVersion:2,amount:0,customerId:CHINA_OFFICIAL_IDS[0],artistId:'cn-tavern-reciter',activity:'poetry',fee:20,roomId:SALON_ROOMS[0].id,steps:{registerSeconds:2,reserveSeconds:2,closeSeconds:2},completed:true};
f.done={sessionId:proof.sessionId,customerId:proof.customerId,customerName:'原来客',proof,waitSeconds:55};
assert(!f.duty.canEndDuty(ID));const w=f.duty.workIntent(ID);assert.equal(w.kind,'appraise');f.fail=true;assert(!f.duty.executeWork(w,ID));assert.equal(f.duty.workReceipts(ID).length,0);f.fail=false;f.finishFail=true;assert(!f.duty.executeWork(w,ID));assert.equal(f.duty.workReceipts(ID).length,1);assert(!f.duty.executeWork(w,ID));assert.equal(f.duty.workReceipts(ID).length,1,'release failure cannot duplicate saved appraisal');f.finishFail=false;assert(f.duty.executeWork(w,ID));assert.equal(f.duty.workReceipts(ID).length,1);assert(f.duty.canEndDuty(ID));
// The player must vacate the original home point for the physical return.
Object.assign(f.player.root.position,{x:P.registry[0],y:P.registry[1],z:P.registry[2]});assert(!f.duty.releaseDuty(ID,{evaluate:true}));assert(f.duty.handoffPending());assert.equal(f.slot.state().holderId,'player');f.fail=true;f.tick(40);assert.equal(f.slot.state().holderId,'player');f.fail=false;f.tick();assert.equal(f.slot.state().holderId,R.incumbentId);assert.equal(f.slot.state().revision,2);assert(f.duty.releaseDuty(ID));assert.equal(f.duty.snapshot().status,'inactive');
const corrupted=fixture({...f.stored,duty:{...f.stored.duty,status:'working',receiptId:ID}});assert.equal(corrupted.duty.state().lastError,'salon-reception-duty-slot-mismatch');assert(!corrupted.duty.claimDuty(ID));
const cancelled=fixture();assert(cancelled.duty.claimDuty(ID));cancelled.tick(30);assert(!cancelled.duty.releaseDuty(ID,{evaluate:true}));cancelled.tick(30);assert.equal(cancelled.duty.workReceipts(ID).length,0,'cancel never invents a successful customer appraisal');
console.log('PASS reception duty original-session/person ownership, physical one-seat handoff, atomic save failures/cold restore, paused attendance, original settled appraisal retry, return and zero cancelled XP');
