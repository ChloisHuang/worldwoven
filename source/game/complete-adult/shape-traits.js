/** Pure opt-in deformation of the reviewed topology. No asset, caller option,
 * identity, score, palette or authoring handle is modified. Semantic positions
 * are the pinned hm08 raw feature coordinates; target pivots come from the
 * supplied current mesh, so an updated neutral sculpt needs no copied targets.
 */
import * as THREE from 'three';
import {normalizeShapeTraits,shapeHeight} from '../character-traits.js';
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const contexts=new WeakMap();
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
 const noseAt=nearestSkin(skin,[0,7.2916,1.5075],true),nose=Array.from(skin.position.slice(noseAt,noseAt+3));
 // Brow featureCoord contains ribbon UVs, not anatomy. Associate its existing
 // fitted vertices with the current skin, without scalp rays or new geometry.
 const semantics=new Map();
 for(const part of asset.parts){if(part.material==='skin'||isEye(part))continue;const raw=[];for(let i=0;i<part.position.length;i+=3){const j=nearestSkin(skin,part.position.slice(i,i+3));raw.push(...skin.featureCoord.slice(j,j+3));}semantics.set(part,raw);}
 const c={eyes,nose,semantics};contexts.set(asset,c);return c;
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
 out[0]+=x*(traits.jawWidth-1)*jaw;
 const bridge=smooth(6.95,7.20,ry);
 const nasal=smooth(6.70,6.83,ry)*(1-smooth(7.28,7.46,ry))
  *(1-smooth(.22-.145*bridge,.36-.12*bridge,Math.abs(rx)))*smooth(1.22,1.46,rz)*(1-w);
 out[0]+=x*(traits.noseSize*traits.noseWidth-1)*nasal;
 out[1]+=(y-c.nose[1])*(traits.noseSize-1)*nasal;
 out[2]+=(z-c.nose[2]+.010)*(traits.noseSize-1)*nasal;
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
export function morphCompleteAdultAsset(asset,input){
 const traits=normalizeShapeTraits(input);
 if(['jawWidth','eyeSize','noseSize','noseWidth','socketDepth'].every(k=>traits[k]===1))return asset;
 const c=context(asset),parts=asset.parts.map(part=>{
  const eye=isEye(part),position=part.position.slice(),raw=part.material==='skin'?part.featureCoord:c.semantics.get(part);let changed=false;
  for(let i=0;i<position.length;i+=3){const out=displaced(part.position.slice(i,i+3),eye?null:raw.slice(i,i+3),traits,c,eye);for(let k=0;k<3;k++){position[i+k]=out[k];changed ||= position[i+k]!==part.position[i+k];}}
  if(!changed)return part;
  // Each globe's three material regions share exactly the same uniform scale
  // and translation, so their original Jacobian normals remain continuous.
  return{...part,position,normal:eye?part.normal:changedNormals(part,position)};
 });
 return{...asset,parts};
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
