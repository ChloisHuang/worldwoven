/** The original four production cel values with stable narrow transitions.
 * Geometry authors the face; this only antialiases the toon boundaries.
 */
import * as THREE from 'three';
import {applyFaceTone} from '../convex-eyes/face-tone.mjs';
export function applyAnatomicalFinish(material,{narrow=true,reflect=true}={}){
 if(reflect)applyFaceTone(material,{productionRamp:true});
 if(!narrow)return;
 const previous=material.onBeforeCompile;
 material.onBeforeCompile=(shader,renderer)=>{
  previous.call(material,shader,renderer);
  shader.vertexShader='attribute float anatomicalTone;\nvarying float vAnatomicalTone;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvAnatomicalTone=anatomicalTone;');
  const chunk=THREE.ShaderChunk.gradientmap_pars_fragment;
  const local=`varying float vAnatomicalTone;
float completeAdultCel(float v){
 float e=max(fwidth(v)*0.75,0.070);
 return (140.0+46.0*smoothstep(-.5-e,-.5+e,v)
              +43.0*smoothstep(0.0-e,0.0+e,v)
              +26.0*smoothstep(.5-e,.5+e,v))/255.0;
}
`;
  const replacement=local+chunk.replace('return vec3( texture2D( gradientMap, coord ).r );','return mix(vec3(texture2D(gradientMap,coord).r),vec3(completeAdultCel(dotNL)),abs(vAnatomicalTone));');
  shader.fragmentShader=shader.fragmentShader.includes(chunk)?shader.fragmentShader.replace(chunk,replacement):shader.fragmentShader.replace('#include <gradientmap_pars_fragment>',replacement);
 };
 material.customProgramCacheKey=()=>`worldwoven-complete-original-four-cel-${reflect}`;material.needsUpdate=true;
}
