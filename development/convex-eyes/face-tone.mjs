/** Five distinct cel bands for the face; body skin keeps its existing ramp. */
import * as THREE from 'three';
export function applyFaceTone(material){
 const previous=material.onBeforeCompile;
 material.onBeforeCompile=(shader,renderer)=>{
  previous.call(material,shader,renderer);
  shader.vertexShader='attribute float eyeReflectance;\nvarying float vEyeReflectance;\nvarying float vFaceTone;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n vFaceTone = smoothstep(1.400, 1.455, position.y);\n vEyeReflectance=eyeReflectance;');
  const bands=`varying float vFaceTone;
varying float vEyeReflectance;
float faceCelTone(float v) {
 float e = max(fwidth(v) * 0.65, 0.006);
 return 0.62 + 0.12 * smoothstep(-0.60-e,-0.60+e,v)
             + 0.10 * smoothstep(-0.20-e,-0.20+e,v)
             + 0.09 * smoothstep( 0.20-e, 0.20+e,v)
             + 0.07 * smoothstep( 0.60-e, 0.60+e,v);
}
`;
  const chunk=THREE.ShaderChunk.gradientmap_pars_fragment.replace('return vec3( texture2D( gradientMap, coord ).r );','return mix(vec3(texture2D(gradientMap,coord).r),vec3(faceCelTone(dotNL)),vFaceTone);');
  shader.fragmentShader=shader.fragmentShader.replace('#include <gradientmap_pars_fragment>',bands+chunk);
  // A small view-dependent cel reflection follows the actual globe normal.
  // It is limited to eye vertices, with no PBR skin or global shadow change.
  shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
#if NUM_DIR_LIGHTS > 0
 if (vEyeReflectance > 0.5) {
 vec3 eyeSum = directionalLights[0].direction + normalize(vViewPosition);
 vec3 eyeHalf = eyeSum * inversesqrt(max(dot(eyeSum,eyeSum),0.00001));
 float eyeGlint = pow(max(dot(normal,eyeHalf),0.0),768.0);
 vec3 eyeWindow = normalize((viewMatrix * vec4(-0.20,0.25,0.95,0.0)).xyz);
 vec3 windowSum = eyeWindow + normalize(vViewPosition);
 vec3 eyeWindowHalf = windowSum * inversesqrt(max(dot(windowSum,windowSum),0.00001));
 float windowGlint = pow(max(dot(normal,eyeWindowHalf),0.0),1024.0);
 float lightGain = clamp(max(directionalLights[0].color.r,max(directionalLights[0].color.g,directionalLights[0].color.b)),0.0,1.0);
 outgoingLight += lightGain * vec3(0.78,0.81,0.80) * smoothstep(0.55,0.90,eyeGlint);
 outgoingLight += lightGain * vec3(0.54,0.57,0.56) * smoothstep(0.45,0.85,windowGlint);
 }
#endif
#include <opaque_fragment>`);
 };
 material.customProgramCacheKey=()=> 'worldwoven-prototype-face-five-band-eye-v3';material.needsUpdate=true;
}
