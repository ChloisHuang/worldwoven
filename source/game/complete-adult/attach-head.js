/** Pure browser-safe mesh attachment. Assets and selected palette are supplied. */
import * as THREE from 'three';
export function attachCompleteHead(root,C,asset,{clay=false,surface=false}={}){
 const head=root.getObjectByName('sculpted-head');
 for(const m of [...head.children])if(m.isMesh&&/^(continuous-head-|ear-|inset-eye-|iris-|pupil-|eye-catchlight-|eyelid-|soft-brow-|nostril-|upper-lip$|lower-lip$|closed-soft-mouth$)/.test(m.name)){m.removeFromParent();m.geometry.dispose();}
 const neck=root.getObjectByName('neck');if(neck){neck.removeFromParent();neck.geometry.dispose();}
 if(clay)for(const m of [...head.children])if(m.isMesh){m.removeFromParent();m.geometry.dispose();}
 // Neutral off-white lets the real room light supply warmth. The previous
 // beige base compounded the lid tint and made the iris read as a dark dot.
 const colors={skin:C.skin,lip:new THREE.Color(C.skin).lerp(new THREE.Color(0x925e5b),.38).getHex(),sclera:0xf2f3f1,iris:C.iris,pupil:C.pupil,brow:C.brow,lash:new THREE.Color(C.skin).lerp(new THREE.Color(C.hair),.78).getHex()};
 const prefixes={skin:'continuous-head-anatomical',sclera:'inset-eye-anatomical',iris:'iris-anatomical',pupil:'pupil-anatomical',brow:'soft-brow-anatomical',lash:'eyelid-contact-anatomical'};
 for(const p of asset.parts){
  if(clay&&(p.material==='brow'||p.material==='lash'))continue;
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p.position,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(p.normal,3));g.setIndex(ArrayBuffer.isView(p.index)?new THREE.BufferAttribute(p.index.slice(),1):p.index);if(surface&&p.featureCoord){g.setAttribute('featureCoord',new THREE.Float32BufferAttribute(p.featureCoord,3));const kind={skin:1,iris:2,pupil:3,sclera:4,brow:5}[p.material];g.setAttribute('featureKind',new THREE.Float32BufferAttribute(new Array(p.position.length/3).fill(kind),1));}g.computeBoundingBox();g.computeBoundingSphere();
  if(p.material==='skin'&&!clay){const c=[];for(let i=0;i<p.position.length/3;i++){const v=new THREE.Color(C.skin).lerp(new THREE.Color(colors.lip),p.lipWeight[i]).multiplyScalar(1-.72*p.cavityWeight[i]-.26*p.lidWeight[i]-.60*p.recessWeight[i]);c.push(v.r,v.g,v.b);}g.setAttribute('color',new THREE.Float32BufferAttribute(c,3));}
  if(!clay&&p.material!=='skin'&&p.recessWeight){const c=[],contact=p.material==='sclera'?.22:.38;for(const occlusion of p.recessWeight){const v=new THREE.Color(colors[p.material]).multiplyScalar(1-contact*occlusion);c.push(v.r,v.g,v.b);}g.setAttribute('color',new THREE.Float32BufferAttribute(c,3));}
  const m=new THREE.Mesh(g,{color:new THREE.Color(clay?0x999999:colors[p.material]),isMaterial:false});m.name=prefixes[p.material]+'-'+p.name;m.userData.softSkin=true;m.userData.completeAdultPart=p.material;head.add(m);
 }
 head.userData.anatomicalStudy={sourceCommit:asset.sourceCommit,prototypeOnly:true,unimplemented:asset.unimplemented};
}
