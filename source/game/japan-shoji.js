import {addInsetClosureSection} from './inset-closures.js';
import {THREE,box} from './geometry.js';

// The wall builder removes the returned rough opening, including the full
// pocket cavities. Floor groups provide their own elevation through matrixWorld.
export function addJapanInsetClosure(g,x,z,width,axis,colliders,cameraColliders,config={}){
 const pocket=config.kind==='pocket',bottom=config.bottom??0,top=config.top??2.85,
  section=addInsetClosureSection(g,colliders,cameraColliders,{kind:pocket?'pocket':'hinge',axis,at:axis==='x'?z:x,lateral:axis==='x'?x:z,bottom,top,width,style:'shoji',wallDepth:pocket?.38:.24,swing:config.swing??1});
 if(pocket){
  // Split mouth jambs overlap both opaque skins, with a 12.5mm running gap
  // outside the full decorated leaf. They occupy the wall, never the aperture.
  const inner=.115,depth=.19-inner,jambWidth=.15,h=top-bottom+.10;
  for(const side of[-1,1])for(const face of[-1,1]){
   const cx=side*(width/2+jambWidth/2),cz=face*(inner+depth/2),mesh=box(section.group,cx,h/2,cz,jambWidth,h,depth,0x765744);
   mesh.name='Integrated shoji pocket mouth jamb';
   const bounds={minX:cx-jambWidth/2,maxX:cx+jambWidth/2,minY:0,maxY:h,minZ:cz-depth/2,maxZ:cz+depth/2};
   section.parts.push({name:mesh.name,bounds,walkBlock:true});
   const b=new THREE.Box3(new THREE.Vector3(bounds.minX,bounds.minY,bounds.minZ),new THREE.Vector3(bounds.maxX,bounds.maxY,bounds.maxZ)).applyMatrix4(section.group.matrixWorld),world={minX:b.min.x,maxX:b.max.x,minY:b.min.y,maxY:b.max.y,minZ:b.min.z,maxZ:b.max.z};
   colliders.push(world);cameraColliders.push({...world});
  }
  section.mount.pocketMouth={innerFace:inner,depth,lateralWidth:jambWidth,clearWidth:width,joinedToBothOpaqueSkins:true};
  section.group.userData.insetClosureSection.mount={...section.mount};
 }
 return section;
}
