import {createTavernRole} from './china-tavern-role.js';

// A bounded government work order, not pay for the time between orders.
// 12 is a reversible game-design rate for the longer original courier chain.
export const PALACE_HERALD_ROLE=Object.freeze({id:'cn-palace-herald-piecework',slotId:'cn-palace-herald-piecework-1',name:'宫苑原令传达',country:'china',currency:'copper',employer:'宫苑文书房',incumbentId:'cn-palace-herald',incumbentName:'沈序',amount:12,contractVersion:1});
export function createPalaceHeraldSlot({saved,resolveActor,getPlayer,isActorAlive,canAssign=()=>false,canRelease=()=>false,saveState}={}){
 const slot=createTavernRole({roleId:PALACE_HERALD_ROLE.id,slotId:PALACE_HERALD_ROLE.slotId,originalHolderId:PALACE_HERALD_ROLE.incumbentId,errorName:'palace-herald',saved,resolveActor,getPlayer,isActorAlive,canAssign:(id,n)=>id!=='player'&&canAssign(id,n),canRelease,saveState});
 return {state:slot.state,resolve:slot.resolve,get loadError(){return slot.loadError;},assign:(id,options)=>id==='player'?{ok:false,code:'npc-piecework-role'}:slot.assign(id,options)};
}
