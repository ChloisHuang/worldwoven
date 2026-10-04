/** Explicit per-actor preview. Production selection, identity and clothes stay
 * under their existing owners. Candidate art still requires visual approval. */
import * as THREE from 'three';
import {normalizeShapeTraits} from '../character-traits.js';
import {ADULT_FORMS} from './assets/adult-forms-data.js';
import {attachCompleteHead} from './attach-head.js';
import {addLayeredHair} from './layered-hair.js';
import {addFemaleHair} from './female-hair.js';
import {applyAnatomicalFinish} from './face-finish.js';
import {applySurfaceFinish} from './surface-finish.js';
import {morphCompleteAdultAsset,fitCompleteAdultAttachments} from './shape-traits.js';
import {RETAINED_HAIR,createHeadAttachmentFit,fitRetainedHeadMesh,fitRetainedFacialHair} from './attachment-fit.js';
export const COMPLETE_ADULT_PREVIEW='complete-adult-head-v1';
export const COMPLETE_ADULT_VERSION='candidate-a0b2aa3-head-runtime-v1';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const forms={'masculine-lean':'male','masculine-broad':'male','feminine-balanced':'female','feminine-slender':'female'};
export function completeAdultSupport(options,selection){
 const shapeTraits=normalizeShapeTraits(options.shapeTraits),form=forms[options.bodyPreset];
 const fail=reason=>({supported:false,reason,shapeTraits});
 if(selection!==COMPLETE_ADULT_PREVIEW)return fail(selection?'unknown-preview':'not-requested');
 if(!form)return fail('unsupported-body');
 if(options.hairStyle!=='low-bun'&&options.hairStyle!==(form==='male'?'side-part':'chin-bob'))return fail('hairstyle-needs-fit');
 const style=options.style??'casual';
 if(style!=='casual'&&!(style==='artist'&&options.culture==='france'&&form==='male'))return fail('role-headgear-needs-fit');
 if(['skin','hair','eyeColor'].some(k=>!Number.isInteger(options[k])))return fail('normalized-colors-required');
 return{supported:true,form,shapeTraits};
}
export function applyCompleteAdultPreview(root,options,selection){
 const support=completeAdultSupport(options,selection);if(!support.supported)return{applied:false,...support};
 const head=root.getObjectByName('sculpted-head');if(!head)return{applied:false,reason:'missing-head-root'};
 const asset=morphCompleteAdultAsset(ADULT_FORMS[support.form],support.shapeTraits),attachmentFit=createHeadAttachmentFit(head,asset);
 const C={skin:options.skin,hair:options.hair,iris:options.eyeColor,pupil:0x25252a,brow:new THREE.Color(options.hair).multiplyScalar(.9).getHex()};
 fitCompleteAdultAttachments(root,options,()=>{
  for(const mesh of head.children){
   if(!mesh.isMesh)continue;
   if(options.hairStyle==='low-bun'&&RETAINED_HAIR.test(mesh.name)||/cook-.*cap|artist-beret|garden-straw/.test(mesh.name))fitRetainedHeadMesh(mesh,attachmentFit);
   if(/^court-official-facial-hair-/.test(mesh.name))fitRetainedFacialHair(mesh,attachmentFit,asset);
  }
  attachCompleteHead(root,C,asset,{surface:true});
  // Hair is the only replaced attachment; authored role hats survive the
  // explicit face removal list in attach-head. Facial hair has its own fit.
  if(options.hairStyle!=='low-bun'){const hair=support.form==='male'?addLayeredHair(head,C.hair):addFemaleHair(head,C.hair);hair.userData.softSkin=support.form==='female';hair.userData.completeAdultPart='hair';}
 });
 const result={applied:true,version:COMPLETE_ADULT_VERSION,form:support.form,attachmentFit};
 root.userData.completeAdultRepresentation=result;return result;
}
/** Cache selection is never persisted as an appearance version. */
export function completeAdultCacheTag(options,selection){return completeAdultSupport(options,selection).supported?COMPLETE_ADULT_VERSION:'legacy';}
export function completeAdultWeights(mesh,sourceY){
 if(!mesh.userData.completeAdultPart)return null;
 if(mesh.userData.completeAdultPart==='skin'&&sourceY<1.435){const u=clamp((sourceY-1.365)/.070);return[[2,1-u],[3,u]];}
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
 const sourceY=g.attributes.sourceY?.getX(index)??position.y,t=clamp((sourceY-1.395)/.050);channels.anatomicalTone.push(kind==='hair'?-1:kind==='skin'?t*t*(3-2*t):0);
}
export function finishCompleteAdultChannels(geometry,channels){
 for(const [name,array]of Object.entries(channels))geometry.setAttribute(name,new THREE.Float32BufferAttribute(array,name==='featureCoord'?3:1));
}
export function readCompleteAdultColor(mesh,index,target){const a=mesh.geometry.attributes.color;return a?target.setRGB(a.getX(index),a.getY(index),a.getZ(index)):target.copy(mesh.material.color);}
export function prepareCompleteAdultSkinMaterial(material){
 if(material.userData.completeAdultFinish)return material;
 applyAnatomicalFinish(material,{narrow:true,reflect:true});applySurfaceFinish(material);material.userData.completeAdultFinish=COMPLETE_ADULT_VERSION;return material;
}
