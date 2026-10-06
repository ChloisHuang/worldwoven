/** Shared preview-only fitting boundary for retained tied hair and role hats.
 * Derived from the supplied candidate, so changing the neutral sculpt does not
 * duplicate art landmarks in costume code. No per-frame fitting or raycasts. */
import * as THREE from 'three';
const HEAD_PIVOT=1.455;
export const RETAINED_HAIR=/^(continuous-swept-hair|side-swept-fringe|side-part-hair|hair-|combed-|tapered-side-lock|side-flow)/;
function bounds(position,minimumY=-Infinity){
 const min=[Infinity,Infinity,Infinity],max=min.map(v=>-v);
 for(let i=0;i<position.length;i+=3){if(position[i+1]<minimumY)continue;for(let k=0;k<3;k++){min[k]=Math.min(min[k],position[i+k]);max[k]=Math.max(max[k],position[i+k]);}}
 return{min,max};
}
function landmark(part,raw){let best=Infinity,at=0;for(let i=0;i<part.featureCoord.length;i+=3){let d=0;for(let k=0;k<3;k++)d+=(part.featureCoord[i+k]-raw[k])**2;if(d<best){best=d;at=i;}}return Array.from(part.position.slice(at,at+3));}
export function createHeadAttachmentFit(head,asset,scalpAsset=asset){
 const old=head.getObjectByName('continuous-head-jaw-cheeks-nose').geometry.attributes.position.array,skin=asset.parts.find(p=>p.material==='skin');
 // A local brow/nose sculpt can pass the old scalp-height cutoff. Hair and
 // hats keep the supplied neutral envelope; facial hair still follows the
 // actual morphed mouth/chin below.
 const scalpSkin=scalpAsset.parts.find(p=>p.material==='skin');
 const a=bounds(old),b=bounds(scalpSkin.position),vertical=(b.max[1]-HEAD_PIVOT)/(a.max[1]-HEAD_PIVOT);
 const oldScalp=bounds(old,1.58),newScalp=bounds(scalpSkin.position,HEAD_PIVOT+(1.58-HEAD_PIVOT)*vertical);
 const scale=[0,vertical,0],offset=[0,HEAD_PIVOT*(1-vertical),0];
 for(const k of[0,2]){scale[k]=(newScalp.max[k]-newScalp.min[k])/(oldScalp.max[k]-oldScalp.min[k]);offset[k]=(newScalp.min[k]+newScalp.max[k])/2-scale[k]*(oldScalp.min[k]+oldScalp.max[k])/2;}
 let hairTopFrom=-Infinity;for(const mesh of head.children)if(mesh.isMesh&&RETAINED_HAIR.test(mesh.name)){mesh.geometry.computeBoundingBox();hairTopFrom=Math.max(hairTopFrom,mesh.geometry.boundingBox.max.y);}
 const oldMouth=head.getObjectByName('closed-soft-mouth').geometry;oldMouth.computeBoundingBox();
 return{scale,offset,hairTopFrom,mouthFrom:oldMouth.boundingBox.getCenter(new THREE.Vector3()).y,mouthTo:landmark(skin,[0,6.57,1.55])[1],chinFrom:a.min[1],chinTo:landmark(skin,[0,6.2,1.34])[1]};
}
/** Existing combs/pins were fitted to the saved hairstyle envelope. When an
 * explicit candidate hairstyle replaces it, retain that same crown contact.
 * Only the accessory attachment moves; anatomy and the head joint stay fixed. */
export function fitCandidateHairAttachments(fit,hair){
 hair.geometry.computeBoundingBox();
 const from=fit.hairTopFrom*fit.scale[1]+fit.offset[1],to=hair.geometry.boundingBox.max.y;
 fit.hairOffsetY=Number.isFinite(from)?Math.max(-.025,Math.min(.025,to-from)):0;
}
export function fitRetainedHeadMesh(mesh,fit){
 const g=mesh.geometry,p=g.attributes.position,n=g.attributes.normal,normal=new THREE.Vector3();
 for(let i=0;i<p.count;i++){p.setXYZ(i,p.getX(i)*fit.scale[0]+fit.offset[0],p.getY(i)*fit.scale[1]+fit.offset[1],p.getZ(i)*fit.scale[2]+fit.offset[2]);normal.set(n.getX(i)/fit.scale[0],n.getY(i)/fit.scale[1],n.getZ(i)/fit.scale[2]).normalize();n.setXYZ(i,normal.x,normal.y,normal.z);}
 g.computeBoundingBox();g.computeBoundingSphere();
}
/** Costume groups are authored in head-bone-local coordinates. Apply the same
 * envelope used by retained hair, relative to the unchanged real head joint. */
export function fitActorHeadAttachment(actor,group){
 const fit=actor.root.userData.characterModel?.attachmentFit;if(!fit||group.userData.completeAdultFit)return group;
 group.position.set(group.position.x*fit.scale[0]+fit.offset[0],(group.position.y+HEAD_PIVOT)*fit.scale[1]+fit.offset[1]-HEAD_PIVOT+(fit.hairOffsetY??0),group.position.z*fit.scale[2]+fit.offset[2]);
 group.scale.multiply(new THREE.Vector3(...fit.scale));group.userData.completeAdultFit=true;return group;
}
// Project a retained lower-face surface onto the new front triangle surface.
// X/Y barycentrics evaluate the cached mesh directly, without rays or a scene.
export function frontSurface(part,x,y){let front=-Infinity;const p=part.position;
 for(let i=0;i<part.index.length;i+=3){const a=part.index[i]*3,b=part.index[i+1]*3,c=part.index[i+2]*3;
  if(y<Math.min(p[a+1],p[b+1],p[c+1])||y>Math.max(p[a+1],p[b+1],p[c+1])||x<Math.min(p[a],p[b],p[c])||x>Math.max(p[a],p[b],p[c]))continue;
  const d=(p[b+1]-p[c+1])*(p[a]-p[c])+(p[c]-p[b])*(p[a+1]-p[c+1]);if(Math.abs(d)<1e-12)continue;
  const u=((p[b+1]-p[c+1])*(x-p[c])+(p[c]-p[b])*(y-p[c+1]))/d,v=((p[c+1]-p[a+1])*(x-p[c])+(p[a]-p[c])*(y-p[c+1]))/d;
  if(u<-.00001||v<-.00001||u+v>1.00001)continue;front=Math.max(front,u*p[a+2]+v*p[b+2]+(1-u-v)*p[c+2]);
 }return front;
}
export function fitRetainedFacialHair(mesh,fit,asset){
 const skin=asset.parts.find(p=>p.material==='skin'),g=mesh.geometry,p=g.attributes.position;
 const ratio=(fit.mouthTo-fit.chinTo)/(fit.mouthFrom-fit.chinFrom);
 for(let i=0;i<p.count;i++){
  const x=p.getX(i)*fit.scale[0],oldY=p.getY(i),y=fit.mouthTo+(oldY-fit.mouthFrom)*ratio,z=frontSurface(skin,x,Math.max(fit.chinTo,y));
  // The trimmed goatee retains a short free tip below the chin; moustaches
  // receive only a 1.7 mm surface separation, preserving their authored shape.
  if(!Number.isFinite(z))throw new Error('Candidate facial-hair fit has no front surface');
  const tip=Math.max(0,fit.chinTo-y);p.setXYZ(i,x,y,z+.0017+tip*.2);
 }
 g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();mesh.userData.completeAdultPart='facial-hair';
}
