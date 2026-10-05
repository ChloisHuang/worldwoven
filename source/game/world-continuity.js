// Scene-free checkpoints. Actor IDs are authored station/visitor IDs, never
// array offsets; routes are rebuilt against the current world's navigation.
export const WORLD_CONTINUITY_VERSION=1;
const AREAS=new Set(['china','japan','france','egypt']);
export const continuityCopy=value=>value==null?null:JSON.parse(JSON.stringify(value));
const finite=value=>Number.isFinite(value);
export function continuityPoint(value){const a=Array.isArray(value)?value:value&&[value.x,value.y,value.z];return a?.length===3&&a.every(finite)?a.slice():null;}
export function readWorldRegion(saved,region){const world=saved?.worldContinuity;if(world?.version!==WORLD_CONTINUITY_VERSION||!AREAS.has(region))return null;const state=world.regions?.[region];return state?.region===region&&state.version===1?continuityCopy(state):null;}
export function captureWorldActor(actor,{id=actor.station?.id,region,elapsed=0,floor=null,mountId=null}={}){
 const position=continuityPoint(actor.root?.position);if(typeof id!=='string'||!AREAS.has(region)||!position)return null;
 const target=actor.route?.length?continuityPoint(actor.route.at(-1)):null;
 return {id,region,position,yaw:finite(actor.root.rotation.y)?actor.root.rotation.y:0,floor:floor||null,mountId:mountId||actor.serviceMount?.id||null,target,returning:!!actor.returning,breakRemaining:finite(actor.breakAt)?Math.max(0,actor.breakAt-elapsed):null,phase:finite(actor.phase)?actor.phase:0};
}
export function storeWorldRegion(saved,region,{player,actors,controllers={},activity=null,camera=null,animationTime=0}){
 if(!AREAS.has(region)||!player)return false;
 const previous=saved.worldContinuity?.version===1?saved.worldContinuity.regions:{};
 saved.worldContinuity={version:1,activeRegion:region,regions:{...previous,[region]:{version:1,region,player,actors:Object.fromEntries(actors.filter(Boolean).map(a=>[a.id,a])),controllers:continuityCopy(controllers),activity:continuityCopy(activity),camera:continuityCopy(camera),animationTime:finite(animationTime)?animationTime:0}}};return true;
}
// A geometry revision can make one old point illegal. Search only that point's
// floor and immediate neighbourhood; never reset the remaining actors/world.
export function nearestContinuityPosition(position,{legal,project=p=>p,maxRadius=4}={}){
 const p=continuityPoint(position);if(!p)return null;
 const valid=candidate=>{const q=project(candidate.slice());return q&&Math.abs(q[1]-p[1])<=.4&&legal(q)?q:null;};
 const exact=valid(p);if(exact)return {position:exact,relocated:false};
 for(let r=.1;r<=maxRadius+.001;r+=.1){const count=Math.max(8,Math.ceil(2*Math.PI*r/.12));for(let i=0;i<count;i++){const a=2*Math.PI*i/count,q=valid([p[0]+Math.cos(a)*r,p[1],p[2]+Math.sin(a)*r]);if(q)return {position:q,relocated:true};}}
 return null;
}
export function restoreWorldActor(actor,snapshot,{id=actor.station?.id,region,elapsed=0,resolvePosition,planPath=()=>[],mount=null}={}){
 if(!snapshot||snapshot.id!==id||snapshot.region!==region||!continuityPoint(snapshot.position))return {restored:false,reason:'identity'};
 const result=resolvePosition(snapshot,mount);if(!result?.position)return {restored:false,reason:'position'};
 actor.root.position.set(...result.position);actor.root.rotation.y=finite(snapshot.yaw)?snapshot.yaw:actor.root.rotation.y;
 actor.returning=!!snapshot.returning;if(finite(snapshot.phase))actor.phase=snapshot.phase;
 actor.breakAt=snapshot.breakRemaining===null?Infinity:elapsed+Math.max(0,Number(snapshot.breakRemaining)||0);
 const target=continuityPoint(snapshot.target);actor.route=target&&!mount?planPath(actor.root.position,{x:target[0],y:target[1],z:target[2]},id==='player'?.34:.25):[];actor.walking=false;
 if(mount)actor.serviceMount=mount;
 return {restored:true,relocated:!!result.relocated};
}
