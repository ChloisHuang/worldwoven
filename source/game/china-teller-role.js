import {createTavernRole} from './china-tavern-role.js';
// New game-design government commission, not a claim about existing bank ownership.
// The fee buys a completed daily consistency report, including no-activity days.
export const TELLER_ROLE=Object.freeze({id:'cn-teller-auditor',slotId:'cn-teller-auditor-1',name:'钱庄日常账簿核验',country:'china',currency:'copper',employer:'承光结算署',incumbentId:'cn-money-house-teller',incumbentName:'陆昭',amount:8,contractVersion:1});
export function createTellerSlot({canAssign=()=>false,canRelease=()=>false,...options}={}){
 const slot=createTavernRole({...options,roleId:TELLER_ROLE.id,slotId:TELLER_ROLE.slotId,originalHolderId:TELLER_ROLE.incumbentId,errorName:'teller',canAssign:(id,n)=>id!=='player'&&canAssign(id,n),canRelease});
 return {...slot,assign:(id,o)=>id==='player'?{ok:false,code:'npc-teller-role'}:slot.assign(id,o)};
}
