import {validateReceptionProof} from './china-salon-reception-proof.js';

// Reception is an attendance-paid job. Completed customer records teach the
// player writing, but never mint the incumbent's historic per-order salary.
export const SALON_RECEPTION_CAREER_ROLE=Object.freeze({
 id:'cn-salon-reception',name:'云来楼艺事接待员',slotId:'cn-salon-reception-1',country:'china',currency:'copper',
 employer:'温晚',workplace:'云来楼三层 · 温晚接待案',supervisorId:'cn-tavern-reception',incumbentId:'cn-tavern-reception',incumbentName:'温晚',
 vacancyKind:'exclusive',workSource:'cn-salon-reception-labor',wage:16,minimumAgeYears:18,
 skillRequirements:Object.freeze({ritual:2,writing:1}),dutyWindow:Object.freeze({startHour:6,endHour:18}),earlyBeforeHour:12,preparationBonus:0,
 duties:'18岁起可申请，礼仪2级、文书1级。温晚当面审核；录用后另行开班，06:00–18:00在原接待案登记真实来客、核对原艺者与房间、服务后核账。基础日薪16文按实际在岗工时结算，由云来楼现有经营账支付；顾客评价与文书经验不另增工资。',
});
const FIELDS=['source','id','workReceiptId','sessionId','customerId','customerName','completed','accurate','timely','waitSeconds','proof'];
export function validChinaSalonReceptionReceipt(r){
 try{
  if(!r||typeof r!=='object'||Array.isArray(r)||Object.keys(r).length!==FIELDS.length||FIELDS.some(key=>!Object.hasOwn(r,key))||
   r.source!=='china-salon-reception'||!/^cn-salon-reception-labor-[1-9][0-9]*$/.test(r.workReceiptId)||!Number.isSafeInteger(Number(r.workReceiptId.split('-').at(-1)))||
   r.id!==`${r.sessionId}-${r.workReceiptId}`||typeof r.customerName!=='string'||!r.customerName.length||r.customerName.length>80||
   r.completed!==true||r.accurate!==true||!Number.isFinite(r.waitSeconds)||r.waitSeconds<0||r.timely!==(r.waitSeconds<=60))return false;
  const proof=validateReceptionProof(r.proof);
  return proof.actorId==='player'&&proof.contractVersion===2&&proof.amount===0&&proof.sessionId===r.sessionId&&proof.customerId===r.customerId&&r.customerId!=='player';
 }catch{return false;}
}
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
export const sameChinaSalonReceptionReceipt=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
export const chinaSalonReceptionReviewScore=receipt=>receipt.timely?1:0;
