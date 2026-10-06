import {createCurrencyLedger} from './currency-ledger.js';
import {GAME_MINUTES_PER_SECOND} from './simulation-clock.js';
import {JAPAN_KITCHEN_ROLE} from './japan-kitchen-role.js';
import {JAPAN_TABLE_SERVICE_ROLE} from './japan-table-service-role.js';

export const JAPAN_STAFF_CAPITAL = Object.freeze({sourceId:'japan-bathhouse-opening-capital-v1',amount:224,currency:'japan'});
export const JAPAN_PAYROLL_ACTORS = Object.freeze(['jp-sushi','jp-ramen']);
export const JAPAN_PAYROLL_SLOTS = Object.freeze({kitchen:JAPAN_KITCHEN_ROLE,tableService:JAPAN_TABLE_SERVICE_ROLE});
const IDS=new Set(JAPAN_PAYROLL_ACTORS),SLOTS=Object.keys(JAPAN_PAYROLL_SLOTS);
const START_MINUTE=JAPAN_KITCHEN_ROLE.dutyWindow.startHour*60,END_MINUTE=JAPAN_KITCHEN_ROLE.dutyWindow.endHour*60,SHIFT_SECONDS=(END_MINUTE-START_MINUTE)/GAME_MINUTES_PER_SECOND;
const copy=x=>JSON.parse(JSON.stringify(x)),integer=x=>Number.isSafeInteger(x)&&x>=0,object=x=>x&&typeof x==='object'&&!Array.isArray(x);
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b),fail=code=>({ok:false,code});
const primary=id=>id==='jp-sushi'?'kitchen':'tableService';
const slotFor=kind=>kind==='cook'?'kitchen':['serve','wash'].includes(kind)?'tableService':null;
const near=(p,q,r=.18)=>Array.isArray(p)&&Array.isArray(q)&&Math.hypot(p[0]-q[0],p[2]-q[2])<=r&&Math.abs(p[1]-q[1])<.35;
const invoiceId=(actorId,day)=>`jp-staff-wage:${day}:${actorId}`;
const gameMinute=seconds=>600+seconds*GAME_MINUTES_PER_SECOND;
const dueAmount=row=>Math.floor(SLOTS.reduce((sum,slot)=>sum+JAPAN_PAYROLL_SLOTS[slot].wage*row.seconds[slot]/SHIFT_SECONDS,0)+1e-9);
const invoiceOrder=(a,b)=>a.day-b.day||a.actorId.localeCompare(b.actorId);
const receiptNumber=tx=>/^currency-([1-9][0-9]*)$/.test(tx?.id)?Number(tx.id.slice(9)):null;
const revenueKind=id=>/^jp-dining-[0-9]+-[1-9][0-9]*$/.test(id)?'dining':/^jp-performance-[0-9]+-[1-9][0-9]*-[1-9][0-9]*:act$/.test(id)?'performance':/^jp-performance-[0-9]+-[1-9][0-9]*-[1-9][0-9]*:drink$/.test(id)?'drink':null;
const revenueReceipt=(tx,start)=>tx?.action==='settle'&&tx.currency==='japan'&&integer(receiptNumber(tx))&&receiptNumber(tx)>=start&&revenueKind(tx.reservationId)?{id:tx.id,reservationId:tx.reservationId,amount:tx.amount,kind:revenueKind(tx.reservationId)}:null;
const ledgerSnapshot=ledger=>{const {cash,bank,accountOpened,total,loadError,...state}=ledger.state();return state;};

// Only two original seats. Actual original-order tasks have first claim; a
// person cannot collect both rates, and two people cannot collect one seat.
// Input is a lean read of the live controllers, never an inferred daily rota.
export function japanStaffCoverage({workers=[],duties={},rotation=null}={}) {
 const candidates=[],waiting=[],claimed=new Set(),used=new Set(),result=[];
 const available=slot=>duties[slot]!=='active';
 for(const w of workers){
  if(!IDS.has(w.id)||w.paused||w.mounted||w.heldMeeting||w.cooldown)continue;
  const task=w.task,claim=w.claim,ownBreak=rotation?.id===w.id;
  const matching=claim&&task?.orderJobId===claim.id&&claim.workerId===w.id&&!task.idle&&!task.staffLife&&!task.staffConversation;
  if(matching){
   const slot=slotFor(claim.kind);
   if(slot&&available(slot)&&(!ownBreak||rotation.phase==='draining')&&w.onTaskRoute)candidates.push({actorId:w.id,slot});
   continue; // A blocked/invalid live order never becomes pretend standby.
  }
  if(ownBreak||!w.canWork||task&&(!task.idle||task.staffLife||task.staffConversation||task.kitchenMeeting||task.tableMeeting)||!near(w.position,w.idleTarget)||task&&(!task.arrived||!near(task.to,w.idleTarget,.08)))continue;
  const relief=rotation?.reliefId===w.id&&!rotation.externalCoverage&&rotation.npcReliefReady&&rotation.retireReady&&rotation.reliefReady&&!['draining','handoff'].includes(rotation.phase);
  waiting.push({actorId:w.id,slots:[primary(w.id),...(relief?[primary(rotation.id)]:[])]});
 }
 const take=(actorId,slot)=>{if(!used.has(actorId)&&!claimed.has(slot)&&available(slot)){used.add(actorId);claimed.add(slot);result.push({actorId,slot});}};
 candidates.sort((a,b)=>(primary(a.actorId)===a.slot?0:1)-(primary(b.actorId)===b.slot?0:1)||a.actorId.localeCompare(b.actorId));
 for(const c of candidates)take(c.actorId,c.slot);
 for(let choice=0;choice<2;choice++)for(const w of waiting){const slot=w.slots[choice];if(slot&&duties[slot]!=='draining')take(w.actorId,slot);}
 return result;
}

function fresh(playerLedger,clock){
 const nextTransaction=playerLedger.state().nextTransaction;
 if(playerLedger.loadError||!integer(nextTransaction)||nextTransaction<1)throw Error('source-ledger-unavailable');
 return {version:1,capital:{...JAPAN_STAFF_CAPITAL},incomeStartTransaction:nextTransaction,till:JAPAN_STAFF_CAPITAL.amount,
  observedSeconds:clock.seconds,accounts:Object.fromEntries(JAPAN_PAYROLL_ACTORS.map(id=>[id,ledgerSnapshot(createCurrencyLedger())])),invoices:[],income:[]};
}
function validate(saved,playerLedger,clock){
 if(!object(saved)||saved.version!==1||!equal(saved.capital,JAPAN_STAFF_CAPITAL)||!integer(saved.incomeStartTransaction)||saved.incomeStartTransaction<1||saved.incomeStartTransaction>playerLedger.state().nextTransaction||!integer(saved.till)||!Number.isFinite(saved.observedSeconds)||saved.observedSeconds<0||saved.observedSeconds>clock.seconds+1e-7||!object(saved.accounts)||Object.keys(saved.accounts).length!==IDS.size||JAPAN_PAYROLL_ACTORS.some(id=>!object(saved.accounts[id]))||!Array.isArray(saved.invoices)||!Array.isArray(saved.income)||saved.invoices.length>20000)throw Error('invalid-payroll-state');
 const records=new Map(),slotTotals=new Map();let paid=0;
 for(const r of saved.invoices){
  if(!object(r)||!IDS.has(r.actorId)||!integer(r.day)||r.id!==invoiceId(r.actorId,r.day)||records.has(r.id)||!object(r.seconds)||Object.keys(r.seconds).length!==2||SLOTS.some(slot=>!Number.isFinite(r.seconds[slot])||r.seconds[slot]<0)||SLOTS.reduce((sum,s)=>sum+r.seconds[s],0)>SHIFT_SECONDS+1e-6||typeof r.closed!=='boolean'||typeof r.paid!=='boolean'||r.paid&&!r.closed||r.amount!==(r.closed?dueAmount(r):null))throw Error('invalid-duty-certificate');
  const elapsed=Math.max(0,Math.min(SHIFT_SECONDS,(gameMinute(saved.observedSeconds)-(r.day*1440+START_MINUTE))/GAME_MINUTES_PER_SECOND));
  if(SLOTS.reduce((sum,s)=>sum+r.seconds[s],0)>elapsed+1e-6||r.closed&&gameMinute(saved.observedSeconds)<r.day*1440+END_MINUTE-1e-7)throw Error('invalid-duty-certificate');
  for(const slot of SLOTS){const key=r.day+':'+slot,total=(slotTotals.get(key)||0)+r.seconds[slot];if(total>elapsed+1e-6)throw Error('overlapping-duty');slotTotals.set(key,total);}
  if(r.paid)paid+=r.amount;records.set(r.id,r);
 }
 const source=new Map(playerLedger.history().map(tx=>[tx.id,tx])),seen=new Set();let income=0;
 for(const receipt of saved.income){const expected=revenueReceipt(source.get(receipt.id),saved.incomeStartTransaction);if(!expected||!equal(receipt,expected)||seen.has(receipt.id))throw Error('invalid-revenue-source');seen.add(receipt.id);income+=receipt.amount;}
 if(!Number.isSafeInteger(income)||saved.till!==saved.capital.amount+income-paid)throw Error('unfunded-payroll');
 for(const actorId of JAPAN_PAYROLL_ACTORS){
  const ledger=createCurrencyLedger({saved:saved.accounts[actorId]});if(ledger.loadError)throw Error('invalid-owner-ledger');
  const state=ledger.state(),wages=new Set();
  if(state.interest?.day>clock.day)throw Error('future-bank-clock');
  if(state.legacyCopper.cash||state.legacyCopper.bank||state.legacyCopper.transactions.length)throw Error('unfunded-owner-ledger');
  for(const tx of ledger.history()){
   if(tx.currency!=='japan'||!['wage','interest'].includes(tx.action))throw Error('unsupported-owner-transaction');
   if(tx.action==='wage'){const r=records.get(tx.requestId);if(!r?.paid||r.actorId!==actorId||r.amount!==tx.amount||r.day!==tx.day||tx.roleId!=='jp-bathhouse-staff'||tx.slotId!==actorId||wages.has(r.id))throw Error('unfunded-owner-wage');wages.add(r.id);}
  }
  for(const r of records.values())if(r.actorId===actorId&&r.paid&&r.amount>0&&!wages.has(r.id))throw Error('missing-owner-wage');
 }
 return copy(saved);
}

/** Finite opening capital belongs to the bathhouse, never an NPC gift. Income
 * starts at the first activation's player-journal high water. Only future,
 * committed Japanese dining/show/drink settlements fund this business.
 *
 * Attendance is volatile simulation state, captured alongside the world clock.
 * Money candidates are detached and published only after one synchronous game
 * save. A failed save retains unpaid certificates and queued source receipts.
 * Daily invoices are actor+day unique; weighted actual-seat hours are floored
 * once, and full debts are paid in day/actor order without skipping a creditor.
 *
 * NPC accounts use the existing currency journal and its daily minimum-balance
 * interest. reserveFromTotal and exact-source refunds are already supported by
 * that journal; this batch does not create NPC purchases or a new consumer flow.
 */
export function createJapanStaffPayroll({saved,playerLedger,getClock,saveState}={}){
 let current=null,loadError=null,lastError=null,saving=false,initialized=saved!=null,lastTick=getClock?.()?.seconds,lastFlush=lastTick,retryAt=0,dirty=false;
 const incoming=new Map(),invoices=new Map(),openInvoices=new Map();
 try{const clock=getClock();if(!Number.isFinite(clock.seconds)||clock.seconds<0||playerLedger?.loadError)throw Error('invalid-clock');current=saved==null?fresh(playerLedger,clock):validate(saved,playerLedger,clock);for(const row of current.invoices){invoices.set(row.id,row);if(!row.closed)openInvoices.set(row.id,row);}}
 catch{loadError='invalid-japan-payroll';}
 const queue=tx=>{const receipt=current&&revenueReceipt(tx,current.incomeStartTransaction);if(receipt&&!current.income.some(r=>r.id===receipt.id))incoming.set(receipt.id,receipt);};
 if(!loadError)for(const tx of playerLedger.history())queue(tx);
 const unsubscribe=playerLedger?.subscribeCommitted(queue);
 function flush(){
  if(loadError)return fail(loadError);if(saving)return fail('payroll-busy');if(typeof saveState!=='function')return fail('persistence-unavailable');
  const clock=getClock();retryAt=clock.seconds+1;
  const next={...current,accounts:{...current.accounts},invoices:current.invoices.map(r=>({...r,seconds:{...r.seconds}})),income:current.income.slice()};
  let changed=dirty||!initialized;
  for(const receipt of incoming.values())if(!next.income.some(r=>r.id===receipt.id)){next.income.push(copy(receipt));next.till+=receipt.amount;changed=true;}
  if(!integer(next.till))return fail('balance-overflow');
  const owners=new Map();
  const owner=actorId=>{if(owners.has(actorId))return owners.get(actorId);const ledger=createCurrencyLedger({saved:next.accounts[actorId],getClock,saveState:state=>{next.accounts[actorId]=state;changed=true;}});owners.set(actorId,ledger);return ledger;};
  for(const actorId of JAPAN_PAYROLL_ACTORS){
   if(next.accounts[actorId].interest?.day===clock.day)continue;
   const day=owner(actorId).observeDay(clock.day);if(!day.ok){lastError=day.code;return day;}
  }
  for(const row of next.invoices.filter(r=>r.closed&&!r.paid).sort(invoiceOrder)){
   if(row.amount>next.till)break;
   if(row.amount){const paid=owner(row.actorId).creditWageToBank({amount:row.amount,receiptId:row.id,currency:'japan',roleId:'jp-bathhouse-staff',slotId:row.actorId,day:row.day});if(!paid.ok){lastError=paid.code;return paid;}}
   next.till-=row.amount;row.paid=true;changed=true;
  }
  if(!changed){lastFlush=clock.seconds;retryAt=0;return {ok:true,replayed:true};}
  saving=true;
  try{
   const result=saveState(copy(next));
   if(result?.then){Promise.resolve(result).catch(()=>{});lastError='async-save-unsupported';return fail(lastError);}
   if(result===false||result?.ok===false){lastError='save-failed';return fail(lastError);}
   current=next;invoices.clear();openInvoices.clear();for(const row of current.invoices){invoices.set(row.id,row);if(!row.closed)openInvoices.set(row.id,row);}incoming.clear();dirty=false;initialized=true;lastFlush=clock.seconds;retryAt=0;lastError=null;return {ok:true,replayed:false};
  }catch{lastError='save-failed';return fail(lastError);}finally{saving=false;}
 }
 function tick(dt,coverage=[]){
  if(loadError||saving)return fail(loadError||'payroll-busy');
  const clock=getClock(),now=clock.seconds;
  if(!Number.isFinite(now)||now<lastTick){lastError='clock-reversed';return fail(lastError);}
  // Reload, another region, clock jumps or oversized deltas never fill the gap.
  const elapsed=now-lastTick,continuous=Number.isFinite(dt)&&dt>0&&dt<=.25&&elapsed<=dt+1e-7;
  if(continuous&&elapsed>0){
   const slots=new Set(),actors=new Set();
   for(const c of coverage){
    if(!IDS.has(c.actorId)||!SLOTS.includes(c.slot)||actors.has(c.actorId)||slots.has(c.slot))continue;
    actors.add(c.actorId);slots.add(c.slot);
    const start=gameMinute(lastTick),end=gameMinute(now);
    for(let day=Math.floor(start/1440);day<=Math.floor(end/1440);day++){
     const seconds=Math.max(0,Math.min(end,day*1440+END_MINUTE)-Math.max(start,day*1440+START_MINUTE))/GAME_MINUTES_PER_SECOND;if(!seconds)continue;
     const id=invoiceId(c.actorId,day);let row=invoices.get(id);
     if(row?.closed)continue;
     if(!row){if(current.invoices.length>=20000){lastError='duty-limit';continue;}row={id,actorId:c.actorId,day,seconds:{kitchen:0,tableService:0},closed:false,amount:null,paid:false};current.invoices.push(row);invoices.set(id,row);openInvoices.set(id,row);}
     row.seconds[c.slot]+=seconds;dirty=true;
    }
   }
  }
  lastTick=now;current.observedSeconds=now;
  let closed=false;
  for(const row of openInvoices.values())if(gameMinute(now)>=row.day*1440+END_MINUTE-1e-7){row.closed=true;row.amount=dueAmount(row);openInvoices.delete(row.id);dirty=true;closed=true;}
  if(now>=retryAt&&(!initialized||closed||incoming.size||now-lastFlush>=5))return flush();
  return {ok:true};
 }
 const account=id=>current&&IDS.has(id)?createCurrencyLedger({saved:current.accounts[id]}).balances().japan:null;
 return {loadError,tick,flush,account,
  snapshot:()=>current?copy(current):null,
  // Internal synchronous world serializer only: avoids cloning account journals
  // on every simulation frame. Callers must never edit this reference.
  captureForSave:()=>current,
  state:()=>current?{...copy(current),accounts:Object.fromEntries(JAPAN_PAYROLL_ACTORS.map(id=>[id,account(id)])),arrears:current.invoices.filter(r=>r.closed&&!r.paid&&r.amount>0).map(r=>({id:r.id,actorId:r.actorId,day:r.day,amount:r.amount,status:'欠薪待付'})),loadError,lastError}: {loadError,lastError},
  dispose(){unsubscribe?.();}};
}
