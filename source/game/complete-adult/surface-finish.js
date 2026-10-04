/** Original, topology-following albedo and feature response. Study only.
 * Coordinates come from our CC0-derived mesh, never an image or camera.
 * Diffuse light still uses the same discrete cel ramp. No skin BRDF switch.
 */
import {HAIR_FLOW_COLOR_GLSL,HAIR_FLOW_LIGHT_GLSL,HAIR_FLOW_VERSION} from './hair-flow-finish.js';
export function applySurfaceFinish(material,{hairFlow=false}={}){
 const previous=material.onBeforeCompile;
 material.onBeforeCompile=(shader,renderer)=>{
  previous.call(material,shader,renderer);
  const declarations='attribute vec3 featureCoord;\nattribute float featureKind;\nvarying vec3 vFeatureCoord;\nvarying float vFeatureKind;\n';
  shader.vertexShader=declarations+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvFeatureCoord=featureCoord;vFeatureKind=featureKind;');
  shader.fragmentShader=`varying vec3 vFeatureCoord;
varying float vFeatureKind;
float featureBell(float x,float center,float width){float u=(x-center)/width;return exp(-u*u);}
float featureSpan(float x,float lo,float hi,float feather){return smoothstep(lo,lo+feather,x)*(1.0-smoothstep(hi-feather,hi,x));}
`+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
vec3 f=vFeatureCoord;
if(vFeatureKind>0.5&&vFeatureKind<1.5){
 // Warm, low-contrast pigmentation follows the original formed eyelid and
 // vermilion. The masks cannot create a new silhouette or cover an eye gap.
 float x=abs(f.x),d=(x-.31)/.145;
 float upper=7.332-.062*d*d+.004*d;
 float lower=7.241+.040*d*d+.006*d;
 float eyeSpan=featureSpan(x,.168,.454,.055)*smoothstep(1.29,1.38,f.z);
 float crease=featureBell(f.y-upper,.058,.020)*eyeSpan;
 float lid=featureBell(f.y-upper,.017,.026)*eyeSpan;
 float tearline=featureBell(f.y-lower,-.005,.012)*eyeSpan;
 float corner=featureBell(x,.176,.020)*featureBell(f.y,7.274,.026)*smoothstep(1.27,1.35,f.z);
 diffuseColor.rgb*=vec3(1.0-.20*crease,1.0-.23*crease,1.0-.25*crease);
 diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.025,.925,.90),.42*lid+.45*tearline+.40*corner);
 float lip=featureSpan(f.y,6.475,6.731,.050)*featureBell(f.x,0.0,.235)*smoothstep(1.41,1.54,f.z);
 diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.12,.89,.89),.62*lip);
 float turn=featureBell(f.y,6.575,.028)*featureBell(f.x,0.0,.18)*smoothstep(1.50,1.555,f.z);
 diffuseColor.rgb*=1.0+.050*turn;
 float oralCorner=featureBell(x,.236,.025)*featureBell(f.y,6.609,.034)*smoothstep(1.38,1.43,f.z);
 diffuseColor.rgb*=1.0-.13*oralCorner;
}else if(vFeatureKind>1.5&&vFeatureKind<2.5){
 // Brown iris: limbal edge, warm collarette and sparse radial fibres. The
 // input iris hue remains the actor's selected brown, rather than blue/white.
 float r=length(f.xy),a=atan(f.y,f.x);
 float fibre=.5+.26*sin(a*53.0+sin(a*13.0)*2.2+r*7.0)+.16*sin(a*91.0-r*14.0);
 float ring=featureBell(r,.40,.075);
 float rim=smoothstep(.86,1.0,r);
 float lowerIris=(1.0-smoothstep(-.74,.32,f.y));
 float value=(1.12+.54*lowerIris+.32*fibre)*(1.0-.48*rim)*(1.0-.15*ring);
 diffuseColor.rgb*=vec3(value*1.10,value*1.015,value*.90);
}else if(vFeatureKind>3.5&&vFeatureKind<4.5){
 // Warm ivory sclera, gently reddened at its limbus and canthi. Existing
 // baked lid contact remains multiplied into the base vertex colour.
 float r=length(f.xy),limbus=featureBell(r,1.04,.14);
 diffuseColor.rgb*=mix(vec3(.96,.945,.91),vec3(.97,.85,.79),.28*limbus);
}else if(vFeatureKind>4.5&&vFeatureKind<5.5){
 // A lightly broken feather edge and sparse directional strand separation.
 // The separately modeled tapered perimeter hairs carry the silhouette.
 float t=f.x,v=f.y;
 if(f.z<.5){
  float edge=.89+.043*sin(t*53.0)+.026*sin(t*137.0);
  if(abs(v)>edge)discard;
  float strand=.5+.5*sin(t*314.0-v*3.1);
  diffuseColor.rgb*=.93+.14*strand;
 }else{diffuseColor.rgb*=1.03;}
}${hairFlow?'else if(vFeatureKind>5.5&&vFeatureKind<6.5){'+HAIR_FLOW_COLOR_GLSL+'}':''}
`);
  // Readable small corneal reflection, still driven by the existing sun and
  // the differentiated, convex eye normal. Only eyes and tiny wet margins.
  shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
#if NUM_DIR_LIGHTS > 0
${hairFlow?HAIR_FLOW_LIGHT_GLSL:''}
 if(vFeatureKind>1.5&&vFeatureKind<4.5){
  vec3 h=normalize(directionalLights[0].direction+normalize(vViewPosition));
  float glint=pow(max(dot(normal,h),0.0),240.0);
  float gain=clamp(max(directionalLights[0].color.r,max(directionalLights[0].color.g,directionalLights[0].color.b)),0.0,1.0);
  outgoingLight+=gain*vec3(.60,.59,.56)*smoothstep(.18,.75,glint);
  outgoingLight+=gain*vec3(.016,.018,.020)*pow(max(dot(normal,h),0.0),24.0);
 }
 if(vFeatureKind>.5&&vFeatureKind<1.5){
  float lip=featureBell(f.y,6.57,.042)*featureBell(f.x,0.0,.16)*smoothstep(1.48,1.55,f.z);
  float d=(abs(f.x)-.31)/.145;
  float lower=7.241+.040*d*d+.006*d;
  float wet=featureBell(f.y-lower,-.005,.009)*featureSpan(abs(f.x),.19,.435,.06)*smoothstep(1.30,1.38,f.z);
  vec3 h=normalize(directionalLights[0].direction+normalize(vViewPosition));
  float glint=pow(max(dot(normal,h),0.0),84.0);
  outgoingLight+=vec3(.055,.033,.025)*(lip*.65+wet)*smoothstep(.30,.75,glint);
 }
#endif
#include <opaque_fragment>`);
 };
 const oldKey=material.customProgramCacheKey.bind(material);
 material.customProgramCacheKey=()=>oldKey()+'-original-feature-surface-v2-'+(hairFlow?HAIR_FLOW_VERSION:'plain-hair');
 material.needsUpdate=true;
}
