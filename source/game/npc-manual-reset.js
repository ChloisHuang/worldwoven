import {blocked,canTraverse,resolveSurfaceHeight} from './navigation.js';

const point=p=>Array.isArray(p)?{x:p[0],y:p[1],z:p[2]}:{x:p.x,y:p.y,z:p.z};
// Recover at this country's authored public arrival, never another person's
// bed, a guessed ground level, or an unverified station inside a closed room.
export function findNpcResetPosition({actor,spawn,navigation,colliders=[],doors=[],actors=[],player=null}){
 if(!spawn)return null;const base=point(spawn),radius=actor.collisionRadius??.25,options={...navigation,radius},solids=colliders.concat(doors);
 const bodies=[...actors.filter(n=>n!==actor),...(player?[player]:[])];
 function legal(p){return !blocked(p.x,p.z,solids,radius,{...options,y:p.y})&&!bodies.some(n=>{const q=n.root?.position;if(!q)return false;return p.y<q.y+(n.bodyHeight??1.95)&&p.y+(actor.bodyHeight??1.95)>q.y&&Math.hypot(p.x-q.x,p.z-q.z)<radius+(n.collisionRadius??(n===player ? .34 : .25))+.16;});}
 for(let ring=0;ring<=8;ring++){const r=ring*.45,count=ring?16:1;for(let i=0;i<count;i++){
  const p={x:base.x+Math.cos(i*Math.PI*2/count)*r,y:base.y,z:base.z+Math.sin(i*Math.PI*2/count)*r};
  const y=resolveSurfaceHeight(p,options,solids);if(y===null||Math.abs(y-base.y)>.4)continue;p.y=y;if(!legal(p))continue;
  // Check a real walkable exit as well as a collision-free disk. Two separate
  // directions reject tiny trapped pockets and unsupported decorative ledges.
  let exits=0;for(const [dx,dz]of [[.8,0],[-.8,0],[0,.8],[0,-.8]]){const q={x:p.x+dx,y:p.y,z:p.z+dz},h=resolveSurfaceHeight(q,options,solids);if(h===null)continue;q.y=h;if(legal(q)&&canTraverse(p,q,solids,options))exits++;}
  if(exits>=2)return [p.x,p.y,p.z];
 }}return null;
}

// No frame or asynchronous work may run inside this transaction. Business
// owners provide reversible actor-local preparation or refuse before mutation.
export function applyNpcManualReset({actor,position,preparations=[],persist,now,after=()=>{}}){
 if(!actor?.root?.position||!Array.isArray(position)||position.length!==3||!position.every(Number.isFinite)||preparations.some(p=>!p))return {ok:false,code:'unavailable'};
 const before={position:actor.root.position.toArray(),route:actor.route,walking:actor.walking,returning:actor.returning,breakAt:actor.breakAt,serviceMount:actor.serviceMount,bathTransition:actor.bathTransition,socialPrivateFade:actor.socialPrivateFade};let applied=0;
 try{
  for(const preparation of preparations){applied++;preparation.apply();}
  actor.root.position.set(...position);actor.route=[];actor.walking=false;actor.returning=false;actor.breakAt=now;actor.serviceMount=null;actor.bathTransition=null;actor.socialPrivateFade=false;
  const result=persist();if(result===false||result?.then||result?.ok===false)throw Error('save-failed');
 }catch{
  for(let i=applied-1;i>=0;i--)preparations[i].rollback();actor.root.position.set(...before.position);for(const key of Object.keys(before))if(key!=='position')actor[key]=before[key];return {ok:false,code:'save-failed'};
 }
 after();return {ok:true,position:position.slice()};
}
