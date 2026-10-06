import {createTavernRole,personId} from './china-tavern-role.js';
import {PALACE_GUARD_ROLE as ROLE} from './formal-careers.js';

// The patrol appointment is separate from the range reviewer's existing role.
// Assignment changes neither person's money, identity nor physical location.
export function guardHandoffBoundary({heldBow=false,flyingArrow=false,targetArrows=false,playerLesson=false,playerDuty=false,meeting=false,personalTrip=false,atHandoff=false}={}) {
 const blockers=[];
 for(const [kind,present] of Object.entries({heldBow,flyingArrow,targetArrows,playerLesson,playerDuty,meeting,personalTrip}))if(present)blockers.push({kind});
 if(!atHandoff)blockers.push({kind:'physical-handoff-pending'});
 return {ok:!blockers.length,blockers};
}
export function createChinaGuardSlot({saved,resolveActor,getPlayer,isActorAlive,canAssign=()=>false,canRelease=()=>false,isPlayerHired=()=>false,saveState}={}) {
 const slot=createTavernRole({roleId:ROLE.id,slotId:ROLE.slotId,originalHolderId:ROLE.incumbentId,errorName:'guard',saved,resolveActor,getPlayer,isActorAlive,
  canAssign:(id,actor)=>id!=='player'&&id!==ROLE.supervisorId&&canAssign(id,actor),canRelease,saveState});
 return {state:slot.state,resolve:slot.resolve,get loadError(){return slot.loadError;},assign(id,options){return isPlayerHired()?{ok:false,code:'player-tenure-owns-role'}:id==='player'?{ok:false,code:'use-formal-career'}:slot.assign(id,options);}};
}
// Read-only adapter. A loaded controller supplies an actual work sample, never
// a role label or elapsed wall-clock time. Zero/invalid samples earn nothing.
export function guardPatrolCoverage({assignment,actor,sample,playerDuty=false}={}) {
 if(playerDuty||!assignment||assignment.roleId!==ROLE.id||assignment.slotId!==ROLE.slotId||assignment.status!=='npc'||!assignment.alive||!assignment.available||assignment.actor!==actor||!actor||actor.alive===false||assignment.holderId!==personId(actor)||assignment.holderId===ROLE.supervisorId||!Number.isSafeInteger(assignment.revision)||assignment.revision<0)return [];
 if(!sample||sample.actorId!==assignment.holderId||!['patrol-travel','patrol-observe'].includes(sample.kind)||!Number.isFinite(sample.seconds)||sample.seconds<=0||sample.seconds>.25)return [];
 return [{roleId:ROLE.id,slotId:ROLE.slotId,actorId:assignment.holderId,holderRevision:assignment.revision,status:'npc',alive:true,available:true}];
}
