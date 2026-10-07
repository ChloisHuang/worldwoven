import {isPlayerConversationHeld} from './npc-social-ownership.js';
const copy=structuredClone,reverse=path=>path.slice().reverse().map(p=>p.slice());
const phases=new Set(['draining','go-meal','meal','go-toilet','toilet','return']);
const valid=t=>!t||typeof t.actorId==='string'&&phases.has(t.phase)&&typeof t.meal==='boolean'&&Array.isArray(t.path)&&t.path.every(p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite))&&Number.isSafeInteger(t.index)&&t.index>=0&&t.index<=t.path.length;
// A physical trip borrows the existing paid meal and public cubicle controllers.
// Caller owns role/identity checks and routes; there is no teleport or relief NPC.
export function createNPCPersonalTrip({saved,getCandidates,getActor,canDepart,canStart=()=>true,canControl=()=>true,getReturnTarget,getExitRoute,getReturnRoute,economy,sharedNeeds,getTavern,getToilet,travel,pose,resetRoute,saveState=()=>false}){
 let task=saved?.version===1&&valid(saved.task)?copy(saved.task):null,time=0,next=0,disposed=false;
 const snapshot=()=>({version:1,task:copy(task)});
 function write(value){const old=task;task=value;try{const r=saveState(snapshot());if(r===false||r?.ok===false||r?.then){task=old;return false;}}catch{task=old;return false;}return true;}
 const actor=()=>task&&getActor(task.actorId);
 function enter(phase,path=[]){if(!write({...task,phase,path:copy(path),index:0}))return false;const n=actor();if(n)resetRoute(n);return true;}
 const home=(fromToilet=false)=>{const n=actor(),p=n.root.position,stairs=getTavern().publicToiletRoute();const exit=fromToilet&&p.y>.5&&p.x>15&&p.z>=0&&p.z<23?reverse(stairs.filter(q=>q[1]<=p.y+.3)):[];return enter('return',[...exit,...getReturnRoute(n)]);};
 function toilet(){const facility=getToilet(),stairs=getTavern()?.publicToiletRoute();return sharedNeeds.status(task.actorId)?.seekToilet&&facility?.publicIntent()&&stairs?.length&&facility.requestPublicActor(actor())?enter('go-toilet',[...stairs,facility.publicIntent().position]):home();}
 function cancelUnavailable(){const tavern=getTavern();if(tavern?.guestMeal(task.actorId)&&!tavern.cancelGuestMeal(task.actorId))return false;if(getToilet()?.abandonActor?.(task.actorId,'person-unavailable')===false)return false;return write(null);}
 return {snapshot,restore:s=>{if(s?.version!==1||!valid(s.task))return false;task=copy(s.task);return true;},owns:n=>!!task&&task.actorId===n?.station.id,away:id=>task?.actorId===id&&task.phase!=='draining',blocks:()=>!!task,canBorrowMeal:id=>task?.actorId===id&&['go-meal','meal'].includes(task.phase),state:()=>copy(task),
  label:()=>!task?null:task.phase==='draining'?(getToilet()?.publicQueuePosition?.(task.actorId)>0?'净室候位 · 在原岗等候':'忙完原单后歇班'):task.phase==='go-meal'?'去云来楼自费吃饭':task.phase==='meal'?'用本人餐款吃饭':['go-toilet','toilet'].includes(task.phase)?'前往公共净室':'日常事务结束 · 返回',
  update(dt,t){if(disposed)return;time+=Math.max(0,dt);
   if(!task&&time>=next){next=time+1;for(const n of getCandidates()){
    const id=n.station.id;if(n.alive===false||isPlayerConversationHeld(id)||!canStart(n))continue;
    // No physiological clock is started for an unfunded, not-yet-working person.
    if(!sharedNeeds.has(id)&&economy.hasIncome(id))sharedNeeds.register(id);
    const need=sharedNeeds.status(id),a=economy.account(id),meal=!!need?.seekMeal&&(a?.cash||0)+(a?.bank||0)>=6;
    if((meal||need?.seekToilet)&&getTavern()?.publicToiletRoute()?.length&&getToilet()?.publicIntent()&&write({actorId:id,phase:'draining',meal,path:[],index:0}))break;
   }}
   if(!task)return;const n=actor();if(!n||n.alive===false){cancelUnavailable();return;}
   // A temporary nearby talk is not a lost job/person binding. Keep the
   // exact prepaid meal, cubicle, route and return phase until it ends.
   if(isPlayerConversationHeld(task.actorId)){n.walking=false;return;}
   if(!canControl(n)){cancelUnavailable();return;}
   const tavern=getTavern(),facility=getToilet(),lease=tavern?.guestMeal(task.actorId);
   if(lease&&task.phase!=='meal'&&!enter('meal'))return;
   if(task.phase==='draining'){if(!canDepart(n))return;if(task.meal)enter('go-meal',getExitRoute(n));else {if(!facility.ownsActor(n)&&!facility.requestPublicActor(n)){n.walking=false;return;}enter('go-toilet',[...getExitRoute(n),...tavern.publicToiletRoute(),facility.publicIntent().position]);}}
   // Old late-admission saves may already be on the stair/at the door.
   // Reclaim a real slot or physically return, never wait in its approach.
   if(task.phase==='go-toilet'&&facility.actorPose(n)&&!enter('toilet'))return;
   if(task.phase==='go-toilet'&&!facility.ownsActor(n)&&!facility.requestPublicActor(n)){home(true);return;}
   if(task.phase==='meal'){if(!lease)toilet();return;}
   if(task.phase==='toilet'){if(!facility.ownsActor(n)){home(true);return;}facility.updateActor(n,dt,{travel:(p,d)=>travel(n,p,d)});pose(n,t,facility.actorPose(n));return;}
   if(task.index<task.path.length){if(travel(n,task.path[task.index],dt)){const nextTask={...task,index:task.index+1};write(nextTask);}pose(n,t,null);if(task.index<task.path.length)return;}
   if(task.phase==='go-meal'){if(tavern.registerGuestPerson(task.actorId)&&tavern.requestGuestMeal(task.actorId))enter('meal');else{toilet();next=time+12;}}
   else if(task.phase==='go-toilet'){if(facility.ownsActor(n))enter('toilet');else home(true);}
   else if(task.phase==='return'){const target=getReturnTarget(n),p=n.root.position;if(Math.hypot(p.x-target[0],p.z-target[2])>.15||Math.abs(p.y-target[1])>.3){enter('return',getReturnRoute(n));}else if(write(null)){resetRoute(n);next=time+4;}}
  },dispose({suspend=false}={}){disposed=true;if(!suspend&&task)cancelUnavailable();}
 };
}
