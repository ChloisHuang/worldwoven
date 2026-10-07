/** ST08 finite NPC childcare. The ledger is written only after arrival and an
 * uninterrupted eight seconds of care. Routes use the normal collision engine.
 */
import {followActorRoute} from './actor-navigation.js';
import {holdSocialActors,releaseSocialActors,socialHoldOwner} from './npc-social-ownership.js';
const point=p=>({x:p.x,y:p.y,z:p.z}),distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const idOf=a=>typeof a==='string'?a:a?.actorId||a?.station?.id;
export function createFamilyCare({ledger,getCountry=()=>undefined,getActor,isAvailable,planPath,moveActor,doors,getActors,getPlayer,getClock,notify=()=>{}}){
 const owner={familyCare:true},cooldown=new Map();let active=null,elapsed=0,scanAt=0,disposed=false;
 function validChild(row,day){return row?.alive&&Number.isFinite(row.ageYears)&&row.ageYears<18&&row.birthDay!==null&&row.birthDay!==undefined&&(row.lastCareDay===null||row.lastCareDay<day)&&row.caregiverId&&row.caregiverId!=='player';}
 function eligible(childId,held=false){
  const day=getClock().day,c=ledger.view(childId),a=c&&ledger.view(c.caregiverId),child=getActor(childId),parent=c&&getActor(c.caregiverId);
  if(!validChild(c,day)||!a?.alive||!Number.isFinite(a.ageYears)||a.ageYears<18||!child?.root||child.alive===false||!parent?.root||parent.alive===false||!isAvailable(c.caregiverId,{held}))return null;
  if(socialHoldOwner(childId))return null;
  if(c.country!==a.country||getCountry()&&c.country!==getCountry())return null;
  return {c,a,child,parent};
 }
 function release(retry=30){
  if(!active)return;const task=active;active=null;cooldown.set(task.childId,elapsed+retry);
  // Restore only this exact person, never a replacement occupying their ID.
  if(getActor(task.parentId)===task.parent){task.parent.route=task.route;task.parent.walking=task.parent.alive!==false&&task.walking;}
  releaseSocialActors(owner);
 }
 function routeToChild(parent,child){
  const cp=child.root.position,pp=parent.root.position;
  const planned=child.station?.familyCarePoints,targets=(Array.isArray(planned)&&planned.length?planned.map(([x,y,z])=>({x,y,z})):[[.85,0],[-.85,0],[0,.85],[0,-.85]].map(([x,z])=>({x:cp.x+x,y:cp.y,z:cp.z+z}))).sort((a,b)=>distance(a,pp)-distance(b,pp));
  const routes=[];for(const target of targets){let route;try{route=planPath(pp,target,parent.collisionRadius??.25);}catch{continue;}
   if(!Array.isArray(route))continue;
   if(route.length||distance(pp,target)<.15&&Math.abs(pp.y-target.y)<.2){let length=0,previous=pp;for(const p of route){length+=distance(previous,p);previous=p;}routes.push({target,route,length});}
  }return routes.sort((a,b)=>a.length-b.length)[0]||null;
 }
 function begin(childId){
  const e=eligible(childId);if(!e||socialHoldOwner(e.c.caregiverId))return false;
  const planned=routeToChild(e.parent,e.child);if(!planned){cooldown.set(childId,elapsed+30);return false;}
  if(!holdSocialActors([e.c.caregiverId],owner))return false;
  active={childId,parentId:e.c.caregiverId,parent:e.parent,child:e.child,route:e.parent.route,walking:e.parent.walking,target:planned.target,childStart:point(e.child.root.position),seconds:0,age:0,stalled:0,phase:'approach'};
  e.parent.route=planned.route;e.parent.walking=false;return true;
 }
 function update(dt,t){
  if(disposed)return;const step=Number.isFinite(dt)?Math.max(0,Math.min(dt,1)):0;elapsed+=step;
  if(!active){if(elapsed<scanAt)return;scanAt=elapsed+2;for(const c of ledger.children(getCountry()))if((cooldown.get(c.actorId)||0)<=elapsed&&validChild(c,getClock().day)&&begin(c.actorId))break;return;}
  const task=active,e=eligible(task.childId,true);task.age+=step;
  if(!e||e.c.caregiverId!==task.parentId||e.parent!==task.parent||e.child!==task.child||socialHoldOwner(task.parentId)!==owner||task.age>120||distance(e.child.root.position,task.childStart)>.35||Math.abs(e.child.root.position.y-task.childStart.y)>.2){release();return;}
  const p=e.parent.root.position,c=e.child.root.position;
  if(task.phase==='approach'){
   if(distance(p,task.target)<.16&&Math.abs(p.y-task.target.y)<.25){task.phase='care';task.seconds=0;e.parent.walking=false;e.parent.route=[];return;}
   if(!e.parent.route?.length){release();return;}
   const before=point(p);try{followActorRoute(e.parent,step,{doors,moveActor,npcs:getActors().filter(a=>a!==getPlayer()),playerPosition:getPlayer()?.root.position,radius:e.parent.collisionRadius??.25});}catch{release();return;}
   task.stalled=distance(before,p)<.001?task.stalled+step:0;if(task.stalled>18)release();return;
  }
  if(distance(p,c)>1.15||Math.abs(p.y-c.y)>.35){release();return;}
  e.parent.walking=false;e.parent.root.rotation.y=Math.atan2(c.x-p.x,c.z-p.z);task.seconds+=step;
  if(task.seconds>=8){let result;try{result=ledger.care(task.childId,task.parentId,getClock().day);}catch{}if(result?.ok)notify(`${e.a.name}已完成对${e.c.name}的当面照护。`);release(result?.ok?2:30);}
 }
 return {update,owns:actor=>!!active&&[active.parentId,active.childId].includes(idOf(actor)),pose:actor=>{
  const id=idOf(actor);if(!active||id!==active.parentId&&id!==active.childId)return null;
  return {walking:id===active.parentId&&active.phase==='approach'&&active.parent.walking===true,action:id===active.parentId&&active.phase==='care'?'staff-rest':null};
 },dispose(){if(disposed)return;disposed=true;release(0);cooldown.clear();}};
}
