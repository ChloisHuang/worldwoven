import {tellerSame} from './china-teller-audit-proof.js';
import {REGIONAL_TELLER_CURRENCIES,regionalTellerRole,regionalTellerContract,validateRegionalTellerContract,regionalTellerAuditProof,regionalTellerReport,regionalTellerJournal,freezeTellerSource} from './regional-teller-audit-proof.js';

const copy=structuredClone,integer=n=>Number.isSafeInteger(n)&&n>=0;
const day=n=>Number.isSafeInteger(n)&&n>=-1;
const keys=(value,names)=>!!value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===names.length&&names.every(key=>Object.hasOwn(value,key));
const stages=['check','calculate','record','return'];
const empty=()=>({version:1,lastIssuedDay:-1,order:null,interruptions:[]});
const newOrder=contract=>({contract,index:0,stage:'check',checked:[],calculationIndex:0,calculated:[],calculation:null,recorded:false});
function validOrder(order){
 if(!keys(order,['contract','index','stage','checked','calculationIndex','calculated','calculation','recorded'])||!validateRegionalTellerContract(order.contract)||
  !stages.includes(order.stage)||!integer(order.index)||order.index>4||!integer(order.calculationIndex)||order.calculationIndex>4)return false;
 const report=regionalTellerReport(order.contract.source);
 return tellerSame(order.checked,report.rows.slice(0,order.index))&&tellerSame(order.calculated,report.rows.slice(0,order.calculationIndex))&&
  (order.stage==='check')===(order.index<4)&&(order.stage!=='check'||order.calculationIndex===0)&&
  (order.stage!=='calculate'||order.calculationIndex<4)&&(!['record','return'].includes(order.stage)||order.calculationIndex===4)&&
  tellerSame(order.calculation,['record','return'].includes(order.stage)?report:null)&&order.recorded===(order.stage==='return');
}
export function validRegionalTellerInspection(state){
 try{
  if(!keys(state,['version','lastIssuedDay','order','interruptions'])||state.version!==1||!day(state.lastIssuedDay)||!Array.isArray(state.interruptions))return false;
  if(state.order!==null&&(!validOrder(state.order)||state.order.contract.day!==state.lastIssuedDay))return false;
  const seen=new Set();for(const row of state.interruptions){
   if(!keys(row,['order','reason'])||!validOrder(row.order)||!['actor-dead','assignment-changed','player-abandoned'].includes(row.reason)||row.order.contract.day>state.lastIssuedDay||seen.has(row.order.contract.orderId))return false;
   seen.add(row.order.contract.orderId);
  }
  return !state.order||!seen.has(state.order.contract.orderId);
 }catch{return false;}
}

// Player-directed finite work only. The adapter owns real motion, visible tool
// poses, contact and the atomic employer/bank/formal-career save. This core has
// no money APIs, autonomous travel, customer creation or catch-up clock.
// Save and settle callbacks are synchronous transactional participants. A
// returned Promise is unsupported and never adopted as an in-memory success.
export function createRegionalTellerInspection({resolveAssignment,getDay,getPlayer,getLedger,getPositions,canControl=()=>false,
 pose=()=>{},contact=()=>false,settle=()=>({ok:false}),saveState=()=>false,saved,getLegacyLastIssuedDay=()=>-1,legacyLastIssuedDay=-1,
 positionTolerance=.12,heightTolerance=.2}={}){
 let state=empty(),loadError=null,active=null,busy=false,disposed=false,suspended=false,lastError=null,cachedContract=null,cachedReport=null,cachedJournal=null;
 if(saved!=null){if(validRegionalTellerInspection(saved))state=copy(saved);else{state=copy(saved);loadError='invalid-regional-teller-inspection';}}
 const fail=code=>({ok:false,code});
 const legacyDay=()=>{try{const value=Math.max(legacyLastIssuedDay,getLegacyLastIssuedDay());return day(value)?value:null;}catch{return null;}};
 const reportOf=contract=>{if(cachedContract!==contract){cachedContract=contract;cachedReport=regionalTellerReport(contract.source);cachedJournal=regionalTellerJournal(contract.source);}return cachedReport;};
 const positions=country=>{try{const p=getPositions(country);return p&&['home','ledger','abacus'].every(key=>Array.isArray(p[key])&&p[key].length===3&&p[key].every(Number.isFinite))?p:null;}catch{return null;}};
 const near=(actor,point)=>{const p=actor?.root?.position;return !!p&&!!point&&Math.hypot(p.x-point[0],p.z-point[2])<=positionTolerance&&Math.abs(p.y-point[1])<=heightTolerance;};
 const ledgerReady=()=>{try{const ledger=getLedger();return !!ledger&&!ledger.loadError&&typeof ledger.state==='function';}catch{return false;}};
 const assignment=country=>{try{return resolveAssignment(country);}catch{return null;}};
 const player=()=>{try{return getPlayer();}catch{return null;}};
 const authorized=(actor,a,contract=null)=>!!actor&&actor.alive!==false&&a?.status==='player'&&a.holderId==='player'&&a.alive!==false&&a.available!==false&&integer(a.revision)&&
  (!contract||a.revision===contract.holderRevision&&(!a.roleId||a.roleId===contract.roleId)&&(!a.slotId||a.slotId===contract.slotId));
 const available=(actor,country)=>{try{return !!canControl(actor,country);}catch{return false;}};
 function syncResult(result){if(result?.then){Promise.resolve(result).catch(()=>{});return false;}return result===true||result?.ok===true;}
 function write(next){
  if(busy||!validRegionalTellerInspection(next))return false;
  busy=true;try{if(!syncResult(saveState(copy(next))))return false;state=next;lastError=null;return true;}catch{return false;}finally{busy=false;}
 }
 function stop(){active=null;}
 function interrupted(reason){stop();const next={...copy(state),order:null,interruptions:[...state.interruptions,{order:copy(state.order),reason}]};if(!write(next))lastError='save-failed';}
 function descriptor(){
  if(loadError||!state.order)return null;
  const order=state.order,c=order.contract,p=positions(c.country),report=reportOf(c),index=order.stage==='check'?order.index:order.stage==='calculate'?order.calculationIndex:0;
  const target=order.stage==='calculate'?'abacus':order.stage==='return'?'home':'ledger',rowIndex=order.stage==='record'?Math.min(3,Math.floor((active?.seconds||0)*2)):index,currency=REGIONAL_TELLER_CURRENCIES[rowIndex];
  return {country:c.country,stage:order.stage,index,currency,target,position:p?.[target]?.slice()||null,
   key:`${c.orderId}:${order.stage}:${index}`,seconds:active?.seconds||0,total:order.stage==='return'?0:2,acting:!!active,
   row:copy(report.rows[rowIndex]),journal:copy(cachedJournal.filter(tx=>(tx.currency||'copper')===currency||tx.action==='exchange'&&tx.quote.to===currency))};
 }
 function finish(){
  const order=state.order,next=copy(state),job=next.order,report=reportOf(order.contract);
  if(job.stage==='check'){job.checked.push(copy(report.rows[job.index++]));if(job.index===4)job.stage='calculate';}
  else if(job.stage==='calculate'){job.calculated.push(copy(report.rows[job.calculationIndex++]));if(job.calculationIndex===4){job.calculation=copy(report);job.stage='record';}}
  else if(job.stage==='record'){job.recorded=true;job.stage='return';}
  else{
   next.order=null;busy=true;
   try{const result=settle(regionalTellerAuditProof(order.contract),copy(next));
    if(result?.then){Promise.resolve(result).catch(()=>{});lastError='settlement-failed';return false;}
    if(!result?.ok){lastError=result?.code||'settlement-failed';return false;}
    state=next;lastError=null;stop();return true;
   }catch{lastError='settlement-failed';return false;}finally{busy=false;}
  }
  if(!write(next)){lastError='save-failed';return false;}stop();return true;
 }
 const api={
  state:()=>copy(state),snapshot:()=>copy(state),get loadError(){return loadError;},get lastError(){return lastError;},
  isActing:()=>!!active,actionDescriptor:descriptor,workIntent:descriptor,
  handoffBoundary:()=>({ok:!loadError&&!state.order,blockers:loadError?[loadError]:state.order?['regional-teller-work-unfinished']:[]}),
  start({country,workReceiptId,contractVersion=1}={}){
   if(disposed||busy||loadError||suspended)return fail(loadError||'teller-unavailable');
   if(state.order)return fail('teller-order-unfinished');
   const role=regionalTellerRole(country),actor=player(),a=role&&assignment(role.country),today=getDay(),legacy=legacyDay();
   if(!role)return fail('invalid-teller-country');
   if(!integer(today)||legacy===null)return fail('invalid-clock');
   if(today<=Math.max(state.lastIssuedDay,legacy))return fail('teller-day-consumed');
   if(!authorized(actor,a)||a.roleId&&a.roleId!==role.id||a.slotId&&a.slotId!==role.slotId)return fail('teller-assignment-unavailable');
   if(!available(actor,role.country)||!near(actor,positions(role.country)?.home))return fail('teller-home-required');
   let source;try{source=freezeTellerSource(getLedger());}catch{return fail('invalid-teller-source');}
   if(!source)return fail('invalid-teller-source');
   const contract=regionalTellerContract({country:role.country,day:today,holderRevision:a.revision,workReceiptId,source,contractVersion});
   if(!validateRegionalTellerContract(contract))return fail('invalid-teller-contract');
   if(!write({...copy(state),lastIssuedDay:today,order:newOrder(contract)}))return fail('save-failed');
   return {ok:true,orderId:contract.orderId,contract:copy(contract)};
  },
  beginAction(stage){
   if(disposed||busy||loadError||suspended||!state.order)return fail(loadError||'no-teller-order');
   if(active)return fail('teller-action-active');
   const actor=player(),order=state.order,work=descriptor();
   if(stage!==order.stage)return fail('teller-stage-mismatch');
   if(!authorized(actor,assignment(order.contract.country),order.contract)||!available(actor,order.contract.country)||!ledgerReady())return fail('teller-work-unavailable');
   if(!near(actor,work.position))return fail('teller-position-required');
   active={key:work.key,seconds:0};lastError=null;return {ok:true,action:descriptor()};
  },
  cancelAction(){stop();return {ok:true};},pause(value=true){suspended=!!value;return {ok:true};},resume(){suspended=false;return {ok:true};},
  abandon(){
   if(disposed||busy||loadError)return fail(loadError||'teller-unavailable');
   if(!state.order)return {ok:true,replayed:true};
   const next={...copy(state),order:null,interruptions:[...state.interruptions,{order:copy(state.order),reason:'player-abandoned'}]};
   if(!write(next))return fail('save-failed');stop();return {ok:true};
  },
  update(dt,t,context={}){
   if(disposed||busy||loadError||!state.order||!Number.isFinite(dt)||dt<=0)return;
   const order=state.order,c=order.contract,actor=player(),a=assignment(c.country);
   if(actor?.alive===false){interrupted('actor-dead');return;}
   if(a&&a.status!=='invalid'&&(a.holderId!=='player'||a.revision!==c.holderRevision||a.roleId&&a.roleId!==c.roleId||a.slotId&&a.slotId!==c.slotId)){interrupted('assignment-changed');return;}
   if(!active)return;
   // Conversation owns the body temporarily but never completes, cancels or
   // restarts a work action. The same pending seconds resume after it closes.
   if(suspended||context.paused||context.chatting||context.conversationActorId)return;
   if(!authorized(actor,a,c)||!available(actor,c.country)||!ledgerReady()){stop();return;}
   const work=descriptor();if(active.key!==work.key||!near(actor,work.position)){stop();return;}
   if(order.stage==='return'){finish();return;}
   try{
    pose(actor,t,work,c);if(!contact(actor,work.target,work,c)){stop();return;}
    const seconds=Math.min(2,active.seconds+Math.min(dt,.25));
    if(seconds===2){const finalWork={...work,seconds};pose(actor,t,finalWork,c);if(!contact(actor,work.target,finalWork,c)){stop();return;}}
    active.seconds=seconds;if(seconds===2)finish();
   }catch{stop();lastError='teller-contact-unavailable';}
  },
  dispose(){stop();disposed=true;},
 };
 return api;
}
