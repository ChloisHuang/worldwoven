import * as THREE from 'three';
import {normalizeShapeTraits,shapeHeight} from '../character-traits.js';
import {createRelaxedArmOffset} from '../approved-surfaces.js';
const projectedTrim=name=>/^shirt-placket$|^shirt-button-/.test(name);
function unshapeHeight(y,l){
 const offset=.857*(l-1);if(y<=.108||y>=1.455||l===1)return y;
 return y<=.965+offset?.108+(y-.108)/l:(y-offset*(1+.965/.49))/(1-offset/.49);
}
function heightDerivative(y,l){return l===1||y<=.108||y>=1.455?1:y<=.965?l:1-.857*(l-1)/.49;}
/** Existing clothing authors in neutral rest space. Only its replacements and
 * in-place front trim edits are re-mapped; already-shaped legacy limbs stay put.
 * The production leg map and arm-rest solver remain the only rig authority.
 */
export function fitCompleteAdultClothing(root,options,attach){
 const leg=normalizeShapeTraits(options.shapeTraits).legLength;
 if(leg===1){attach(options);return;}
 const old=new Map();root.traverse(m=>{if(!m.isMesh)return;old.set(m,m.geometry);if(projectedTrim(m.name)){const p=m.geometry.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,unshapeHeight(p.getY(i),leg));}});
 attach({...options,shapeTraits:{...normalizeShapeTraits(options.shapeTraits),legLength:1}});
 const neutralArm=createRelaxedArmOffset(options.bodyPreset,options.wardrobePreset,1),shapedArm=createRelaxedArmOffset(options.bodyPreset,options.wardrobePreset,leg);
 root.traverse(m=>{
  if(!m.isMesh||old.get(m)===m.geometry&&!projectedTrim(m.name))return;
  const g=m.geometry,p=g.attributes.position,n=g.attributes.normal,sy=g.attributes.sourceY??new THREE.Float32BufferAttribute(Array.from({length:p.count},(_,i)=>p.getY(i)),1);
  const arm=/sleeve/.test(m.name),normal=new THREE.Vector3(),epsilon=1e-5;
  const delta=y=>shapedArm(y).map((v,k)=>v-neutralArm(y)[k]);
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),y=p.getY(i),z=p.getZ(i),sourceY=sy.getX(i),d=arm?delta(sourceY):[0,0,0];
   const below=arm?delta(sourceY-epsilon):null,derivative=arm?delta(sourceY+epsilon).map((v,k)=>(v-below[k])/(2*epsilon)):[0,0,0];
   p.setXYZ(i,x+Math.sign(x)*d[0],shapeHeight(y+d[1],leg),z+d[2]);
   const ny=(n.getY(i)-Math.sign(x)*derivative[0]*n.getX(i)-derivative[2]*n.getZ(i))/(heightDerivative(y+d[1],leg)*(1+derivative[1]));
   normal.set(n.getX(i),ny,n.getZ(i)).normalize();n.setXYZ(i,normal.x,normal.y,normal.z);
  }
  g.setAttribute('sourceY',sy);g.computeBoundingBox();g.computeBoundingSphere();
 });
}
