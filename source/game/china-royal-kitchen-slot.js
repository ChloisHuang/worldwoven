import {createTavernRole} from './china-tavern-role.js';
import {ROYAL_KITCHEN_ROLE as R} from './china-royal-kitchen-role.js';
// A slot is not a wallet or a person. Assignment never moves a body, gives meal
// eligibility, transfers wages, or steals an unfinished original dish.
export function royalKitchenHandoffBoundary({orders=[],workAction=null,meeting=false,personalTrip=false,playerDuty=false}={}){
 const blockers=orders.filter(o=>!['consumed','cancelled'].includes(o.stage)).map(o=>({kind:'original-royal-order',orderId:o.id,mealId:o.mealId,workerId:o.workerId,stage:o.stage}));
 if(workAction)blockers.push({kind:'manual-player-action'});
 if(meeting)blockers.push({kind:'face-to-face-meeting'});
 if(personalTrip)blockers.push({kind:'personal-trip'});
 if(playerDuty)blockers.push({kind:'player-duty'});
 return {ok:blockers.length===0,blockers};
}
export function createRoyalKitchenSlot({saved,resolveActor,getPlayer,isActorAlive,canAssign=()=>false,canRelease=()=>false,isPlayerHired=()=>false,saveState}={}){
 const slot=createTavernRole({roleId:R.id,slotId:R.slotId,originalHolderId:R.incumbentId,errorName:'royal-kitchen',saved,resolveActor,getPlayer,isActorAlive,
  canAssign:(id,n)=>id!=='player'&&canAssign(id,n),canRelease,saveState});
 return {state:slot.state,resolve:slot.resolve,assign(id,options){return isPlayerHired()?{ok:false,code:'player-tenure-owns-role'}:id==='player'?{ok:false,code:'use-formal-career'}:slot.assign(id,options);},get loadError(){return slot.loadError;}};
}
