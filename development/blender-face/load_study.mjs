/** Original Blender control-cage study, loaded only by the local prototype. */
import * as THREE from 'three';
import fs from 'node:fs';
const asset=JSON.parse(fs.readFileSync(new URL('./assets/adult-subdivided.json',import.meta.url),'utf8'));
export function replaceHeadWithBlender(head,root,C){
 for(const m of [...head.children])if(m.isMesh&&!/hair|fringe|combed|side-lock|side-flow/.test(m.name)){m.removeFromParent();m.geometry.dispose();}
 const oldNeck=root.getObjectByName('neck');if(oldNeck){oldNeck.removeFromParent();oldNeck.geometry.dispose();}
 const colors={skin:C.skin,lip:new THREE.Color(C.skin).lerp(new THREE.Color(0x925e5b),.43).getHex(),mouth:new THREE.Color(C.skin).multiplyScalar(.38).getHex(),sclera:0xe7eaeb,iris:C.iris,pupil:C.pupil,brow:C.brow};
 const prefixes={skin:'continuous-head-blender-skin',lip:'upper-lip-blender-volume',mouth:'closed-soft-mouth-blender-cavity',sclera:'inset-eye-white-blender',iris:'iris-blender',pupil:'pupil-blender',brow:'soft-brow-blender'};
 for(const [i,p]of asset.parts.entries()){
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p.position,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(p.normal,3));g.setIndex(p.index);g.computeBoundingBox();g.computeBoundingSphere();
  const m=new THREE.Mesh(g,{color:new THREE.Color(colors[p.material]),isMaterial:false});m.name=prefixes[p.material]+'-'+i;m.userData.blenderStudy=true;head.add(m);
 }
 head.userData.controlCage={vertices:asset.cageVertices,faces:asset.cageFaces,subdivision:asset.subdivision};
}
