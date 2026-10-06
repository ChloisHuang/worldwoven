import {createTavernRole} from './china-tavern-role.js';

export const TAVERN_KITCHEN_ROLES=Object.freeze({
 chef:Object.freeze({roleId:'cn-tavern-chef',slotId:'cn-tavern-chef-rotation-1',originalHolderId:'cn-tavern-cook'}),
 assistant:Object.freeze({roleId:'cn-tavern-steward',slotId:'cn-tavern-steward-1',originalHolderId:'cn-tavern-assistant'})
});
// An explicit assignment seam, sharing the host's save/revision contract. The
// player career remains authoritative while held, including off-duty periods.
// This does not select successors, grant funds, or enroll physiological needs.
export function createTavernKitchenRoles({saved=null,resolveActor=()=>null,getPlayer=()=>null,isActorAlive=n=>n?.alive!==false,getTenureRoleId=()=>null,canAssign=()=>false,canRelease=()=>({ok:false}),saveState=()=>true}={}){
 const roles={};let initial=saved;
 // Only a completely absent legacy section receives original holders. A partial
 // section must fail closed rather than silently repopulating a vacated job.
 const snapshot=()=>({version:1,chef:roles.chef.state(),assistant:roles.assistant.state()});
 for(const [key,definition]of Object.entries(TAVERN_KITCHEN_ROLES)){
  const other=key==='chef'?'assistant':'chef';
  roles[key]=createTavernRole({...definition,errorName:key,saved:initial==null?null:initial.version===1?initial[key]??{}:{},resolveActor,getPlayer,isActorAlive,
   canAssign:(id,n)=>getTenureRoleId()!==definition.roleId&&id!=='player'&&roles[other]?.state().holderId!==id&&canAssign(key,id,n),
   canRelease:(from,to)=>canRelease(key,from,to),
   saveState:next=>saveState({...snapshot(),[key]:next})});
 }
 function resolve(key){const definition=TAVERN_KITCHEN_ROLES[key],role=roles[key];if(!role)return null;
  if(getTenureRoleId()===definition.roleId){const actor=getPlayer(),alive=!!actor&&isActorAlive(actor)!==false;return {...role.state(),holderId:'player',actor,alive,isPlayer:true,available:alive,status:alive?'player':'unloaded',source:'formal-career',reliefActor:resolveActor(role.state().holderId)};}
  return {...role.resolve(),source:'kitchen-assignment'};
 }
 function assign(key,id,options){if(!roles[key])return {ok:false,code:'unknown-role'};if(getTenureRoleId()===TAVERN_KITCHEN_ROLES[key].roleId)return {ok:false,code:'player-tenure-owns-role'};if(id==='player')return {ok:false,code:'use-formal-career'};return roles[key].assign(id,options);}
 return {state:snapshot,resolve,assign};
}

// A queued paid ticket can safely wait for the next holder. A real tray or an
// unfinished physical action cannot change hands just because a slot changed.
// Reads only: the caller must drain these actions through the ordinary scene.
export function kitchenHandoffBoundary(role,{orders=[],phases=[],activity=null,heldTrayId=null}={}){
 if(!TAVERN_KITCHEN_ROLES[role])return {ok:false,blockers:[{kind:'unknown-role'}]};
 const timers=new Map(phases),blockers=[];
 for(const order of orders){
  const held=role==='chef'?order.holder==='cook':order.holder==='assistant';
  const inProgress=(timers.get(order.id)||0)>0&&(role==='chef'?['paid','preparing','prepared','heating','cooked'].includes(order.stage):['pass','carrying','wrong','dirty','return','wash'].includes(order.stage));
  if(held||inProgress)blockers.push({kind:held?'held-item':'physical-action',orderId:order.id,stage:order.stage});
 }
 if(role==='assistant')for(const [id,elapsed]of timers)if(elapsed>0&&(id.startsWith('clean-')||id.startsWith('clean-room-')))blockers.push({kind:'cleaning',actionId:id});
 if(activity&&(role==='chef'?['prep','heat','pass']:['pickup','deliver','recover','clear','wash','clean-table','clean-room']).includes(activity.kind))blockers.push({kind:'player-action',orderId:activity.orderId||null});
 if(role==='assistant'&&heldTrayId&&!blockers.some(b=>b.orderId===heldTrayId))blockers.push({kind:'held-item',orderId:heldTrayId});
 return {ok:blockers.length===0,blockers};
}
