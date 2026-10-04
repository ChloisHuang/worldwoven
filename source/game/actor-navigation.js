import {moveWithCollision} from './navigation.js';

// Routes describe static passages. Other people only constrain this movement
// step, never the whole route or its distant destination.
const EPS=1e-6,PERSON_HEIGHT=1.95,TURNOUT=new WeakMap();
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

export function moveActorWithCollision(actor,dx,dz,radius,{doors,colliders,navigation,npcs,playerPosition}){
 const p=actor.root.position,before={x:p.x,y:p.y,z:p.z},local=constrainActorMove(actor,before,dx,dz,radius,npcs,playerPosition);
 let bodyBlocked=!!local.blocker;
 const leaf=doors?.constrainMove?doors.constrainMove(before,local.dx,local.dz,radius):local;
 moveWithCollision(p,leaf.dx,leaf.dz,colliders,radius,navigation);
 // Wall sliding can change direction and support height. Recheck the actual
 // displacement against bodies and live leaves. A shortened retry must itself
 // remain safe; otherwise wait at the original position for this single step.
 for(let attempt=0;attempt<2;attempt++){
  const movedX=p.x-before.x,movedZ=p.z-before.z,allowed=doors?.constrainMove?doors.constrainMove(before,movedX,movedZ,radius):{dx:movedX,dz:movedZ};
  const actual=constrainActorMove(actor,before,allowed.dx,allowed.dz,radius,npcs,playerPosition,p.y);
  bodyBlocked||=!!actual.blocker;
  if(Math.abs(actual.dx-movedX)<1e-6&&Math.abs(actual.dz-movedZ)<1e-6)return {bodyBlocked};
  Object.assign(p,before);
  if(attempt===0)moveWithCollision(p,actual.dx,actual.dz,colliders,radius,navigation);
 }
 return {bodyBlocked};
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
 const move=(x,z)=>{
  const beforeX=from.x,beforeY=from.y,beforeZ=from.z;
  movement=moveActor(actor,x,z,radius);
  actor.walking=(from.x-beforeX)**2+(from.y-beforeY)**2+(from.z-beforeZ)**2>1e-9;
  if(actor.walking)actor.root.rotation.y=Math.atan2(from.x-beforeX,from.z-beforeZ);
  return actor.walking;
 };
 if(body){
  const other=body.actor,sameDirection=other?.walking&&!TURNOUT.has(other)&&Math.sin(other.root.rotation.y)*ux+Math.cos(other.root.rotation.y)*uz>.35;
  // Follow a moving queue. In a crossing, one actor starts yielding and
  // the other can also make room locally; no role owns an entire corridor.
  if(!sameDirection&&(!other?.walking||TURNOUT.has(other)||actorId(actor)>actorId(other))){
   let turn=TURNOUT.get(actor);
   if(!turn||turn.route!==route||turn.position!==body.position){turn={route,position:body.position,sign:1,ux,uz};TURNOUT.set(actor,turn);}
   for(const sign of [turn.sign,-turn.sign]){
    const sx=turn.uz*amount*sign,sz=-turn.ux*amount*sign;
    if(constrainActorMove(actor,from,sx,sz,radius,npcs,playerPosition).blocker)continue;
    if(move(sx,sz)){turn.sign=sign;break;}
   }
  }
  return {...step,waiting:true,blocked:false,body:other?.station?.id||'player',yielding:actor.walking,travel:amount};
 }
 TURNOUT.delete(actor);
 move(ux*amount,uz*amount);
 return {...step,waiting:!!movement?.bodyBlocked&&!actor.walking,blocked:!actor.walking&&!movement?.bodyBlocked,travel:amount};
}
