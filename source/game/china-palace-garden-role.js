import {createTavernRole} from './china-tavern-role.js';

// A bounded government work order, not pay for the time between orders.
// 8 is a game-design rate: below the existing 12-copper two-table piecework.
export const PALACE_GARDEN_ROLE=Object.freeze({id:'cn-palace-garden-piecework',slotId:'cn-palace-garden-piecework-1',name:'荷庭原令清扫',country:'china',currency:'copper',employer:'宫苑工务',incumbentId:'cn-garden',incumbentName:'Bo',amount:8,contractVersion:1});
export function createPalaceGardenSlot({saved,resolveActor,getPlayer,isActorAlive,canAssign=()=>false,canRelease=()=>false,saveState}={}){
 const slot=createTavernRole({roleId:PALACE_GARDEN_ROLE.id,slotId:PALACE_GARDEN_ROLE.slotId,originalHolderId:PALACE_GARDEN_ROLE.incumbentId,errorName:'palace-garden',saved,resolveActor,getPlayer,isActorAlive,canAssign,canRelease,saveState});
 return slot;
}
