import {createTavernRole} from './china-tavern-role.js';
// Game-design rate for six real, identified volumes; no wage for leisure reading.
export const ARCHIVE_ROLE=Object.freeze({id:'cn-archive-inspector',slotId:'cn-archive-inspector-1',name:'雅集楼馆藏巡检',country:'china',currency:'copper',employer:'宫苑藏书房',incumbentId:'cn-rest',incumbentName:'Lan',amount:8,contractVersion:2});
export function createArchiveSlot({canAssign=()=>false,canRelease=()=>false,...options}={}){
 const slot=createTavernRole({...options,roleId:ARCHIVE_ROLE.id,slotId:ARCHIVE_ROLE.slotId,originalHolderId:ARCHIVE_ROLE.incumbentId,errorName:'archive',canAssign:(id,n)=>id!=='player'&&canAssign(id,n),canRelease});
 return {...slot,assign:(id,o)=>id==='player'?{ok:false,code:'npc-archive-role'}:slot.assign(id,o)};
}
