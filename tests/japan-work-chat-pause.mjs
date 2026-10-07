// Working conversations retain the original scheduler task while fresh work
// or a due relief shift waits. No scene render or route/lifecycle replay.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {registerHooks} from 'node:module';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
registerHooks({resolve(s,c,next){return s==='three'?{url:pathToFileURL(path.resolve('source/vendor/three/build/three.module.js')).href,shortCircuit:true}:next(s,c);}});
const T=await import('three');
const {createJapanBathhouseOperations}=await import('../source/game/japan-bathhouse-operations.js');
const {JAPAN_SERVICE_POINTS:P,JAPAN_SERVICE_WORKERS}=await import('../source/game/japan-service-orders.js');
const {createFacilityQueue}=await import('../source/game/npc-facilities.js');
const source=fs.readFileSync('source/game/japan-bathhouse.js','utf8'),start=source.indexOf(' const stations=['),end=source.indexOf('\n ];',start);
assert(start>=0&&end>start);
// Read the real authored stations without allocating unrelated scene geometry.
const stations=JSON.parse(JSON.stringify(vm.runInNewContext(source.slice(start,end+4)+';stations')));
const ids=new Set(Object.values(JAPAN_SERVICE_WORKERS).flat());
function fixture(saved={}){
 const group=new T.Group(),facilities=createFacilityQueue(),npcs=[];
 function actor(station){const root=new T.Group();root.position.fromArray(station.npcPosition);root.rotation.y=Math.PI;root.userData.appearance={wardrobePreset:'test'};group.add(root);const n={station,root,home:root.position.clone(),phase:0,route:[],locomotion:{walkSpeed:2},animate(t,walking,action,context){this.pose={walking,action,context};this.root.userData.poseQA={action};}};npcs.push(n);return n;}
 for(const s of stations.filter(s=>ids.has(s.id)))actor(structuredClone(s));
 const items=[...[-7,4].map(x=>({id:'rest-'+x,kind:'seat',center:[x,3.8,7.55],position:[x,3.8,7],anchor:[x,3.8,7]})),{id:'staff-seat',kind:'seat',center:[-6.8,11.4,-7.45],position:[-6.8,11.4,-8.39]},{id:'staff-bed',kind:'bed',center:[-4.3,11.4,-11.5],position:[-4.3,11.4,-9.18]}];
 const furniture={items,facilities,resolveBath:()=>null,releaseActor:id=>facilities.releaseActor(id)};
 const routine=createJapanBathhouseOperations({npcs,lot:{group,colliders:[],walkableSurfaces:[],bounds:{minX:-50,maxX:50,minZ:-50,maxZ:50}},furniture,saved:{staffLife:{version:3,dueIn:90,...saved}},planPath:()=>[],doors:{routeStep:()=>({waiting:true})},moveActor(n,dx,dz){n.root.position.x+=dx;n.root.position.z+=dz;},poseContext:(n,s)=>({target:s?.workTarget}),changeWardrobe(){},createVisitor:v=>actor({id:v.id,npcPosition:v.position,npcName:v.name}),removeVisitor:n=>npcs.splice(npcs.indexOf(n),1)});
 const get=id=>npcs.find(n=>n.station.id===id);let time=0;
 return {routine,get,furniture,frame(dt=.01,state={}){time+=dt;routine.update(dt,time,{position:new T.Vector3(40,0,40),...state});},dispose(){routine.dispose();facilities.dispose();}};
}
// R179: scheduling a due break or fresh order must not replace a held task.
{
 const {holdSocialActors,releaseSocialActors,setPlayerConversationHold}=await import('../source/game/npc-social-ownership.js');
 const f=fixture({next:1,dueIn:.1});
 try{
  f.frame();const sushi=f.get('jp-sushi'),original=sushi.serviceTask,route=sushi.route,phase=original.elapsed;
  assert(holdSocialActors([sushi.station.id],'japan-break-pause'));f.frame(.2);assert.equal(sushi.serviceTask,original);assert.equal(sushi.serviceTask.elapsed,phase);assert.equal(sushi.route,route);assert.notEqual(f.routine.state().staffLife.active?.id,sushi.station.id);
  releaseSocialActors('japan-break-pause');f.frame(.1);assert.equal(f.routine.state().staffLife.active.id,sushi.station.id);assert.notEqual(sushi.serviceTask,original);
 }finally{releaseSocialActors('japan-break-pause');f.dispose();}
 const f2=fixture();
 try{
  f2.frame();const welcome=f2.get('jp-welcome'),guest=f2.get(f2.routine.state().visits[0].id),original=welcome.serviceTask;guest.root.position.fromArray(P.reception);
  assert(holdSocialActors([welcome.station.id],'japan-order-pause'));f2.frame();f2.frame();assert.equal(welcome.serviceTask,original,'new register job must not replace the paused original task');assert(!f2.routine.state().claims.some(j=>j.workerId===welcome.station.id));
  releaseSocialActors('japan-order-pause');f2.frame();assert(welcome.serviceTask.orderJobId);
 }finally{releaseSocialActors('japan-order-pause');f2.dispose();}
 const working=fixture();try{working.frame();const guest=working.get(working.routine.state().visits[0].id),host=working.get('jp-welcome');guest.root.position.fromArray(P.reception);working.frame();working.frame();assert(host.serviceTask.orderJobId);host.root.position.fromArray(host.serviceTask.to);working.frame(.5);const task=host.serviceTask,elapsed=task.elapsed,claims=working.routine.state().claims,route=host.route;assert(elapsed>0);setPlayerConversationHold(host.station.id);working.frame(5,{position:host.root.position.clone().add(new T.Vector3(1,0,0)),conversationActorId:host.station.id});assert.equal(host.serviceTask,task);assert.equal(task.elapsed,elapsed);assert.equal(host.route,route);assert.deepEqual(working.routine.state().claims,claims,'chat cannot finish the real register order');setPlayerConversationHold(null);working.frame(.1);assert.equal(host.serviceTask,task);assert(task.elapsed>elapsed);}finally{setPlayerConversationHold(null);working.dispose();}
 const menu=fixture();try{menu.frame();const sushi=menu.get('jp-sushi'),task=sushi.serviceTask,elapsed=task.elapsed;setPlayerConversationHold(sushi.station.id);menu.frame(.2,{position:sushi.root.position.clone().add(new T.Vector3(2.6,0,0)),conversationActorId:sushi.station.id});assert.equal(sushi.serviceTask,task);assert.equal(task.elapsed,elapsed,'nearby selection at 2.6m must pause the same task');setPlayerConversationHold(null);menu.frame();assert(task.elapsed>elapsed);}finally{setPlayerConversationHold(null);menu.dispose();}
 console.log('PASS Japan task owner preserves held actor task/route/elapsed across due break and fresh order, then resumes same scheduler');
}
