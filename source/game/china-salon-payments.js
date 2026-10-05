// Visitor purses stay in the existing tavern world. A hold is money moved out
// of that purse, not a fresh allowance. Candidate worlds commit atomically.
const copy=x=>JSON.parse(JSON.stringify(x));
export const salonReceipt=id=>/^cn-salon-work-[1-9][0-9]*$/.test(id);
export function validSalonVisitor(v){
 const h=v.salonPayment;
 if(v.mode==='salon'&&!salonReceipt(v.salonClaimId))return false;
 if(v.mode!=='salon'&&v.salonClaimId!==undefined)return false;
 if(h!==undefined&&(!salonReceipt(h.id)||!Number.isSafeInteger(h.amount)||h.amount<1||!Number.isSafeInteger(h.day)||h.day<0||!['reserved','refunded','settled'].includes(h.status)))return false;
 return h?.status!=='reserved'||v.mode==='salon'&&v.salonClaimId===h.id;
}
export function changeSalonVisitor(world,order,operation){
 if(!world||!salonReceipt(order?.id))return null;
 const next=copy(world),v=next.visitors.find(v=>v.id===order.customerId);if(!v)return null;
 if(operation==='invite'){
  if(v.mode!=='idle'||v.salonPayment?.status==='reserved')return null;
  v.mode='salon';v.salonClaimId=order.id;return next;
 }
 if(v.mode!=='salon'||v.salonClaimId!==order.id)return null;
 if(operation==='reserve'){
  if(v.salonPayment?.id===order.id)return v.salonPayment.status==='reserved'&&v.salonPayment.amount===order.fee?next:null;
  if(v.copper<order.fee||!Number.isSafeInteger(order.fee)||order.fee<1)return null;
  v.copper-=order.fee;v.salonPayment={id:order.id,amount:order.fee,day:order.day,status:'reserved'};return next;
 }
 const hold=v.salonPayment?.id===order.id?v.salonPayment:null;
 if(operation==='settle'){
  if(!hold||hold.status!=='reserved'||hold.amount!==order.fee||hold.day!==order.day)return null;
  hold.status='settled';
 }else if(operation==='cancel'){
  if(hold?.status==='reserved'){v.copper+=hold.amount;hold.status='refunded';}
 }else return null;
 v.mode='leaving';delete v.salonClaimId;return next;
}
