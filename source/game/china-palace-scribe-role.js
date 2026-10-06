import {createTavernRole} from './china-tavern-role.js';

// A bounded government work order, not pay for the time between orders.
// 8 is a game-design rate: below the existing 12-copper two-table piecework.
export const PALACE_SCRIBE_ROLE=Object.freeze({id:'cn-palace-scribe-piecework',slotId:'cn-palace-scribe-piecework-1',name:'宫苑原令拟稿',country:'china',currency:'copper',employer:'宫苑文书房',incumbentId:'cn-calligraphy',incumbentName:'Wen',amount:8,contractVersion:1});
export function createPalaceScribeSlot({saved,resolveActor,getPlayer,isActorAlive,canAssign=()=>false,canRelease=()=>false,saveState}={}){
 const slot=createTavernRole({roleId:PALACE_SCRIBE_ROLE.id,slotId:PALACE_SCRIBE_ROLE.slotId,originalHolderId:PALACE_SCRIBE_ROLE.incumbentId,errorName:'palace-scribe',saved,resolveActor,getPlayer,isActorAlive,canAssign:(id,n)=>id!=='player'&&canAssign(id,n),canRelease,saveState});
 return {state:slot.state,resolve:slot.resolve,get loadError(){return slot.loadError;},assign:(id,options)=>id==='player'?{ok:false,code:'npc-piecework-role'}:slot.assign(id,options)};
}
