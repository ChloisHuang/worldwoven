import {moveWithCollision} from './navigation.js';

// Routes describe static passages. Other people only constrain this movement
// step, never the whole route or its distant destination.
const EPS=1e-6,PERSON_HEIGHT=1.95,TURNOUT=new WeakMap(),BODY_RECOVERY=new WeakMap(),STAND_RECOVERY=new WeakMap();
const BODY_WAIT=5,BODY_ESCAPE_SECONDS=1.25,BODY_ESCAPE_DISTANCE=1.4,ROUTE_PROGRESS=.12,BODY_CLEAR_GRACE=.25;
let movementStep=0,movementTime=0,movementDt=0;

// One tick per simulation substep, including ticks with no movement. Neither
// wall time nor repeated movement/yield trials can advance a person's timer.
export function beginActorNavigationStep(dt){
 movementStep++;movementDt=Number.isFinite(dt)?Math.max(0,dt):0;movementTime+=movementDt;
}

export function cancelActorStandIntent(actor){STAND_RECOVERY.delete(actor);}

// Only an actual, continuous get-up intent may call this helper. Read-only
// budget/availability probes keep using furniture.standPoint directly.
// resolvePoint must retain every wall, support and live door when omitting
// dynamic bodies; the helper cannot relax or invent a landing itself.
export function findActorStandPoint(actor,mount,resolvePoint){
 if(!actor?.root?.position||!mount||typeof resolvePoint!=='function'){cancelActorStandIntent(actor);return null;}
 let staticPoint;
 try{
  const normal=resolvePoint({ignoreDynamicBodies:false});
  if(normal){cancelActorStandIntent(actor);return normal;}
  staticPoint=resolvePoint({ignoreDynamicBodies:true});
 }catch{cancelActorStandIntent(actor);return null;}
 if(!staticPoint||movementDt<=0){STAND_RECOVERY.delete(actor);return null;}
 const p=actor.root.position;let state=STAND_RECOVERY.get(actor);
 if(!state||state.mount!==mount||state.step!==movementStep&&state.step!==movementStep-1||Math.hypot(p.x-state.x,p.z-state.z)>.08||Math.abs(p.y-state.y)>.08){
  state={mount,step:-1,wait:0,x:p.x,y:p.y,z:p.z};STAND_RECOVERY.set(actor,state);
 }
 if(state.step!==movementStep){state.wait+=movementDt;state.step=movementStep;}
 if(state.wait+EPS<BODY_WAIT)return null;
 cancelActorStandIntent(actor);return staticPoint;
}

function bodyRecovery(actor,from,dx,dz,radius,{doors,colliders,navigation,npcs,playerPosition},local){
 const length=Math.hypot(dx,dz);
 let state=BODY_RECOVERY.get(actor);
 if(!movementDt||length<EPS){BODY_RECOVERY.delete(actor);return null;}
 if(state?.step===movementStep)return state;
 if(!state||state.step!==movementStep-1||Math.abs(from.y-state.y)>.5||dx/length*state.ux+dz/length*state.uz<.25){
  state={step:movementStep,wait:0,x:from.x,y:from.y,z:from.z,ux:dx/length,uz:dz/length};
  BODY_RECOVERY.set(actor,state);
 }
 state.step=movementStep;
 if(state.escapeUntil&&(movementTime>=state.escapeUntil-EPS||state.remaining<EPS)){
  state.escapeUntil=0;state.wait=0;
 }
 // Probe only a local body encounter. Static geometry, support and live leaves
 // must permit useful movement before a character can be blamed for the stop.
 // The prior actual result also catches a wall slide that meets a body even
 // when the original diagonal intent was clear, without probing every walker.
 let blocked=false,staticBlocked=false;
 if(local.blocker||state.lastBodyBlocked||state.escapeUntil||state.wait>0){
  const candidate={...from},leaf=doors?.constrainMove?doors.constrainMove(from,dx,dz,radius):{dx,dz};
  moveWithCollision(candidate,leaf.dx,leaf.dz,colliders,radius,navigation);
  const allowed=doors?.constrainMove?doors.constrainMove(from,candidate.x-from.x,candidate.z-from.z,radius):{dx:candidate.x-from.x,dz:candidate.z-from.z};
  staticBlocked=allowed.dx*dx+allowed.dz*dz<length*length*.25;
  if(!staticBlocked)blocked=!!constrainActorMove(actor,from,allowed.dx,allowed.dz,radius,npcs,playerPosition,candidate.y).blocker;
 }
 if(!blocked){
  // A local turnout can make one tiny forward trial look clear, then put the
  // walker straight back beside the same body. Keep that short gap in the
  // encounter until there is real net progress or a sustained clear route.
  // An active escape still ends immediately once ordinary collision is clear.
  state.clearTime=(state.clearTime||0)+movementDt;
  if(!staticBlocked&&!state.escapeUntil&&state.wait>0&&state.clearTime<BODY_CLEAR_GRACE&&(from.x-state.x)*state.ux+(from.z-state.z)*state.uz<ROUTE_PROGRESS){state.wait+=movementDt;return state;}
  state.wait=0;state.escapeUntil=0;state.x=from.x;state.y=from.y;state.z=from.z;state.ux=dx/length;state.uz=dz/length;return state;
 }
 state.clearTime=0;
 if(!state.escapeUntil){
  // Net forward progress resets waiting. Tiny sideways yielding/backtracking
  // does not, even when those trials briefly set actor.walking=true.
  if((from.x-state.x)*state.ux+(from.z-state.z)*state.uz>=ROUTE_PROGRESS){state.wait=0;state.x=from.x;state.y=from.y;state.z=from.z;}
  state.wait+=movementDt;
  if(state.wait+EPS>=BODY_WAIT){state.escapeUntil=movementTime+BODY_ESCAPE_SECONDS;state.remaining=BODY_ESCAPE_DISTANCE;state.wait=0;}
 }
 return state;
}
const actorId=n=>n.station?.id||'';

export function constrainActorMove(actor,from,dx,dz,radius,npcs,playerPosition,endY=from.y){
 const length2=dx*dx+dz*dz;
 let fraction=1,blocker=null;
 if(length2<EPS*EPS)return {dx,dz,blocker};
 const test=(other,p,otherRadius)=>{
  if(!p||other===actor||p===actor.root.position)return;
  const height=actor.bodyHeight??PERSON_HEIGHT,otherHeight=other?.bodyHeight??PERSON_HEIGHT;
  if(Math.min(from.y,endY)>=p.y+otherHeight-EPS||Math.max(from.y,endY)+height<=p.y+EPS)return;
  const r=radius+otherRadius,ox=from.x-p.x,oz=from.z-p.z;
  if(Math.abs(ox)>Math.abs(dx)+r||Math.abs(oz)>Math.abs(dz)+r)return;
  const projection=ox*dx+oz*dz,c=ox*ox+oz*oz-r*r;
  // A restored overlap may separate but cannot move farther into a body.
  const initialOverlap=from.y<p.y+otherHeight-EPS&&from.y+height>p.y+EPS;
  if(c<0&&projection>=0&&initialOverlap)return;
  const disc=projection*projection-length2*c;
  if(disc<=0||projection>=0&&c>=0)return;
  let contact=Math.max(0,(-projection-Math.sqrt(disc))/length2),exit=Math.min(1,(-projection+Math.sqrt(disc))/length2);
  // Intersect horizontal and vertical sweep intervals. Rising into a body
  // after passing its horizontal edge must still stop at the actual contact.
  const dy=endY-from.y;
  if(Math.abs(dy)>EPS){const low=(p.y-height+EPS-from.y)/dy,high=(p.y+otherHeight-EPS-from.y)/dy;contact=Math.max(contact,Math.min(low,high));exit=Math.min(exit,Math.max(low,high));}
  else if(!initialOverlap)return;
  if(contact>=exit||contact>1)return;
  const safe=Math.max(0,contact-.001/Math.sqrt(length2));
  if(safe<fraction){fraction=safe;blocker={actor:other,position:p};}
 };
 for(const other of npcs)test(other,other.root.position,other.collisionRadius??.25);
 test(null,playerPosition,.34);
 return {dx:dx*fraction,dz:dz*fraction,blocker};
}

export function moveActorWithCollision(actor,dx,dz,radius,context){
 const {doors,colliders,navigation,npcs,playerPosition}=context,p=actor.root.position,before={x:p.x,y:p.y,z:p.z};
 let local=constrainActorMove(actor,before,dx,dz,radius,npcs,playerPosition);
 const recovery=bodyRecovery(actor,before,dx,dz,radius,context,local),bodyBypassed=!!(recovery?.escapeUntil&&movementTime<recovery.escapeUntil-EPS&&recovery.remaining>EPS);
 if(context.probeOnly)return {bodyBlocked:!!local.blocker,bodyBypassed};
 if(bodyBypassed){const scale=Math.min(1,recovery.remaining/Math.max(EPS,Math.hypot(dx,dz)));local={dx:dx*scale,dz:dz*scale};}
 let bodyBlocked=!!local.blocker;
 const result=()=>{if(recovery)recovery.lastBodyBlocked=bodyBlocked;if(bodyBypassed)recovery.remaining=Math.max(0,recovery.remaining-Math.hypot(p.x-before.x,p.z-before.z));return {bodyBlocked,bodyBypassed};};
 const leaf=doors?.constrainMove?doors.constrainMove(before,local.dx,local.dz,radius):local;
 moveWithCollision(p,leaf.dx,leaf.dz,colliders,radius,navigation);
 // Wall sliding can change direction and support height. Recheck the actual
 // displacement against bodies and live leaves. A shortened retry must itself
 // remain safe; otherwise wait at the original position for this single step.
 for(let attempt=0;attempt<2;attempt++){
  const movedX=p.x-before.x,movedZ=p.z-before.z,allowed=doors?.constrainMove?doors.constrainMove(before,movedX,movedZ,radius):{dx:movedX,dz:movedZ};
  const actual=bodyBypassed?allowed:constrainActorMove(actor,before,allowed.dx,allowed.dz,radius,npcs,playerPosition,p.y);
  bodyBlocked||=!!actual.blocker;
  if(Math.abs(actual.dx-movedX)<1e-6&&Math.abs(actual.dz-movedZ)<1e-6)return result();
  Object.assign(p,before);
  if(attempt===0)moveWithCollision(p,actual.dx,actual.dz,colliders,radius,navigation);
 }
 return result();
}

// Jobs supply their existing route and timing; this is the same route executor
// for a passerby, an official and a palace resident. Doors retain ownership of
// opening/staging, while moveActor retains all real wall/leaf/body collisions.
export function followActorRoute(actor,dt,{route=actor.route,doors,moveActor,npcs=[],playerPosition=null,radius=.25,speedScale=.82,arrivalTolerance=.025,resolveWaypoint=step=>step.waypoint}={}){
 actor.walking=false;
 const step=doors.routeStep(route,actor.root.position,arrivalTolerance);
 if(step.waiting||!step.waypoint){TURNOUT.delete(actor);return {...step,blocked:false};}
 const from=actor.root.position,p=resolveWaypoint(step),dx=p.x-from.x,dz=p.z-from.z,d=Math.hypot(dx,dz);
 if(d<EPS)return {...step,blocked:false};
 const amount=Math.min(d,Math.max(0,dt)*(actor.locomotion?.walkSpeed||1.3)*speedScale),ux=dx/d,uz=dz/d;
 if(amount<EPS)return {...step,blocked:false};
 const ahead=Math.min(d,amount+.10),body=constrainActorMove(actor,from,ux*ahead,uz*ahead,radius,npcs,playerPosition).blocker;
 let movement=null;
 const move=(x,z,minForwardFraction=0)=>{
  const beforeX=from.x,beforeY=from.y,beforeZ=from.z;
  movement=moveActor(actor,x,z,radius);
  // A wall can slide a requested side-step by only a tiny tangential amount.
  // That does not make this side available: discard the trial and try the
  // other side, rather than slowly scraping along a desk forever.
  if(minForwardFraction&&(from.x-beforeX)*x+(from.z-beforeZ)*z<(x*x+z*z)*minForwardFraction){
   from.x=beforeX;from.y=beforeY;from.z=beforeZ;actor.walking=false;return false;
  }
  actor.walking=(from.x-beforeX)**2+(from.y-beforeY)**2+(from.z-beforeZ)**2>1e-9;
  if(actor.walking)actor.root.rotation.y=Math.atan2(from.x-beforeX,from.z-beforeZ);
  return actor.walking;
 };
 if(body){
  // Probe this route's forward intent once, without moving. Yield trials stay
  // collision checked but cannot reset or double-count the same step's wait.
  if(moveActor.probeBodyRecovery?.(actor,ux*ahead,uz*ahead,radius)?.bodyBypassed){
   TURNOUT.delete(actor);move(ux*amount,uz*amount);
   return {...step,waiting:false,blocked:!actor.walking,travel:amount,bodyBypassed:!!movement?.bodyBypassed};
  }
  if(step.phase==='walking')doors.rejoinAroundBody?.(route,from,body.position,radius+(body.actor?.collisionRadius??(body.actor ? .25 : .34)));
  const other=body.actor,sameDirection=other?.walking&&!TURNOUT.has(other)&&Math.sin(other.root.rotation.y)*ux+Math.cos(other.root.rotation.y)*uz>.35;
  // Follow a moving queue. In a crossing, one actor starts yielding and
  // the other can also make room locally; no role owns an entire corridor.
  if(!sameDirection&&(!other?.walking||TURNOUT.has(other)||actorId(actor)>actorId(other))){
   let turn=TURNOUT.get(actor);
   if(!turn||turn.route!==route||turn.position!==body.position){turn={route,position:body.position,sign:1,ux,uz,clearance:radius+(body.actor?.collisionRadius??(body.actor ? .25 : .34))+.1};TURNOUT.set(actor,turn);}
   let bodyClosesSide=false;
   for(const sign of [turn.sign,-turn.sign]){
    const sx=turn.uz*amount*sign,sz=-turn.ux*amount*sign;
    if(constrainActorMove(actor,from,sx,sz,radius,npcs,playerPosition).blocker){bodyClosesSide=true;if(turn.started&&sign===turn.sign)break;continue;}
    if(move(sx,sz,.25)){turn.sign=sign;turn.started=true;break;}
   }
   // At exact body contact, the open side can initially point into its circle
   // while a desk closes the other side. A bounded collision-checked retreat
   // creates turning room independently of frame rate, without backing down
   // the route indefinitely or reversing the already chosen passing side.
   // Treat the 15cm cap with the movement epsilon: a floating-point crumb
   // must not issue a zero-intent trial that erases this encounter's wait.
   if(!actor.walking&&bodyClosesSide&&(turn.backedOff||0)<.15-EPS){const back=Math.min(amount,.15-(turn.backedOff||0)),x=from.x,z=from.z;move(-turn.ux*back,-turn.uz*back,.25);turn.backedOff=(turn.backedOff||0)+Math.hypot(from.x-x,from.z-z);}
  }
  return {...step,waiting:true,blocked:false,body:other?.station?.id||'player',yielding:actor.walking,travel:amount};
 }
 const turn=TURNOUT.get(actor);
 // Keep the chosen side through this local encounter. A single clear forward
 // step is not proof that we have passed the body; resetting here oscillates
 // between a desk and the person standing beside it.
 if(turn&&(turn.route!==route||Math.hypot(turn.position.x-from.x,turn.position.z-from.z)>1.5||Math.abs(turn.position.y-from.y)>1.95||(turn.position.x-from.x)*turn.ux+(turn.position.z-from.z)*turn.uz< -turn.clearance))TURNOUT.delete(actor);
 move(ux*amount,uz*amount);
 return {...step,waiting:!!movement?.bodyBlocked&&!actor.walking,blocked:!actor.walking&&!movement?.bodyBlocked,travel:amount};
}
