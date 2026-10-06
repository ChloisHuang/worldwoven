import {createTavernRole} from './china-tavern-role.js';
// Dormant NPC contract. Existing free listening and player-poet commissions
// do not employ this role. A new original paid salon session freezes its terms.
export const SALON_RECEPTION_ROLE=Object.freeze({id:'cn-salon-reception',slotId:'cn-salon-reception-1',employer:'cn-yunlai-tavern',currency:'copper',amount:8,contractVersion:1,incumbentId:'cn-tavern-reception'});

export function createSalonReceptionSlot({saved,resolveActor,getPlayer,isActorAlive,canAssign=()=>false,canRelease=()=>false,saveState}={}){
 const slot=createTavernRole({roleId:SALON_RECEPTION_ROLE.id,slotId:SALON_RECEPTION_ROLE.slotId,originalHolderId:SALON_RECEPTION_ROLE.incumbentId,errorName:'salon-reception',saved,resolveActor,getPlayer,isActorAlive,canAssign:(id,n)=>id===SALON_RECEPTION_ROLE.incumbentId&&canAssign(id,n),canRelease,saveState});
 return {state:slot.state,resolve:slot.resolve,get loadError(){return slot.loadError;},assign:(id,options)=>id!==null&&id!==SALON_RECEPTION_ROLE.incumbentId?{ok:false,code:'unsupported-reception-holder'}:slot.assign(id,options)};
}
