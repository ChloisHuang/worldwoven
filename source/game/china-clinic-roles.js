import {createTavernRole} from './china-tavern-role.js';
import {PHARMACY_ASSISTANT_ROLE,CLINIC_PHYSICIAN_ROLE} from './formal-careers.js';
export const CLINIC_ROLES=Object.freeze(Object.fromEntries([['physician',CLINIC_PHYSICIAN_ROLE],['assistant',PHARMACY_ASSISTANT_ROLE]].map(([key,r])=>[key,Object.freeze({roleId:r.id,slotId:r.slotId,originalHolderId:r.incumbentId})])));
// Persistent job slots, not personal identities. No automatic succession,
// income, movement, lifespan simulation or authority over another controller.
export function createClinicRoles({saved=null,resolveActor=()=>null,getPlayer=()=>null,isActorAlive=n=>n?.alive!==false,getTenureRoleId=()=>null,canAssign=()=>false,canRelease=()=>false,saveState=()=>false}={}){
 const roles={},snapshot=()=>({version:1,physician:roles.physician.state(),assistant:roles.assistant.state()});
 for(const[key,definition]of Object.entries(CLINIC_ROLES)){
  const other=key==='physician'?'assistant':'physician';
  roles[key]=createTavernRole({...definition,errorName:'clinic-'+key,saved:saved==null?null:saved.version===1?saved[key]??{}:{},resolveActor,getPlayer,isActorAlive,
   canAssign:(id,n)=>getTenureRoleId()!==definition.roleId&&id!=='player'&&roles[other]?.state().holderId!==id&&canAssign(key,id,n),
   canRelease:(from,to)=>canRelease(key,from,to),saveState:next=>saveState({...snapshot(),[key]:next})});
 }
 function resolve(key){const role=roles[key],definition=CLINIC_ROLES[key];if(!role)return null;
  if(getTenureRoleId()===definition.roleId){const actor=getPlayer(),alive=!!actor&&isActorAlive(actor)!==false;return {...role.state(),holderId:'player',actor,alive,isPlayer:true,available:alive,status:alive?'player':'unloaded',source:'formal-career',reliefActor:resolveActor(role.state().holderId)};}
  return {...role.resolve(),source:'clinic-assignment'};
 }
 return {state:snapshot,resolve,assign(key,id,options){if(!roles[key])return {ok:false,code:'unknown-role'};if(getTenureRoleId()===CLINIC_ROLES[key].roleId)return {ok:false,code:'player-tenure-owns-role'};if(id==='player')return {ok:false,code:'use-formal-career'};return roles[key].assign(id,options);}};
}
export function clinicHandoffBoundary(key,{order=null,workAction=null,physicianAction=false,meeting=false}={}){
 if(!CLINIC_ROLES[key])return {ok:false,blockers:[{kind:'unknown-role'}]};const blockers=[];
 // The original physician/assistant pair owns the whole unfinished numbered
 // chain. Even a pre-preparation paper must not silently move to a successor.
 if(order&&!['complete','cancelled'].includes(order.stage))blockers.push({kind:'original-patient-order',orderId:order.id,stage:order.stage,cardId:order.cardId,packetId:order.packetId||null,holderId:order.staffPeople?.[key]||null});
 if(workAction||physicianAction)blockers.push({kind:'manual-player-action'});
 if(meeting)blockers.push({kind:'pending-face-to-face-meeting'});
 return {ok:blockers.length===0,blockers};
}
