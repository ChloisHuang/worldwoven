/** Two original opaque hairstyles. Y-up, metres, face +Z.
 * Authored from public hairstyle previews; no imported mod geometry/textures.
 * Offline scalp fit is baked by build-female-hair-options.mjs. Runtime reads
 * static positions/normals, so actors do not trace rays or create hair per frame.
 */
import * as THREE from 'three';
import DATA from './assets/female-hair-options-data.js';
export const FEMALE_HAIR_OPTIONS=['long-layered','gathered-updo'];
export function createFemaleHairOption({style='long-layered',color=0x44342f}={}){
 const a=DATA[style];if(!a)throw Error('Unknown female hairstyle '+style);const g=new THREE.BufferGeometry(),base=new THREE.Color(color),c=[];
 for(const v of a.value)c.push(base.r*v,base.g*v,base.b*v);
 g.setAttribute('position',new THREE.Float32BufferAttribute(a.position,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(a.normal,3));g.setAttribute('color',new THREE.Float32BufferAttribute(c,3));g.setIndex(a.index);g.computeBoundingBox();g.computeBoundingSphere();g.userData={style,originalAsset:true,triangles:a.index.length/3,scalpSha256:a.scalpSha256};return g;
}
export function addFemaleHairOption(head,color=0x44342f,style='long-layered'){
 for(const m of [...head.children])if(m.isMesh&&/hair|fringe|combed|side-lock|side-flow/.test(m.name)){m.removeFromParent();m.geometry.dispose();}
 const g=createFemaleHairOption({style,color}),m=new THREE.Mesh(g,{color:new THREE.Color(color),isMaterial:false});m.name='hair-female-'+style;m.userData.softSkin=true;head.add(m);head.userData.femaleHair={...g.userData};return m;
}
