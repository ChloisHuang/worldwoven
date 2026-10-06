/** Pure opt-in deformation of the reviewed topology. No asset, caller option,
 * identity, score, palette or authoring handle is modified. Semantic positions
 * are the pinned hm08 raw feature coordinates; target pivots come from the
 * supplied current mesh, so an updated neutral sculpt needs no copied targets.
 */
import * as THREE from 'three';
import {normalizeShapeTraits,shapeHeight} from '../character-traits.js';
import {neutralNoseProfileOffset,noseHeightProfileOffset} from './nose-profile.js';
import {frontSurface} from './attachment-fit.js';
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const contexts=new WeakMap(),semanticSources=new WeakMap();
const isEye=p=>['sclera','iris','pupil'].includes(p.material);
function nearestSkin(skin,point,raw=false){
 const coords=raw?skin.featureCoord:skin.position;let best=Infinity,at=0;
 for(let i=0;i<coords.length;i+=3){const d=(coords[i]-point[0])**2+(coords[i+1]-point[1])**2+(coords[i+2]-point[2])**2;if(d<best){best=d;at=i;}}
 return at;
}
function context(asset){
 if(contexts.has(asset))return contexts.get(asset);
 const skin=asset.parts.find(p=>p.material==='skin'),eyes={};
 for(const side of [-1,1]){
  const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
  for(const p of asset.parts.filter(isEye))for(let i=0;i<p.position.length;i+=3){if(Math.sign(p.position[i])!==side)continue;for(let k=0;k<3;k++){min[k]=Math.min(min[k],p.position[i+k]);max[k]=Math.max(max[k],p.position[i+k]);}}
  eyes[side]=min.map((v,k)=>(v+max[k])/2);
 }
 const landmark=raw=>{const at=nearestSkin(skin,raw,true);return Array.from(skin.position.slice(at,at+3));};
 const nose=landmark([0,7.2916,1.5075]),bridge=landmark([0,7.1046,1.583]),tip=landmark([0,6.909,1.6807]),columella=landmark([0,6.8268,1.6033]);
 const chinRoot=landmark([0,6.4583,1.5032]),chin=landmark([0,6.2006,1.4344]);
 // Local cartilage controls must not rescale the root-to-tip distance. Keep
 // the tip's height and use its lower bulb depth, never the upper nasal root.
 const tipPivot=[0,tip[1],tip[2]-Math.max(.003,(tip[2]-columella[2])/2)];
 const wings={};for(const side of [-1,1])wings[side]=landmark([side*.1014,6.8563,1.5318]);
 // Brow featureCoord contains ribbon UVs, not anatomy. Interpolate its
 // anatomical coordinates on the actual fitted triangles, so eye-size morphs
 // do not step between unrelated nearest-vertex weights.
 const semantics=semanticSources.get(asset)||new Map();
 if(!semanticSources.has(asset))for(const part of asset.parts){if(part.material==='skin'||isEye(part))continue;const raw=[];for(let i=0;i<part.position.length;i+=3){const p=part.position.slice(i,i+3),feature=part.material==='brow'?frontSurface(skin,p[0],p[1],true):null;if(feature)raw.push(...feature);else{const j=nearestSkin(skin,p);raw.push(...skin.featureCoord.slice(j,j+3));}}semantics.set(part,raw);}
 const c={form:asset.form,eyes,nose,bridge,tip,tipPivot,wings,chinRoot,chin,semantics};contexts.set(asset,c);return c;
}
function eyeWeight(x,y,z){
 return smooth(.075,.145,Math.abs(x))*(1-smooth(.48,.66,Math.abs(x)))
  *smooth(7.06,7.20,y)*(1-smooth(7.36,7.51,y))*smooth(1.12,1.28,z);
}
function displaced(p,raw,traits,c,eye=false){
 const [x,y,z]=p,side=x<0?-1:1,pivot=c.eyes[side],w=eye?1:eyeWeight(...raw),size=(traits.eyeSize-1)*w;
 const out=[x+(x-pivot[0])*size,y+(y-pivot[1])*size,z+(z-pivot[2])*size-.0075*(traits.socketDepth-1)*w];
 if(eye)return out;
 const [rx,ry,rz]=raw;
 const jaw=smooth(1.38,1.435,y)*smooth(5.98,6.18,ry)*(1-smooth(6.50,6.94,ry))*smooth(.18,.85,rz);
 const jawDelta=traits.jawWidth-1;
 out[0]+=x*jawDelta*jaw;
 if(c.form==='male'){
  // Keep the saved preference/genotype scale. The male narrow endpoint now
  // approaches the existing middle jaw; the wide endpoint opens the actual
  // mandible and chin, rather than leaving both endpoints pointed.
  const maleDelta=jawDelta<0?jawDelta*.25:jawDelta*.25+18.75*jawDelta*jawDelta;
  // The extra contour response stays outside the original oral surface, so
  // remapping the jaw does not silently change the saved mouth or expression.
  const mouth=smooth(6.39,6.44,ry)*(1-smooth(6.73,6.79,ry))*smooth(1.25,1.38,rz)
   *(1-smooth(.27,.36,Math.abs(rx)));
  out[0]+=x*(maleDelta-jawDelta)*jaw*(1-mouth);
 }
 const bridge=smooth(6.95,7.20,ry);
 const nasal=smooth(6.70,6.83,ry)*(1-smooth(7.28,7.46,ry))
  *(1-smooth(.22-.145*bridge,.36-.12*bridge,Math.abs(rx)))*smooth(1.22,1.46,rz)*(1-w);
 // Width changes the cross-span. Saved noseSize values size each alar wing
 // around its own inner attachment, leaving the central tip and length fixed.
 out[0]+=x*(traits.noseWidth-1)*nasal;
 const wing=smooth(.06,.11,Math.abs(rx))*(1-smooth(1.56,1.64,rz))
  *smooth(6.79,6.85,ry)*(1-smooth(6.92,7.08,ry))*nasal;
 for(let k=0;k<3;k++)out[k]+=(p[k]-c.wings[side][k])*(traits.noseSize-1)*wing;
 // Independent chin length/projection share a broad sublabial transition and
 // stop above the anchored neck. Neither moves the lips or full head anchor.
 const chin=smooth(1.38,1.435,y)*smooth(5.98,6.17,ry)*(1-smooth(6.38,6.55,ry))
  *smooth(.65,1.18,rz)*(1-smooth(.26,.54,Math.abs(rx)));
 out[1]+=(y-c.chinRoot[1])*(traits.chinLength-1)*chin;
 out[2]+=Math.abs(c.chinRoot[1]-c.chin[1])*(traits.chinProjection-1)*chin;
 // Bridge height is whole-profile support, not additional tip length.
 out[2]+=noseHeightProfileOffset(raw,traits.noseBridgeHeight,c.form);
 const bulb=smooth(6.76,6.84,ry)*(1-smooth(6.99,7.11,ry))
  *(1-smooth(.11,.21,Math.abs(rx)))*smooth(1.47,1.59,rz)*(1-w);
 // Bulb volume changes locally; its center height and the upper ridge stay put.
 for(let k=0;k<3;k++)out[k]+=(p[k]-c.tipPivot[k])*(traits.noseTipSize-1)*bulb*(k===2?1:1.35);
 return out;
}
function areaNormals(position,index){
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(position,3));g.setIndex(new THREE.BufferAttribute(index,1));g.computeVertexNormals();const normal=g.attributes.normal.array;g.dispose();return normal;
}
function changedNormals(part,position){
 // Rotate authored smooth normals by the local surface change. This retains
 // the neutral shading instead of replacing it with a different averaging rule.
 const oldArea=areaNormals(part.position,part.index),newArea=areaNormals(position,part.index),normal=part.normal.slice();
 const a=new THREE.Vector3(),b=new THREE.Vector3(),n=new THREE.Vector3(),q=new THREE.Quaternion();
 for(let i=0;i<normal.length;i+=3){a.fromArray(oldArea,i);b.fromArray(newArea,i);if(a.distanceToSquared(b)<1e-18)continue;q.setFromUnitVectors(a,b);n.fromArray(part.normal,i).applyQuaternion(q).normalize().toArray(normal,i);}
 return normal;
}
// The eyebrow ribbon must stay on the actual deformed triangles. Nearest raw
// landmarks alone create stepped offsets and let a raised ridge swallow it.
// The 1.2 mm envelope also clears the intervening coarse skin triangles; a
// vertex-only 0.35 mm fit can still cross skin between ribbon vertices.
function refitBrows(asset,parts){
 const oldSkin=asset.parts.find(p=>p.material==='skin'),skin=parts.find(p=>p.material==='skin');
 return parts.map((part,index)=>{
  if(part.material!=='brow')return part;
  const before=asset.parts[index],position=part.position.slice();
  for(let i=0;i<position.length;i+=3){
   const oldZ=frontSurface(oldSkin,before.position[i],before.position[i+1]),z=frontSurface(skin,position[i],position[i+1]);
   if(Number.isFinite(z)&&Number.isFinite(oldZ))position[i+2]=z+Math.max(.0012,before.position[i+2]-oldZ);
  }
  return{...part,position,normal:changedNormals(before,position)};
 });
}
const profileAssets=new WeakMap();
/** Cache the local neutral sculpt separately from the preserved authored asset.
 * Brows follow their fitted skin; eyes and all non-profile positions stay exact. */
export function sculptCompleteAdultProfile(asset){
 if(profileAssets.has(asset))return profileAssets.get(asset);
 const c=context(asset),parts=asset.parts.map(part=>{
  if(isEye(part))return part;
  const raw=part.material==='skin'?part.featureCoord:c.semantics.get(part),position=part.position.slice();let changed=false;
  for(let i=0;i<position.length;i+=3){const dz=neutralNoseProfileOffset(raw.slice(i,i+3),asset.form);if(dz){position[i+2]+=dz;changed ||= position[i+2]!==part.position[i+2];}}
  return changed?{...part,position,normal:changedNormals(part,position)}:part;
 });
 const result={...asset,parts:refitBrows(asset,parts)};profileAssets.set(asset,result);semanticSources.set(result,new Map(result.parts.map((part,i)=>[part,c.semantics.get(asset.parts[i])])));return result;
}
export function morphCompleteAdultAsset(asset,input){
 const traits=normalizeShapeTraits(input);
 if(Object.entries(traits).every(([key,value])=>key==='legLength'||value===1))return asset;
 const c=context(asset),parts=asset.parts.map(part=>{
  const eye=isEye(part),position=part.position.slice(),raw=part.material==='skin'?part.featureCoord:c.semantics.get(part);let changed=false;
  for(let i=0;i<position.length;i+=3){const out=displaced(part.position.slice(i,i+3),eye?null:raw.slice(i,i+3),traits,c,eye);for(let k=0;k<3;k++)if(out[k]!==part.position[i+k]){position[i+k]=out[k];changed ||= position[i+k]!==part.position[i+k];}}
  if(!changed)return part;
  // Each globe's three material regions share exactly the same uniform scale
  // and translation, so their original Jacobian normals remain continuous.
  return{...part,position,normal:eye?part.normal:changedNormals(part,position)};
 });
 return{...asset,parts:refitBrows(asset,parts)};
}
/** Map only newly inserted head/hair through the existing leg-height contract.
 * Retained body, garment, hair and accessory geometry is already shaped. */
export function fitCompleteAdultAttachments(root,options,attach){
 const leg=normalizeShapeTraits(options.shapeTraits).legLength,old=new Set();
 root.traverse(m=>{if(m.isMesh)old.add(m);});attach();
 root.traverse(m=>{
  if(!m.isMesh||old.has(m))return;
  const g=m.geometry,p=g.attributes.position,n=g.attributes.normal,sy=new THREE.Float32BufferAttribute(Array.from({length:p.count},(_,i)=>p.getY(i)),1),normal=new THREE.Vector3();
  if(leg!==1)for(let i=0;i<p.count;i++){
   const y=p.getY(i),derivative=y<=.108||y>=1.455?1:y<=.965?leg:1-.857*(leg-1)/.49;
   p.setY(i,shapeHeight(y,leg));normal.set(n.getX(i),n.getY(i)/derivative,n.getZ(i)).normalize();n.setXYZ(i,normal.x,normal.y,normal.z);
  }
  g.setAttribute('sourceY',sy);g.computeBoundingBox();g.computeBoundingSphere();
 });
}
