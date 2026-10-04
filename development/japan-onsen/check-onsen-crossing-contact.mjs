// Narrow geometry check for the new crossing only. Seated contact/wardrobe
// evidence is reused; the endpoint below must equal the unmodified bath fit.
import assert from 'node:assert/strict';
import path from 'node:path';
import {registerHooks} from 'node:module';
import {pathToFileURL} from 'node:url';
const source=path.resolve(process.env.SOURCE_ROOT||'source');
registerHooks({resolve(s,c,next){return s==='three'?{url:pathToFileURL(source+'/vendor/three/build/three.module.js').href,shortCircuit:true}:next(s,c);}});
const T=await import('three'),{createCharacter}=await import(source+'/game/characters.js'),{REST_BATH_DESCRIPTORS}=await import(source+'/game/furniture-interactions.js'),{createOnsenTransition}=await import(source+'/game/onsen-transitions.js');
const descriptor=REST_BATH_DESCRIPTORS.japan[1],east=descriptor.center[0]+descriptor.size[0]/2;
// These are the actual pool() wall, east timber and lumbar ledge dimensions,
// not the furniture proxy that is intentionally ignored during a crossing.
const solids=[['wall',east-.14,3.8,east+.14,4.52],['coping',east-.17,4.5,east+.17,4.6],['lumbar',east-.22,4.1,east-.14,4.5]].map(([name,x0,y0,x1,y1])=>({name,box:new T.Box3(new T.Vector3(x0+.001,y0+.001,-12),new T.Vector3(x1-.001,y1-.001,-6))}));
const item={...descriptor,bathEntry:{east,top:4.617,handY:4.6}},context={supportY:item.supportY,bathPose:item.bathPose,bathHipHeight:item.bathHipHeight};
for(const [bodyPreset,legLength,scale]of[['masculine-broad',1.06,1],['masculine-lean',.94,.96]]){
 const look={culture:'japan',bodyPreset,shapeTraits:{legLength},scale,wardrobePreset:'onsen-swimwear'},actor=createCharacter(look),crossing=createOnsenTransition({item,position:item.position,yaw:item.yaw});
 let samples=0,triangles=0;const point=new T.Vector3(),triangle=new T.Triangle();
 for(let frame=0;frame<=48;frame++){
  const pose=frame?crossing.update(.1):crossing.sample();actor.root.position.fromArray(pose.position);actor.root.rotation.y=pose.yaw;actor.animate(frame*.1,false,'bathe',{...context,bathTransition:pose});actor.root.updateMatrixWorld(true);
  if(pose.progress===1)continue; // Endpoint must reuse approved support, below.
  actor.root.traverse(mesh=>{
   if(!mesh.isSkinnedMesh)return;mesh.skeleton.update();
   for(const range of mesh.geometry.userData.sourceRanges||[]){
    const vertices=[];for(let i=range.start;i<range.start+range.count;i++){
     const p=mesh.getVertexPosition(i,point).applyMatrix4(mesh.matrixWorld).clone();vertices.push(p);
     for(const solid of solids)assert(!solid.box.containsPoint(p),`${bodyPreset} ${pose.progress}: ${range.name} enters ${solid.name}`);
    }
    for(let i=range.indexStart;i<range.indexStart+range.indexCount;i+=3){
     const index=mesh.geometry.index;triangle.set(...[0,1,2].map(k=>vertices[index.getX(i+k)-range.start]));triangles++;
     for(const solid of solids)assert(!solid.box.intersectsTriangle(triangle),`${bodyPreset} ${pose.progress}: ${range.name} triangle enters ${solid.name}`);
    }
   }
  });samples++;
 }
 actor.animate(5,false,'bathe',context);const baseline=createCharacter(look);baseline.root.position.set(...item.anchor);baseline.root.rotation.y=item.yaw;baseline.animate(5,false,'bathe',context);
 for(const key of['hip','sole','back'])assert(Math.abs(actor.getPoseMetrics().bathContact[key].body-baseline.getPoseMetrics().bathContact[key].body)<1e-7,'Unchanged supported '+key);
 for(let i=0;i<3;i++)assert(Math.abs(actor.getPoseMetrics().bathHandContact.palm.point[i]-baseline.getPoseMetrics().bathHandContact.palm.point[i])<1e-7,'Contact metrics at actual seat anchor');
 actor.dispose();baseline.dispose();console.log(JSON.stringify({bodyPreset,legLength,scale,samples,triangles,status:'PASS'}));
}
