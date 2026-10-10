// Durable assignment only. Personal needs, money and history stay on actors.
export const personId=actor=>actor?.actorId||actor?.station?.id||actor?.id||null;
const id=value=>typeof value==='string'&&/^[a-z][a-z0-9-]{0,63}$/.test(value);
export function createTavernRole({roleId,slotId,originalHolderId,errorName='role',saved=null,resolveActor=()=>null,getPlayer=()=>null,isActorAlive=actor=>actor?.alive!==false,canAssign=()=>true,canRelease=()=>true,saveState=()=>true}={}){
 const initial={version:1,roleId:roleId,slotId:slotId,holderId:originalHolderId,revision:0};
 let current=saved==null?initial:{...saved},loadError=null,lease=null;
 if(!current||current.version!==1||current.roleId!==roleId||current.slotId!==slotId||!(current.holderId===null||id(current.holderId))||!Number.isSafeInteger(current.revision)||current.revision<0)loadError=`invalid-${errorName}-assignment`;
 // state() historically persisted a transient loadError:null display field.
 // Assignment evidence is the same canonical five fields after a cold load.
 if(!loadError)current={version:1,roleId,slotId,holderId:current.holderId,revision:current.revision};
 function state(){return loadError?{...initial,holderId:null,loadError}:{...current,loadError:null};}
 function resolve(){const row=state(),isPlayer=row.holderId==='player',actor=row.holderId?(isPlayer?getPlayer():resolveActor(row.holderId)):null,alive=!!actor&&isActorAlive(actor)!==false,available=!loadError&&alive&&canAssign(row.holderId,actor);
  return {...row,actor,alive,isPlayer,available,status:loadError?'invalid':row.holderId===null?'vacant':!actor?'unloaded':!alive?'inactive':!available?'busy':isPlayer?'player':'npc'};
 }
 function prepareAssignment(holderId,{expectedRevision=current.revision}={}){
  const before=current;
  function check(){
   if(loadError)return {ok:false,code:loadError};if(current!==before||expectedRevision!==current.revision)return {ok:false,code:`stale-${errorName}-assignment`};
   if(!(holderId===null||id(holderId)))return {ok:false,code:'invalid-holder'};
   if(holderId!==null){const actor=holderId==='player'?getPlayer():resolveActor(holderId);if(!actor||isActorAlive(actor)===false||holderId!=='player'&&personId(actor)!==holderId||!canAssign(holderId,actor))return {ok:false,code:'holder-unavailable'};}
   if(holderId!==current.holderId){const boundary=canRelease(current.holderId,holderId);if(boundary===false||boundary?.ok===false)return {ok:false,code:'handoff-pending',...(boundary?.blockers?{blockers:boundary.blockers}: {})};}
   return {ok:true};
  }
  if(lease)return {ok:false,code:'assignment-busy'};
  const result=check();if(!result.ok)return result;
  const replayed=holderId===current.holderId,next=replayed?{...current}:{...current,holderId,revision:current.revision+1},token={};let durable=false,adopted=false;
  const valid=()=>!adopted&&(!lease||lease===token)&&check().ok;
  return {ok:true,replayed,assignment:{...next},valid,
   lock(){if(!valid()||lease)return false;lease=token;return true;},
   save(saveAtomic){if(lease!==token||!valid()||typeof saveAtomic!=='function')return false;try{const result=saveAtomic({assignment:{...next}});durable=result===true;return durable;}catch{return false;}},
   committed(){if(adopted)return true;if(lease!==token||!durable)return false;current=next;adopted=true;return true;},
   release(){if(lease===token)lease=null;}
  };
 }
 function assign(holderId,options){
  const p=prepareAssignment(holderId,options);if(!p.ok)return p;if(p.replayed)return {ok:true,replayed:true};
  if(!p.lock())return {ok:false,code:'assignment-busy'};
  try{if(!p.save(({assignment})=>{const result=saveState(assignment);return result!==false&&result?.ok!==false&&!result?.then;}))return {ok:false,code:'save-failed'};
   if(!p.committed())return {ok:false,code:'save-failed'};return {ok:true,revision:current.revision};
  }finally{p.release();}
 }

 return {state,resolve,assign,prepareAssignment,isAlive:actor=>!!actor&&isActorAlive(actor)!==false,get loadError(){return loadError;}};
}
