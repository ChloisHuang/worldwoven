import {createTavernRole} from './china-tavern-role.js';
// Preserve the original NPC per-order contract. Player reception is salaried
// separately: its service evidence must never claim an eight-copper order wage.
export const SALON_RECEPTION_ROLE=Object.freeze({id:'cn-salon-reception',slotId:'cn-salon-reception-1',employer:'cn-yunlai-tavern',currency:'copper',amount:8,contractVersion:1,incumbentId:'cn-tavern-reception'});

export const PLAYER_SALON_RECEPTION_CONTRACT=Object.freeze({contractVersion:2,amount:0});
export const salonReceptionContractFor=holderId=>holderId===SALON_RECEPTION_ROLE.incumbentId?SALON_RECEPTION_ROLE:holderId==='player'?PLAYER_SALON_RECEPTION_CONTRACT:null;
const supported=id=>id===null||!!salonReceptionContractFor(id);

export function createSalonReceptionSlot({saved,resolveActor,getPlayer,isActorAlive,canAssign=()=>false,canRelease=()=>false,saveState}={}){
 const slot=createTavernRole({roleId:SALON_RECEPTION_ROLE.id,slotId:SALON_RECEPTION_ROLE.slotId,originalHolderId:SALON_RECEPTION_ROLE.incumbentId,errorName:'salon-reception',saved,resolveActor,getPlayer,isActorAlive,canAssign:(id,n)=>!!salonReceptionContractFor(id)&&canAssign(id,n),canRelease,saveState});
 return {state:slot.state,resolve:slot.resolve,get loadError(){return slot.loadError;},assign:(id,options)=>!supported(id)?{ok:false,code:'unsupported-reception-holder'}:slot.assign(id,options),prepareAssignment:(id,options)=>!supported(id)?{ok:false,code:'unsupported-reception-holder'}:slot.prepareAssignment(id,options)};
}
