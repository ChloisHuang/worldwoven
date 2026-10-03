/** Fit the retained original hair to this anatomical scalp, clearing the ear. */
import * as THREE from 'three';
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
export function fitAnatomicalHair(head,skin){
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(skin.position,3));
 geometry.setIndex(skin.index);geometry.computeBoundingSphere();
 const material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
 const scalp=new THREE.Mesh(geometry,material);scalp.updateMatrixWorld(true);
 const origin=new THREE.Vector3(0,1.602,-.017),point=new THREE.Vector3(),direction=new THREE.Vector3();
 const ray=new THREE.Raycaster();let fitted=0;
 for(const mesh of head.children){
  if(!mesh.isMesh||!mesh.name.startsWith('hair-'))continue;
  const p=mesh.geometry.attributes.position;
  for(let i=0;i<p.count;i++){
   point.fromBufferAttribute(p,i);
   // The old bed ended across the middle of the anatomical ear. Raise and
   // taper that side region into an arch; the ear mesh itself stays intact.
   const angle=Math.atan2(Math.abs(point.x),point.z+.017);
   const ear=Math.exp(-(((angle-1.70)/.42)**2));
   point.y+=.035*ear*(1-smooth(1.585,1.629,point.y));
   direction.copy(point).sub(origin);const radius=direction.length();direction.normalize();
   ray.set(origin,direction);ray.far=.25;
   const hit=ray.intersectObject(scalp,false)[0];
   if(hit&&radius<hit.distance+.0012){point.copy(origin).addScaledVector(direction,hit.distance+.0012);fitted++;}
   p.setXYZ(i,point.x,point.y,point.z);
  }
  p.needsUpdate=true;mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingBox();mesh.geometry.computeBoundingSphere();
 }
 geometry.dispose();material.dispose();
 head.userData.anatomicalHairFit={fitted,earRelief:true};
}
