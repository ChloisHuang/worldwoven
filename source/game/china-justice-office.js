// A principal vacancy comes only from the durable family life record. A hidden,
// absent, busy or unspawned NPC is never a vacancy. No life transition is made here.
export const JUSTICE_OFFICE_ID='cn-official-justice';
export const JUSTICE_PRINCIPAL_RANK='cn-justice-principal';
export function chinaJusticeVacancy({family,actor,worldSeed}={}){
 const dead=family?.loadError?null:family?.view?.(JUSTICE_OFFICE_ID);
 if(!dead||dead.actorId!==JUSTICE_OFFICE_ID||dead.alive!==false||!Number.isFinite(dead.diedDay)||dead.diedDay<0||
  !actor||actor.alive!==false||(actor.actorId||actor.station?.id)!==JUSTICE_OFFICE_ID||(actor.lifeId??actor.station?.lifeId??'original')!=='original')return {ok:false,code:'principal-no-vacancy'};
 return {ok:true,officeId:JUSTICE_OFFICE_ID,previousHolderId:JUSTICE_OFFICE_ID,vacancyId:`cn-justice-vacancy:death:${worldSeed}:${dead.diedDay}`};
}
export function justiceAuthority(appointment,holderKey='player@original'){
 return appointment?.rankId===JUSTICE_PRINCIPAL_RANK&&appointment.officeId===JUSTICE_OFFICE_ID&&appointment.vacancy?.vacancyId?
  {officeId:JUSTICE_OFFICE_ID,holderId:'player',appointmentId:appointment.appointmentId,holderKey,vacancyId:appointment.vacancy.vacancyId}:null;
}
// The case ledger creates these receipts only after a witnessed principal
// review and the original 8-second desk archive. Wages are once per simulated
// day, never per case or click. Failed bank writes retain the original source.
export function createJusticePayroll({careers,bank,getClock=()=>null,getAuthority=()=>null}){
 const wages=(bank.history?.()||[]).filter(t=>t.action==='wage'),settled=new Set(wages.map(t=>t.requestId)),latest=wages.findLast(t=>t.roleId===JUSTICE_OFFICE_ID);
 let last=latest?{day:latest.day,status:'paid',amount:latest.amount}:null;
 function settle(duties=[]){
  for(const duty of duties){
   const receiptId=`cn-justice-salary:${duty.day}`;
   if(settled.has(receiptId))continue;
   const appointment=careers.currentOfficialAppointment?.(duty.appointmentId),term=getAuthority(duty.appointmentId),clock=getClock();
   if(!appointment||!term||JSON.stringify(term)!==JSON.stringify(duty.officeTerm)||!Number.isSafeInteger(duty.day)||duty.day<appointment.sinceDay||duty.day>clock?.day)continue;
   // Already evaluated original clerk work keeps its frozen pay; the new office
   // cannot add a second government day wage on top of that same work day.
   if(careers.principalSalaryDayBlocked?.(duty.day)){settled.add(receiptId);last={day:duty.day,status:'original-clerk-day',amount:0};continue;}
   const archive=duty.steps?.at(-1),review=duty.steps?.find(step=>step.stage==='review');
   if(archive?.stage!=='archive'||archive.proof?.elapsed<8||archive.proof?.day!==duty.day||archive.proof?.officeTerm?.appointmentId!==appointment.appointmentId||review?.proof?.officeTerm?.appointmentId!==appointment.appointmentId)continue;
   let result;try{result=bank.creditWageToBank({amount:168,receiptId,currency:'copper',roleId:JUSTICE_OFFICE_ID,slotId:'cn-justice-principal-1',day:duty.day});}catch{result={ok:false,code:'save-failed'};}
   last={day:duty.day,status:result?.ok?'paid':'pending',amount:168,code:result?.code||null};
   if(result?.ok)settled.add(receiptId);
  }
  return last;
 }
 return {settle,state:()=>last?{...last}:null};
}
