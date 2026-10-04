/** Original softly waved asymmetric bob. Metres, Y-up, face +Z.
 * A continuous crown/back mass carries broad sculpted flow and four tapering
 * face-framing locks. One opaque merged mesh; no textures, rays or per-frame work.
 */
import * as THREE from 'three';
import HAIR_DATA from './assets/female-hair-data.js';
export const FEMALE_HAIR_FIT={center:[0,1.54638,-.0163],radii:[.081,.10413,.0945]};
/** Reuse the authored/baked mesh. No scalp queries occur in this runtime path. */
export function createFemaleHairGeometry({color=0x44342f,center=FEMALE_HAIR_FIT.center,radii=FEMALE_HAIR_FIT.radii}={}){
 const p=HAIR_DATA.position.slice(),n=HAIR_DATA.normal.slice(),c=[],base=new THREE.Color(color);
 for(let i=0;i<p.length;i+=3){for(let k=0;k<3;k++){p[i+k]=center[k]+(p[i+k]-FEMALE_HAIR_FIT.center[k])*radii[k]/FEMALE_HAIR_FIT.radii[k];n[i+k]*=FEMALE_HAIR_FIT.radii[k]/radii[k];}const length=Math.hypot(n[i],n[i+1],n[i+2]);for(let k=0;k<3;k++)n[i+k]/=length;c.push(base.r*HAIR_DATA.value[i/3],base.g*HAIR_DATA.value[i/3],base.b*HAIR_DATA.value[i/3]);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(n,3));g.setAttribute('color',new THREE.Float32BufferAttribute(c,3));g.setIndex(HAIR_DATA.index);g.computeBoundingBox();g.computeBoundingSphere();g.userData={originalAsset:true,style:'asymmetrical-soft-wave-bob',triangles:HAIR_DATA.index.length/3,scalpSha256:HAIR_DATA.scalpSha256};return g;
}
export function addFemaleHair(head,color=0x44342f,fit={}){
 for(const m of [...head.children])if(m.isMesh&&/hair|fringe|combed|side-lock|side-flow/.test(m.name)){m.removeFromParent();m.geometry.dispose();}
 const geometry=createFemaleHairGeometry({...fit,color}),mesh=new THREE.Mesh(geometry,fit.material??{color:new THREE.Color(color),isMaterial:false});mesh.name='hair-female-asymmetrical-wave-bob';mesh.userData.softSkin=true;head.add(mesh);head.userData.femaleHair={...geometry.userData};return mesh;
}
