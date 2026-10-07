import {isPlayerConversationHeld} from './npc-social-ownership.js';
import {CHINA_CLINIC as C} from './china-clinic.js';
import {TAVERN_DISHES} from './china-tavern-kitchen.js';
const copy=structuredClone,reverse=path=>path.slice().reverse().map(p=>p.slice());
const roles=['physician','assistant'];
const corridor=[[20.7,.215,-21.3],[14,.115,-21.3],[14,.115,8.8],[16.9,.215,9.1]];
const upper=[[20.7,4.015,-24.7],[20,4.015,-25.5],[19.975,4.015,-25.7],[19.975,2.115,-31.8],[17.575,2.115,-31.8],[17.575,.215,-25.7]];
const phases=new Set(['draining','go-meal','meal','go-toilet','toilet','return']);
// One personal trip borrows the existing meal and public cubicle controllers.
// This does not invent relief, relocate bodies, or reassign a clinic job.
export function createClinicNeeds({getHolder,getActor,canDepart,sharedNeeds,economy,getTavern,getToilet,travel,pose,resetRoute,saveState=()=>false,saved={},enableEnrollment=false}){
 let task=saved?.version===1&&saved.task?copy(saved.task):null,time=0,nextDecision=0,nextEnrollment=0,disposed=false,lastReason=null;
 if(task&&(!phases.has(task.phase)||!roles.includes(task.role)||!/^cn-[a-z0-9-]{1,60}$/.test(task.actorId)||!Array.isArray(task.path)||task.path.some(p=>!Array.isArray(p)||p.length!==3||!p.every(Number.isFinite))||!Number.isSafeInteger(task.index)||task.index<0||task.index>task.path.length))task=null;
 const snapshot=()=>({version:1,task:task?copy(task):null});
 function restore(state){const row=state?.version===1?state.task:null;if(row&&(!phases.has(row.phase)||!roles.includes(row.role)||!/^cn-[a-z0-9-]{1,60}$/.test(row.actorId)||!Array.isArray(row.path)||row.path.some(p=>!Array.isArray(p)||p.length!==3||!p.every(Number.isFinite))||!Number.isSafeInteger(row.index)||row.index<0||row.index>row.path.length))return false;task=row?copy(row):null;return true;}
 const actor=()=>task&&getActor(task.actorId),currentRole=()=>task&&roles.find(role=>getHolder(role)?.holderId===task.actorId&&getHolder(role)?.status==='npc'),current=()=>!!currentRole();
 function write(next){const before=task;task=next;try{const r=saveState(snapshot());if(r===false||r?.ok===false||r?.then){task=before;return false;}}catch{task=before;return false;}return true;}
 function enter(phase,path=[]){if(!task)return false;const n=actor();if(!write({...task,phase,path:path.map(p=>p.slice()),index:0}))return false;if(n)resetRoute(n);return true;}
 const exitRoute=role=>[...(role==='physician'?upper:[]),...corridor];
 const returnTarget=()=>{const role=currentRole()||task.role;return current()?(role==='physician'?C.points.doctor:C.points.assistant):role==='physician'?[24.6,4.015,-24.3]:[22.1,.215,-24.75];};
 function returnPath(){const role=currentRole()||task.role;return [...reverse(corridor),...(role==='physician'?reverse(upper):[]),returnTarget()];}
 function returnHome(fromToilet=false){const stairs=getTavern()?.publicToiletRoute?.()||[],p=actor().root.position,exit=fromToilet&&p.y>.5&&p.x>15&&p.z>=0&&p.z<23?reverse(stairs.filter(q=>q[1]<=p.y+.3)):[];return enter('return',[...exit,...returnPath()]);}
 function advance(n,dt){if(task.index>=task.path.length)return true;if(travel(n,task.path[task.index],dt)){task.index++;saveState(snapshot());}return task.index>=task.path.length;}
 function goToilet(){const need=sharedNeeds?.status(task.actorId),stairs=getTavern()?.publicToiletRoute?.(),facility=getToilet();if(!need?.seekToilet||!stairs?.length||!facility?.publicIntent()||!facility.requestPublicActor(actor()))return returnHome();return enter('go-toilet',[...stairs,facility.publicIntent().position]);}
 function cleanupUnavailable(){const tavern=getTavern(),facility=getToilet();if(tavern?.clinicMeal(task.actorId)&&!tavern.cancelClinicMeal(task.actorId))return false;if(facility?.abandonActor?.(task.actorId,'clinic-person-unavailable')===false)return false;return write(null);}
 return {snapshot,restore,owns:n=>!!task&&task.actorId===n?.station?.id,away:id=>!!task&&task.actorId===id&&task.phase!=='draining',
  blocksAdmissions:()=>!!task&&!!current(),suspendsClinic:()=>!!task&&!!current()&&task.phase!=='draining',
  canBorrowMeal:id=>!!task&&task.actorId===id&&['go-meal','meal'].includes(task.phase),
  label:id=>task?.actorId!==id?null:task.phase==='draining'?(getToilet()?.publicQueuePosition?.(task.actorId)>0?'净室候位 · 在医馆等候':'忙完原患者后短暂歇班'):task.phase==='go-meal'?'沿公共通道去云来楼自费吃饭':task.phase==='meal'?'用本人餐款吃饭':task.phase==='go-toilet'||task.phase==='toilet'?'前往云来公共净室':'日常事务结束 · 返回医馆',
  update(dt,t){if(disposed)return;time+=Math.max(0,dt);
   if(enableEnrollment&&time>=nextEnrollment){nextEnrollment=time+1;for(const role of roles){const r=getHolder(role),n=r?.status==='npc'&&r.available&&r.alive&&getActor(r.holderId),p=role==='physician'?C.points.doctor:C.points.assistant;if(n&&n.alive!==false&&Math.hypot(n.root.position.x-p[0],n.root.position.z-p[2])<.35&&Math.abs(n.root.position.y-p[1])<.3&&!sharedNeeds?.has(r.holderId))sharedNeeds?.register(r.holderId);}}

   if(!task&&time>=nextDecision){nextDecision=time+1;
    for(const role of roles){const r=getHolder(role),n=r?.status==='npc'&&r.available&&r.alive&&getActor(r.holderId);if(!n||n.alive===false||isPlayerConversationHeld(n.station.id))continue;const need=sharedNeeds?.status(r.holderId),account=economy?.account(r.holderId),meal=!!need?.seekMeal&&(account?.cash||0)+(account?.bank||0)>=TAVERN_DISHES[0].price;
     if(!meal&&!need?.seekToilet){if(need?.seekMeal)lastReason='本人餐钱不足，先继续可行日常';continue;}
     if(!getTavern()?.publicToiletRoute?.()?.length||!getToilet()?.publicIntent())continue;
     if(write({actorId:r.holderId,role,holderRevision:r.revision,phase:'draining',meal,path:[],index:0}))break;
    }
   }
   if(!task)return;const n=actor();if(!n||n.alive===false){cleanupUnavailable();return;}
   if(isPlayerConversationHeld(task.actorId)){n.walking=false;return;}
   const tavern=getTavern(),facility=getToilet(),lease=tavern?.clinicMeal(task.actorId);
   if(lease&&task.phase!=='meal'){if(!enter('meal'))return;}
   if(task.phase==='draining'){
    if(!canDepart())return;
    if(task.meal){if(!enter('go-meal',exitRoute(task.role)))return;}
    else {if(!facility.ownsActor(n)&&!facility.requestPublicActor(n)){n.walking=false;return;}if(!enter('go-toilet',[...exitRoute(task.role),...tavern.publicToiletRoute(),facility.publicIntent().position]))return;}
   }
   if(task.phase==='go-toilet'&&facility.actorPose(n)&&!enter('toilet'))return;
   if(task.phase==='go-toilet'&&!facility.ownsActor(n)&&!facility.requestPublicActor(n)){returnHome(true);return;}
   if(task.phase==='meal'){if(!lease)goToilet();return;}
   if(task.phase==='toilet'){
    if(!facility?.ownsActor(n)){returnHome(true);return;}
    facility.updateActor(n,dt,{travel:(point,step)=>travel(n,point,step)});const mounted=facility.actorPose(n);pose(n,t,mounted);return;
   }
   const arrived=advance(n,dt);pose(n,t,null);if(!arrived)return;
   if(task.phase==='go-meal'){
    if(tavern.registerClinicPerson(task.actorId)&&tavern.requestClinicMeal(task.actorId)){enter('meal');return;}
    // No charge or fake satisfaction if funds, host, seat, or capacity changed.
    goToilet();nextDecision=time+12;
   }else if(task.phase==='go-toilet'){
    if(facility.ownsActor(n))enter('toilet');else returnHome(true);
   }else if(task.phase==='return'){const target=returnTarget(),p=n.root.position;if(Math.hypot(p.x-target[0],p.z-target[2])>.15||Math.abs(p.y-target[1])>.3){const cross=p.y>3&&target[1]<1?[...upper,corridor[0]]:p.y<1&&target[1]>3?reverse(upper):[];enter('return',[...cross,target]);}else if(write(null)){resetRoute(n);nextDecision=time+4;}}
  },
  state:()=>({task:task?copy(task):null,lastReason}),dispose({suspend=false}={}){disposed=true;if(!suspend&&task)cleanupUnavailable();}
 };
}
