/** Cloud-local development choice; never imported by production main. */
import './register.js';
import {setCharacterModelPreviewSelector,setCharacterPreviewHeadLook} from '../character-model-preview.js';
export function installActorPreview({femaleHair='gathered-updo',hairFlow=true,playerOnly=false}={}){
 const select=options=>{
  if(playerOnly&&options.previewSubject!=='player')return{modelPreview:null,previewHair:null,previewHairFlow:false};
  const male=options.bodyPreset.startsWith('masculine'),casual=options.style==='casual';
  const frock=casual&&options.culture==='france'&&options.bodyPreset==='masculine-lean'&&options.wardrobePreset==='court-frock-coat';
  const gown=casual&&options.culture==='france'&&!male&&['court-gown','court-overgown'].includes(options.wardrobePreset);
  // Keep a working chef's authored hat/hair combination. Unsupported role cuts
  // explicitly fall back; an opt-in does not pretend they have all been fitted.
  if(options.style==='chef')return{modelPreview:'complete-adult-head-v1',previewHair:['low-bun','braided-tail'].includes(options.hairStyle)?'retained':null,previewHairFlow:hairFlow};
  return{modelPreview:frock||gown?'complete-adult-pair-v1':'complete-adult-head-v1',previewHair:male?'side-part':gown&&options.bodyPreset==='feminine-slender'&&options.wardrobePreset==='court-gown'&&femaleHair==='long-layered'?'long-layered':'gathered-updo',previewHairFlow:hairFlow};
 };
 setCharacterModelPreviewSelector(select);
 return{select,dispose(){setCharacterModelPreviewSelector(null);setCharacterPreviewHeadLook(null);}};
}
export {setCharacterPreviewHeadLook};
