/** Original loose side-part sculpt. Y-up, face +Z, dimensions in metres.
 * No textures, transparent cards, copied meshes or per-frame construction.
 * Broad overlapping forms share a continuous root mass; small locks occur only
 * at the silhouette. The module returns one indexed, vertex-coloured mesh.
 */
import * as THREE from 'three';
import HAIR_DATA from './assets/layered-hair-data.js';
import {attachHairFlow} from './hair-flow-finish.js';
const BASE_CENTER=[0,1.562,-.017], BASE_RADII=[.079,.126,.101];
/** Reuse the evaluated original mesh. No rays or per-frame work at runtime. */
export function createLayeredHairGeometry({center=BASE_CENTER,radii=BASE_RADII,color=0x44342f,flowFinish=false}={}){
 const p=HAIR_DATA.position.slice(),n=HAIR_DATA.normal.slice(),c=[],base=new THREE.Color(color);
 for(let i=0;i<p.length;i+=3){
  for(let k=0;k<3;k++){p[i+k]=center[k]+(p[i+k]-BASE_CENTER[k])*radii[k]/BASE_RADII[k];n[i+k]*=BASE_RADII[k]/radii[k];}
  const length=Math.hypot(n[i],n[i+1],n[i+2])||1;for(let k=0;k<3;k++)n[i+k]/=length;
  const value=HAIR_DATA.value[i/3];c.push(base.r*value,base.g*value,base.b*value);
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(n,3));g.setAttribute('color',new THREE.Float32BufferAttribute(c,3));g.setIndex(HAIR_DATA.index);g.computeBoundingBox();g.computeBoundingSphere();g.userData={originalAsset:true,style:HAIR_DATA.style,triangles:HAIR_DATA.index.length/3,locks:16,scalpSha256:HAIR_DATA.scalpSha256};if(flowFinish)attachHairFlow(g,HAIR_DATA.flow);return g;
}

/** Replace only head hair. The placeholder matches Worldwoven's mesh batcher.
 */
export function addLayeredHair(head,color=0x44342f,fit={}){
 for(const child of [...head.children])if(child.isMesh&&/^(hair-|fringe|combed|side-lock|side-flow)/.test(child.name)){child.removeFromParent();child.geometry.dispose();}
 const geometry=createLayeredHairGeometry({...fit,color});
 const material=fit.material??{color:new THREE.Color(color),isMaterial:false};
 const mesh=new THREE.Mesh(geometry,material);mesh.name='hair-layered-loose-side-part';mesh.userData.softSkin=true;mesh.userData.layeredHair=true;head.add(mesh);head.userData.layeredHair={...geometry.userData,center:fit.center??BASE_CENTER,radii:fit.radii??BASE_RADII};return mesh;
}
