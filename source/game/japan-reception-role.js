// A fictional shop apprenticeship, not a court appointment. Training comes
// from the original visitor ledger and returned bath token at the live desk.
export const JAPAN_RECEPTION_ROLE=Object.freeze({
 id:'jp-reception-apprentice',name:'汤馆接待见习',slotId:'jp-reception-apprentice-1',country:'japan',currency:'japan',
 employer:'Koharu',workplace:'霞汤屋 · 一层接待登记台',supervisorId:'jp-welcome',incumbentId:'jp-welcome',incumbentName:'Koharu',
 vacancyKind:'exclusive',careerKind:'apprenticeship',workSource:'jp-reception-labor',wage:12,minimumAgeYears:18,
 skillRequirements:Object.freeze({ritual:0,writing:0}),dutyWindow:Object.freeze({startHour:6,endHour:18}),earlyBeforeHour:12,preparationBonus:0,
 duties:'18岁起可申请，无技能前置。Koharu当面核验并说明店规，录用后另行开班。06:00–18:00在接待台候单；对原来客登记客簿、发同号浴牌，再于离店时核号收牌。交班按实际现场工时计日薪，准确性与时效另记评价，不增发工资；真实完成才积累文书经验。本店的幻想学徒规则不授官品。',
});

const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const serial=value=>Number.isSafeInteger(value)&&value>0;
// Produced only by the physical service board. Neither opening a card nor a
// clock tick creates a registration, return, training credit or review.
export function validJapanReceptionReceipt(r){
 if(!object(r)||r.source!=='japan-reception'||!['register','checkout'].includes(r.kind)||
  !serial(r.number)||typeof r.customerName!=='string'||r.customerName.length<1||r.customerName.length>80||
  !Number.isFinite(r.waitSeconds)||r.waitSeconds<0)return false;
 const visit=/^jp-visitor-(0|[1-9][0-9]*)-([1-9][0-9]*)$/.exec(r.visitId),work=/^jp-reception-labor-([1-9][0-9]*)$/.exec(r.workReceiptId);
 if(!visit||!work||!Number.isSafeInteger(Number(visit[1]))||Number(visit[1])>0xffffffff||Number(visit[2])!==r.number||!serial(Number(work[1]))||
  r.id!==`${r.visitId}-${r.kind}-${r.workReceiptId}`||r.customerId!==r.visitId||r.tokenId!==`${r.visitId}:token`||r.timely!==(r.waitSeconds<=60))return false;
 return r.outcome==='handoff'?r.completed===false&&r.accurate===false:
  r.completed===true&&r.accurate===true&&r.outcome===(r.timely?'completed':'late');
}
const RECEIPT_FIELDS=['source','id','workReceiptId','visitId','number','customerId','customerName','kind','tokenId','outcome','waitSeconds','completed','accurate','timely'];
export const sameJapanReceptionReceipt=(a,b)=>RECEIPT_FIELDS.every(key=>a?.[key]===b?.[key]);
export const japanReceptionReviewScore=r=>r.outcome==='completed'?1:r.outcome==='late'?0:-1;
