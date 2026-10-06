// Regression for short-bed head burial and scene-local double-bed occupancy.
// Uses live complete-adult meshes and authored furniture, not proxy capsules.
import assert from 'node:assert/strict';import {registerHooks} from 'node:module';import {pathToFileURL} from 'node:url';import path from 'node:path';
const root=path.resolve(process.env.SOURCE_ROOT||'source');registerHooks({resolve(s,c,n){return s==='three'?{url:pathToFileURL(root+'/vendor/three/build/three.module.js').href,shortCircuit:true}:n(s,c);}});
const load=n=>import(pathToFileURL(root+'/game/'+n+'.js'));
const T=await import('three'),C=await load('characters'),F=await load('furniture-interactions'),W=await load('world-continuity');await load('character-live-entry');
const report=[];
for(const [region,module] of [['china','regions-east'],['france','regions-west'],['japan','japan-bathhouse'],['egypt','egypt-temple']]){
 const M=await load(module),lot=M['build'+region[0].toUpperCase()+region.slice(1)](),f=F.createFurnitureInteractions(lot,region);
 for(const bed of f.items.filter(i=>i.kind==='bed')){
  const a=f.resolveBed(bed,'first');assert(a);assert(f.occupyBed(a,'first'));const b=f.resolveBed(bed,'second');if(!b)f.releaseActor('second');
  assert.equal(!!b,bed.capacity===2,bed.id+' authored capacity');if(b){assert.notEqual(a.berthId,b.berthId);assert(f.occupyBed(b,'second'));assert.equal(f.resolveBed(bed,'third'),null);f.releaseActor('third');}
  const reference=W.captureWorldRuntime({mount:a});assert.equal(W.restoreWorldRuntime(reference,{furniture:f}).mount.berthId,a.berthId);assert.equal(W.restoreWorldRuntime({$worldRef:'furniture',id:bed.id},{furniture:f}).id,bed.id,'old saves retain parent identity');
  f.releaseActor('first');if(b)assert.equal(f.facilities.reservation(bed.id,'second').seatId,b.berthId,'one gets up without evicting the other');const restored=f.resolveBed(a,'first',p=>p.berthId===a.berthId);assert.equal(restored.berthId,a.berthId);f.releaseActor('first');f.releaseActor('second');
  // Only representative short, single, and long beds need actual skin fitting.

  const bounds=[];
  for(const [i,berth] of bed.berths.entries()){
   const actor=C.createCharacter({culture:region,bodyPreset:i?'feminine-balanced':'masculine-lean',hairStyle:i?'chin-bob':'side-part',wardrobePreset:region==='china'?(i?'cross-collar-ruqun':'scholar-robe'):region==='france'?(i?'court-gown':'court-frock-coat'):undefined,skin:0xa87050,hair:0x242020,clothes:0x536784,accent:0xc6ab67,eyeColor:0x493525});
   actor.root.position.set(...berth.anchor);actor.root.rotation.y=berth.yaw;actor.animate(0,false,null);const neutralNeck=actor.root.getObjectByName('head').position.length();actor.animate(1,false,'lie-rest',{...berth,lieSurfaceHeightAt:(x,z)=>f.bedSupportAt(berth,x,z)});actor.root.updateMatrixWorld(true);const body=new T.Box3(),head=new T.Box3();
   actor.root.traverse(o=>{if(!o.isSkinnedMesh)return;o.skeleton.update();for(const r of o.geometry.userData.sourceRanges)for(let j=r.start;j<r.start+r.count;j++){const p=o.getVertexPosition(j,new T.Vector3()).applyMatrix4(o.matrixWorld);body.expandByPoint(p);if(/continuous-head/.test(r.name)&&(o.geometry.attributes.sourceY?.getX(j)??o.geometry.attributes.position.getY(j))>1.48)head.expandByPoint(p);}});
   assert(Math.abs(head.getCenter(new T.Vector3()).z-(bed.center[2]+berth.liePillowZ+.10))<.025,bed.id+' head centered on actual pillow');
   assert(body.min.z>bed.center[2]-bed.size[2]/2&&body.max.z<bed.center[2]+bed.size[2]/2,bed.id+' full body fits mattress length');
   assert(body.min.x>bed.center[0]-bed.size[0]/2&&body.max.x<bed.center[0]+bed.size[0]/2,bed.id+' full body fits mattress width');
   assert(actor.getPoseMetrics().lieContact.head.gap>=-.015&&actor.getPoseMetrics().lieContact.head.gap<.035,bed.id+' occiput above pillow');
   assert(Math.abs(actor.root.getObjectByName('head').position.length()-neutralNeck)<1e-8,bed.id+' sleep preserves anatomical neck length');bounds.push(body);actor.animate(1.1,false,'lie-rest',{...berth,lieSurfaceHeightAt:(x,z)=>f.bedSupportAt(berth,x,z)});actor.root.position.set(...bed.position);actor.animate(2,false,null);assert.equal(actor.getPoseMetrics().lying,false);actor.dispose();
  }
  if(bounds.length===2)assert(bounds[0].max.x<bounds[1].min.x,bed.id+' independent nonoverlapping adults');report.push({id:bed.id,capacity:bed.capacity});
 }
 f.dispose();
}
assert.equal(C.characterResourceStats().activeReferences,0);console.log(JSON.stringify({status:'PASS',report}));
