import * as THREE from 'three';
// Sweep a small camera volume along its sight line. Boxes are world-space solids.
export function cameraDistanceToObstacle(target,desired,boxes,radius=.18){
 const delta=desired.clone().sub(target),length=delta.length();if(length<.001)return 0;let fraction=1,obstructed=false;
 for(const b of boxes||[]){let lo=0,hi=1;let hit=true;for(const [axis,min,max]of[['x','minX','maxX'],['y','minY','maxY'],['z','minZ','maxZ']]){const d=delta[axis],p=target[axis],a=b[min]-radius,c=b[max]+radius;if(!Number.isFinite(a)||!Number.isFinite(c)){hit=false;break;}if(Math.abs(d)<1e-8){if(p<a||p>c){hit=false;break;}}else{let t1=(a-p)/d,t2=(c-p)/d;if(t1>t2)[t1,t2]=[t2,t1];lo=Math.max(lo,t1);hi=Math.min(hi,t2);if(lo>hi){hit=false;break;}}}if(hit&&hi>=0&&lo<=1){fraction=Math.min(fraction,Math.max(0,lo));obstructed=true;}}
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
