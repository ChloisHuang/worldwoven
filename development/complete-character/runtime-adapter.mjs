/** Development-only opt-in boundary. Importing this module changes no actors.
 * Call after createApprovedSurfaces(opts), before existing skin/cloth batching.
 * No source activation, identity migration, randomization, runtime fs or rays.
 */
import * as THREE from 'three';
import {normalizeShapeTraits} from '../../source/game/character-traits.js';
import {ADULT_FORMS} from './assets/adult-forms-data.mjs';
import {attachCompleteHead} from './attach_head.mjs';
import {addLayeredHair} from './layered-hair.mjs';
import {applyNaturalClothing} from './natural-clothing.mjs';
import {applyFemaleSilhouette} from './female-silhouette.mjs';
import {applyAnatomicalFinish} from './face_finish.mjs';
import {applySurfaceFinish} from '../anatomical-head/surface_finish.mjs';
export const COMPLETE_ADULT_VERSION='reviewed-pair-2026-10-04';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const supported={
 'masculine-lean':{form:'male',hair:'side-part',wardrobe:'court-frock-coat'},
 'feminine-slender':{form:'female',hair:'chin-bob',wardrobe:'court-gown'}
};
export function completeAdultSupport(options){
 const shapeTraits=normalizeShapeTraits(options.shapeTraits),entry=supported[options.bodyPreset];
 const fail=reason=>({supported:false,reason,shapeTraits});
 if(!entry)return fail('unreviewed-body');
 if(options.culture!=='france'||(options.style??'casual')!=='casual')return fail('unreviewed-outfit-context');
 if(options.hairStyle!==entry.hair||options.wardrobePreset!==entry.wardrobe)return fail('unreviewed-hair-or-garment');
 if(Object.values(shapeTraits).some(v=>v!==1))return fail('shape-traits-preserved-by-legacy-fallback');
 if(['skin','hair','eyeColor'].some(k=>!Number.isInteger(options[k])))return fail('normalized-colors-required');
 return{supported:true,form:entry.form,shapeTraits};
}
export function applyCompleteAdultPreview(root,options){
 const support=completeAdultSupport(options);if(!support.supported)return{applied:false,...support};
 if(!root.getObjectByName('sculpted-head'))return{applied:false,reason:'missing-head-root'};
 const C={skin:options.skin,hair:options.hair,iris:options.eyeColor,pupil:0x25252a,brow:new THREE.Color(options.hair).multiplyScalar(.9).getHex()};
 attachCompleteHead(root,C,ADULT_FORMS[support.form],{surface:true});
 const head=root.getObjectByName('sculpted-head');
 if(support.form==='male'){const hair=addLayeredHair(head,C.hair);hair.userData.softSkin=false;} // Preserve the exact reviewed male hair's existing cloth bucket.
 applyNaturalClothing(root,options);applyFemaleSilhouette(root,options);
 for(const mesh of head.children)if(mesh.isMesh&&/^hair-/.test(mesh.name))mesh.userData.completeAdultPart='hair';
 root.userData.completeAdultRepresentation={version:COMPLETE_ADULT_VERSION,form:support.form,shapeTraits:{...support.shapeTraits}};
 return{applied:true,version:COMPLETE_ADULT_VERSION,form:support.form};
}
/** Caller supplies the final normalized geometry options. Append this result
 * to its in-memory cache key; never persist it as a replacement saved identity. */
export function completeAdultCacheTag(options){return completeAdultSupport(options).supported?COMPLETE_ADULT_VERSION:'legacy';}
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
 const t=clamp((position.y-1.395)/.050);channels.anatomicalTone.push(kind==='hair'?-1:kind==='skin'?t*t*(3-2*t):0);
}
export function finishCompleteAdultChannels(geometry,channels){
 for(const [name,array]of Object.entries(channels))geometry.setAttribute(name,new THREE.Float32BufferAttribute(array,name==='featureCoord'?3:1));
}
export function readCompleteAdultColor(mesh,index,target){const a=mesh.geometry.attributes.color;return a?target.setRGB(a.getX(index),a.getY(index),a.getZ(index)):target.copy(mesh.material.color);}
export function prepareCompleteAdultSkinMaterial(material){
 if(material.userData.completeAdultFinish)return material;
 applyAnatomicalFinish(material,{narrow:true,reflect:true});applySurfaceFinish(material);material.userData.completeAdultFinish=COMPLETE_ADULT_VERSION;return material;
}
