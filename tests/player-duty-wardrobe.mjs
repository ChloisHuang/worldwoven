// Regression boundaries: borrowed clothing must not become saved identity,
// survive canceled duties, or override bathing and personal outfit previews.
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,next){return s==='three'?{url:new URL('../source/vendor/three/build/three.module.js',import.meta.url).href,shortCircuit:true}:next(s,c);}});
const T=await import('three');
const {createCharacter}=await import('../source/game/characters.js');
const {attachJinyiCostume}=await import('../source/game/jinyi-costume.js');
const {createAppearanceState,playerAppearance}=await import('../source/game/appearance.js');
const {resolvePlayerWardrobe}=await import('../source/game/player-wardrobe.js');
const copy=x=>JSON.parse(JSON.stringify(x));
for(const bodyPreset of ['feminine-slender','masculine-broad']){
 const appearance=createAppearanceState(42);appearance.player.bodyPreset=bodyPreset;
 const original=copy(appearance),outfit=3,personal=playerAppearance(appearance,'china',outfit),context={appearance,region:'china',outfit,dutyPreset:'jinyi-training'};
 const duty=resolvePlayerWardrobe(context);assert.equal(duty.source,'guard-duty');
 for(const key of ['skin','hair','hairStyle','eyeColor','bodyPreset','shapeTraits'])assert.deepEqual(duty.look[key],personal[key]);
 assert.deepEqual(appearance,original);
 const preview=resolvePlayerWardrobe({...context,preview:true,outfit:5});assert.deepEqual(preview.look,playerAppearance(appearance,'china',5));
 assert.deepEqual(resolvePlayerWardrobe(context),duty,'preview cancel restores active loan');
 assert.deepEqual(resolvePlayerWardrobe({...context,outfit:5,dutyPreset:null}).look,preview.look,'personal confirmation stays source after loan ends');
 for(const bathWardrobePreset of ['bath-robe','onsen-swimwear']){
  const bath=resolvePlayerWardrobe({...context,bath:{kind:'bath',bathWardrobePreset}});assert.equal(bath.look.wardrobePreset,bathWardrobePreset);assert.equal(bath.source,'bath');
  assert.deepEqual(resolvePlayerWardrobe(context),duty,'bath exit restores loan');
  assert.deepEqual(resolvePlayerWardrobe({...context,dutyPreset:null}).look,personal,'ending duty during bath restores personal outfit on exit');
 }
 assert.equal(resolvePlayerWardrobe({...context,region:'japan',servicePreset:'onsen-swimwear'}).source,'bath-service');
 assert.equal(resolvePlayerWardrobe({...context,region:'japan'}).source,'personal','travel cannot take foreign duty uniform');
 const actor=createCharacter({...duty.look,culture:'china',previewSubject:'player'}),handle=attachJinyiCostume(actor),hat=actor.root.getObjectByName('Original Ming folded black duty cap'),saber=actor.root.getObjectByName('Original sheathed waist saber');
 assert.equal(actor.root.userData.characterModel.requested,null,'default face remains published model');
 assert.equal(hat.parent,actor.root.userData.head);assert.equal(saber.parent.name,'pelvis');assert.equal(attachJinyiCostume(actor),handle,'attachment is idempotent');
 const parts=[];actor.root.traverse(n=>{for(const r of n.geometry?.userData.sourceRanges||[])parts.push(r.name);});
 for(const part of ['jinyi-fitted-robe-body','jinyi-pleated-robe-skirt','jinyi-leather-waist-belt','jinyi-woven-knee-band'])assert(parts.includes(part),part);
 actor.root.updateMatrixWorld(true);
 const hatLocal=hat.matrix.clone(),saberLocal=saber.matrix.clone(),at=[];
 for(const [walking,action,headLook]of [[true,null,null],[false,'observe',{yaw:.5,pitch:.15,weight:1}],[false,'tea',{yaw:-.4,pitch:-.1,weight:1}]]){
  actor.animate(1.2,walking,action,{headLook});actor.root.updateMatrixWorld(true);assert(hat.matrix.elements.every(Number.isFinite));assert(saber.matrix.elements.every(Number.isFinite));
  const h=hat.getWorldPosition(new T.Vector3()),p=saber.getWorldPosition(new T.Vector3());assert(h.y>1&&h.distanceTo(p)>.3);at.push({walking,action,hat:h.toArray(),saber:p.toArray()});
 }
 assert(hat.matrix.equals(hatLocal));assert(saber.matrix.equals(saberLocal));
 handle.dispose();assert(!actor.root.getObjectByName('jinyi-folded-crown'));assert(!actor.root.userData.jinyiCostume);actor.dispose();
 console.log('PASS personal identity, bath/preview/travel restoration and original garments/bone attachments',bodyPreset,JSON.stringify(at));
}
