/** Optional original bundle finish. Coordinates follow authored surfaces:
 * x = root-to-tip, y = unwrapped bundle phase / 16, z = finish strength.
 * Quantized coordinates are baked offline; the runtime never fits/raycasts.
 */
import * as THREE from 'three';
export const HAIR_FLOW_VERSION='soft-bundles-v1';
export function attachHairFlow(geometry,packed){
 if(!packed)throw Error('Hair asset is missing baked bundle coordinates');
 const bytes=Uint8Array.from(atob(packed),c=>c.charCodeAt(0));
 const coords=new Uint16Array(bytes.buffer);
 if(coords.length!==geometry.attributes.position.count*3)throw Error('Hair flow vertex count mismatch');
 geometry.setAttribute('featureCoord',new THREE.Uint16BufferAttribute(coords,3,true));
 geometry.setAttribute('featureKind',new THREE.Uint8BufferAttribute(new Uint8Array(coords.length/3).fill(6),1));
 geometry.userData.hairFlow=HAIR_FLOW_VERSION;
 return geometry;
}
export const HAIR_FLOW_COLOR_GLSL=`
 // Broad authored bundles, with quiet roots and a soft shift along the length.
 // The actor's selected RGB remains the source of every shade.
 float ht=clamp(f.x,0.0,1.0),hp=f.y*100.530965;
 float hb=.5+.5*cos(hp+.24*sin(ht*4.0));
 float hs=.5+.5*cos(hp*2.0-.35);
 float hr=mix(.77,1.0,smoothstep(.025,.24,ht));
 float hl=1.0+.20*featureBell(ht,.39,.22)+.10*featureBell(ht,.76,.17);
 float hf=(.86+.22*hb+.045*hs)*hr*hl;
 diffuseColor.rgb*=mix(1.0,hf,f.z);
`;
export const HAIR_FLOW_LIGHT_GLSL=`
 if(vFeatureKind>5.5&&vFeatureKind<6.5){
  vec3 hairLight=directionalLights[0].direction;
  vec3 hairHalf=normalize(hairLight+normalize(vViewPosition));
  float hairLit=max(dot(normal,hairLight),0.0);
  float hairLobe=pow(max(dot(normal,hairHalf),0.0),12.0);
  float hairBundle=.35+.65*pow(.5+.5*cos(f.y*100.530965+.24*sin(f.x*4.0)),.8);
  float hairLength=smoothstep(.05,.25,f.x)*(1.0-.45*smoothstep(.76,1.0,f.x));
  vec3 hairGain=clamp(directionalLights[0].color,vec3(0.0),vec3(1.5));
  // Multiplicative selected-hue reflection; goes to zero with the direct light.
  outgoingLight+=diffuseColor.rgb*hairGain*(.95*hairLobe*hairLit*hairBundle*hairLength*f.z);
 }
`;
