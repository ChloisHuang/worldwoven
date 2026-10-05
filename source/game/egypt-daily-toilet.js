import {createDailyToilet} from './daily-toilet.js';
import {followActorRoute} from './actor-navigation.js';

// The northern 1.30m strip of the existing bath and its original full-height
// opaque linen closure. The bath, changing niche and east aisle remain intact.
export const EGYPT_DAILY_TOILET=Object.freeze({
 id:'eg-private-bath-toilet',provider:'egypt-daily-toilet',roomId:'egypt-private-bath',
 approach:Object.freeze([15.84,0,-3.62]),anchor:Object.freeze([14.92,0,-3.62]),
 seatY:.605,yaw:Math.PI/2,exitYaw:0,seconds:8,executionRadius:.06,
 closures:Object.freeze(['private-bath-entry']),
 privacyBounds:Object.freeze({minX:12,maxX:16.29,minZ:-4.25,maxZ:2.49}),
 attendantId:'egypt-private-bath',standby:Object.freeze([18.15,0,.8])
});
const P=EGYPT_DAILY_TOILET,FACILITY=Object.freeze({...P,receiptSource:'egypt-toilet',intentId:'eg-daily-toilet',
 name:'王室沐浴间 · 私密净室',approachLabel:'正前往沐浴间净室',privacyLabel:'等净室空闲、亚麻门帘合好',
 closureKinds:Object.freeze({'private-bath-entry':Object.freeze(['full-curtain'])})
});
export function createEgyptDailyToilet(options){
 const core=createDailyToilet({...options,facility:FACILITY});
 const staff=options.getActors?.().find(n=>n.station?.id===P.attendantId);
 let attending=null,routeKey=null,retry=0,disposed=false;
 const at=p=>staff&&Math.hypot(staff.root.position.x-p[0],staff.root.position.z-p[2])<.07&&Math.abs(staff.root.position.y-p[1])<.1;
 function travel(p,dt){
  staff.walking=false;if(at(p)){staff.route=[];routeKey=null;return true;}
  const key=p.join(',');if(key!==routeKey){routeKey=key;retry=0;staff.route=options.planPath(staff.root.position,{x:p[0],y:p[1],z:p[2]},.25);}
  const result=followActorRoute(staff,dt,{doors:options.doors,moveActor:options.moveActor,npcs:options.getActors(),playerPosition:options.getPlayer()?.root.position,arrivalTolerance:.035});
  if(result.waiting)retry=0;else if(!result.waypoint){retry+=dt;if(retry>=3)routeKey=null;}
  return at(p);
 }
 return {...core,
  // Seti's original home is outside the room but inside the curtain safety
  // hold zone. He walks to the existing bedroom-side supply space, then walks
  // home again. Nobody is hidden, cloned, snapped, or counted through the wall.
  updateStaff(dt,t,{conversationActorId=null}={}){
   if(disposed||!staff||!options.planPath||!options.moveActor)return;
   if(core.active()&&!attending&&conversationActorId!==P.attendantId){attending='yielding';routeKey=null;staff.route=[];}
   if(!attending)return;
   if(!core.active()&&attending!=='returning'){attending='returning';routeKey=null;staff.route=[];}
   if(conversationActorId===P.attendantId)return;
   const destination=attending==='returning'?staff.home.toArray():P.standby;
   if(travel(destination,dt)){
    if(attending==='returning'){attending=null;staff.breakAt=t+10;staff.returning=false;staff.label?.querySelector('small')&&(staff.label.querySelector('small').textContent=staff.station.npcLabel);return;}
    attending='waiting';staff.root.rotation.y=-Math.PI/2;
   }
   const label=staff.label?.querySelector('small');if(label)label.textContent=attending==='returning'?'回到原处整理亚麻':attending==='waiting'?'在门外备好干净亚麻':'让出净室门口';
   staff.animate?.(t+staff.phase,staff.walking,null,options.poseContext?.(staff,null));
  },
  owns:n=>!!attending&&n===staff,
  socialStatus:n=>n===staff&&attending?{busy:true,attention:false,job:attending==='returning'?'回到原处整理亚麻':'为净室让出门口'}:null,
  state:()=>({...core.state(),attendant:staff?{id:P.attendantId,stage:attending,position:staff.root.position.toArray()}:null}),
  dispose(){core.dispose();disposed=true;if(attending&&staff)staff.route=[];attending=null;}
 };
}
