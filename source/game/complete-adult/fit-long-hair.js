/** The single baked long style was draped on the slender French gown. Map its
 * lower envelope with the same body stations as that garment, keeping the
 * authored layers, section thickness and scalp attachment. No runtime rays,
 * extra mesh, new hairstyle, or per-character correction table is involved. */
import * as THREE from 'three';
import {femaleBodyWidthAtHeight,femaleBodyDepth} from './female-silhouette.js';
const BASE='feminine-slender';
function ratio(y,preset){
 const t=Math.max(0,Math.min(1,(1.425-y)/.045)),blend=t*t*(3-2*t);
 return[femaleBodyWidthAtHeight(y,preset)/femaleBodyWidthAtHeight(y,BASE),1+(femaleBodyDepth(preset)/femaleBodyDepth(BASE)-1)*blend];
}
export function fitFemaleLongHair(mesh,options){
 if(mesh.userData.completeAdultPart!=='long-hair'||options.bodyPreset===BASE)return;
 const g=mesh.geometry,p=g.attributes.position,n=g.attributes.normal,normal=new THREE.Vector3(),epsilon=1e-5;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i);if(y>=1.425)continue;
  const [sx,sz]=ratio(y,options.bodyPreset),before=ratio(y-epsilon,options.bodyPreset),after=ratio(y+epsilon,options.bodyPreset);
  p.setXYZ(i,x*sx,y,z*sz);
  // Inverse-transpose of this varying envelope, retaining the baked smooth
  // seam normals and the original closed cross-sections of every lock.
  normal.set(n.getX(i)/sx,n.getY(i)-x*(after[0]-before[0])/(2*epsilon)*n.getX(i)/sx-z*(after[1]-before[1])/(2*epsilon)*n.getZ(i)/sz,n.getZ(i)/sz).normalize();n.setXYZ(i,normal.x,normal.y,normal.z);
 }
 g.computeBoundingBox();g.computeBoundingSphere();
}
