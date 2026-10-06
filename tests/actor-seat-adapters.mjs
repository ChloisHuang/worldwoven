import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {Vector3} from '../source/vendor/three/build/three.module.js';
import {beginActorNavigationStep,findActorStandPoint} from '../source/game/actor-navigation.js';
import {createOnsenTransition} from '../source/game/onsen-transitions.js';

// Execute the real bounded release functions without constructing eight scenes.
// This catches a forgotten adapter, a dropped live door, or accidental loss of
// furniture's default navigation while supplying the NPC collision radius.
const cases=[
 ['china-palace-life','unmount','\n function ',true],
 ['china-official-life','release','\n function ',true],
 ['china-tavern-service-scene','unmount','\n function '],
 ['china-clinic-service','unmount','\n function '],
 ['japan-performance-service','unseat','\n function '],
 ['france-tea-service','unmountGuest','\n function '],
 ['egypt-meal-service','unmountGuest','\n function '],
 ['japan-bathhouse-operations','unmount','\n function '],
];
for(const [file,name,terminator,stageMount] of cases){
 const source=fs.readFileSync(new URL('../source/game/'+file+'.js',import.meta.url),'utf8'),start=source.indexOf(' function '+name+'('),end=source.indexOf(terminator,start+1);
 assert(start>=0&&end>start,file);
 for(const radius of [.25,.31]){
  const seat={id:'original-seat',position:[1,0,0],anchor:[0,0,0]},n={station:{id:'original-person'},root:{position:new Vector3(),rotation:{y:0}},serviceMount:seat,route:['original-route'],...(radius===.25?{}:{collisionRadius:radius})},s={mount:seat};
  const door={staticDoor:true},body={minX:.6,maxX:1.4,minZ:-.3,maxZ:.3,minY:0,maxY:1.95},navigation={surfaces:['original-surfaces']},player={root:{position:new Vector3(1,0,0)}};
  let staticBlocked=false,readsFail=false,released=0,calls=0;
  const context={findActorStandPoint,createOnsenTransition,n,s,guest:n,GUEST:n.station.id,P:{guest:n.station.id},seat,navigation,doors:{cameraColliders:[door]},npcs:[n,{root:{position:new Vector3(1,0,0)}}],getPlayer:()=>player,player,travelState:new Map(),
   safety:()=>[door,body],claims:{releaseActor:id=>{assert.equal(id,n.station.id);released++;}},
   furniture:{releaseActor:id=>{assert.equal(id,n.station.id);released++;},standPoint:(nav,extra,item,r)=>{
    calls++;assert.equal(nav,file==='japan-bathhouse-operations'?undefined:navigation,file+' preserves original navigation');assert.equal(item,seat);assert.equal(r,radius);
    assert(extra.includes(door),file+' retains closed door geometry on both probes');
    if(readsFail)throw Error('unavailable');return staticBlocked||extra.some(x=>x!==door)?null:new Vector3(...seat.position);
   }}
  };
  vm.createContext(context);new vm.Script(source.slice(start,end)).runInContext(context);
  const attempt=()=>context[name](n,s),mounted=()=>stageMount?s.mount:n.serviceMount;
  for(let i=0;i<80;i++)beginActorNavigationStep(.1);
  staticBlocked=true;for(let i=0;i<60;i++){beginActorNavigationStep(.1);assert.equal(attempt(),false);}
  assert.equal(mounted(),seat);assert.equal(released,0);
  staticBlocked=false;readsFail=true;beginActorNavigationStep(.1);assert.equal(attempt(),false);assert.equal(mounted(),seat);assert.equal(released,0);readsFail=false;
  for(let i=0;i<49;i++){beginActorNavigationStep(.1);assert.equal(attempt(),false);assert.equal(attempt(),false);}
  assert.equal(mounted(),seat);assert.equal(released,0);assert.deepEqual(n.root.position.toArray(),seat.anchor);
  beginActorNavigationStep(.1);assert.equal(attempt(),true);assert.equal(mounted(),null);assert.deepEqual(n.root.position.toArray(),seat.position);
  assert.equal(released,file==='japan-performance-service'?0:1,'each module retains its original ownership release');assert(calls>100);
 }
}
console.log('PASS: all eight live NPC release adapters share five-second body-only recovery, actual actor radii, safe read failure, original occupancy behavior and static/live-door rejection; bathhouse default navigation is retained');
