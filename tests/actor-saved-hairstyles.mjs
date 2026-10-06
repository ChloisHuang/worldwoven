/** Regression: saved six-way identity was rendered as only two sex defaults.
 * Check real adult-scalp/garment triangle contacts, rigid full braid and
 * sourceY leg mapping. This is geometry evidence, not visual acceptance. */
import {registerHooks} from 'node:module';import {pathToFileURL} from 'node:url';import path from 'node:path';import assert from 'node:assert/strict';import crypto from 'node:crypto';
registerHooks({resolve(s,c,next){return s==='three'?{url:pathToFileURL(path.resolve('source/vendor/three/build/three.module.js')).href,shortCircuit:true}:next(s,c);}});
const {createApprovedSurfaces}=await import('../source/game/approved-surfaces.js'),{ADULT_FORMS}=await import('../source/game/complete-adult/assets/adult-forms-data.js'),{createHeadAttachmentFit}=await import('../source/game/complete-adult/attachment-fit.js'),{planSavedHairstyle,applySavedHairstyle,SAVED_HAIRSTYLES,createHairSurfaceEnvelope,hairGarmentParts}=await import('../source/game/complete-adult/saved-hairstyle-fit.js'),{WARDROBE_PRESETS}=await import('../source/game/appearance.js');
const hash=g=>crypto.createHash('sha256').update(Buffer.from(g.attributes.position.array.buffer)).digest('hex');
const dispose=root=>root.traverse(m=>{if(m.isMesh)m.geometry.dispose();});
function samples(g,check){const p=g.attributes.position,ix=g.index.array;for(let i=0;i<p.count;i++)check([p.getX(i),p.getY(i),p.getZ(i)]);for(let i=0;i<ix.length;i+=3){const a=ix[i],b=ix[i+1],c=ix[i+2];for(const w of [[.5,.5,0],[0,.5,.5],[.5,0,.5],[1/3,1/3,1/3]])check([0,1,2].map(k=>w[0]*p.array[a*3+k]+w[1]*p.array[b*3+k]+w[2]*p.array[c*3+k]));}}
const results=[],signatures={male:new Set(),female:new Set()},contacts={};
for(const culture of ['china','japan','egypt','france'])for(const form of ['male','female'])for(const style of SAVED_HAIRSTYLES){
 const bodyPreset=form==='male'?'masculine-lean':'feminine-balanced',options={culture,bodyPreset,masc:form==='male',hairStyle:style,wardrobePreset:WARDROBE_PRESETS[culture][form==='male'?'masculine':'feminine'][0],hair:0x44342f,previewHairFlow:true},root=createApprovedSurfaces(options),head=root.getObjectByName('sculpted-head'),fit=createHeadAttachmentFit(head,ADULT_FORMS[form]),oldHead=hash(head.getObjectByName('continuous-head-jaw-cheeks-nose').geometry),clothes=new Map();root.traverse(m=>{if(m.isMesh&&m.parent!==head)clothes.set(m,hash(m.geometry));});
 const plan=planSavedHairstyle(root,options,fit);assert(plan.supported,culture+'/'+form+'/'+style+' '+plan.reason);const summary=applySavedHairstyle(plan);
 assert.equal(hash(head.getObjectByName('continuous-head-jaw-cheeks-nose').geometry),oldHead,'never shrink head');for(const[m,digest]of clothes)assert.equal(hash(m.geometry),digest,'never change garment');
 const g=head.getObjectByName('hair-saved-'+style).geometry;if(culture==='china')signatures[form].add(hash(g));assert(g.attributes.featureKind,'keeps bundle flow');
 const key=form+'/'+style;if(!contacts[key]){const scalp=createHairSurfaceEnvelope([ADULT_FORMS[form].parts.find(p=>p.material==='skin')],{minimumY:1.44});let min=Infinity,count=0,penetrations=0;samples(g,([x,y,z])=>{if(y<1.44)return;const c=scalp(x,y,z);if(c){min=Math.min(min,c.distance);count++;if(c.distance<-.0001)penetrations++;}});contacts[key]={samples:count,minClearance:min,penetrations};}
 const clothEnvelope=createHairSurfaceEnvelope(hairGarmentParts(root));let clothMinimum=Infinity,clothPenetrations=0;for(const m of plan.meshes)samples(m.geometry,([x,y,z])=>{if(y>1.46)return;const contact=clothEnvelope(x,y,z);if(contact){clothMinimum=Math.min(clothMinimum,contact.distance);if(contact.distance<-.0001)clothPenetrations++;}});assert.equal(clothPenetrations,0,[culture,form,style,'garment triangle interiors',clothMinimum].join('/'));
 if(plan.braid){assert(plan.braid.length>.30,'keep full authored braid');assert(summary.braid.rootBridge,'join shifted root');for(const m of plan.braid.meshes)assert.equal(m.userData.completeAdultPart,'long-hair');}
 results.push({culture,form,style,scalpFit:plan.scalpFit,clothFit:plan.clothFit,clothMinimum,braid:summary.braid});dispose(root);
}
assert.equal(signatures.male.size,6);assert.equal(signatures.female.size,6);
// Previously rejected combinations include broad bodies, heavier clothes and
// saved long/short legs. Soaking remains a deliberate compact bound braid.
for(const bodyPreset of ['masculine-broad','feminine-slender'])for(const legLength of [.94,1.06])for(const culture of ['china','japan','egypt','france'])for(const wardrobePreset of [...WARDROBE_PRESETS[culture][bodyPreset.startsWith('masculine')?'masculine':'feminine'],...(culture==='japan'?['onsen-swimwear']:[])]){
 const form=bodyPreset.startsWith('masculine')?'male':'female',options={culture,bodyPreset,masc:form==='male',hairStyle:'braided-tail',wardrobePreset,hair:0x665544,shapeTraits:{legLength}},root=createApprovedSurfaces(options),fit=createHeadAttachmentFit(root.getObjectByName('sculpted-head'),ADULT_FORMS[form]),plan=planSavedHairstyle(root,options,fit);assert(plan.supported,[bodyPreset,legLength,culture,wardrobePreset,plan.reason].join('/'));const summary=applySavedHairstyle(plan);assert.equal(summary.boundForSoaking,wardrobePreset==='onsen-swimwear');if(plan.braid)assert(plan.braid.length>.30);dispose(root);
}
// A deep male socket moves the forehead locally. The cross-form dimensions
// stay neutral, but the final contact pass must clear the actual morphed skin.
const {morphCompleteAdultAsset,sculptCompleteAdultProfile}=await import('../source/game/complete-adult/shape-traits.js');
for(const hairStyle of ['swept-short','side-part','low-bun']){
 const options={culture:'china',bodyPreset:'masculine-broad',masc:true,hairStyle,wardrobePreset:'scholar-long-robe',hair:0x44342f,shapeTraits:{socketDepth:1.65,eyeSize:1.2}},root=createApprovedSurfaces(options),asset=morphCompleteAdultAsset(sculptCompleteAdultProfile(ADULT_FORMS.male),options.shapeTraits),fit=createHeadAttachmentFit(root.getObjectByName('sculpted-head'),asset,ADULT_FORMS.male),plan=planSavedHairstyle(root,options,fit,asset),envelope=createHairSurfaceEnvelope([asset.parts.find(p=>p.material==='skin')],{minimumY:1.44});
 assert(plan.supported);let bad=0;samples(plan.meshes[0].geometry,([x,y,z])=>{if(y<1.44)return;const c=envelope(x,y,z);if(c&&c.distance<-.0001)bad++;});assert.equal(bad,0,'actual male forehead contact '+hairStyle);applySavedHairstyle(plan);dispose(root);
}
console.log(JSON.stringify({status:Object.values(contacts).some(c=>c.penetrations)?'CONTACT_FAILURE':'PASS',cases:results.length,contacts,results},null,2));assert(Object.values(contacts).every(c=>!c.penetrations),'hair triangle interiors clear real scalp');
