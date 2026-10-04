/** Isolated CC0 anatomical study. Never imported by production source. */
import * as THREE from 'three';
import fs from 'node:fs';
import {fitAnatomicalHair} from '../anatomical-head/fit_hair.mjs';
import {reframePrototypeHair} from '../convex-eyes/hair-framing.mjs';
const asset=JSON.parse(fs.readFileSync(new URL('./adult-head.json',import.meta.url),'utf8'));
export function replaceWithCompleteAdult(root,C,{clay=false,surface=false}={}){
 const head=root.getObjectByName('sculpted-head');
 for(const m of [...head.children])if(m.isMesh&&!/hair|fringe|combed|side-lock|side-flow/.test(m.name)){m.removeFromParent();m.geometry.dispose();}
 const neck=root.getObjectByName('neck');if(neck){neck.removeFromParent();neck.geometry.dispose();}
 // Same original hair construction as the round06 comparator.
 reframePrototypeHair(head,C.hair);
 if(!clay)fitAnatomicalHair(head,asset.parts.find(p=>p.material==='skin'));
 // Original strand coordinates follow each retained bundle's authored path.
 // They are independent of camera, skin colour and reference image pixels.
 if(surface&&!clay)for(const m of head.children){
  if(!m.isMesh||!m.name.startsWith('hair-'))continue;
  const p=m.geometry.attributes.position,fc=[],bundle=m.name.startsWith('hair-framing-');
  for(let i=0;i<p.count;i++){
   fc.push(bundle?Math.floor(i/13)/26:p.getY(i),bundle?(i%13)/12:Math.atan2(p.getX(i),p.getZ(i)+.017)/Math.PI, bundle?1:0);
  }
  m.geometry.setAttribute('featureCoord',new THREE.Float32BufferAttribute(fc,3));
  m.geometry.setAttribute('featureKind',new THREE.Float32BufferAttribute(new Array(p.count).fill(6),1));
 }
 if(clay)for(const m of [...head.children])if(m.isMesh){m.removeFromParent();m.geometry.dispose();}
 const colors={skin:C.skin,lip:new THREE.Color(C.skin).lerp(new THREE.Color(0x925e5b),.38).getHex(),sclera:0xd9d0c5,iris:C.iris,pupil:C.pupil,brow:C.brow,lash:new THREE.Color(C.skin).lerp(new THREE.Color(C.hair),.78).getHex()};
 const prefixes={skin:'continuous-head-anatomical',sclera:'inset-eye-anatomical',iris:'iris-anatomical',pupil:'pupil-anatomical',brow:'soft-brow-anatomical',lash:'eyelid-contact-anatomical'};
 for(const p of asset.parts){
  if(clay&&(p.material==='brow'||p.material==='lash'))continue;
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p.position,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(p.normal,3));g.setIndex(p.index);if(surface&&p.featureCoord){g.setAttribute('featureCoord',new THREE.Float32BufferAttribute(p.featureCoord,3));const kind={skin:1,iris:2,pupil:3,sclera:4,brow:5}[p.material];g.setAttribute('featureKind',new THREE.Float32BufferAttribute(new Array(p.position.length/3).fill(kind),1));}g.computeBoundingBox();g.computeBoundingSphere();
  if(p.material==='skin'&&!clay){const c=[];for(let i=0;i<p.position.length/3;i++){const v=new THREE.Color(C.skin).lerp(new THREE.Color(colors.lip),p.lipWeight[i]).multiplyScalar(1-.72*p.cavityWeight[i]-.26*p.lidWeight[i]-.60*p.recessWeight[i]);c.push(v.r,v.g,v.b);}g.setAttribute('color',new THREE.Float32BufferAttribute(c,3));}
  if(!clay&&p.material!=='skin'&&p.recessWeight){const c=[];for(const occlusion of p.recessWeight){const v=new THREE.Color(colors[p.material]).multiplyScalar(1-.38*occlusion);c.push(v.r,v.g,v.b);}g.setAttribute('color',new THREE.Float32BufferAttribute(c,3));}
  const m=new THREE.Mesh(g,{color:new THREE.Color(clay?0x999999:colors[p.material]),isMaterial:false});m.name=prefixes[p.material]+'-'+p.name;m.userData.softSkin=true;head.add(m);
 }
 head.userData.anatomicalStudy={sourceCommit:asset.sourceCommit,prototypeOnly:true,unimplemented:asset.unimplemented};
}
