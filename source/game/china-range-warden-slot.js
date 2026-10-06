import {createTavernRole,personId} from './china-tavern-role.js';

// An NPC security appointment, not another player vacancy or a royal meal title.
export const RANGE_WARDEN_ROLE=Object.freeze({id:'cn-range-warden-duty',slotId:'cn-range-warden-duty-1',name:'射圃巡察主管',country:'china',currency:'copper',employer:'宫城安防署',incumbentId:'cn-range-warden',incumbentName:'陆衡',wage:24,dutyWindow:Object.freeze({startHour:6,endHour:18})});
const ROLE=RANGE_WARDEN_ROLE;
export function createChinaRangeWardenSlot({saved,resolveActor,getPlayer,isActorAlive,canAssign=()=>false,canRelease=()=>false,getPatrolHolderId=()=>null,saveState}={}){
 const slot=createTavernRole({roleId:ROLE.id,slotId:ROLE.slotId,originalHolderId:ROLE.incumbentId,errorName:'range-warden',saved,resolveActor,getPlayer,isActorAlive,canAssign:(id,actor)=>id!=='player'&&id!==getPatrolHolderId()&&canAssign(id,actor),canRelease,saveState});
 return {state:slot.state,resolve:slot.resolve,get loadError(){return slot.loadError;},assign:(id,options)=>id==='player'?{ok:false,code:'npc-security-role'}:slot.assign(id,options)};
}
// Deliberately separate from guardPatrolCoverage: that adapter must continue
// rejecting the historical reviewer, including when handed the wrong account.
export function rangeWardenPatrolCoverage({assignment,actor,sample,dt=sample?.seconds,unavailable=false}={}){
 if(unavailable||!assignment||assignment.roleId!==ROLE.id||assignment.slotId!==ROLE.slotId||assignment.status!=='npc'||!assignment.alive||!assignment.available||assignment.actor!==actor||!actor||actor.alive===false||assignment.holderId!==personId(actor)||!Number.isSafeInteger(assignment.revision)||assignment.revision<0)return [];
 if(!sample||sample.actorId!==assignment.holderId||!['patrol-travel','patrol-observe'].includes(sample.kind)||!Number.isFinite(sample.seconds)||sample.seconds<=0||sample.seconds>.25||!Number.isFinite(dt)||Math.abs(sample.seconds-dt)>1e-7)return [];
 return [{roleId:ROLE.id,slotId:ROLE.slotId,actorId:assignment.holderId,holderRevision:assignment.revision,status:'npc',alive:true,available:true}];
}
