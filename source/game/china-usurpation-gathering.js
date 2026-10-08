import {followActorRoute} from './actor-navigation.js';
import {holdSocialActors,releaseSocialActors,socialHoldOwner} from './npc-social-ownership.js';
import {usurpationBodyId} from './china-usurpation-context.js';

const point=value=>Array.isArray(value)&&value.length===3&&value.every(Number.isFinite);
const objectPoint=value=>({x:value[0],y:value[1],z:value[2]});
const idOf=actor=>actor?.actorId||actor?.station?.id;
const near=(position,destination)=>Math.abs(position.y-destination[1])<.3&&Math.hypot(position.x-destination[0],position.z-destination[2])<.10;

// The original controllers retain their work, routes and clocks. Only the
// existing actor-local social lease lends a body; movement uses local routes.
export function createChinaUsurpationGathering({getActors=()=>[],getPlayer=()=>null,
 isPresent=()=>false,canBorrow=()=>false,shouldYield=()=>false,planPath,moveActor,doors,animate=()=>{}}={}) {
 const owner={palaceUsurpationGathering:true};let current=null;
 function release(leaseId) {
  if(!current||leaseId&&current.id!==leaseId)return false;
  for(const row of current.rows)if(isPresent(row.actor)&&usurpationBodyId(row.actor)===row.bodyId)row.actor.walking=false;
  releaseSocialActors(owner);current=null;return true;
 }
 function borrow(request) {
  if(current)return current.id===request?.leaseId&&current.caseId===request.caseId;
  if(!request?.leaseId||!request.caseId||!Array.isArray(request.actors)||!request.actors.length)return false;
  const ids=request.actors.map(idOf);if(ids.some(id=>!id||id==='player')||new Set(ids).size!==ids.length)return false;
  const rows=[];
  for(const actor of request.actors){
   const id=idOf(actor),destination=request.destinations?.[id];
   if(!point(destination)||!isPresent(actor)||actor.alive===false||socialHoldOwner(id)||shouldYield(actor))return false;
   const moving=!near(actor.root.position,destination);
   if(!canBorrow(actor,{moving,held:false}))return false;
   const route=moving?planPath?.(actor.root.position,objectPoint(destination),actor.collisionRadius??.25):[];
   if(moving&&(!route?.length||!near({...route.at(-1),y:route.at(-1).y??actor.root.position.y},destination)))return false;
   rows.push({actor,id,bodyId:usurpationBodyId(actor),destination:destination.slice(),route,elapsed:0,stalled:0,arrived:!moving});
  }
  if(!holdSocialActors(ids,owner))return false;
  current={id:request.leaseId,caseId:request.caseId,kind:request.kind,rows};return true;
 }
 function state(leaseId) {
  if(!current||current.id!==leaseId)return {held:false,legalRoutes:false,participants:[]};
  const valid=current.rows.every(row=>isPresent(row.actor)&&row.actor.alive!==false&&usurpationBodyId(row.actor)===row.bodyId&&socialHoldOwner(row.id)===owner&&!shouldYield(row.actor));
  // A final moving frame is not a standing arrival. Let the real body settle
  // on its next update before the action timer inspects every participant.
  return {held:valid,legalRoutes:valid,participants:current.rows.map(row=>({actorId:row.id,bodyId:row.bodyId,arrived:valid&&!row.actor.walking&&near(row.actor.root.position,row.destination)}))};
 }
 function update(dt,time=0) {
  if(!current)return;const delta=Number.isFinite(dt)?Math.max(0,Math.min(.25,dt)):0;
  if(!state(current.id).held){release();return;}
  for(const row of current.rows){
   const actor=row.actor;row.elapsed+=delta;
   if(row.elapsed>90){release();return;}
   actor.walking=false;
   if(!near(actor.root.position,row.destination)){
    const before={x:actor.root.position.x,z:actor.root.position.z};
    if(!row.route.length){release();return;}
    followActorRoute(actor,delta,{route:row.route,doors,moveActor,npcs:getActors(),playerPosition:getPlayer()?.root.position,radius:actor.collisionRadius??.25,arrivalTolerance:.045,speedScale:.82});
    const progressed=Math.hypot(actor.root.position.x-before.x,actor.root.position.z-before.z)>.0001;
    row.stalled=progressed?0:row.stalled+delta;
    if(row.stalled>8){release();return;}
   }
   row.arrived=near(actor.root.position,row.destination);
   const player=getPlayer();if(row.arrived&&!actor.walking&&player?.root?.position&&actor.root.rotation){const p=player.root.position;actor.root.rotation.y=Math.atan2(p.x-actor.root.position.x,p.z-actor.root.position.z);}
   animate(actor,time,actor.walking===true);
  }
 }
 return {borrow,state,release,update,owns:actor=>!!current?.rows.some(row=>row.actor===actor),active:()=>current?.id||null,dispose:()=>release()};
}
