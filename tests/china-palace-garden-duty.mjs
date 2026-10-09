import assert from 'node:assert/strict';
import {createChinaPalaceGardenDuty,palaceGardenDutyPoints} from '../source/game/china-palace-garden-duty.js';
import {createPalaceGardenSlot} from '../source/game/china-palace-garden-role.js';
const ID='cn-palace-garden-labor-1',HOME=[.8,.295,-18.7];
const actor=(id,p)=>({station:{id},alive:true,home:{toArray:()=>p.slice()},root:{position:{x:p[0],y:p[1],z:p[2]},rotation:{y:0}},route:[],locomotion:{walkSpeed:1.3},animate(){}});
function fixture(saved=null){
 const host=actor('cn-garden',HOME),P=palaceGardenDutyPoints(host),player=actor('player',P.registry);let boundary=true,done=null,fail=false,finishFail=false,acting=false,stored=saved,moveCount=0,mounted=false,hour=12,originalWork=null;
 const slot=createPalaceGardenSlot({saved:saved?.chinaGardenSlot,resolveActor:()=>host,getPlayer:()=>player,canAssign:()=>true,canRelease:()=>({ok:boundary})});
 const edict={gardenHandoffBoundary:()=>({ok:boundary&&Math.hypot(host.root.position.x-HOME[0],host.root.position.z-HOME[2])<.2}),gardenPlayerHandoffBoundary:()=>({ok:boundary}),gardenPlayerActing:()=>acting,stopGardenPlayerWork(){acting=false;},gardenPlayerIntent:()=>originalWork,gardenPlayerCompleted:()=>done,gardenPlayerHeld:()=>false,bindGardenAssignment:()=>({ok:true}),
  finishGardenPlayerOrder(id){if(finishFail||done?.documentId!==id)return false;done=null;boundary=true;return true;}};
 const options={edict,slot,npcs:[host],getPlayer:()=>player,getClock:()=>({hour,day:1}),getMounted:()=>mounted,saved:saved?.duty,saveState(next,patch){if(fail)return false;stored={...stored,duty:structuredClone(next),...structuredClone(patch)};return true;},planPath:(_,to)=>[to],doors:{routeStep(route,pos){if(route[0]&&Math.hypot(pos.x-route[0].x,pos.z-route[0].z)<.04)route.shift();return {waypoint:route[0]};}},moveActor(n,x,z){n.root.position.x+=x;n.root.position.z+=z;moveCount++;}};
 const duty=createChinaPalaceGardenDuty(options);
 return {host,player,slot,edict,duty,P,get stored(){return structuredClone(stored);},get moveCount(){return moveCount;},set boundary(v){boundary=v;},set done(v){done=v;boundary=false;},set fail(v){fail=v;},set finishFail(v){finishFail=v;},set mounted(v){mounted=v;},set hour(v){hour=v;},set originalWork(v){originalWork=v;},tick(n=1){for(let i=0;i<n;i++)duty.update(.1,i*.1);}};
}
const f=fixture();assert(f.duty.meetingReady());assert(f.duty.claimDuty(ID));assert.equal(f.slot.state().holderId,'cn-garden');
f.boundary=false;f.tick(30);assert.equal(f.moveCount,0,'original decree/personal life must drain before moving Bo');
f.boundary=true;f.fail=true;f.tick(50);assert(f.moveCount>0);assert.equal(f.slot.state().holderId,'cn-garden','failed atomic save cannot adopt player');
f.fail=false;f.tick();assert.equal(f.slot.state().holderId,'player');assert.equal(f.slot.state().revision,1);assert.equal(f.stored.chinaGardenSlot.holderId,'player');assert(f.duty.dutyActive(ID));
const restored=fixture(f.stored);assert.equal(restored.duty.state().lastError,null);assert(restored.duty.holdDuty(ID));assert.equal(restored.duty.snapshot().status,'working');
f.hour=18;assert(!f.duty.dutyActive(ID),'no wage at/after 18');assert(f.duty.workIntent(ID),'original work remains actionable after hours');f.hour=5;assert(!f.duty.dutyActive(ID));f.hour=12;
f.mounted=true;assert(!f.duty.dutyActive(ID));f.mounted=false;
f.player.root.position.x=30;assert(!f.duty.dutyActive(ID));assert.equal(f.duty.dutyState().status,'paused');
Object.assign(f.player.root.position,{x:10,y:.145,z:-14});assert(!f.duty.dutyActive(ID),'idle east-shore stroll is not attended work');f.originalWork={key:'original',position:[10,.145,-14],kind:'reading',action:'听原令'};assert(f.duty.dutyActive(ID),'actual original-order corridor counts attendance');f.originalWork=null;
Object.assign(f.player.root.position,{x:HOME[0],y:HOME[1],z:HOME[2]});
f.done={version:1,actorId:'player',documentId:'cn-edict-east-shore:1',audienceId:'cn-morning-audience:1',day:1,holderRevision:1,received:true,filed:true,sweepSeconds:7,returned:true};
assert(!f.duty.canEndDuty(ID));assert(!f.duty.releaseDuty(ID));assert.equal(f.duty.state().status,'working','unreviewed original remains actionable');const w=f.duty.workIntent(ID);assert.equal(w.kind,'appraise');
const reviewPosition={...f.host.root.position};
f.host.alive=false;assert(!f.duty.executeWork(w,ID),'deceased Bo cannot appraise original work');f.host.alive=true;
f.host.root.position.x+=4;assert(!f.duty.executeWork(w,ID),'absent Bo cannot appraise from a saved proof');Object.assign(f.host.root.position,reviewPosition);
f.host.walking=true;assert(!f.duty.executeWork(w,ID),'reviewer must finish the physical return before appraisal');f.host.walking=false;
assert.equal(f.duty.workReceipts(ID).length,0,'unwitnessed appraisals produce no work receipt');
f.fail=true;assert(!f.duty.executeWork(w,ID));assert.equal(f.duty.workReceipts(ID).length,0);f.fail=false;f.finishFail=true;assert(!f.duty.executeWork(w,ID));assert.equal(f.duty.workReceipts(ID).length,1);assert(!f.duty.executeWork(w,ID));assert.equal(f.duty.workReceipts(ID).length,1);f.finishFail=false;assert(f.duty.executeWork(w,ID));assert(f.duty.canEndDuty(ID));
Object.assign(f.player.root.position,{x:f.P.registry[0],y:f.P.registry[1],z:f.P.registry[2]});assert(!f.duty.releaseDuty(ID));assert.equal(f.slot.state().holderId,'player');f.fail=true;f.tick(50);assert.equal(f.slot.state().holderId,'player');f.fail=false;f.tick();assert.equal(f.slot.state().holderId,'cn-garden');assert.equal(f.slot.state().revision,2);assert(f.duty.releaseDuty(ID));assert.equal(f.duty.state().status,'inactive');
const corrupted=fixture({...f.stored,duty:{...f.stored.duty,status:'working',receiptId:ID}});assert.equal(corrupted.duty.state().lastError,'palace-garden-duty-slot-mismatch');assert(!corrupted.duty.claimDuty(ID));
console.log('PASS garden duty physical one-seat handoff, atomic failures/cold restore, exact on-site hours, real original appraisal retry, no cancellation fabrication, physical return');
