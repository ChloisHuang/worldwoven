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
  if(c<0&&projection>=0)return;
  const disc=projection*projection-length2*c;
  if(disc<0||projection>=0)return;
  const contact=Math.max(0,(-projection-Math.sqrt(disc))/length2);
  if(contact>1)return;
  // A short step on a ramp uses the body's actual vertical interval too.
  const dy=endY-from.y,y=from.y+dy*contact;
  if(y>=p.y+otherHeight-EPS||y+height<=p.y+EPS)return;
  const safe=Math.max(0,contact-.001/Math.sqrt(length2));
  if(safe<fraction){fraction=safe;blocker={actor:other,position:p};}
 };
 for(const other of npcs)test(other,other.root.position,other.collisionRadius??.25);
 test(null,playerPosition,.34);
 return {dx:dx*fraction,dz:dz*fraction,blocker};
}

// Jobs supply their existing route and timing; this is the same route executor
// for a passerby, an official and a palace resident. Doors retain ownership of
// opening/staging, while moveActor retains all real wall/leaf/body collisions.
export function followActorRoute(actor,dt,{doors,moveActor,npcs=[],playerPosition=null,radius=.25,speedScale=.82,arrivalTolerance=.025}={}){
 actor.walking=false;
 const step=doors.routeStep(actor.route,actor.root.position,arrivalTolerance);
 if(step.waiting||!step.waypoint)return {...step,blocked:false};
 const from=actor.root.position,p=step.waypoint,dx=p.x-from.x,dz=p.z-from.z,d=Math.hypot(dx,dz);
 if(d<EPS)return {...step,blocked:false};
 const amount=Math.min(d,Math.max(0,dt)*actor.locomotion.walkSpeed*speedScale),ux=dx/d,uz=dz/d;
 if(amount<EPS)return {...step,blocked:false};
 const ahead=Math.min(d,amount+.10),body=constrainActorMove(actor,from,ux*ahead,uz*ahead,radius,npcs,playerPosition).blocker;
 const move=(x,z)=>{
  const beforeX=from.x,beforeY=from.y,beforeZ=from.z;
  moveActor(actor,x,z,radius);
  actor.walking=(from.x-beforeX)**2+(from.y-beforeY)**2+(from.z-beforeZ)**2>1e-9;
  if(actor.walking)actor.root.rotation.y=Math.atan2(from.x-beforeX,from.z-beforeZ);
  return actor.walking;
 };
 if(body){
  const other=body.actor,sameDirection=other?.walking&&Math.sin(other.root.rotation.y)*ux+Math.cos(other.root.rotation.y)*uz>.35;
  // Follow a moving queue. In a crossing, one deterministic actor yields;
  // a stationary person or player always gets a local attempt to pass around.
  if(!sameDirection&&(!other?.walking||actorId(actor)>actorId(other))){
   let turn=TURNOUT.get(actor);
   if(!turn||turn.route!==actor.route||turn.position!==body.position){turn={route:actor.route,position:body.position,sign:1};TURNOUT.set(actor,turn);}
   for(const sign of [turn.sign,-turn.sign]){
    const sx=uz*amount*sign,sz=-ux*amount*sign;
    if(constrainActorMove(actor,from,sx,sz,radius,npcs,playerPosition).blocker)continue;
    if(move(sx,sz)){turn.sign=sign;break;}
   }
  }
  return {...step,waiting:true,blocked:false,body:other?.station?.id||'player',yielding:actor.walking};
 }
 TURNOUT.delete(actor);
 move(ux*amount,uz*amount);
 return {...step,blocked:!actor.walking};
}
