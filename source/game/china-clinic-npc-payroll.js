// Event/low-frequency coordinator. The actual clinic owns physical coverage and
// original patient proof; the observer owns duty and the ledger owns bank funds.
export function createClinicNPCPayroll({clinic,observer,economy,getClock}){
 let receiptCursor=0,nextCheck=-Infinity,lastError=null,disposed=false;
 const unpaid=new Map(observer.closedDuties().filter(p=>!economy.hasReceipt(`clinic-government-wage:${p.slotId}:${p.actorId}:${p.day}`)).map(p=>[JSON.stringify([p.actorId,p.roleId,p.day]),p]));
 const same=(a,b)=>a.actorId===b.actorId&&a.roleId===b.roleId&&a.day===b.day;
 function checkpoint(){
  if(observer.loadError||economy.loadError){lastError=observer.loadError||economy.loadError;return false;}
  const clock=getClock();if(!observer.flush()){lastError='duty-save-failed';return false;}
  for(const receipt of clinic.npcDutyReceipts(receiptCursor)){
   if(observer.hasDuty(receipt)&&!observer.dutyClosed(receipt)&&!observer.recordPatient(receipt)){lastError='patient-proof-save-failed';return false;}receiptCursor++;
  }
  const pending=clinic.npcDutyPending();
  for(const row of observer.openDuties()){
   if(row.day>clock.day||row.day===clock.day&&clock.hour<18||pending.some(p=>same(row,p)))continue;
   const proof=observer.seal({...row,currentDay:clock.day,currentHour:clock.hour,pendingOrders:false});if(!proof){lastError='duty-seal-failed';return false;}unpaid.set(JSON.stringify([row.actorId,row.roleId,row.day]),proof);
  }
  for(const [id,proof]of unpaid){const result=economy.settle(proof);if(!result.ok){lastError=result.code;return false;}unpaid.delete(id);}
  lastError=null;return true;
 }
 return {checkpoint,state:()=>({lastError,pendingWages:unpaid.size,receiptCursor}),
  update(dt){if(disposed)return;const clock=getClock();observer.observe({seconds:clock.seconds,dt,coverage:clinic.npcDutyCoverage()});if(clock.seconds>=nextCheck){nextCheck=clock.seconds+5;checkpoint();}},
  dispose(){if(disposed)return;checkpoint();observer.suspend();disposed=true;}
 };
}
