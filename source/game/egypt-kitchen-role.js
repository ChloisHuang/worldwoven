// Het lends the original kitchen seat. Only Samira's original resident meal
// can establish work evidence; the player's paid visitor meal stays separate.
export const EGYPT_KITCHEN_ROLE=Object.freeze({
 id:'eg-kitchen-cook',name:'尼罗厨房制作员',slotId:'eg-kitchen-cook-1',country:'egypt',currency:'egypt',
 employer:'赫特',workplace:'尼罗厨房 · 赫特的供膳登记处',supervisorId:'egypt-royal-kitchen',incumbentId:'egypt-royal-kitchen',incumbentName:'赫特',
 vacancyKind:'exclusive',careerKind:'technical-service',workSource:'eg-kitchen-labor',wage:18,minimumAgeYears:18,
 skillRequirements:Object.freeze({cooking:1,ritual:1}),dutyWindow:Object.freeze({startHour:6,endHour:18}),earlyBeforeHour:12,preparationBonus:0,
 duties:'须满18岁、烹饪1级、礼仪1级，由赫特当面审核。录用后主动接班，核对萨米拉的原居民餐单，备料、烹制、装盘并送交同一份陶锅蔬食与面包，原居民实际用毕后才记评价与烹饪经验。06:00–18:00按实际在岗工时计薪，须有已用毕原单才可验收，完整一班18埃及券存入银行；及时、迟做与未完交班分别记评价，不增扣工时工资。架空技术服务岗位，不授官品。居民供膳仅有一次性24份开局储备，无每日补货，完整财政未接；玩家访客餐仍须另付5埃及券。',
});

export const EGYPT_KITCHEN_TIMELY_SECONDS=90;
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const serial=value=>Number.isSafeInteger(value)&&value>0;
// The original meal service issues completed evidence only when the same
// resident actually finishes the original numbered dish. Handoff is terminal
// unfinished work and cannot be replayed later as that order's completion.
export function validEgyptKitchenReceipt(r){
 if(!object(r)||r.source!=='egypt-kitchen'||r.customerId!=='egypt-papyrus'||r.customerName!=='萨米拉'||
  r.dishId!=='visitor-bread-stew'||!serial(r.number)||typeof r.orderId!=='string'||typeof r.workReceiptId!=='string'||
  !Number.isFinite(r.waitSeconds)||r.waitSeconds<0)return false;
 const order=/^egypt-meal-([1-9][0-9]*)$/.exec(r.orderId),work=/^eg-kitchen-labor-([1-9][0-9]*)$/.exec(r.workReceiptId);
 if(!order||!work||Number(order[1])!==r.number||!serial(Number(work[1]))||
  r.id!==`${r.orderId}-cook-${r.workReceiptId}`||r.itemId!==`${r.orderId}-dish`||r.supplyReceipt!==`${r.orderId}-prepared`||
  r.timely!==(r.waitSeconds<=EGYPT_KITCHEN_TIMELY_SECONDS))return false;
 return r.outcome==='handoff'?r.completed===false&&r.accurate===false:
  r.completed===true&&r.accurate===true&&r.outcome===(r.timely?'completed':'late');
}
const RECEIPT_FIELDS=['source','id','workReceiptId','orderId','number','customerId','customerName','itemId','dishId','supplyReceipt','outcome','waitSeconds','completed','accurate','timely'];
export const sameEgyptKitchenReceipt=(a,b)=>RECEIPT_FIELDS.every(key=>a?.[key]===b?.[key]);
export const egyptKitchenReviewScore=r=>r.outcome==='completed'?1:r.outcome==='late'?0:-1;
