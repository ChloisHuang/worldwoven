import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {registerHooks} from 'node:module';import {pathToFileURL} from 'node:url';
const SOURCE=path.resolve(process.env.SOURCE_ROOT||'/workspace/shared/worldwoven-r17-repairs/source'),OUT=path.resolve(process.env.OUT_FILE||'/workspace/shared/worldwoven-r17-bath-repair/contact-01.json');
assert.equal(process.env.QA_RESOURCE_WINDOW,'granted-by-owner');assert(OUT.startsWith('/workspace/shared/worldwoven-r17-bath-repair/'));
registerHooks({resolve(s,c,next){return s==='three'?{url:pathToFileURL(SOURCE+'/vendor/three/build/three.module.js').href,shortCircuit:true}:next(s,c);}});
const T=await import('three'),C=await import(pathToFileURL(SOURCE+'/game/characters.js')),F=await import(pathToFileURL(SOURCE+'/game/furniture-interactions.js')),J=await import(pathToFileURL(SOURCE+'/game/japan-bathhouse.js')),N=await import(pathToFileURL(SOURCE+'/game/navigation.js'));
const lot=J.buildJapan(),f=F.createFurnitureInteractions(lot,'japan'),options={bounds:lot.bounds,surfaces:lot.walkableSurfaces,legacyGround:false,bodyHeight:1.95,maxStep:.4},rows=[],errors=[];
function check(ok,label){if(!ok)errors.push(label);}
function measure(a,d){const p=new T.Vector3(),b=new T.Box3(),head=new T.Box3(),hip=new T.Box3(),foot=new T.Box3();let torsoBelow=0,torsoTotal=0,covered=0,bodyMinY=Infinity,backMaxX=-Infinity,wallMaxX=-Infinity;const e=d.center[0]+d.size[0]/2,seat={minX:e-.70,maxX:e-.14,minZ:d.center[2]-d.size[2]/2+.14,maxZ:d.center[2]+d.size[2]/2-.14};let seatPenetration=0,rimPenetration=0,backrestPenetration=0;
 a.root.updateMatrixWorld(true);a.root.traverseVisible(o=>{if(!o.isSkinnedMesh)return;o.skeleton.update();for(const r of o.geometry.userData.sourceRanges||[])for(let i=r.start;i<r.start+r.count;i++){
  o.getVertexPosition(i,p).applyMatrix4(o.matrixWorld);b.expandByPoint(p);const attr=o.geometry.attributes.position,sy=o.geometry.attributes.sourceY?.getX(i)??attr.getY(i);
  if(/continuous-head/.test(r.name))head.expandByPoint(p);
  if(/^onsen/.test(r.name))covered++;
  if(/^onsen-swim-body/.test(r.name)&&sy>1.1&&sy<1.335){torsoTotal++;if(p.y<d.waterY)torsoBelow++;if(attr.getZ(i)<0&&p.y<d.bathPose.backTopY-.01&&sy>1.12)backMaxX=Math.max(backMaxX,p.x);}
  if(/^onsen-trouser|^onsen-swim-body/.test(r.name)&&sy>.84&&sy<1.01&&attr.getZ(i)<-.012)hip.expandByPoint(p);
  if(/^footwear-bath-bare/.test(r.name))foot.expandByPoint(p);
  if(!/^footwear/.test(r.name))bodyMinY=Math.min(bodyMinY,p.y);
  if(p.x>seat.minX+.01&&p.x<seat.maxX-.01&&p.z>seat.minZ&&p.z<seat.maxZ&&p.y<d.bathPose.seatY-.012)seatPenetration++;
  if(p.y<d.center[1]+.86){wallMaxX=Math.max(wallMaxX,p.x);if(p.x>e-.14+.009)rimPenetration++;}
  if(p.x>e-.22+.009&&p.y>d.bathPose.seatY+.01&&p.y<d.bathPose.backTopY-.01)backrestPenetration++;
 }});return {bounds:{min:b.min.toArray(),max:b.max.toArray()},head:{min:head.min.toArray(),max:head.max.toArray()},hip:{min:hip.min.toArray(),max:hip.max.toArray()},feet:{min:foot.min.toArray(),max:foot.max.toArray()},hipGap:hip.min.y-d.bathPose.seatY,soleGap:foot.min.y-d.supportY,backGap:e-.22-backMaxX,retainingWallGap:e-.14-wallMaxX,shoulderAboveWater:a.root.userData.arms.map(b=>b.getWorldPosition(new T.Vector3()).y-d.waterY),bodyBottomGap:bodyMinY-d.supportY,torsoSubmergedFraction:torsoBelow/torsoTotal,coveredVertices:covered,seatPenetration,rimPenetration,backrestPenetration};}
for(const d of f.items.filter(x=>x.kind==='bath')){
 check(f.canUse(options,[],d),d.id+' explicit mounted transfer');check(!!f.standPoint(options,[],d),d.id+' clear exit');
 check(!N.canTraverse(new T.Vector3(...d.position),new T.Vector3(...d.anchor),lot.colliders,{...options,radius:.34}),d.id+' ordinary walking blocked by real basin');
 const t=lot.explorationTargets.find(t=>t.furnitureId===d.id&&t.mountedDestination);check(!!t,d.id+' mapped approach target');if(t)check(!N.blocked(t.position[0],t.position[2],lot.colliders,.34,{...options,y:t.position[1]}),d.id+' mapped target stands on dry floor');
 for(const bodyPreset of['feminine-balanced','masculine-lean','feminine-slender','masculine-broad'])for(const legLength of[.94,1,1.06]){
  const a=C.createCharacter({culture:'japan',bodyPreset,wardrobePreset:d.bathWardrobePreset,shapeTraits:{legLength}});a.root.position.set(...d.anchor);a.root.rotation.y=d.yaw;const c={supportY:d.supportY,bathHipHeight:d.bathHipHeight,bathPose:d.bathPose};a.animate(1,false,'bathe',c);const skin=measure(a,d),pose=a.getPoseMetrics(),label=d.id+'/'+bodyPreset+'/'+legLength;
  check(Math.abs(skin.hipGap)<.018,label+' hip supported '+skin.hipGap);check(Math.abs(skin.soleGap-.004)<.002,label+' sole supported '+skin.soleGap);check(Math.abs(skin.backGap-.006)<.01,label+' back supported '+skin.backGap);
  check(skin.bodyBottomGap>-.012,label+' garment above real floor '+skin.bodyBottomGap);check(skin.seatPenetration===0,label+' garment/legs clear real seat '+skin.seatPenetration);check(skin.rimPenetration===0,label+' body clear real back wall '+skin.rimPenetration);check(skin.backrestPenetration===0,label+' body clear true lumbar support '+skin.backrestPenetration);check(skin.retainingWallGap>.012,label+' hair/body clear outer retaining wall '+skin.retainingWallGap);check(skin.shoulderAboveWater.every(y=>y>.005&&y<.14),label+' shoulder waterline '+skin.shoulderAboveWater);
  check(skin.head.min[1]>d.waterY+.10,label+' face above water');check(skin.torsoSubmergedFraction>.48&&skin.torsoSubmergedFraction<.99,label+' chest below water and neck above '+skin.torsoSubmergedFraction);check(skin.coveredVertices>1000,label+' opaque swimwear retained');
  a.animate(1.05,false,'bathe',c);const held=measure(a,d);check(Math.abs(held.hipGap-skin.hipGap)<1e-5,label+' stable repeated contact');a.root.position.set(...d.position);a.animate(2,true,null,{groundHeightAt:()=>3.8});check(a.getPoseMetrics().gaitReset,label+' stand restores gait');
  rows.push({id:d.id,bodyPreset,legLength,skin,pose});a.dispose();
 }
}
check(C.characterResourceStats().activeReferences===0,'no retained actor references');f.dispose();const report={status:errors.length?'FAIL':'PASS',scope:'Actual CPU skinned onsen seat/sole/back/fabric contacts, four bodies and three leg shapes in both pools; real mounted transfer/dismount and blocked normal traversal',cases:rows.length,errors,rows};fs.writeFileSync(OUT,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,cases:rows.length,errors,out:OUT}));if(errors.length)process.exitCode=1;
