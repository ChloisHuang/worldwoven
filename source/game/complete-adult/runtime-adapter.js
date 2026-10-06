/** Explicit per-actor preview. Production selection, identity and clothes stay
 * under their existing owners. Candidate art still requires visual approval. */
import * as THREE from 'three';
import {normalizeShapeTraits} from '../character-traits.js';
import {ADULT_FORMS} from './assets/adult-forms-data.js';
import {attachCompleteHead} from './attach-head.js';
import {addLayeredHair} from './layered-hair.js';
import {addFemaleHairOption,FEMALE_HAIR_OPTIONS} from './female-hair-options.js';
import {applyNaturalClothing} from './natural-clothing.js';
import {applyFemaleSilhouette} from './female-silhouette.js';
import {fitCompleteAdultClothing} from './fit-clothing.js';
import {applyAnatomicalFinish} from './face-finish.js';
import {applySurfaceFinish} from './surface-finish.js';
import {applyNaturalMakeup} from './natural-makeup.js';
import {morphCompleteAdultAsset,sculptCompleteAdultProfile,fitCompleteAdultAttachments} from './shape-traits.js';
import {RETAINED_HAIR,createHeadAttachmentFit,fitCandidateHairAttachments,fitRetainedHeadMesh,fitRetainedFacialHair} from './attachment-fit.js';
import {FREE_BRAID,planRetainedBraid,applyRetainedBraid} from './retained-hair-fit.js';
export const COMPLETE_ADULT_PREVIEW='complete-adult-head-v1';
export const COMPLETE_ADULT_PAIR_PREVIEW='complete-adult-pair-v1';
export const COMPLETE_ADULT_VERSION='candidate-female-supported-projection-v1';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const forms={'masculine-lean':'male','masculine-broad':'male','feminine-balanced':'female','feminine-slender':'female'};
export function completeAdultSupport(options,selection){
 const shapeTraits=normalizeShapeTraits(options.shapeTraits),form=forms[options.bodyPreset];
 const fail=reason=>({supported:false,reason,shapeTraits});
 if(![COMPLETE_ADULT_PREVIEW,COMPLETE_ADULT_PAIR_PREVIEW].includes(selection))return fail(selection?'unknown-preview':'not-requested');
 if(!form)return fail('unsupported-body');
 if(options.previewHair&&options.previewHair!=='retained'&&!(form==='male'&&options.previewHair==='side-part')&&!(form==='female'&&FEMALE_HAIR_OPTIONS.includes(options.previewHair)))return fail('unsupported-preview-hair');
 const bakedHair=options.previewHair==='side-part'||FEMALE_HAIR_OPTIONS.includes(options.previewHair);
 if(options.previewHair==='retained'&&!['low-bun','braided-tail'].includes(options.hairStyle))return fail('retained-hairstyle-needs-fit');
 if(form==='female'&&!options.previewHair)return fail('explicit-female-hair-required');
 if(options.previewHair==='long-layered'&&!(selection===COMPLETE_ADULT_PAIR_PREVIEW&&options.culture==='france'&&options.bodyPreset==='feminine-slender'&&options.wardrobePreset==='court-gown'))return fail('long-hair-needs-matching-gown');
 if(selection===COMPLETE_ADULT_PAIR_PREVIEW&&(options.culture!=='france'||(options.style??'casual')!=='casual'||!(options.bodyPreset==='masculine-lean'&&(bakedHair||options.hairStyle==='side-part')&&options.wardrobePreset==='court-frock-coat'||form==='female'&&bakedHair&&['court-gown','court-overgown'].includes(options.wardrobePreset))))return fail('complete-pair-only');
 if(!bakedHair&&options.hairStyle==='braided-tail'&&options.previewHair!=='retained')return fail('retained-braid-opt-in-required');
 if(!bakedHair&&!['low-bun','braided-tail'].includes(options.hairStyle)&&options.hairStyle!==(form==='male'?'side-part':'chin-bob'))return fail('hairstyle-needs-fit');
 const style=options.style??'casual';
 const fittedChef=style==='chef'&&['low-bun','braided-tail'].includes(options.hairStyle)&&(!options.previewHair||options.previewHair==='retained');
 if(style!=='casual'&&!fittedChef&&!(style==='artist'&&options.culture==='france'&&form==='male'))return fail('role-headgear-needs-fit');
 if(['skin','hair','eyeColor'].some(k=>!Number.isInteger(options[k])))return fail('normalized-colors-required');
 return{supported:true,form,shapeTraits};
}
export function applyCompleteAdultPreview(root,options,selection){
 const support=completeAdultSupport(options,selection);if(!support.supported)return{applied:false,...support};
 const head=root.getObjectByName('sculpted-head');if(!head)return{applied:false,reason:'missing-head-root'};
 const asset=morphCompleteAdultAsset(sculptCompleteAdultProfile(ADULT_FORMS[support.form]),support.shapeTraits);
 // Local nose/brow support must not resize a retained hairstyle or role hat.
 const attachmentFit=createHeadAttachmentFit(head,asset,ADULT_FORMS[support.form]);
 const retained=options.previewHair==='retained'||(!options.previewHair&&options.hairStyle==='low-bun');
 const braid=options.hairStyle==='braided-tail'&&retained?planRetainedBraid(root,attachmentFit):null;if(braid&&!braid.supported)return{applied:false,reason:braid.reason};
 const C={skin:options.skin,hair:options.hair,iris:options.eyeColor,pupil:0x25252a,brow:new THREE.Color(options.hair).multiplyScalar(.9).getHex()};
 fitCompleteAdultAttachments(root,options,()=>{
  for(const mesh of head.children){
   if(!mesh.isMesh)continue;
   if(retained&&RETAINED_HAIR.test(mesh.name)&&!FREE_BRAID.test(mesh.name)||/cook-.*cap|artist-beret|garden-straw/.test(mesh.name))fitRetainedHeadMesh(mesh,attachmentFit);
   if(/^court-official-facial-hair-/.test(mesh.name))fitRetainedFacialHair(mesh,attachmentFit,asset);
  }
  if(braid)attachmentFit.retainedBraid=applyRetainedBraid(braid);
  attachCompleteHead(root,C,asset,{surface:true});
  // Hair is the only replaced attachment; authored role hats survive the
  // explicit face removal list in attach-head. Facial hair has its own fit.
  if(!retained){for(const mesh of[...head.children])if(mesh.isMesh&&RETAINED_HAIR.test(mesh.name)){mesh.removeFromParent();mesh.geometry.dispose();}const flowFinish=!!options.previewHairFlow,hair=support.form==='male'?addLayeredHair(head,C.hair,{flowFinish}):addFemaleHairOption(head,C.hair,options.previewHair,{flowFinish});hair.userData.softSkin=support.form==='female';hair.userData.completeAdultPart=options.previewHair==='long-layered'?'long-hair':'hair';if(options.previewHair)fitCandidateHairAttachments(attachmentFit,hair);}
 });
 if(selection===COMPLETE_ADULT_PAIR_PREVIEW)fitCompleteAdultClothing(root,options,neutral=>{applyNaturalClothing(root,neutral);applyFemaleSilhouette(root,neutral);});
 const result={applied:true,hairFlow:!!options.previewHairFlow,previewHair:options.previewHair??null,...(options.previewMakeup==='natural'?{makeup:'natural'}:{}),garmentRefinement:selection===COMPLETE_ADULT_PAIR_PREVIEW,version:COMPLETE_ADULT_VERSION,form:support.form,attachmentFit};
 root.userData.completeAdultRepresentation=result;return result;
}
/** Cache selection is never persisted as an appearance version. */
export function completeAdultCacheTag(options,selection){return completeAdultSupport(options,selection).supported?COMPLETE_ADULT_VERSION+'|'+selection+'|'+(options.previewHair??'saved-hair')+'|flow:'+!!options.previewHairFlow+(options.previewMakeup==='natural'?'|makeup:natural-v1':''):'legacy';}
export function completeAdultWeights(mesh,sourceY,index){
 if(!mesh.userData.completeAdultPart)return null;
 if(mesh.userData.completeAdultPart==='long-hair'){
  // The baked lower lengths lie on the gown, so they follow torso joints; only
  // the crown is rigid to the head. Reuse existing rest heights and two buckets.
  if(sourceY<1.335){const u=clamp((sourceY-1.18)/.155);return[[1,1-u],[2,u]];}
  const u=clamp((sourceY-1.395)/.08);return[[2,1-u],[3,u]];
 }
 if(mesh.userData.completeAdultPart==='skin'&&sourceY<1.435){
  // Only the native cervical surface blends into the torso. Long-chin facial
  // vertices can cross this height without becoming part of the neck.
  const feature=mesh.geometry.attributes.featureCoord;
  const cervical=!feature||index===undefined||feature.getY(index)<6.20&&feature.getZ(index)<1.12;
  if(cervical){const u=clamp((sourceY-1.365)/.070);return[[2,1-u],[3,u]];}
 }
 return[[3,1]];
}
/** Extra channels accompany the existing two material buckets. Legacy meshes
 * receive zero feature channels so mixed scenes keep their existing ramp. */
export function createCompleteAdultChannels(){return{featureCoord:[],featureKind:[],eyeReflectance:[],featureSheen:[],anatomicalTone:[]};}
export function appendCompleteAdultVertex(channels,mesh,index,position){
 const g=mesh.geometry,kind=mesh.userData.completeAdultPart;
 channels.featureCoord.push(g.attributes.featureCoord?.getX(index)??0,g.attributes.featureCoord?.getY(index)??0,g.attributes.featureCoord?.getZ(index)??0);
 channels.featureKind.push(g.attributes.featureKind?.getX(index)??0);
 channels.eyeReflectance.push(['iris','pupil','sclera'].includes(kind)?1:0);channels.featureSheen.push(0);
 const sourceY=g.attributes.sourceY?.getX(index)??position.y,t=clamp((sourceY-1.395)/.050);channels.anatomicalTone.push(kind==='hair'||kind==='long-hair'?-1:['skin','iris','pupil','sclera'].includes(kind)?t*t*(3-2*t):0);
}
export function finishCompleteAdultChannels(geometry,channels){
 for(const [name,array]of Object.entries(channels))geometry.setAttribute(name,new THREE.Float32BufferAttribute(array,name==='featureCoord'?3:1));
}
export function readCompleteAdultColor(mesh,index,target){const a=mesh.geometry.attributes.color;return a?target.setRGB(a.getX(index),a.getY(index),a.getZ(index)):target.copy(mesh.material.color);}
export function completeAdultMaterialKey(preview,section){return COMPLETE_ADULT_VERSION+'|flow:'+!!preview.hairFlow+(preview.makeup==='natural'&&section!=='cloth'?'|makeup:natural-v1':'');}
export function prepareCompleteAdultSkinMaterial(material,preview={}){
 if(material.userData.completeAdultFinish)return material;
 applyAnatomicalFinish(material,{narrow:true,reflect:false});applySurfaceFinish(material,{hairFlow:!!preview.hairFlow});if(preview.makeup==='natural')applyNaturalMakeup(material);material.userData.completeAdultFinish=COMPLETE_ADULT_VERSION;return material;
}

export function prepareCompleteAdultClothMaterial(material,preview={}){
 if(preview.hairFlow)applySurfaceFinish(material,{hairFlow:true});
 material.userData.completeAdultHairFlow=!!preview.hairFlow;return material;
}
