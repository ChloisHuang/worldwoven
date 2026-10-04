import * as THREE from 'three';
// Sweep a small camera volume along its sight line. Boxes are world-space solids.
export function cameraDistanceToObstacle(target,desired,boxes,radius=.18){
 // This sweep runs for camera, interaction and health sight lines. Avoid
 // allocating a Vector3 plus four axis arrays for every tested world box.
 const dx=desired.x-target.x,dy=desired.y-target.y,dz=desired.z-target.z,length=Math.sqrt(dx*dx+dy*dy+dz*dz);if(length<.001)return 0;let fraction=1,obstructed=false;
 const minX=Math.min(target.x,desired.x),maxX=Math.max(target.x,desired.x),minY=Math.min(target.y,desired.y),maxY=Math.max(target.y,desired.y),minZ=Math.min(target.z,desired.z),maxZ=Math.max(target.z,desired.z);
 for(const b of boxes||[]){
  // Most solids are in a different room. Reject disjoint segment bounds
  // before the exact slab sweep; touching bounds still reach the exact test.
  if(b.minX<=b.maxX&&(b.minX-radius>maxX||b.maxX+radius<minX)||b.minY<=b.maxY&&(b.minY-radius>maxY||b.maxY+radius<minY)||b.minZ<=b.maxZ&&(b.minZ-radius>maxZ||b.maxZ+radius<minZ))continue;
  let lo=0,hi=1,a=b.minX-radius,c=b.maxX+radius;
  if(!Number.isFinite(a)||!Number.isFinite(c))continue;
  if(Math.abs(dx)<1e-8){if(target.x<a||target.x>c)continue;}else{let t1=(a-target.x)/dx,t2=(c-target.x)/dx;if(t1>t2){const swap=t1;t1=t2;t2=swap;}lo=Math.max(lo,t1);hi=Math.min(hi,t2);if(lo>hi)continue;}
  a=b.minY-radius;c=b.maxY+radius;if(!Number.isFinite(a)||!Number.isFinite(c))continue;
  if(Math.abs(dy)<1e-8){if(target.y<a||target.y>c)continue;}else{let t1=(a-target.y)/dy,t2=(c-target.y)/dy;if(t1>t2){const swap=t1;t1=t2;t2=swap;}lo=Math.max(lo,t1);hi=Math.min(hi,t2);if(lo>hi)continue;}
  a=b.minZ-radius;c=b.maxZ+radius;if(!Number.isFinite(a)||!Number.isFinite(c))continue;
  if(Math.abs(dz)<1e-8){if(target.z<a||target.z>c)continue;}else{let t1=(a-target.z)/dz,t2=(c-target.z)/dz;if(t1>t2){const swap=t1;t1=t2;t2=swap;}lo=Math.max(lo,t1);hi=Math.min(hi,t2);if(lo>hi)continue;}
  if(hi>=0&&lo<=1){fraction=Math.min(fraction,Math.max(0,lo));obstructed=true;}
 }
 return obstructed?Math.max(.12,length*fraction-.07):length;
}
export function resolveCameraPosition(target,desired,boxes,radius=.18){const delta=desired.clone().sub(target),length=delta.length();if(length<.001)return desired.clone();const distance=Math.min(length,cameraDistanceToObstacle(target,desired,boxes,radius));return target.clone().addScaledVector(delta,distance/length);}
export function buildCameraSolids(lot){if(lot.cameraColliders?.length)return lot.cameraColliders.map(c=>({...c}));return lot.colliders.map(c=>({...c,minY:c.minY??-.1,maxY:c.maxY??3.4}));}

// Keep a following orthographic shadow map aligned to whole light-space texels.
// This removes sub-texel swimming when the player moves without moving the sun.
const SHADOW_OFFSET=new THREE.Vector3(-14,26,15);
const SHADOW_RIGHT=new THREE.Vector3(15,0,14).normalize();
const SHADOW_UP=SHADOW_OFFSET.clone().normalize().cross(SHADOW_RIGHT).normalize();
export function stableShadowTarget(position,halfExtent=18,resolution=1024){
 const out=position.clone(),step=2*halfExtent/resolution;
 for(const axis of [SHADOW_RIGHT,SHADOW_UP]){const n=out.dot(axis);out.addScaledVector(axis,Math.round(n/step)*step-n);}
 return out;
}
export function cameraClipPlanes({mode='lot',cameraDistance=4.6,overviewDistance=0,overviewRadius=0}={}){
 if(mode==='globe')return {near:.3,far:100};
 if(overviewDistance>0)return {near:.5,far:Math.max(180,overviewDistance+overviewRadius+30)};
 // Very tight fallback needs a small near plane; normal TPS uses better precision.
 return {near:cameraDistance<.65?.04:.2,far:150};
}
