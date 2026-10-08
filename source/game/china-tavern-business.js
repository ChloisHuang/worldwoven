// Business-funded operating work. Personal purses, player payroll and salon
// performer splits remain in their original journals. Only real adjacent live
// coverage can earn a new NPC salary; an unpaid obligation is not bank money.
import {GAME_MINUTES_PER_SECOND as RATE} from './simulation-clock.js';
import {TAVERN_HIRING_ROLES,TAVERN_TRIAL_TABLE_IDS,TAVERN_HIRING_BUSINESS_ID as BUSINESS} from './china-tavern-hiring.js';
const NS='chinaTavernBusiness',copy=structuredClone;
export const TAVERN_OPERATING_MEAL_PROVIDER='tavern-operating-bank';
const mealIdentity=()=>({version:1,namespace:NS,currency:'copper',roleIds:Object.values(TAVERN_HIRING_ROLES).map(r=>r.roleId).sort()});
const integer=n=>Number.isSafeInteger(n)&&n>=0;
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const text=x=>typeof x==='string'&&x.length>0&&x.length<=240;
const same=(a,b)=>a===b||!!a&&!!b&&typeof a==='object'&&typeof b==='object'&&Array.isArray(a)===Array.isArray(b)&&Object.keys(a).length===Object.keys(b).length&&Object.keys(a).every(k=>Object.hasOwn(b,k)&&same(a[k],b[k]));
const exact=(x,keys)=>object(x)&&Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
const require=(ok,code='invalid-tavern-business')=>{if(!ok)throw Error(code);};
const definitions=Object.values(TAVERN_HIRING_ROLES),role=id=>definitions.find(r=>r.roleId===id);
const actors=new Set(['cn-tavern-host','cn-tavern-cook','cn-tavern-assistant','cn-tavern-diner-west','cn-tavern-diner-east']);
const key=r=>JSON.stringify([r.contractId,r.actorId,r.roleId,r.day]);
const minutes=s=>600+s*RATE;
const empty=()=>({version:1,businessId:BUSINESS,revision:0,contracts:[],rows:[],trials:[],receipts:[],accounts:{},mealTransfers:[]});
export function tavernSalaryTerms(roleId,excludedTrial=null){
 const r=role(roleId);require(r,'invalid-tavern-contract-role');
 return {version:1,currency:'copper',baseDailyWage:r.wage,startHour:6,endHour:18,
  prorating:'floor(baseDailyWage*min(1,actualCoveredHours/12)+1e-9)',preparationBonus:1,
  preparationBonusCondition:'actualCoveredHours>=12-1e-9',
  origin:roleId===TAVERN_HIRING_ROLES.host.roleId?'new-npc-operating-default':'existing-formal-role',excludedTrial:copy(excludedTrial)};
}
function validContract(c){
 const r=role(c?.roleId),excluded=c?.salary?.excludedTrial;
 return exact(c,['id','sourceId','sourceRevision','kind','actorId','bodyId','roleId','slotId','holderRevision','activatedSeconds','salary','proof'])&&
  text(c.id)&&text(c.sourceId)&&integer(c.sourceRevision)&&actors.has(c.actorId)&&text(c.bodyId)&&!!r&&r.slotId===c.slotId&&integer(c.holderRevision)&&
  Number.isFinite(c.activatedSeconds)&&c.activatedSeconds>=0&&object(c.proof)&&
  (c.kind==='accepted-hiring'||c.kind==='retained-original-incumbent'&&r.originalHolderId===c.actorId)&&
  (excluded===null||exact(excluded,['id','startedSeconds','completedSeconds'])&&text(excluded.id)&&Number.isFinite(excluded.startedSeconds)&&excluded.startedSeconds>=0&&Number.isFinite(excluded.completedSeconds)&&excluded.completedSeconds>excluded.startedSeconds)&&
  same(c.salary,tavernSalaryTerms(c.roleId,excluded));
}
function wageAmount(row,contract){
 const hours=row.segments.reduce((n,s)=>n+s.endHour-s.startHour,0),s=contract.salary;
 return Math.floor(s.baseDailyWage*Math.min(1,hours/12)+1e-9)+(hours>=12-1e-9?s.preparationBonus:0);
}
function reservationReceipt(t){return {id:t.id,sourceId:NS,sourceRevision:t.sourceRevision,reservedSeconds:t.reservedSeconds,businessId:BUSINESS,...copy(t.request),currency:'copper',amount:12,funding:'business'};}
function paymentProof(t,revision){const r=t.request;return {id:r.remunerationId,sourceId:NS,sourceRevision:revision,businessId:BUSINESS,applicationId:r.applicationId,trialId:r.trialId,actorId:r.actorId,bodyId:r.bodyId,currency:'copper',amount:12,funding:'business'};}
function salaryReceipt(row,contract,revision){return {id:`tavern-operating-wage:${row.contractId}:${row.actorId}:${row.roleId}:${row.day}`,kind:'npc-wage',businessId:BUSINESS,currency:'copper',amount:wageAmount(row,contract),sourceId:NS,sourceRevision:revision,actorId:row.actorId,proof:{row:copy(row),contractId:contract.id}};}
export function validTavernOperatingReceipt(r){
 if(!exact(r,['id','kind','businessId','currency','amount','sourceId','sourceRevision','actorId','proof'])||!text(r.id)||!['npc-wage','trial-payment','stock-purchase'].includes(r.kind)||r.businessId!==BUSINESS||r.currency!=='copper'||!integer(r.amount)||r.sourceId!==NS||!integer(r.sourceRevision)||r.sourceRevision<1||!object(r.proof))return false;
 return r.kind==='stock-purchase'?r.actorId===null&&r.amount>0:actors.has(r.actorId)&&(r.kind!=='trial-payment'||r.amount===12);
}
function trialWork(p,t){
 const r=t.request;
 return exact(p,['id','sourceId','sourceRevision','businessId','applicationId','trialId','actorId','bodyId','steps'])&&text(p.id)&&text(p.sourceId)&&integer(p.sourceRevision)&&p.businessId===BUSINESS&&
  p.applicationId===r.applicationId&&p.trialId===r.trialId&&p.actorId===r.actorId&&p.bodyId===r.bodyId&&Array.isArray(p.steps)&&p.steps.length===2&&new Set(p.steps.map(s=>s?.tableId)).size===2&&
  p.steps.every((s,i)=>exact(s,['id','tableId','startedSeconds','completedSeconds'])&&text(s.id)&&TAVERN_TRIAL_TABLE_IDS.includes(s.tableId)&&Number.isFinite(s.startedSeconds)&&s.startedSeconds>=t.reservedSeconds&&Number.isFinite(s.completedSeconds)&&s.completedSeconds-s.startedSeconds>=5&&(!i||s.startedSeconds>=p.steps[i-1].completedSeconds));
}
function overlap(row,others){
 for(const old of others)if(row.day===old.day&&(row.actorId===old.actorId||row.slotId===old.slotId||row.bodyId===old.bodyId))
  require(!row.segments.some(a=>old.segments.some(b=>a.startHour<b.endHour&&b.startHour<a.endHour)),'overlapping-tavern-coverage');
}
function mealChange(state,input,kind){
 require(actors.has(input?.actorId)&&/^cn-tavern-order-[1-9][0-9]*$/.test(input?.orderId||'')&&integer(input.amount)&&input.amount>0,'invalid-tavern-meal');
 const paid=state.mealTransfers.find(r=>r.orderId===input.orderId&&r.kind==='meal-payment'),refund=state.mealTransfers.find(r=>r.orderId===input.orderId&&r.kind==='meal-refund');
 require(kind==='meal-payment'?!paid:paid&&!refund&&paid.actorId===input.actorId&&paid.amount===input.amount,'tavern-meal-conflict');
 const account=state.accounts[input.actorId];require(account,'insufficient-npc-funds');
 if(kind==='meal-payment')require(account.bank>=input.amount,'insufficient-npc-funds');
 account.bank+=(kind==='meal-payment'?-1:1)*input.amount;
 const result={id:`${NS}:${kind}:${input.orderId}`,kind,actorId:input.actorId,orderId:input.orderId,amount:input.amount,sourceSplit:{cash:0,bank:input.amount},receiptsThrough:state.receipts.length};
 require(integer(account.bank),'invalid-tavern-bank');state.mealTransfers.push(result);return result;
}

/** Source verifiers are synchronous read-only checks of immutable facts. They
 * must verify historical receipts without requiring today's owner/location.
 * verifyCoverage alone checks current body/slot/controller/work-area facts.
 * saveState(next, receipt, worldPatch) writes ONE complete world synchronously.
 * Candidates expose patch/valid/lock/save/committed/release; commit(worldPatch)
 * is the convenience coordinator. No adoption occurs before strict true save.
 */
export function createChinaTavernBusiness(options={}){
 const {saved,getProperty=()=>null,getClock=()=>null,saveState=()=>false}=options;
 let current=empty(),invalidSnapshot=null,loadError=null,lastError=null,busy=null,anchor=null,dirty=false;
 const candidateReceipts=new Map();
 const verify=(name,...args)=>{require(typeof options[name]==='function','missing-'+name);const v=options[name](...args.map(value=>copy(value)));if(v?.then){Promise.resolve(v).catch(()=>{});throw Error('async-source-unsupported');}require(v===true,'unverified-'+name);};
 const failure=code=>{lastError=code;return {ok:false,code};};
 function validate(state,{sources=true}={}){
  require(exact(state,['version','businessId','revision','contracts','rows','trials','receipts','accounts','mealTransfers'])&&state.version===1&&state.businessId===BUSINESS&&integer(state.revision)&&Array.isArray(state.contracts)&&Array.isArray(state.rows)&&Array.isArray(state.trials)&&Array.isArray(state.receipts)&&object(state.accounts)&&Array.isArray(state.mealTransfers));
  const contracts=new Map(),rows=new Set(),trialIds=new Set(),paid=new Set(),receipts=new Set();
  for(const c of state.contracts){require(validContract(c)&&!contracts.has(c.id),'invalid-tavern-contract');if(sources)verify('verifyContract',c);contracts.set(c.id,c);}
  for(const r of state.rows){
   const c=contracts.get(r?.contractId);require(c&&exact(r,['contractId','actorId','bodyId','roleId','slotId','holderRevision','day','segments'])&&['actorId','bodyId','roleId','slotId','holderRevision'].every(k=>r[k]===c[k])&&integer(r.day)&&Array.isArray(r.segments)&&r.segments.length&&!rows.has(key(r)),'invalid-tavern-coverage');
   rows.add(key(r));let end=6;
   for(const s of r.segments){require(exact(s,['startHour','endHour'])&&Number.isFinite(s.startHour)&&Number.isFinite(s.endHour)&&s.startHour>=end&&s.endHour>s.startHour&&s.endHour<=18,'invalid-tavern-coverage');
    const from=(r.day*1440+s.startHour*60-600)/RATE,to=(r.day*1440+s.endHour*60-600)/RATE,x=c.salary.excludedTrial;
    require(from>=c.activatedSeconds-1e-7&&(!x||to<=x.startedSeconds||from>=x.completedSeconds),'invalid-tavern-contract-coverage');end=s.endHour;}
   overlap(r,state.rows.filter(other=>other!==r));
  }
  for(const t of state.trials){
   require(exact(t,['id','sourceRevision','reservedSeconds','request','owner','status','work','cancellation'])&&text(t.id)&&integer(t.sourceRevision)&&t.sourceRevision>0&&t.sourceRevision<=state.revision&&Number.isFinite(t.reservedSeconds)&&t.reservedSeconds>=0&&!trialIds.has(t.id)&&['held','released','paid'].includes(t.status)&&exact(t.owner,['ownerId','ownership'])&&t.owner.ownerId==='player'&&integer(t.owner.ownership),'invalid-tavern-trial');
   const r=t.request;require(exact(r,['applicationId','trialId','actorId','bodyId','remunerationId','tableIds'])&&text(r.applicationId)&&text(r.trialId)&&actors.has(r.actorId)&&text(r.bodyId)&&text(r.remunerationId)&&same(r.tableIds,TAVERN_TRIAL_TABLE_IDS)&&t.id===r.remunerationId+':reserve','invalid-tavern-trial');
   trialIds.add(t.id);if(sources)verify('verifyTrialRequest',r,t.owner);
   if(t.work){require(trialWork(t.work,t),'invalid-tavern-trial-work');if(sources)verify('verifyTrialWork',t.work,reservationReceipt(t));}
   require(t.status!=='paid'||!!t.work,'unworked-tavern-trial');
   if(t.status==='released'){require(!t.work&&object(t.cancellation),'completed-trial-obligation');if(sources)verify('verifyTrialCancellation',t.cancellation,reservationReceipt(t));}
   else require(t.cancellation===null,'invalid-tavern-trial');
  }
  const ledger={accounts:{},receipts:[],mealTransfers:[]};let mealIndex=0;
  for(let index=0;index<=state.receipts.length;index++){
   while(mealIndex<state.mealTransfers.length&&state.mealTransfers[mealIndex].receiptsThrough===index){const m=state.mealTransfers[mealIndex++];require(['meal-payment','meal-refund'].includes(m.kind)&&same(m,mealChange(ledger,m,m.kind)),'invalid-tavern-meal');}
   if(index===state.receipts.length)break;
   const r=state.receipts[index];require(validTavernOperatingReceipt(r)&&r.sourceRevision<=state.revision&&!receipts.has(r.id),'invalid-tavern-expense');receipts.add(r.id);
   if(r.kind==='npc-wage'){
    const row=state.rows.find(v=>key(v)===key(r.proof?.row||{})),c=contracts.get(row?.contractId);
    require(row&&same(row,r.proof.row)&&same(r,salaryReceipt(row,c,r.sourceRevision))&&!paid.has(key(row)),'invalid-tavern-wage');paid.add(key(row));
   }else if(r.kind==='trial-payment'){
    const t=state.trials.find(v=>v.id===r.proof.reservationId);
    require(t?.status==='paid'&&same(r.proof.work,t.work)&&same(r.proof.payment,paymentProof(t,r.sourceRevision))&&r.id===t.request.remunerationId&&r.actorId===t.request.actorId,'invalid-tavern-trial-payment');
   }else{
    const s=r.proof.sourcePatch,d=s?.businessDebit;
    require(s?.kind==='purchase'&&r.id===d?.id&&r.amount===d?.amount&&d.businessId===BUSINESS&&d.currency==='copper'&&integer(d.balanceBefore)&&d.balanceAfter===d.balanceBefore-r.amount&&d.balanceAfter>=0&&same(s.receipt?.owner,d.owner),'invalid-tavern-stock-expense');
    if(sources)verify('verifyStockReceipt',s.receipt);
   }
   if(r.actorId){const account=ledger.accounts[r.actorId]??={cash:0,bank:0};account.bank+=r.amount;require(integer(account.bank),'invalid-tavern-bank');}
   ledger.receipts.push(copy(r));
  }
  require(mealIndex===state.mealTransfers.length&&same(state.accounts,ledger.accounts),'invalid-tavern-bank');
  for(const t of state.trials)require((t.status==='paid')===state.receipts.some(r=>r.kind==='trial-payment'&&r.proof.reservationId===t.id),'tavern-trial-payment-mismatch');
  return state;
 }
 try{if(saved!=null){invalidSnapshot=copy(saved);current=copy(saved);}validate(current);const property=getProperty();require(!property?.loadError,'tavern-property-unavailable');const events=property?.snapshot?.().events?.filter(e=>e.kind==='operating-expense')||[];const expenses=current.receipts.filter(r=>r.amount>0);require(events.length===expenses.length&&expenses.every(r=>events.some(e=>same(e.receipt,r))),'tavern-property-mismatch');invalidSnapshot=null;}
 catch(e){loadError=e.message;current=empty();}
 function accounting(){
  const paid=new Set(current.receipts.filter(r=>r.kind==='npc-wage').map(r=>key(r.proof.row))),contracts=new Map(current.contracts.map(c=>[c.id,c]));
  const earnedWages=current.rows.reduce((n,r)=>n+wageAmount(r,contracts.get(r.contractId)),0),wagesPayable=current.rows.filter(r=>!paid.has(key(r))).reduce((n,r)=>n+wageAmount(r,contracts.get(r.contractId)),0);
  const trialReserved=current.trials.filter(t=>t.status==='held').length*12,trialEarned=current.trials.filter(t=>t.work).length*12;
  return {sourceId:NS,sourceRevision:current.revision,earnedWages,wagesPayable,trialReserved,trialEarned,protectedFunds:wagesPayable+trialReserved,paidWages:current.receipts.filter(r=>r.kind==='npc-wage').reduce((n,r)=>n+r.amount,0),trialPaid:current.receipts.filter(r=>r.kind==='trial-payment').reduce((n,r)=>n+r.amount,0),procurementCash:current.receipts.filter(r=>r.kind==='stock-purchase').reduce((n,r)=>n+r.amount,0)};
 }
 const clock=()=>{const c=getClock();require(integer(c?.day)&&Number.isFinite(c.hour)&&c.hour>=0&&c.hour<24,'invalid-tavern-clock');return c;};
 const strictSave=result=>{if(result?.then){Promise.resolve(result).catch(()=>{});throw Error('async-save-unsupported');}require(result===true,'save-failed');};
 function participant(next,{receipt=null,property=null,others=[],replayed=false,transfer=null}={}){
  validate(next,{sources:false});
  if(!property&&!transfer){property=getProperty()?.prepareOperatingGuard?.();require(property?.ok,property?.code||'tavern-property-unavailable');}
  const base=current,token={},all=[...others,...(property?[property]:[])];let locked=false,durable=false,accepted=false,released=false,inSave=false,mealValidated=false;
  const bundle={patch:{...Object.assign({},...all.map(p=>p.patch||{})),[NS]:copy(next)},receipt:copy(receipt)};
  const valid=()=>!loadError&&!released&&!accepted&&current===base&&(!busy||busy===token)&&(!locked?all.every(p=>p.valid?.()===true):true);
  const mealWorld=(patch,total)=>{const order=patch?.chinaServiceWorld?.orders?.find(o=>o.id===transfer?.orderId);return !!transfer&&!!order&&order.customerId===transfer.actorId&&order.price===total&&(transfer.kind==='meal-payment'?order.payment==='reserved'&&order.collected===true:order.payment==='refunded'&&order.cancelled===true);};
  const result={ok:true,replayed,...copy(bundle),...(transfer?{transfer:copy(transfer),balanceAfter:next.accounts[transfer.actorId].bank}:{}),valid,
   lock(){if(locked||transfer&&!mealValidated||!valid())return false;for(const p of all){if(!p.lock?.()){for(const old of all)old.release?.();return false;}}busy=token;locked=true;return true;},
   save(saveAtomic){
    if(!locked||inSave||durable||accepted||!valid()||typeof saveAtomic!=='function')return false;
    inSave=true;try{let save=()=>{strictSave(saveAtomic(copy(bundle)));return true;};for(const p of all.filter(p=>typeof p.save==='function').reverse()){const inner=save;save=()=>p.save(()=>inner());}strictSave(save());durable=true;return true;}catch(e){lastError=e.message;return false;}finally{inSave=false;}
   },
   committed(){
    if(accepted)return transfer?{ok:true,replayed:true}:true;if(!locked||(!durable&&!(transfer&&mealValidated))||inSave||current!==base||busy!==token)return false;
    for(const p of all)if(p.committed?.()===false)return false;
    current=next;dirty=false;accepted=true;lastError=null;return transfer?{ok:true,replayed}:true;
   },
   release(){if(inSave||durable&&!accepted)return false;for(const p of all)p.release?.();if(busy===token)busy=null;locked=false;released=true;if(receipt)candidateReceipts.delete(receipt.id);return true;},
   validateMealWorld(worldPatch,record){
    mealValidated=false;if(!transfer||record?.version!==1||record.kind!==transfer.kind||record.actorId!==transfer.actorId||record.orderId!==transfer.orderId||!integer(record.amount)||!Array.isArray(record.portions)||!mealWorld(worldPatch,record.amount))return false;
    const parts=record.portions.filter(p=>p.providerId===TAVERN_OPERATING_MEAL_PROVIDER);return mealValidated=parts.length===1&&parts[0].amount===transfer.amount&&same(parts[0].sourceSplit,transfer.sourceSplit)&&same(parts[0].identity,mealIdentity())&&record.portions.reduce((n,p)=>n+p.amount,0)===record.amount;
   },
   commit(worldPatch={}){
    if(accepted)return {ok:true,replayed:true,receipt:copy(receipt)};
    if(!object(worldPatch)||Object.keys(worldPatch).some(k=>Object.hasOwn(bundle.patch,k)))return failure('invalid-tavern-world-patch');
    if(transfer){if(!mealWorld(worldPatch,transfer.amount))return failure('invalid-tavern-meal-world');mealValidated=true;}
    if(!result.lock())return failure('stale-tavern-business');
    try{if(!result.save(()=>saveState(copy(next),copy(receipt),{...copy(worldPatch),...copy(bundle.patch)})))return failure(lastError||'save-failed');if(!result.committed())return failure('tavern-adoption-failed');return {ok:true,replayed,receipt:copy(receipt)};}finally{result.release();}
   }};return result;
 }
 function run(fn){if(loadError||busy)return failure(loadError||'tavern-business-busy');try{return fn();}catch(e){return failure(e.message);}}
 function nextState(){const next=copy(current);require(integer(++next.revision),'tavern-business-limit');return next;}
 function expense(next,receipt,{others=[],replayed=false}={}){
  let property=null;
  if(!replayed){next.receipts.push(copy(receipt));if(receipt.actorId){const a=next.accounts[receipt.actorId]??={cash:0,bank:0};a.bank+=receipt.amount;}}
  validate(next,{sources:false});
  if(receipt.amount>0){candidateReceipts.set(receipt.id,copy(receipt));property=getProperty()?.prepareOperatingExpense?.({receipt});if(!property?.ok){candidateReceipts.delete(receipt.id);return property||failure('tavern-property-unavailable');}}
  return participant(next,{receipt,property,others,replayed});
 }
 function acceptContract(contract){return run(()=>{
  require(validContract(contract),'invalid-tavern-contract');verify('verifyContract',contract);
  const old=current.contracts.find(c=>c.id===contract.id);if(old){require(same(old,contract),'tavern-contract-conflict');return {ok:true,replayed:true};}
  const c=clock();require(Number.isFinite(c.seconds)&&Math.abs(c.seconds-contract.activatedSeconds)<1e-7,'contract-activation-must-be-current');
  const next=nextState();next.contracts.push(copy(contract));return participant(next).commit();
 });}
 function prepareTrialReservation({application:a}={}){return run(()=>{
  require(a?.status==='submitted'&&a.roleId===TAVERN_HIRING_ROLES.assistant.roleId&&a.trial?.request?.remuneration?.amount===12,'invalid-tavern-trial-request');
  const r=a.trial.request,request={applicationId:a.id,trialId:r.id,actorId:a.actor?.actorId,bodyId:a.actor?.bodyId,remunerationId:r.remuneration.id,tableIds:copy(r.tableIds)},owner=copy(a.owner);
  verify('verifyTrialRequest',request,owner);const id=request.remunerationId+':reserve',old=current.trials.find(t=>t.id===id);
  if(old){require(same(old.request,request)&&same(old.owner,owner)&&old.status==='held','trial-reservation-unavailable');return participant(current,{receipt:reservationReceipt(old),replayed:true});}
  const now=clock();require(Number.isFinite(now.seconds)&&now.seconds>=0,'invalid-tavern-clock');const next=nextState(),trial={id,sourceRevision:next.revision,reservedSeconds:now.seconds,request,owner,status:'held',work:null,cancellation:null};next.trials.push(trial);
  const property=getProperty()?.prepareOperatingGuard?.({reserve:12,owner});require(property?.ok,property?.code||'tavern-property-unavailable');
  return participant(next,{receipt:reservationReceipt(trial),property});
 });}
 function prepareTrialRelease({reservationId,cancellationProof}={}){return run(()=>{
  const trial=current.trials.find(t=>t.id===reservationId);require(trial,'unknown-trial-reservation');
  require(trial.status!=='paid'&&!trial.work,'completed-trial-obligation');verify('verifyTrialCancellation',cancellationProof,reservationReceipt(trial));
  if(trial.status==='released'){require(same(trial.cancellation,cancellationProof),'trial-cancellation-conflict');return participant(current,{replayed:true});}
  const next=nextState(),t=next.trials.find(t=>t.id===reservationId);t.status='released';t.cancellation=copy(cancellationProof);return participant(next);
 });}
 function recordTrialWork({reservationId,workProof}={}){return run(()=>{
  const trial=current.trials.find(t=>t.id===reservationId);require(trial&&trial.status!=='released','trial-reservation-unavailable');require(trialWork(workProof,trial),'invalid-tavern-trial-work');verify('verifyTrialWork',workProof,reservationReceipt(trial));
  if(trial.work){require(same(trial.work,workProof),'trial-work-conflict');return {ok:true,replayed:true};}
  const next=nextState();next.trials.find(t=>t.id===reservationId).work=copy(workProof);return participant(next).commit();
 });}
 function prepareTrialPayment({reservationId,workProof}={}){return run(()=>{
  const trial=current.trials.find(t=>t.id===reservationId);require(trial&&trial.status!=='released','trial-reservation-unavailable');require(trialWork(workProof,trial),'invalid-tavern-trial-work');verify('verifyTrialWork',workProof,reservationReceipt(trial));
  const old=current.receipts.find(r=>r.id===trial.request.remunerationId);
  if(old){require(same(old.proof.work,workProof),'trial-payment-conflict');return expense(current,old,{replayed:true});}
  const next=nextState(),t=next.trials.find(v=>v.id===reservationId);t.status='paid';t.work=copy(workProof);
  const payment=paymentProof(t,next.revision),receipt={id:payment.id,kind:'trial-payment',businessId:BUSINESS,currency:'copper',amount:12,sourceId:NS,sourceRevision:next.revision,actorId:t.request.actorId,proof:{reservationId,work:copy(workProof),payment}};
  return expense(next,receipt);
 });}
 function prepareWageSettlement({contractId,day}={}){return run(()=>{
  const row=current.rows.find(r=>r.contractId===contractId&&r.day===day);require(row,'no-observed-tavern-work');const now=clock();require(now.day>row.day||now.day===row.day&&now.hour>=18,'tavern-day-not-finished');
  const contract=current.contracts.find(c=>c.id===contractId);verify('verifyContract',contract);const old=current.receipts.find(r=>r.kind==='npc-wage'&&key(r.proof.row)===key(row));
  if(old)return expense(current,old,{replayed:true});const next=nextState();return expense(next,salaryReceipt(row,contract,next.revision));
 });}
 function prepareStockPurchase({stockParticipant:p}={}){return run(()=>{
  require(p?.ok&&p.sourcePatch?.kind==='purchase'&&typeof p.save==='function'&&p.valid?.()===true,'invalid-stock-participant');
  const s=p.sourcePatch,d=s.businessDebit;require(integer(p.amount)&&p.amount>0&&p.amount===p.cost&&d?.amount===p.amount,'invalid-stock-expense');
  verify('verifyStockReceipt',s.receipt);const old=current.receipts.find(r=>r.id===d.id);
  if(old){require(same(old.proof.sourcePatch,s),'stock-expense-conflict');return expense(current,old,{others:[p],replayed:true});}
  const budget=getProperty()?.businessBudget?.();require(budget&&d.businessId===budget.businessId&&same(d.owner,{ownerId:budget.ownerId,ownership:budget.ownership})&&d.sourceId===budget.sourceId&&d.sourceRevision===budget.sourceRevision&&d.balanceBefore===budget.balance&&d.balanceAfter===budget.balance-p.amount,'stale-stock-budget');
  const next=nextState(),receipt={id:d.id,kind:'stock-purchase',businessId:BUSINESS,currency:'copper',amount:p.amount,sourceId:NS,sourceRevision:next.revision,actorId:null,proof:{sourcePatch:copy(s)}};return expense(next,receipt,{others:[p]});
 });}
 function coverageAt(values){
  require(Array.isArray(values),'invalid-tavern-coverage');const result=[];
  for(const v of values){
   const c=current.contracts.find(c=>c.id===v?.contractId);
   if(!c||!exact(v,['contractId','actorId','bodyId','roleId','slotId','holderRevision','alive','available','inWorkArea','controller','activity','trial'])||!['actorId','bodyId','roleId','slotId','holderRevision'].every(k=>v[k]===c[k])||v.alive!==true||v.available!==true||v.inWorkArea!==true||v.controller!=='tavern-work'||!['work','waiting'].includes(v.activity)||v.trial!==false)continue;
   verify('verifyCoverage',v,c);result.push(copy(v));
  }
  require(new Set(result.map(v=>v.actorId)).size===result.length&&new Set(result.map(v=>v.bodyId)).size===result.length&&new Set(result.map(v=>v.slotId)).size===result.length,'overlapping-tavern-coverage');return result;
 }
 function observe({seconds,dt,coverage=[]}={}){
  if(loadError||busy){anchor=null;return false;}
  try{
   const valid=coverageAt(coverage),previous=anchor;
   anchor=Number.isFinite(seconds)&&seconds>=0&&Number.isFinite(dt)&&dt>0&&dt<=.25?{seconds,coverage:valid}:null;
   if(!anchor||!previous||seconds<=previous.seconds||Math.abs(seconds-previous.seconds-dt)>1e-7){lastError=null;return false;}
   const additions=[],paid=new Set(current.receipts.filter(r=>r.kind==='npc-wage').map(r=>key(r.proof.row)));
   for(const v of valid){
    if(!previous.coverage.some(p=>same(p,v)))continue;const c=current.contracts.find(c=>c.id===v.contractId),excluded=c.salary.excludedTrial;
    let spans=[[Math.max(previous.seconds,c.activatedSeconds),seconds]];
    if(excluded)spans=spans.flatMap(([a,b])=>b<=excluded.startedSeconds||a>=excluded.completedSeconds?[[a,b]]:[[a,Math.min(b,excluded.startedSeconds)],[Math.max(a,excluded.completedSeconds),b]].filter(([x,y])=>y>x));
    // Active reservations exclude their actor's trial interval even before the
    // hiring contract has a completed-work exclusion field.
    if(current.trials.some(t=>t.status==='held'&&t.request.actorId===v.actorId))continue;
    for(const [a,b]of spans){const start=minutes(a),finish=minutes(b);
     for(let day=Math.floor(start/1440);day<=Math.floor(finish/1440);day++){
      const from=Math.max(start,day*1440+360),to=Math.min(finish,day*1440+1080);if(to<=from)continue;
      const row={contractId:c.id,actorId:c.actorId,bodyId:c.bodyId,roleId:c.roleId,slotId:c.slotId,holderRevision:c.holderRevision,day,segments:[{startHour:(from-day*1440)/60,endHour:(to-day*1440)/60}]};
      if(paid.has(key(row)))continue;overlap(row,[...current.rows,...additions]);additions.push(row);
     }
    }
   }
   if(additions.length){const next=nextState();for(const row of additions){const old=next.rows.find(r=>key(r)===key(row));if(!old)next.rows.push(row);else{const tail=old.segments.at(-1),s=row.segments[0];if(tail.endHour===s.startHour)tail.endHour=s.endHour;else old.segments.push(s);}}current=next;dirty=true;}
   lastError=null;return true;
  }catch(e){anchor=null;lastError=e.message;return false;}
 }
 function checkpoint(){return run(()=>{if(!dirty)return {ok:true};return participant(copy(current)).commit();});}
 function settleDue(){return run(()=>{
  const now=clock(),rows=current.rows.filter(r=>r.day<now.day||r.day===now.day&&now.hour>=18),results=[];
  for(const r of rows){if(current.receipts.some(p=>p.kind==='npc-wage'&&key(p.proof.row)===key(r)))continue;const p=prepareWageSettlement({contractId:r.contractId,day:r.day});results.push(p.ok?p.commit():p);}
  return {ok:results.every(r=>r.ok),results};
 });}
 function prepareMeal(input,kind){return run(()=>{
  if(kind==='meal-payment')require(!current.mealTransfers.some(r=>r.orderId===input?.orderId&&r.kind==='meal-refund'),'tavern-meal-conflict');
  const old=current.mealTransfers.find(r=>r.orderId===input?.orderId&&r.kind===kind);
  if(old){require(old.actorId===input.actorId&&old.amount===input.amount,'tavern-meal-conflict');return participant(current,{transfer:old,replayed:true});}
  const next=nextState(),record=mealChange(next,input,kind);return participant(next,{transfer:record});
 });}
 function mealFundsProvider(){return {
  get loadError(){return loadError;},snapshot:()=>copy(current),account:id=>actors.has(id)&&!loadError?copy(current.accounts[id]||{cash:0,bank:0}):null,
  hasIncome:id=>!loadError&&current.receipts.some(r=>r.actorId===id&&r.amount>0),
  mealAccountIdentity:mealIdentity,
  mealTransfer:(orderId,kind)=>copy(current.mealTransfers.find(r=>r.orderId===orderId&&r.kind===kind)||null),mealTransferOrderIds:()=>current.mealTransfers.map(r=>r.orderId),
  prepareMealPayment:input=>prepareMeal(input,'meal-payment'),prepareMealRefund:input=>prepareMeal(input,'meal-refund'),
  prepareMealGuard(){const base=current,token={};let locked=false;return {valid:()=>!loadError&&!busy&&current===base,lock(){if(loadError||busy||current!==base)return false;busy=token;locked=true;return true;},release(){if(locked&&busy===token){busy=null;locked=false;}}};}
 };}
 return {get loadError(){return loadError;},get busy(){return !!busy;},get lastError(){return lastError;},snapshot:()=>copy(invalidSnapshot??current),state:()=>({...copy(current),...accounting(),loadError,lastError}),accounting,acceptContract,observe,suspend(){anchor=null;},checkpoint,settleDue,
  prepareTrialReservation,prepareTrialRelease,recordTrialWork,prepareTrialPayment,prepareWageSettlement,prepareStockPurchase,mealFundsProvider,
  verifyExpenseCandidate:r=>!loadError&&same(candidateReceipts.get(r?.id),r),
  verifyExpenseReceipt:r=>!loadError&&current.receipts.some(old=>same(old,r)),
  verifyTrialReceipt(kind,receipt,application){
   if(loadError)return false;const t=current.trials.find(t=>t.request.applicationId===application?.id);if(!t)return false;
   if(kind==='reservation')return t.status==='held'&&same(receipt,reservationReceipt(t));
   const r=current.receipts.find(r=>r.id===t.request.remunerationId);return kind==='payment'&&!!r&&same(receipt,r.proof.payment);
  },
  trialReservation:id=>{const t=current.trials.find(t=>t.id===id||t.request.applicationId===id);return t?reservationReceipt(t):null;},
  account:id=>!loadError&&actors.has(id)?copy(current.accounts[id]||{cash:0,bank:0}):null,
 };
}

// Cold-load source reader: all supplied verifiers inspect immutable saved roots,
// never live owner/body/location. Full journal/zero-origin bank/property replay
// is required before exposing even one payment to the hiring journal.
export function verifySavedTavernBusinessPayment({saved,property,proof,application,...sources}={}){
 const account=createChinaTavernBusiness({...sources,saved,getProperty:()=>({snapshot:()=>copy(property)})});
 return !account.loadError&&account.verifyTrialReceipt('payment',proof,application);
}
