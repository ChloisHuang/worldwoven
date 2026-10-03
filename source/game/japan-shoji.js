import {addInsetClosureSection} from './inset-closures.js';
import {box} from './geometry.js';

// Surface-running shoji overlap the outside of the aperture, while a timber
// return joins each wall jamb to the back of the track. The opening stays full
// width. Even the conservative .15m leaf boxes retain 5mm behind this return.
export function addShojiJambReturns(g,base,x,z,width,axis,colliders,cameraColliders){
 const jambWidth=.16,jambInset=.006,back=-.04,front=.145,height=2.925,depth=front-back;
 for(const side of[-1,1]){
  // Recess the inner edge into the existing jamb so the overlapping solids
  // never place two visible faces on the same aperture-side plane.
  const lateral=side*(width/2+jambInset+jambWidth/2),normal=(back+front)/2;
  const cx=x+(axis==='x'?lateral:normal),cz=z+(axis==='x'?normal:lateral),w=axis==='x'?jambWidth:depth,d=axis==='x'?depth:jambWidth;
  const mesh=box(g,cx,height/2,cz,w,height,d,0x765744);mesh.name='Joined shoji privacy jamb return';
  const b={minX:cx-w/2,maxX:cx+w/2,minY:base,maxY:base+height,minZ:cz-d/2,maxZ:cz+d/2};
  colliders.push(b);cameraColliders.push({...b});
 }
}

// The wall author must cut the returned rough opening, including both pocket
// cavities. Floor groups supply their own world elevation through matrixWorld.
export function addJapanInsetClosure(g,x,z,width,axis,colliders,cameraColliders,config={}){
 return addInsetClosureSection(g,colliders,cameraColliders,{kind:config.kind||'hinge',axis,at:axis==='x'?z:x,lateral:axis==='x'?x:z,bottom:config.bottom??0,top:config.top??2.85,width,style:'shoji',wallDepth:config.kind==='pocket'?.38:.24,swing:config.swing??1});
}
