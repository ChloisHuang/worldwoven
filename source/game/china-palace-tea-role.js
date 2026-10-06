import {createTavernRole} from './china-tavern-role.js';

// One original, physically completed service. This is not an idle wage or
// payment for the existing free conversations. The public needs gate stays off.
export const PALACE_TEA_ROLE=Object.freeze({id:'cn-palace-tea-service',slotId:'cn-palace-tea-service-1',name:'宫苑原单备茶',country:'china',currency:'copper',employer:'宫苑茶务',incumbentId:'cn-tea',incumbentName:'Lin',amount:8,contractVersion:1});
export function createPalaceTeaSlot({saved,resolveActor,getPlayer,isActorAlive,canAssign=()=>false,canRelease=()=>false,saveState}={}){
 const slot=createTavernRole({roleId:PALACE_TEA_ROLE.id,slotId:PALACE_TEA_ROLE.slotId,originalHolderId:PALACE_TEA_ROLE.incumbentId,errorName:'palace-tea',saved,resolveActor,getPlayer,isActorAlive,canAssign:(id,n)=>id!=='player'&&canAssign(id,n),canRelease,saveState});
 return {state:slot.state,resolve:slot.resolve,get loadError(){return slot.loadError;},assign:(id,options)=>id==='player'?{ok:false,code:'npc-piecework-role'}:slot.assign(id,options)};
}
