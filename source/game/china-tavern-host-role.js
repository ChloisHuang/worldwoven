// Assignment is distinct from the individual, property owner and personal money.
// This is an explicit succession seam, not an aging/death or hiring simulator.
export const TAVERN_HOST_ROLE_ID='cn-tavern-host';
export const TAVERN_HOST_SLOT_ID='cn-tavern-host-rotation-1';
export const ORIGINAL_TAVERN_HOST_ID='cn-tavern-host';
export const personId=actor=>actor?.actorId||actor?.station?.id||actor?.id||null;
const id=value=>typeof value==='string'&&/^[a-z][a-z0-9-]{0,63}$/.test(value);
export function createTavernHostRole({saved=null,resolveActor=()=>null,getPlayer=()=>null,isActorAlive=actor=>actor?.alive!==false,canAssign=()=>true,saveState=()=>true}={}){
 const initial={version:1,roleId:TAVERN_HOST_ROLE_ID,slotId:TAVERN_HOST_SLOT_ID,holderId:ORIGINAL_TAVERN_HOST_ID,revision:0};
 let current=saved==null?initial:{...saved},loadError=null;
 if(!current||current.version!==1||current.roleId!==TAVERN_HOST_ROLE_ID||current.slotId!==TAVERN_HOST_SLOT_ID||!(current.holderId===null||id(current.holderId))||!Number.isSafeInteger(current.revision)||current.revision<0)loadError='invalid-host-assignment';
 function state(){return loadError?{...initial,holderId:null,loadError}:{...current,loadError:null};}
 function resolve(){const row=state(),isPlayer=row.holderId==='player',actor=row.holderId?(isPlayer?getPlayer():resolveActor(row.holderId)):null,alive=!!actor&&isActorAlive(actor)!==false;
  return {...row,actor,alive,isPlayer,available:!loadError&&alive,status:loadError?'invalid':row.holderId===null?'vacant':!actor?'unloaded':!alive?'inactive':isPlayer?'player':'npc'};
 }
 function assign(holderId,{expectedRevision=current.revision}={}){
  if(loadError)return {ok:false,code:loadError};if(expectedRevision!==current.revision)return {ok:false,code:'stale-host-assignment'};
  if(!(holderId===null||id(holderId)))return {ok:false,code:'invalid-holder'};
  if(holderId!==null){const actor=holderId==='player'?getPlayer():resolveActor(holderId);if(!actor||isActorAlive(actor)===false||holderId!=='player'&&personId(actor)!==holderId||!canAssign(holderId,actor))return {ok:false,code:'holder-unavailable'};}
  if(holderId===current.holderId)return {ok:true,replayed:true};const next={...current,holderId,revision:current.revision+1};
  try{const result=saveState({...next});if(result===false||result?.ok===false||result?.then)return {ok:false,code:'save-failed'};}catch{return {ok:false,code:'save-failed'};}
  current=next;return {ok:true,revision:current.revision};
 }
 return {state,resolve,assign,isAlive:actor=>!!actor&&isActorAlive(actor)!==false,get loadError(){return loadError;}};
}
