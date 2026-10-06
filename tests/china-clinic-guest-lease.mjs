import {findActorStandPoint} from '../source/game/actor-navigation.js';
// Reproduces two controllers moving/posing one tavern guest during clinic care.
// The real tavern workflow and save format run with inert props and direct routes;
// this bounded test deliberately excludes production collision and rendering QA.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import {createFacilityQueue} from '../source/game/npc-facilities.js';

const copy=value=>JSON.parse(JSON.stringify(value));
const position=(x=0,y=.215,z=0)=>({x,y,z,
  set(x,y,z){Object.assign(this,{x,y,z});return this;},
  toArray(){return [this.x,this.y,this.z];},
  copy(p){return this.set(p.x,p.y,p.z);},
  clone(){return position(this.x,this.y,this.z);},
  distanceTo(p){return Math.hypot(this.x-p.x,this.y-p.y,this.z-p.z);}
});
const context=vm.createContext({console}),modules=new Map();
const navigation=new vm.SyntheticModule(['followActorRoute','findActorStandPoint'],function(){this.setExport('findActorStandPoint',findActorStandPoint);
  this.setExport('followActorRoute',(n,dt)=>{
    const p=n.route[0];if(!p)return {};
    const d=n.root.position.distanceTo(p),step=Math.min(d,dt*3);
    if(d<.035){n.root.position.copy(p);n.route.shift();return {};}
    n.root.position.x+=(p.x-n.root.position.x)/d*step;
    n.root.position.y+=(p.y-n.root.position.y)/d*step;
    n.root.position.z+=(p.z-n.root.position.z)/d*step;
    n.walking=true;return {};
  });
},{context});
const props=new vm.SyntheticModule(['createTavernMealProps','createTavernDirtProps'],function(){
  this.setExport('createTavernMealProps',()=>({update(){},clear(){},state:()=>({}),dispose(){}}));
  this.setExport('createTavernDirtProps',()=>({update(){},dispose(){}}));
},{context});
const mealKit=new vm.SyntheticModule(['createPalaceMealKit'],function(){
  this.setExport('createPalaceMealKit',()=>({show(){},sync(){},dispose(){}}));
},{context});
function module(file){
  if(!modules.has(file))modules.set(file,new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{context,identifier:file}));
  return modules.get(file);
}
const sceneModule=module(fileURLToPath(new URL('../source/game/china-tavern-service-scene.js',import.meta.url)));
await sceneModule.link((id,from)=>id.includes('actor-navigation')?navigation:id.includes('meal-props')?props:id.includes('china-palace-costume')?mealKit:module(path.resolve(path.dirname(from.identifier),id)));
await sceneModule.evaluate();

function fixture(saved=null,existingActors=null){
  const ids=['cn-tavern-host','cn-tavern-cook','cn-tavern-assistant','cn-tavern-diner-west','cn-tavern-diner-east'];
  const homes=[[24.1,.215,11.4],[23.3,.215,9.36],[22,.215,14.1],[20,.215,22.4],[22,.215,22.4]];
  const npcs=existingActors||ids.map((id,i)=>{
    const label={textContent:'酒楼居民'};
    return {station:{id,npcName:id,npcLabel:label.textContent,npcPosition:homes[i],ageYears:26},
      label:{querySelector:()=>label},root:{position:position(...homes[i]),rotation:{y:0},visible:true},
      home:position(...homes[i]),route:[],phase:0,walking:false,poses:0,
      animate(_t,_walking,action){this.poses++;this.lastPose=action;}};
  });
  const items=[18.1,23.9].flatMap(x=>[-1,1].map(side=>({id:`china-tavern-dining-${x}-${side}`,kind:'seat',
    position:[x+1,.215,18.1+side*1.32],anchor:[x,.215,18.1+side*1.32],center:[x,.215,18.1+side*1.32],seatY:.9,yaw:0})))
    .concat(['lan','zhu'].map((id,i)=>({id:'china-tavern-bed-'+id,kind:'bed',position:[18+i*5,4.015,19.5],anchor:[18+i*5,4.015,18.5],center:[18+i*5,4.015,18.5],supportY:4.9,yaw:0})));
  const facilities=createFacilityQueue(),flags={rejectSave:false,toiletId:null,toiletUpdates:0};
  const furniture={items,facilities,releaseActor:id=>facilities.releaseActor(id),standPoint:(_nav,_extra,seat)=>position(...seat.position)};
  const player={root:{position:position(0,.215,0)},walking:false};let time=0;
  const scene=sceneModule.namespace.createTavernServiceScene({npcs,lot:{group:{}},furniture,doors:{},
    planPath:(_from,to)=>[position(to.x,to.y,to.z)],moveActor(){},poseContext:()=>({}),getPlayer:()=>player,getMounted:()=>null,
    getClock:()=>({hour:10}),worldSeed:26,saveState:()=>!flags.rejectSave,
    getToilet:()=>({ownsActor:n=>flags.toiletId===n.station.id,updateActor(){flags.toiletUpdates++;},actorPose:()=>null,label:()=> '净室'})});
  assert(saved?scene.restoreWorld(saved):scene.initializeWorld(),'real tavern world is valid');
  const tick=(count=1,conversationActorId=null)=>{for(let i=0;i<count;i++){time+=.1;scene.update(.1,time,{conversationActorId});}};
  return {scene,npcs,flags,tick};
}

const f=fixture(),guest=f.npcs[3],id=guest.station.id,claimId='cn-clinic-order-1';
const visitor=scene=>scene.snapshot().visitors.find(v=>v.id===id);
assert.equal(f.scene.claimClinicPatient('missing-resident',claimId),false);
assert.equal(f.scene.claimClinicPatient(f.npcs[0].station.id,claimId),false,'staff are not guest patients');
const modes=new Set(),stages=new Set();
for(let step=0;step<2500&&visitor(f.scene).mode!=='idle';step++){
  const world=f.scene.snapshot(),v=visitor(f.scene),o=world.orders.find(o=>o.id===v.orderId);
  modes.add(v.mode);stages.add(o?.stage);
  assert.equal(f.scene.claimClinicPatient(id,claimId),false,`${v.mode}/${o?.stage} retains tavern ownership`);
  f.tick();
}
assert.equal(visitor(f.scene).mode,'idle','the actual meal and lodging finish before clinic admission');
assert.deepEqual([...modes].sort(),['dining','leaving','lodging','lodging-wait']);
assert(stages.has('eating'),'the guest actually eats before admission');
assert(f.scene.state().history.some(h=>h.event==='guest-entered-room'&&h.customerId===id),'the same guest actually rests in a room');
assert.equal(guest.serviceMount,null,'the guest has left the room furniture');
assert(f.scene.owns(guest));assert.equal(f.scene.socialStatus(guest).busy,false);

f.tick(1,id);
assert.equal(f.scene.claimClinicPatient(id,claimId),false,'a current conversation blocks transfer');
f.flags.toiletId=id;f.tick();
assert(f.flags.toiletUpdates>0,'the real visitor controller delegated the active toilet workflow');
assert.equal(f.scene.claimClinicPatient(id,claimId),false,'active toilet use blocks transfer');
f.flags.toiletId=null;f.tick();
for(const malformed of ['',null,'cn-clinic-order-0','cn-clinic-order-01','unrelated-order-1'])assert.equal(f.scene.claimClinicPatient(id,malformed),false);
f.flags.rejectSave=true;
assert.equal(f.scene.claimClinicPatient(id,claimId),false,'a failed durable owner approval cannot transfer control');
assert.equal(visitor(f.scene).mode,'idle');assert(f.scene.owns(guest));
f.flags.rejectSave=false;
assert(f.scene.claimClinicPatient(id,claimId));
assert.deepEqual(copy(f.scene.clinicClaims()),[{actorId:id,claimId}]);
const leasedRevision=f.scene.snapshot().revision;
assert(f.scene.claimClinicPatient(id,claimId),'only the same lease can replay admission');
assert.equal(f.scene.snapshot().revision,leasedRevision,'admission replay makes no second world transaction');
assert.equal(f.scene.claimClinicPatient(id,'cn-clinic-order-2'),false);
assert.equal(f.scene.releaseClinicPatient(id,'cn-clinic-order-2'),false,'stale release cannot steal a live lease');
assert.equal(f.scene.releaseClinicPatient(f.npcs[4].station.id,claimId),false,'release must identify the leased resident');

function assertExternalControl(f,actor){
  actor.root.position.set(30,4.015,-15);actor.root.rotation.y=.9;actor.walking=true;
  const route=[position(31,4.015,-15)];actor.route=route;
  const poses=actor.poses,otherPoses=f.npcs[0].poses;actor.lastPose='clinic-consult';actor.label.querySelector().textContent='医馆来客';
  f.tick(80);
  assert.deepEqual(actor.root.position.toArray(),[30,4.015,-15],'tavern cannot move a clinic-owned actor');
  assert.equal(actor.root.rotation.y,.9);assert.equal(actor.walking,true,'tavern cannot clear clinic locomotion');
  assert.strictEqual(actor.route,route);assert.equal(actor.route.length,1,'clinic route stays intact');
  assert.equal(actor.poses,poses,'tavern cannot overwrite the clinic pose');assert.equal(actor.lastPose,'clinic-consult');
  assert.equal(actor.label.querySelector().textContent,'医馆来客','tavern cannot overwrite the clinic label');
  assert(f.npcs[0].poses>otherPoses,'other tavern controllers continue to update');
  assert.equal(f.scene.owns(actor),false);assert.equal(f.scene.socialStatus(actor),null,'clinic owns social availability');
}
assertExternalControl(f,guest);
const saved=f.scene.snapshot(),actorIds=f.npcs.map(n=>n.station.id);
f.scene.dispose();
const restored=fixture(saved,f.npcs);
assert.strictEqual(restored.npcs.find(n=>n.station.id===id),guest,'reload reuses the existing world actor');
assert.deepEqual(restored.npcs.map(n=>n.station.id),actorIds,'reload creates no replacement or duplicate residents');
assert.equal(new Set(restored.npcs.map(n=>n.station.id)).size,restored.npcs.length);
assert.equal(visitor(restored.scene).mode,'clinic');assert.equal(visitor(restored.scene).careClaimId,claimId);
assert.deepEqual(copy(restored.scene.clinicClaims()),[{actorId:id,claimId}]);
assert(restored.scene.claimClinicPatient(id,claimId),'the saved lease replays with the same identity');
assert.equal(restored.scene.claimClinicPatient(id,'cn-clinic-order-2'),false);
assertExternalControl(restored,guest);

restored.flags.rejectSave=true;
assert.equal(restored.scene.releaseClinicPatient(id,claimId),false,'failed release save retains clinic ownership');
assert.equal(restored.scene.owns(guest),false);assert.equal(visitor(restored.scene).mode,'clinic');
restored.flags.rejectSave=false;
assert(restored.scene.releaseClinicPatient(id,claimId));
assert.equal(visitor(restored.scene).mode,'idle');assert.equal(visitor(restored.scene).careClaimId,undefined);
assert.deepEqual(copy(restored.scene.clinicClaims()),[]);assert(restored.scene.owns(guest));
assert.equal(restored.scene.socialStatus(guest).busy,false);assert.equal(restored.scene.socialStatus(guest).attention,true);
assert.equal(guest.route.length,0);assert.equal(guest.walking,false);
assert.equal(restored.scene.releaseClinicPatient(id,claimId),false,'a consumed lease cannot release twice');
const poses=guest.poses,before=guest.root.position.clone();restored.tick(100);
assert(guest.poses>poses,'the regular tavern pose controller resumes');
assert(guest.root.position.distanceTo(before)>.1,'the regular tavern route controller resumes');
assert.strictEqual(restored.npcs.find(n=>n.station.id===id),guest);
restored.scene.dispose();
console.log('PASS real tavern guest clinic lease: meal/lodging and conversation/toilet gates, durable approval, exclusive movement/pose/social ownership, same actor reload, stale claim rejection and normal return');
