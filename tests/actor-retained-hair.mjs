/** Two actual unresolved actor types: retained long braid and a real chef cap. */
import {registerHooks} from 'node:module';import {pathToFileURL} from 'node:url';import path from 'node:path';import assert from 'node:assert/strict';
registerHooks({resolve(s,c,next){return s==='three'?{url:pathToFileURL(path.resolve('source/vendor/three/build/three.module.js')).href,shortCircuit:true}:next(s,c);}});
const T=await import('three'),C=await import('../source/game/characters.js');await import('../source/game/complete-adult/register.js');
const {npcRoleAppearance}=await import('../source/game/appearance.js');
const {attachPalaceCostume}=await import('../source/game/china-palace-costume.js');
const meshRanges=actor=>{const result=new Map();actor.root.traverse(m=>{if(m.isSkinnedMesh)for(const r of m.geometry.userData.sourceRanges)result.set(r.name,{mesh:m,g:m.geometry,r});});return result;};
const fixtures=[{id:'cn-consort-heng',culture:'china',style:'casual',previewHair:'retained'},{id:'jp-sushi',culture:'japan',style:'chef',previewHair:null}],results=[];
for(const fixture of fixtures){
 const look={...npcRoleAppearance(fixture.culture,fixture.id,41),culture:fixture.culture,style:fixture.style},snapshot=JSON.stringify(look),legacy=C.createCharacter(look),actor=C.createCharacter({...look,modelPreview:'complete-adult-head-v1',previewHair:fixture.previewHair});
 assert(actor.root.userData.characterModel.applied,fixture.id+' '+actor.root.userData.characterModel.reason);assert.equal(JSON.stringify(look),snapshot);assert.deepEqual(actor.root.userData.appearance,legacy.root.userData.appearance);assert.equal(actor.root.userData.appearance.hairStyle,look.hairStyle);
 const old=meshRanges(legacy),now=meshRanges(actor);assert(now.has('continuous-head-anatomical-head-neck'));assert(!now.has('continuous-head-jaw-cheeks-nose'));
 for(const [name,a]of old){if(/head|ear-|eye|iris-|pupil-|brow|nostril|lip|mouth|hair|fringe|combed|side-lock|side-flow|^neck$|cook-.*cap/.test(name))continue;const b=now.get(name);assert(b,name);for(const key of['position','color']){const x=a.g.attributes[key],y=b.g.attributes[key];assert.deepEqual(y.array.slice(b.r.start*y.itemSize,(b.r.start+b.r.count)*y.itemSize),x.array.slice(a.r.start*x.itemSize,(a.r.start+a.r.count)*x.itemSize),name);}}
 let handle,braid=null;
 if(fixture.id==='cn-consort-heng'){
  actor.station={royalRole:'consort',costumeStyle:'jade-pin'};handle=attachPalaceCostume(actor);braid=actor.root.userData.characterModel.attachmentFit.retainedBraid;assert(braid&&braid.contactSamples>0);assert(braid.garmentRetreat>=-.025);
  for(const [name,a]of old)if(/^hair-(braided-tail|braid-weave-|braid-tie)/.test(name)){
   const b=now.get(name);assert(b,name);assert.equal(a.r.count,b.r.count);const p=a.g.attributes.position,q=b.g.attributes.position;
   for(let j=0;j<a.r.count;j++)for(const [axis,k]of[['X',0],['Y',1],['Z',2]])assert(Math.abs(q['get'+axis](b.r.start+j)-p['get'+axis](a.r.start+j)-braid.translation[k])<2e-7,'whole free braid keeps one rigid translation');
  }
 }else{assert(now.has('cook-soft-cap'));assert(now.has('cook-cap-band'));assert(now.has('cook-apron'));}
 actor.animate(0,false,null);actor.root.updateMatrixWorld(true);actor.root.traverse(m=>{if(m.isSkinnedMesh)m.skeleton.update();});
 const collar=now.get('continuous-head-anatomical-head-neck'),anchored=[];
 for(let i=collar.r.start;i<collar.r.start+collar.r.count;i++)if(collar.g.attributes.sourceY.getX(i)<1.36)anchored.push([i,collar.mesh.getVertexPosition(i,new T.Vector3())]);
 actor.root.userData.head.rotation.y=.38;actor.root.updateMatrixWorld(true);collar.mesh.skeleton.update();for(const [i,before]of anchored)assert(collar.mesh.getVertexPosition(i,new T.Vector3()).distanceTo(before)<1e-6);
 // A retained shaft's lower lengths follow the torso, not a rigid head orbit.
 if(braid){const tail=now.get('hair-braided-tail'),sw=tail.g.attributes.skinWeight,si=tail.g.attributes.skinIndex,sy=tail.g.attributes.sourceY;let torso=0;for(let i=tail.r.start;i<tail.r.start+tail.r.count;i++)if(sy.getX(i)<1.335){let headWeight=0;for(let k=0;k<4;k++)if(si.array[i*4+k]===3)headWeight+=sw.array[i*4+k];assert.equal(headWeight,0);torso++;}assert(torso>0);}
 const changed=C.createCharacter({...look,shapeTraits:{...look.shapeTraits,noseBridgeHeight:look.shapeTraits.noseBridgeHeight>1? .8:1.2},modelPreview:'complete-adult-head-v1',previewHair:fixture.previewHair}),changedHead=meshRanges(changed).get('continuous-head-anatomical-head-neck');let max=0;
 for(let j=0;j<collar.r.count;j++)max=Math.max(max,Math.abs(collar.g.attributes.position.getZ(collar.r.start+j)-changedHead.g.attributes.position.getZ(changedHead.r.start+j)));assert(max>.0005);changed.dispose();
 results.push({id:fixture.id,body:look.bodyPreset,hairStyle:look.hairStyle,braid,bridgeDelta:max,collarAnchors:anchored.length});handle?.dispose();legacy.dispose();actor.dispose();
}
assert.equal(C.characterResourceStats().activeReferences,0);console.log(JSON.stringify({status:'PASS',results,scope:'Only real braid and chef actor/cache/pose contracts; no world or accepted-art claim'},null,2));
