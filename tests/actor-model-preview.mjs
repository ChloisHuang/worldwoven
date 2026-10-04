/** Narrow regression: model selection must not rewrite saves or strip role dress. */
import {registerHooks} from 'node:module';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
registerHooks({resolve(s,c,next){return s==='three'?{url:pathToFileURL(path.resolve('source/vendor/three/build/three.module.js')).href,shortCircuit:true}:next(s,c);}});
const T=await import('three');
const C=await import('../source/game/characters.js');
const {createAppearanceState,playerAppearance,npcRoleAppearance,npcShapeTraits,migrateAppearanceState}=await import('../source/game/appearance.js');
const {courtOfficialAppearance,CHINA_COURT_OFFICIALS}=await import('../source/game/china-palace-audience.js');
const {attachCourtOfficialCostume}=await import('../source/game/china-court-official-costume.js');
const {attachPalaceCostume}=await import('../source/game/china-palace-costume.js');
const {shapePreferenceScore,normalizeShapeTraits,SHAPE_RANGES}=await import('../source/game/character-traits.js');
const modelPreview='complete-adult-head-v1';
const previewFor=look=>look.bodyPreset.startsWith('feminine')?{modelPreview,previewHair:'gathered-updo'}:{modelPreview};
const skinMeshes=a=>{const out=[];a.root.traverse(m=>{if(m.isSkinnedMesh)out.push(m);});return out;};
function ranges(actor){return new Map(skinMeshes(actor).flatMap(mesh=>mesh.geometry.userData.sourceRanges.map(r=>[r.name,{r,g:mesh.geometry}])));}
const state=createAppearanceState(41);Object.assign(state.player,{bodyPreset:'feminine-slender',variant:2,hairStyle:'chin-bob',wardrobeIndex:0,shapeTraits:npcShapeTraits('france','saved-player',41)});
const saved=JSON.stringify(state),loaded=migrateAppearanceState(JSON.parse(saved));assert.equal(JSON.stringify(loaded),saved);
const male={...npcRoleAppearance('france','saved-npc',19),culture:'france',bodyPreset:'masculine-lean',hairStyle:'side-part',wardrobePreset:'court-frock-coat'};
const female={...playerAppearance(loaded,'france'),culture:'france'};
const official={...courtOfficialAppearance('china',CHINA_COURT_OFFICIALS[0].id,npcRoleAppearance('china',CHINA_COURT_OFFICIALS[0].id,41)),culture:'china'};
const consort={...npcRoleAppearance('china','cn-consort-yue',41),culture:'china'};
// Before explicit registration, even a preview request is an unchanged legacy
// cache/material request. Registering later cannot reuse that legacy geometry.
const coldLegacy=C.createCharacter(male),coldPreview=C.createCharacter({...male,modelPreview});
assert.equal(coldPreview.root.userData.characterModel.reason,'preview-not-registered');
assert.equal(skinMeshes(coldPreview)[1].geometry,skinMeshes(coldLegacy)[1].geometry);
assert.equal(C.characterResourceStats().sharedBodyMaterials,2);
await import('../source/game/complete-adult/register.js');
const readyPreview=C.createCharacter({...male,modelPreview});
assert(readyPreview.root.userData.characterModel.applied);
assert.notEqual(skinMeshes(readyPreview)[1].geometry,skinMeshes(coldPreview)[1].geometry);
for(const actor of[coldLegacy,coldPreview,readyPreview])actor.dispose();
const result=[];
for(const [id,look]of [['saved-npc',male],['saved-player',female],['official',official],['consort',consort]]){
 const original=structuredClone(look),score=shapePreferenceScore(look.shapeTraits),legacy=C.createCharacter(look),preview=C.createCharacter({...look,...previewFor(look)}),reload=C.createCharacter({...JSON.parse(JSON.stringify(look)),...previewFor(look)});
 assert(preview.root.userData.characterModel.applied,id);assert.deepEqual(preview.root.userData.head.position.toArray(),legacy.root.userData.head.position.toArray());assert.deepEqual(look,original);assert.deepEqual(preview.root.userData.appearance,legacy.root.userData.appearance);assert.equal(shapePreferenceScore(preview.root.userData.appearance.shapeTraits),score);
 const meshes=skinMeshes(preview),legacyMeshes=skinMeshes(legacy);assert.equal(meshes.length,2);assert.notEqual(meshes[1].material,legacyMeshes[1].material);assert.notEqual(meshes[0].material,legacyMeshes[0].material);assert.equal(meshes[1].geometry,skinMeshes(reload)[1].geometry);assert.notEqual(meshes[1].geometry,legacyMeshes[1].geometry);
 assert.equal(legacyMeshes[1].material.userData.completeAdultFinish,undefined);assert.equal(legacyMeshes[1].geometry.attributes.featureKind,undefined);
 const old=ranges(legacy),now=ranges(preview);let retained=0;
 for(const [name,{r,g}]of old){if(/head|ear-|eye|iris-|pupil-|brow|nostril|lip|mouth|hair|fringe|combed|side-lock|side-flow|^neck$/.test(name))continue;const next=now.get(name);assert(next,`Retained garment ${name}`);for(const key of ['position','normal','color','skinIndex','skinWeight']){const a=g.attributes[key],b=next.g.attributes[key];assert.deepEqual(b.array.slice(next.r.start*b.itemSize,(next.r.start+next.r.count)*b.itemSize),a.array.slice(r.start*a.itemSize,(r.start+r.count)*a.itemSize),`${id} ${name} ${key}`);}retained++;}
 const head=now.get('continuous-head-anatomical-head-neck'),p=head.g.attributes.position,sy=head.g.attributes.sourceY,si=head.g.attributes.skinIndex,sw=head.g.attributes.skinWeight;let anchors=0,blend=0;const anchorIds=[];
 for(let i=head.r.start;i<head.r.start+head.r.count;i++){let weight=0;for(let k=0;k<4;k++)if(si.array[i*4+k]===3)weight+=sw.array[i*4+k];if(sy.getX(i)<1.36){assert.equal(weight,0);anchors++;anchorIds.push(i);}if(weight>0&&weight<1)blend++;}
 assert.equal(anchors,46);assert(blend>0);
 const mesh=meshes.find(m=>m.geometry===head.g),before=anchorIds.map(i=>mesh.getVertexPosition(i,new T.Vector3()).toArray());preview.root.userData.head.rotation.y=.38;preview.root.updateMatrixWorld(true);mesh.skeleton.update();for(const [j,i]of anchorIds.entries())assert(new T.Vector3(...before[j]).distanceTo(mesh.getVertexPosition(i,new T.Vector3()))<1e-6);
 let costume;
 if(id==='official'){assert([...now.keys()].filter(n=>n.startsWith('court-official-facial-hair')).length===3);costume=attachCourtOfficialCostume(preview);const cap=preview.root.getObjectByName('Original civil official black winged cap');assert.equal(cap.parent,preview.root.userData.head);assert(cap.userData.completeAdultFit);}
 if(id==='consort'){preview.station={royalRole:'consort',costumeStyle:'flower-comb'};costume=attachPalaceCostume(preview);assert(preview.root.userData.palaceCostume.userData.completeAdultFit);assert(Math.abs(preview.root.userData.characterModel.attachmentFit.hairOffsetY)<.025);}
 result.push({id,score,body:look.bodyPreset,hair:look.hairStyle,wardrobe:look.wardrobePreset,retainedBodySurfaces:retained,collarAnchors:anchors,neckBlendVertices:blend,fit:preview.root.userData.characterModel.attachmentFit});
 costume?.dispose();for(const a of[preview,legacy,reload])a.dispose();
}
for(const [reason,look]of [['retained-braid-opt-in-required',{...male,hairStyle:'braided-tail'}],['role-headgear-needs-fit',{...male,style:'chef'}]]){const a=C.createCharacter(look),b=C.createCharacter({...look,...previewFor(look)});assert.equal(b.root.userData.characterModel.reason,reason);assert.equal(skinMeshes(a)[0].geometry,skinMeshes(b)[0].geometry);assert.equal(skinMeshes(a)[1].material,skinMeshes(b)[1].material);a.dispose();b.dispose();}
// Complete-pair selection ports only the two already-authored French cuts.
const pair=[];
for(const [name,look]of [['male',male],['female',female]]){
 const a=C.createCharacter({...look,modelPreview:'complete-adult-pair-v1',previewHair:name==='female'?'long-layered':null}),headOnly=C.createCharacter({...look,...previewFor(look)}),triangles=C.auditCharacter(a).visibleTriangles;
 assert(a.root.userData.characterModel.garmentRefinement);assert.deepEqual(a.root.userData.appearance,headOnly.root.userData.appearance);assert.equal(skinMeshes(a).length,2);if(name==='female'){assert(ranges(a).has('hair-female-long-layered'));assert.equal(a.root.userData.appearance.hairStyle,'chin-bob');assert(!Object.hasOwn(a.root.userData.appearance,'previewHair'));}assert.notEqual(skinMeshes(a)[0].geometry,skinMeshes(headOnly)[0].geometry);
 pair.push({name,triangles,score:shapePreferenceScore(a.root.userData.appearance.shapeTraits)});a.dispose();headOnly.dispose();
}
const unmatched=C.createCharacter({...official,modelPreview:'complete-adult-pair-v1'});assert.equal(unmatched.root.userData.characterModel.reason,'complete-pair-only');unmatched.dispose();
const omittedHair=C.createCharacter({...female,modelPreview});assert.equal(omittedHair.root.userData.characterModel.reason,'explicit-female-hair-required');omittedHair.dispose();
const wrongGarment=C.createCharacter({...consort,modelPreview,previewHair:'long-layered'});assert.equal(wrongGarment.root.userData.characterModel.reason,'long-hair-needs-matching-gown');wrongGarment.dispose();
// Four chosen new endpoints exercise the actual merged cache and head mesh.
// Existing exhaustive pure shape/save contracts are reused, not duplicated.
const endpoints=[];
for(const [look,key,side]of [[female,'chinLength','max'],[male,'chinProjection','min'],[male,'noseBridgeHeight','max'],[female,'noseTipSize','max']]){
 const neutral={...look,shapeTraits:normalizeShapeTraits(null)},base=C.createCharacter({...neutral,...previewFor(look)}),changed=C.createCharacter({...neutral,shapeTraits:{...neutral.shapeTraits,[key]:SHAPE_RANGES[key][side]},...previewFor(look)});
 const a=ranges(base).get('continuous-head-anatomical-head-neck'),b=ranges(changed).get('continuous-head-anatomical-head-neck');let maxDelta=0;
 for(let j=0;j<a.r.count;j++){const i=a.r.start+j,k=b.r.start+j;for(const axis of['X','Y','Z']){const delta=Math.abs(a.g.attributes.position['get'+axis](i)-b.g.attributes.position['get'+axis](k));maxDelta=Math.max(maxDelta,delta);if(a.g.attributes.sourceY.getX(i)<1.36)assert.equal(delta,0);}}
 if(key==='chinLength'){
  // Reproduce the elongated candidate's former 1.435 m neck-threshold leak.
  const fc=b.g.attributes.featureCoord,si=b.g.attributes.skinIndex,sw=b.g.attributes.skinWeight;
  for(let j=0;j<b.r.count;j++){const i=b.r.start+j;if(fc.getY(i)>6.10&&fc.getY(i)<6.40&&fc.getZ(i)>1.15&&Math.abs(fc.getX(i))<.45){let head=0;for(let k=0;k<4;k++)if(si.array[i*4+k]===3)head+=sw.array[i*4+k];assert.equal(head,1,'Long chin remains rigid to head');}}
 }
 assert(maxDelta>.0005&&maxDelta<.01,key);assert.equal(shapePreferenceScore(base.root.userData.appearance.shapeTraits),shapePreferenceScore(changed.root.userData.appearance.shapeTraits));endpoints.push({body:look.bodyPreset,key,value:SHAPE_RANGES[key][side],maxDelta});base.dispose();changed.dispose();
}
assert.equal(JSON.stringify(state),saved);assert.equal(C.characterResourceStats().activeReferences,0);
console.log(JSON.stringify({status:'PASS',result,pair,endpoints,resources:C.characterResourceStats(),scope:'Actual createCharacter/cache/skeleton/save contracts; no world, browser or phone claim'},null,2));
