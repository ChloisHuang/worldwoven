/** Local study only: narrower discrete cel ramp on anatomical skin. */
import * as THREE from 'three';
import {applyFaceTone} from '../convex-eyes/face-tone.mjs';
export function applyAnatomicalFinish(material,{narrow=false,reflect=true}={}){
 if(reflect)applyFaceTone(material,{productionRamp:true});
 if(!narrow)return;
 const previous=material.onBeforeCompile;
 material.onBeforeCompile=(shader,renderer)=>{
  previous.call(material,shader,renderer);
  shader.vertexShader='attribute float anatomicalTone;\nvarying float vAnatomicalTone;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvAnatomicalTone=anatomicalTone;');
  const chunk=THREE.ShaderChunk.gradientmap_pars_fragment;
  const local=`varying float vAnatomicalTone;
float anatomicalHairTone(float v){
 // Three broad cel regions retain the dark selected hair while avoiding
 // the old stack of high-contrast bands across every shallow bundle.
 float e=max(fwidth(v)*0.75,0.075);
 return (151.0+44.0*smoothstep(-.25-e,-.25+e,v)
              +44.0*smoothstep(.45-e,.45+e,v))/255.0;
}
float anatomicalCelTone(float v){
 // Original four-band mean is 202.5/255. The new five-band mean is
 // 202.8/255: contrast narrows around that value, not toward pale skin.
 float e=max(fwidth(v)*0.65,0.022);
 return (164.0 + 20.0*smoothstep(-0.60-e,-0.60+e,v)
               + 19.0*smoothstep(-0.20-e,-0.20+e,v)
               + 19.0*smoothstep( 0.20-e, 0.20+e,v)
               + 19.0*smoothstep( 0.60-e, 0.60+e,v))/255.0;
}
`;
  const replacement=local+chunk.replace('return vec3( texture2D( gradientMap, coord ).r );','if(vAnatomicalTone<-.5)return vec3(anatomicalHairTone(dotNL));return mix(vec3(texture2D(gradientMap,coord).r),vec3(anatomicalCelTone(dotNL)),vAnatomicalTone);');
  shader.fragmentShader=shader.fragmentShader.includes(chunk)?shader.fragmentShader.replace(chunk,replacement):shader.fragmentShader.replace('#include <gradientmap_pars_fragment>',replacement);
 };
 material.customProgramCacheKey=()=>`worldwoven-anatomical-five-band-v2-${reflect}`;
 material.needsUpdate=true;
}
