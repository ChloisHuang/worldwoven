/** Candidate-only character light response; geometry still authors the face.
 * Four cel levels span the formed normal range. Hair retains the prior ramp.
 */
import * as THREE from 'three';
import {applyFaceTone} from './face-tone.js';
export function applyAnatomicalFinish(material,{narrow=true,reflect=true}={}){
 if(reflect)applyFaceTone(material,{productionRamp:true});
 if(!narrow)return;
 const previous=material.onBeforeCompile;
 material.onBeforeCompile=(shader,renderer)=>{
  previous.call(material,shader,renderer);
  shader.vertexShader='attribute float anatomicalTone;\nvarying float vAnatomicalTone;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvAnatomicalTone=anatomicalTone;');
  const chunk=THREE.ShaderChunk.gradientmap_pars_fragment;
  const local=`varying float vAnatomicalTone;
float completeAdultHairCel(float v){
 float e=max(fwidth(v)*0.75,0.070);
 return (140.0+46.0*smoothstep(-.5-e,-.5+e,v)
              +43.0*smoothstep(0.0-e,0.0+e,v)
              +26.0*smoothstep(.5-e,.5+e,v))/255.0;
}
float completeAdultSkinCel(float v){
 float e=max(fwidth(v)*0.75,0.10);
 return .12+.20*smoothstep(-e,e,v)
           +.30*smoothstep(.38-e*1.3,.38+e*1.3,v)
           +.38*smoothstep(.72-e*1.6,.72+e*1.6,v);
}
`;
  const replacement=local+chunk.replace('return vec3( texture2D( gradientMap, coord ).r );','return mix(vec3(texture2D(gradientMap,coord).r),vec3(vAnatomicalTone<0.0?completeAdultHairCel(dotNL):completeAdultSkinCel(dotNL)),abs(vAnatomicalTone));');
  shader.fragmentShader=shader.fragmentShader.includes(chunk)?shader.fragmentShader.replace(chunk,replacement):shader.fragmentShader.replace('#include <gradientmap_pars_fragment>',replacement);
 };
 material.customProgramCacheKey=()=>`worldwoven-complete-character-depth-cel-v1-${reflect}`;material.needsUpdate=true;
}
