// Haru lends the single original kitchen seat. Serving the original guest's
// meal is ordinary technical work and does not include the player's own meal.
export const JAPAN_KITCHEN_ROLE=Object.freeze({
 id:'jp-kitchen-cook',name:'汤屋厨房制作员',slotId:'jp-kitchen-cook-1',country:'japan',currency:'japan',
 employer:'Haru',workplace:'霞汤屋 · 一层厨房登记处',supervisorId:'jp-sushi',incumbentId:'jp-sushi',incumbentName:'Haru',
 vacancyKind:'exclusive',careerKind:'technical-service',workSource:'jp-kitchen-labor',wage:18,minimumAgeYears:18,
 skillRequirements:Object.freeze({cooking:1,ritual:1}),dutyWindow:Object.freeze({startHour:6,endHour:18}),earlyBeforeHour:12,preparationBonus:0,
 duties:'须满18岁、烹饪1级、礼仪1级，由Haru当面审核。录用后另行接班：核对来客号与寿司或拉面原单，按单制作、核对装盘，再将同号餐点放回原传菜位，由Daichi取盘送给原客。06:00–18:00按实际在岗工时计薪，完整一班18日本券存入银行。一单完成后继续候单；准确出品积累烹饪经验，及时、迟做与未完交班分别记录评价。工作不包含泡汤或餐食。',
});

export const JAPAN_KITCHEN_TIMELY_SECONDS=90;
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const serial=value=>Number.isSafeInteger(value)&&value>0;
// Only the original board issues this after the original completed meal reaches
// its pickup, or after Haru takes back the guest's unfinished cooking order.
export function validJapanKitchenReceipt(r){
 if(!object(r)||r.source!=='japan-kitchen'||r.kind!=='cook'||!['sushi','ramen'].includes(r.dishId)||
  !serial(r.number)||typeof r.visitId!=='string'||typeof r.workReceiptId!=='string'||
  typeof r.customerName!=='string'||r.customerName.length<1||r.customerName.length>80||
  !Number.isFinite(r.waitSeconds)||r.waitSeconds<0)return false;
 const visit=/^jp-visitor-(0|[1-9][0-9]*)-([1-9][0-9]*)$/.exec(r.visitId),work=/^jp-kitchen-labor-([1-9][0-9]*)$/.exec(r.workReceiptId);
 if(!visit||!work||!Number.isSafeInteger(Number(visit[1]))||Number(visit[1])>0xffffffff||Number(visit[2])!==r.number||!serial(Number(work[1]))||
  r.id!==`${r.visitId}-cook-${r.workReceiptId}`||r.customerId!==r.visitId||r.tokenId!==`${r.visitId}:token`||r.itemId!==`${r.visitId}:meal`||
  r.timely!==(r.waitSeconds<=JAPAN_KITCHEN_TIMELY_SECONDS))return false;
 return r.outcome==='handoff'?r.completed===false&&r.accurate===false:
  r.completed===true&&r.accurate===true&&r.outcome===(r.timely?'completed':'late');
}
const RECEIPT_FIELDS=['source','id','workReceiptId','visitId','number','customerId','customerName','kind','tokenId','itemId','dishId','outcome','waitSeconds','completed','accurate','timely'];
export const sameJapanKitchenReceipt=(a,b)=>RECEIPT_FIELDS.every(key=>a?.[key]===b?.[key]);
export const japanKitchenReviewScore=r=>r.outcome==='completed'?1:r.outcome==='late'?0:-1;
