/** Narrow integration-contract check, not a morphology or all-world matrix. */
import {registerHooks} from 'node:module';
import {pathToFileURL,fileURLToPath} from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const HERE=path.dirname(fileURLToPath(import.meta.url)),SOURCE=path.resolve(HERE,'../../source');
registerHooks({resolve(s,c,next){if(s==='three')return{url:pathToFileURL(SOURCE+'/vendor/three/build/three.module.js').href,shortCircuit:true};return next(s,c);}});
const T=await import('three'),{createApprovedSurfaces}=await import('../../source/game/approved-surfaces.js');
const A=await import('./runtime-adapter.mjs'),{ADULT_FORMS}=await import('./assets/adult-forms-data.mjs');
const {morphCompleteAdultAsset}=await import('./shape-traits.mjs');
const {normalizeShapeTraits,SHAPE_RANGES,LEGACY_SHAPE_KEYS,shapeHeight,shapePreferenceScore}=await import('../../source/game/character-traits.js');
// These low-cost contracts cover real integration failure modes: shared-cache
// mutation, eye material seams, detached lids/collars and score/save migration.
const assetsBefore=structuredClone(ADULT_FORMS);
const palette={skin:0xdba789,hair:0x44342f,eyeColor:0x594b3f,clothes:0x65847b,accent:0xe7cab0};
const records=[];
for(const [form,bodyPreset,hairStyle,wardrobePreset]of [['male','masculine-lean','side-part','court-frock-coat'],['female','feminine-slender','chin-bob','court-gown']]){
 const opts={...palette,culture:'france',style:'casual',bodyPreset,hairStyle,wardrobePreset,masc:form==='male',shapeTraits:{jawWidth:1,legLength:1,eyeSize:1,noseSize:1,noseWidth:1,socketDepth:1},stableId:'review-'+form};
 const snapshot=structuredClone(opts),root=createApprovedSurfaces(opts),result=A.applyCompleteAdultPreview(root,opts);assert(result.applied);assert.deepEqual(opts,snapshot);
 const expected=JSON.parse(fs.readFileSync(path.join(HERE,form==='male'?'adult-head.json':'adult-head-female.json')));
 assert.equal(morphCompleteAdultAsset(ADULT_FORMS[form],opts.shapeTraits),ADULT_FORMS[form]);
 for(const part of ADULT_FORMS[form].parts){const mesh=root.getObjectByName('sculpted-head').children.find(m=>m.name.endsWith('-'+part.name));for(const key of ['position','normal'])assert.deepEqual(mesh.geometry.attributes[key].array,part[key]);}
 for(let i=0;i<expected.parts.length;i++)for(const key of ['position','normal','index'])assert.deepEqual(Array.from(ADULT_FORMS[form].parts[i][key]),Array.from(key==='index'?new Uint16Array(expected.parts[i][key]):new Float32Array(expected.parts[i][key])));
 let triangles=0,anchored=0;const channels=A.createCompleteAdultChannels(),pos=new T.Vector3();
 root.traverse(mesh=>{if(!mesh.isMesh)return;triangles+=mesh.geometry.index.count/3;const g=mesh.geometry,p=g.attributes.position;for(let i=0;i<p.count;i++){pos.fromBufferAttribute(p,i);A.appendCompleteAdultVertex(channels,mesh,i,pos);if(mesh.userData.completeAdultPart==='skin'&&pos.y<1.36){assert.deepEqual(A.completeAdultWeights(mesh,pos.y),[[2,1],[3,0]]);anchored++;}}});
 assert.equal(anchored,46);assert.equal(triangles,form==='male'?33316:29804);assert.equal(channels.featureKind.length*3,channels.featureCoord.length);assert.equal(channels.featureKind.length,channels.anatomicalTone.length);
 const merged=new T.BufferGeometry();A.finishCompleteAdultChannels(merged,channels);assert.equal(merged.attributes.featureCoord.count,channels.featureKind.length);merged.dispose();
 records.push({form,triangles,collarAnchors:anchored});root.traverse(m=>{if(m.isMesh)m.geometry.dispose();});
}
// Representative saved requests now use the reviewed topology, while all saved
// numbers, stable identifiers, seeds, palette choices and original scores survive.
const npc={...palette,culture:'france',style:'casual',masc:true,bodyPreset:'masculine-lean',hairStyle:'side-part',wardrobePreset:'court-frock-coat',id:'unchanged-resident',seed:19,shapeTraits:{jawWidth:.94,legLength:1.02,eyeSize:1.04,noseSize:.97,noseWidth:.91,socketDepth:1.20}};
const player={...npc,masc:false,bodyPreset:'feminine-slender',hairStyle:'chin-bob',wardrobePreset:'court-gown',id:'saved-player',seed:41,shapeTraits:{jawWidth:1.05,legLength:.97,eyeSize:.93,noseSize:1.08,noseWidth:1.10,socketDepth:.82}};
const near=(a,b,epsilon=2e-7)=>assert(Math.abs(a-b)<epsilon,`${a} != ${b}`);
const dispose=root=>root.traverse(m=>{if(m.isMesh)m.geometry.dispose();});
const saved=[];
for(const options of [npc,player]){
 const original=structuredClone(options),score=shapePreferenceScore(options.shapeTraits),root=createApprovedSurfaces(options);
 const legacyLeg=root.getObjectByName('sculpted-head').parent.children.filter(m=>m.isMesh&&/footwear|bare-leg/.test(m.name)).map(m=>[m,m.geometry.attributes.position.array.slice()]);
 assert(A.applyCompleteAdultPreview(root,options).applied);assert.deepEqual(options,original);assert.equal(shapePreferenceScore(options.shapeTraits),score);
 assert.deepEqual(root.userData.completeAdultRepresentation.shapeTraits,normalizeShapeTraits(options.shapeTraits));
 for(const [mesh,p]of legacyLeg)assert.deepEqual(mesh.geometry.attributes.position.array,p);
 const form=options.masc?'male':'female',base=ADULT_FORMS[form].parts.find(p=>p.material==='skin'),head=root.getObjectByName('continuous-head-anatomical-head-neck'),p=head.geometry.attributes.position,sy=head.geometry.attributes.sourceY;
 let collar=0;for(let i=0;i<p.count;i++)if(base.position[i*3+1]<1.36){near(p.getX(i),base.position[i*3]);near(p.getZ(i),base.position[i*3+2]);near(p.getY(i),shapeHeight(base.position[i*3+1],options.shapeTraits.legLength));near(sy.getX(i),base.position[i*3+1]);assert.deepEqual(A.completeAdultWeights(head,sy.getX(i)),[[2,1],[3,0]]);collar++;}
 assert.equal(collar,46);assert(root.userData.naturalClothing||root.userData.femaleSilhouette?.changed.length);
 // All mapped garment/hair/skin vertices keep anatomical sourceY. The fixed
 // head anchor means leg length never translates the eye or facial landmarks.
 let buckets=new Set();root.traverse(m=>{if(!m.isMesh)return;buckets.add(Boolean(m.userData.softSkin));if(m.userData.completeAdultPart||m.userData.naturalClothing||m.userData.femaleGarmentFit)assert(m.geometry.attributes.sourceY);});assert.equal(buckets.size,2);
 saved.push({id:options.id,form,score,collarAnchors:collar});dispose(root);
}
// Leg-only requests retain the authored face exactly; the inserted neck, bob
// tips and fitted garment follow the same rest-height map as the legacy body.
for(const options of [npc,player]){
 const neutral={...options,shapeTraits:normalizeShapeTraits(null)},base=createApprovedSurfaces(neutral);assert(A.applyCompleteAdultPreview(base,neutral).applied);
 for(const legLength of [SHAPE_RANGES.legLength.min,SHAPE_RANGES.legLength.max]){
  const opts={...neutral,shapeTraits:{...neutral.shapeTraits,legLength}},changed=createApprovedSurfaces(opts);assert(A.applyCompleteAdultPreview(changed,opts).applied);let mapped=0,max=0;
  changed.traverse(m=>{if(!m.isMesh||/sleeve/.test(m.name)||!(m.userData.completeAdultPart||m.userData.naturalClothing||m.userData.femaleGarmentFit))return;const p=m.geometry.attributes.position,q=base.getObjectByName(m.name).geometry.attributes.position;assert.equal(p.count,q.count);for(let i=0;i<p.count;i++){near(p.getX(i),q.getX(i));near(p.getZ(i),q.getZ(i));near(p.getY(i),shapeHeight(q.getY(i),legLength));max=Math.max(max,Math.abs(p.getY(i)-q.getY(i)));if(p.getY(i)!==q.getY(i))mapped++;}});
  assert(mapped>100&&max>.009&&max<.052);dispose(changed);
 }
 dispose(base);
}
const nearest=(part,target)=>{let best=Infinity,at=0;for(let i=0;i<part.featureCoord.length;i+=3){const d=target.reduce((n,v,k)=>n+(part.featureCoord[i+k]-v)**2,0);if(d<best){best=d;at=i;}}return at;};
const allChanges=[];
for(const [form,asset]of Object.entries(ADULT_FORMS)){
 const skin=asset.parts.find(p=>p.material==='skin'),lid=nearest(skin,[.311,7.332,1.4107]),lower=nearest(skin,[.31,7.24,1.402]),jaw=nearest(skin,[.58,6.41,.78]),tip=nearest(skin,[0,6.909,1.6807]),ala=nearest(skin,[.205,6.865,1.49]);
 for(const key of LEGACY_SHAPE_KEYS)for(const value of [SHAPE_RANGES[key].min,SHAPE_RANGES[key].max]){
  const traits=normalizeShapeTraits({[key]:value}),result=morphCompleteAdultAsset(asset,traits),changed=result.parts.find(p=>p.material==='skin');
  if(key==='legLength'){assert.equal(result,asset);continue;}
  let max=0;for(let i=0;i<skin.position.length;i++){assert(Number.isFinite(changed.position[i]));max=Math.max(max,Math.abs(changed.position[i]-skin.position[i]));if(skin.position[Math.floor(i/3)*3+1]<1.38)assert.equal(changed.position[i],skin.position[i]);}
  assert(max>1e-5&&max<.025,`${form} ${key} movement ${max}`);
  for(const part of result.parts)for(let i=0;i<part.normal.length;i+=3)near(Math.hypot(...part.normal.slice(i,i+3)),1,2e-5);
  if(key==='jawWidth')assert((changed.position[jaw]-skin.position[jaw])*(value-1)>0);
  if(key==='noseWidth')assert((changed.position[ala]-skin.position[ala])*(value-1)>0);
  if(key==='noseSize'){assert((changed.position[tip+2]-skin.position[tip+2])*(value-1)>0);assert((changed.position[tip+1]-skin.position[tip+1])*(value-1)<0);}
  if(key==='eyeSize'||key==='socketDepth'){
   const eyeIndex=asset.parts.findIndex(p=>p.material==='iris'&&p.position[0]>0),oldEye=asset.parts[eyeIndex],newEye=result.parts[eyeIndex];
   for(const at of [lid,lower])for(let k=0;k<3;k++){
    if(key==='eyeSize')near(changed.position[at+k]-newEye.position[k],(skin.position[at+k]-oldEye.position[k])*value);
    else near(changed.position[at+k]-skin.position[at+k],newEye.position[k]-oldEye.position[k]);
   }
   if(key==='socketDepth')assert((newEye.position[2]-oldEye.position[2])*(value-1)<0);
  }
  // Material splits duplicate the same globe ring. They must still be the
  // same point with the same normal after any combination of facial controls.
  const boundaries=new Map();let shared=0;
  for(let j=0;j<asset.parts.length;j++){const before=asset.parts[j],after=result.parts[j];if(!['sclera','iris','pupil'].includes(before.material))continue;for(let i=0;i<before.position.length;i+=3){const id=Array.from(before.position.slice(i,i+3)).join(','),v=[...after.position.slice(i,i+3),...after.normal.slice(i,i+3)],prior=boundaries.get(id);if(prior){assert.deepEqual(v,prior);shared++;}else boundaries.set(id,v);}}
  assert(shared>=192);allChanges.push({form,trait:key,value,maxDelta:Number(max.toFixed(6))});
 }
}
// Four targeted new-control examples, not a rendered trait/body matrix. Old
// six values and all-ones geometry keep their previous meaning and score.
const extended=[];
for(const [form,key,bound]of [['male','chinLength','min'],['female','chinProjection','max'],['male','noseBridgeHeight','max'],['female','noseTipSize','min']]){
 const asset=ADULT_FORMS[form],base=asset.parts.find(p=>p.material==='skin'),traits=normalizeShapeTraits({[key]:SHAPE_RANGES[key][bound]}),result=morphCompleteAdultAsset(asset,traits),skin=result.parts.find(p=>p.material==='skin');
 const chin=nearest(base,[0,6.2006,1.4344]),bridge=nearest(base,[0,7.1046,1.583]),tip=nearest(base,[0,6.909,1.6807]),tipSide=nearest(base,[.075,6.918,1.66]),mouth=nearest(base,[0,6.6081,1.553]);
 const delta=traits[key]-1;let max=0;
 for(let i=0;i<skin.position.length;i++){assert(Number.isFinite(skin.position[i]));max=Math.max(max,Math.abs(skin.position[i]-base.position[i]));if(base.position[Math.floor(i/3)*3+1]<1.38||base.featureCoord[Math.floor(i/3)*3+1]>7.5)assert.equal(skin.position[i],base.position[i]);}
 assert(max>1e-4&&max<.008,key+' has bounded actual geometry change');
 for(let k=0;k<3;k++)assert.equal(skin.position[mouth+k],base.position[mouth+k],'mouth remains outside new controls');
 if(key==='chinLength')assert((skin.position[chin+1]-base.position[chin+1])*delta<0);
 if(key==='chinProjection')assert((skin.position[chin+2]-base.position[chin+2])*delta>0);
 if(key==='noseBridgeHeight'){assert((skin.position[bridge+2]-base.position[bridge+2])*delta>0);for(let k=0;k<3;k++)assert.equal(skin.position[tip+k],base.position[tip+k],'bridge does not resize tip');}
 if(key==='noseTipSize'){assert((skin.position[tip+2]-base.position[tip+2])*delta>0);assert((skin.position[tipSide]-base.position[tipSide])*delta>0);for(let k=0;k<3;k++)assert.equal(skin.position[bridge+k],base.position[bridge+k],'tip does not resize bridge');}
 for(let i=0;i<asset.parts.length;i++)if(['sclera','iris','pupil'].includes(asset.parts[i].material))assert.equal(result.parts[i],asset.parts[i],'new controls leave globes unchanged');
 assert.equal(shapePreferenceScore(traits),shapePreferenceScore({}));extended.push({form,trait:key,value:traits[key],maxDelta:Number(max.toFixed(6))});
}
// Unsupported choices still return the original legacy objects unchanged.
const unsupported={...npc,hairStyle:'swept-short'},root=createApprovedSurfaces(unsupported),meshes=[...root.getObjectByName('sculpted-head').children];
assert.equal(A.applyCompleteAdultPreview(root,unsupported).reason,'unreviewed-hair-or-garment');assert.deepEqual([...root.getObjectByName('sculpted-head').children],meshes);dispose(root);
assert.deepEqual(ADULT_FORMS,assetsBefore);
console.log(JSON.stringify({status:'PASS',neutral:records,savedRequests:saved,traitBounds:allChanges,extended,eyeSeams:'continuous original globe normals',unsupportedFallback:'unchanged',activation:'none'}));
