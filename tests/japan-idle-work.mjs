// Focused controller regression: idle work lost its action/target when the
// order scheduler took ownership. No scene render or route/lifecycle replay.
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
const a=fixture();
try{
 a.frame();
 for(const id of ['jp-sushi','jp-ramen','jp-onsen','jp-women-onsen','jp-market-tea','jp-herb-workshop']){
  const n=a.get(id),target=n.station.workTarget;assert(n.serviceTask.idle&&n.serviceTask.arrived);assert.equal(n.pose.action,n.station.npcAction);assert.deepEqual(n.pose.context.target,target);assert.equal(n.root.rotation.y,Math.atan2(target[0]-n.root.position.x,target[2]-n.root.position.z),id+' faces actual work target');
 }
 const sushi=a.get('jp-sushi'),idle=sushi.serviceTask;
 for(const dt of [3.98,.02,.01]){a.frame(dt);assert.equal(sushi.pose.action,'sushi','Idle action stays continuous across its duration boundary');assert.equal(sushi.serviceTask,idle);}
 const elapsed=idle.elapsed;
 a.frame(.1,{position:sushi.root.position.clone().add(new T.Vector3(1,0,0)),conversationActorId:sushi.station.id});
 assert.equal(sushi.pose.action,null);assert.equal(idle.elapsed,elapsed);assert.equal(sushi.serviceTask,idle);
 a.frame();assert.equal(sushi.pose.action,'sushi');
 sushi.root.position.x+=.5;a.frame();assert.equal(sushi.pose.action,null,'Displaced arrived idle cannot work away from its target');sushi.root.position.copy(sushi.home);
 const welcome=a.get('jp-welcome');welcome.root.position.fromArray(welcome.serviceTask.to);a.frame();assert.equal(welcome.pose.action,undefined,'Safe counter waiting point never performs pretend registration');
 const guest=a.get(a.routine.state().visits[0].id);guest.root.position.fromArray(P.reception);a.frame();a.frame();
 assert(welcome.serviceTask.orderJobId);assert(!welcome.serviceTask.idle);assert.deepEqual(welcome.serviceTask.workTarget,P.receptionLedger);assert(!welcome.pose.action,'Walk to a live order immediately suppresses idle work');
}finally{a.dispose();}
const b=fixture({next:1,dueIn:.1});
try{
 b.frame();const sushi=b.get('jp-sushi'),ramen=b.get('jp-ramen');assert.equal(ramen.pose.action,'ramen');
 b.frame(.1);assert(sushi.serviceTask.staffLife&&ramen.serviceTask.staffLife);assert(!sushi.serviceTask.idle&&!ramen.serviceTask.idle,'Due shift interrupts both idles immediately');
 // Arrival fixture only: navigation and the full break lifecycle were already
 // verified. Exercise the actual handoff gates and relief scheduler here.
 for(const n of [sushi,ramen])n.root.position.fromArray(n.serviceTask.to);
 b.frame(1.01);b.frame();assert.equal(b.routine.state().staffLife.active.phase,'preparing');
 assert(ramen.serviceTask.idle&&ramen.serviceTask.arrived);assert(!ramen.pose.action,'Relief never uses its original ramen tools at the kitchen pickup');assert.equal(ramen.serviceTask.workTarget,undefined);assert.deepEqual(ramen.serviceTask.face,P.mealTray);
 assert.equal(b.get('jp-herb-workshop').serviceTask.action,'tidy','Nao retains the existing supply idle');
}finally{b.dispose();}
const c=fixture();
try{c.get('jp-sushi').station.workTarget=null;c.frame();assert(!c.get('jp-sushi').pose.action,'Missing target never creates an idle work action');}finally{c.dispose();}
console.log('PASS: authored home targets/facing, chat pause/resume, displacement/walking suppression, live order priority, physical handoff gates, relief target without original tools, Nao supply idle and missing-target guard');
