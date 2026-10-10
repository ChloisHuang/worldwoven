// Tiny real operations adapter: staged leaving visit + replaceable transfer
// gate isolate optional-use rejection, without claiming country-route evidence.
import assert from 'node:assert/strict';import {registerHooks} from 'node:module';import {pathToFileURL} from 'node:url';
registerHooks({resolve(id,ctx,next){return id==='three'?{url:pathToFileURL(process.cwd()+'/source/vendor/three/build/three.module.js').href,shortCircuit:true}:next(id,ctx);}});
const T=await import('three'),{createJapanBathhouseOperations}=await import('../source/game/japan-bathhouse-operations.js'),{createJapanServiceOrders,JAPAN_SERVICE_WORKERS,JAPAN_LOCAL_WORKERS}=await import('../source/game/japan-service-orders.js'),{createFacilityQueue}=await import('../source/game/npc-facilities.js'),{createJapanVisitorIdentity}=await import('../source/game/japan-visitors.js'),{JAPAN_KOTATSU_TABLES}=await import('../source/game/japan-kotatsu-duty.js');
function fixture(){
 const table=JAPAN_KOTATSU_TABLES[0],board=createJapanServiceOrders({worldSeed:17}),v=board.spawn({...createJapanVisitorIdentity(board.nextIdentity(),17),restPoint:[-7.7,3.8,7.39],diningPoint:[-7.7,3.8,7.39],restSeatId:'rest-west'}),saved=board.state();Object.assign(saved.visits[0],{stage:'leaving',position:table.seat.position.slice()});
 const group=new T.Group(),actor=(id,p)=>{const root=new T.Group();root.userData.appearance={wardrobePreset:'haori-trouser'};root.position.fromArray(p);group.add(root);return {station:{id,npcName:id},root,home:root.position.clone(),route:[],phase:0,locomotion:{walkSpeed:2},animate(){}};};
 const npcs=[...new Set([...Object.values(JAPAN_SERVICE_WORKERS).flat(),...JAPAN_LOCAL_WORKERS])].map((id,i)=>actor(id,[20+i,0,20])),items=[-7.7,4.4].map((x,i)=>({id:i?'rest-east':'rest-west',kind:'seat',center:[x,3.8,7.55],position:[x,3.8,6.61],anchor:[x,3.8,7.39],yaw:0,seatY:4.365})),facilities=createFacilityQueue();let canUse=false,reject=false,urgent=false,calls=0;
 const furniture={items,facilities,resolveBath:()=>null,releaseActor:id=>facilities.releaseActor(id),canSit:()=>true,canUse:()=>{calls++;return canUse;},standPoint:(_,__,item)=>new T.Vector3(...item.position)};
 const service=createJapanBathhouseOperations({npcs,lot:{group},furniture,doors:{cameraColliders:[],routeStep:()=>({waiting:true})},planPath:()=>[],moveActor(){},poseContext:()=>({}),changeWardrobe(){},createVisitor:v=>{const n=actor(v.id,v.position);npcs.push(n);return n;},removeVisitor:n=>npcs.splice(npcs.indexOf(n),1),worldSeed:17,saved,saveState:()=>!reject,sharedNeeds:{hunger:()=>.2,status:id=>id===v.id?{seekMeal:urgent}:null}});
 service.restore({version:1,time:0,nextArrival:100,checkpointAt:100});const guest=npcs.find(n=>n.station.id===v.id);
 return {service,guest,v,table,frame(){service.update(.1,0);},setCanUse(v){canUse=v},setReject(v){reject=v},setUrgent(v){urgent=v},calls:()=>calls};
}
{
 const f=fixture();for(let i=0;i<32;i++)f.frame();assert(f.calls()>=30);assert(f.service.state().kotatsuCare.seenVisits.includes(f.v.id));assert(f.service.state().kotatsuCare.items.every(x=>x.cycle===0&&x.stage==='clean'));assert.equal(f.guest.serviceMount,undefined);assert(f.service.state().failures.some(x=>x.reason==='optional rest seat transfer obstructed'));f.service.dispose({suspend:true});
}
{
 const f=fixture();f.setCanUse(true);f.setReject(true);f.frame();assert(!f.guest.serviceMount,'failed begin-save releases physical seat');assert(f.service.state().kotatsuCare.items.every(x=>x.cycle===0));f.setReject(false);f.frame();assert(f.service.state().kotatsuCare.seenVisits.includes(f.v.id));assert(f.service.state().kotatsuCare.items.every(x=>x.cycle===0));f.service.dispose({suspend:true});
}
{
 const f=fixture();f.setCanUse(true);f.frame();assert.equal(f.service.state().kotatsuCare.items[0].stage,'resting');assert(f.guest.serviceMount);f.setUrgent(true);f.setReject(true);f.frame();assert(!f.guest.serviceMount);assert.equal(f.service.state().kotatsuCare.items[0].stage,'resting','failed dirty save never falsely clean');f.setReject(false);f.frame();assert.equal(f.service.state().kotatsuCare.items[0].stage,'collect');f.service.dispose({suspend:true});
}
console.log('PASS optional actual canUse rejection bounded to 3 seconds, failed begin releases seat without dirt, urgent real rest ends safely and rejected departure save retries same original');
