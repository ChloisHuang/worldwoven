// Original exhibition production, not customer demand or a sale.
// The formal public-employment wage is separate from any business revenue.
export const FRANCE_ART_ROLE=Object.freeze({
 id:'fr-atelier-artist',name:'宫苑原画师',slotId:'fr-atelier-artist-1',country:'france',currency:'france',
 employer:'卢西安',workplace:'皇家艺术书斋 · 原画展览',supervisorId:'france-atelier',incumbentId:'france-atelier',incumbentName:'卢西安',
 vacancyKind:'exclusive',careerKind:'technical-service',workSource:'fr-atelier-labor',wage:16,minimumAgeYears:18,
 skillRequirements:Object.freeze({art:2,writing:1}),dutyWindow:Object.freeze({startHour:6,endHour:18}),earlyBeforeHour:12,preparationBonus:0,
 duties:'须满18岁、艺术2级、文书1级，由卢西安本人审核。接班后选宫苑花园或柱廊及晨光或暖暮，领同号画布与颜料、描稿上色、携原画归档陈列。06:00–18:00按真实在岗工时计薪，完整一班16法国券存银行；工资来自既有正式雇用结算，不是卖画收入。每件完成原作艺术经验10点，共用每日4次成长上限。六套一次性开局展览耗材，不每日补货；每天最多开始一幅，耗尽后停止新作，可交班。原艺术学习保持开放。',
});

export const FRANCE_ART_TIMELY_SECONDS=180;
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const serial=value=>Number.isSafeInteger(value)&&value>0;
export function validFranceArtReceipt(r){
 if(!object(r)||r.source!=='france-art'||r.customerId!=='france-atelier'||r.customerName!=='卢西安'||
  !serial(r.number)||r.number>6||typeof r.orderId!=='string'||typeof r.workReceiptId!=='string'||
  !Number.isFinite(r.waitSeconds)||r.waitSeconds<0)return false;
 const order=/^france-art-([1-9][0-9]*)$/.exec(r.orderId),work=/^fr-atelier-labor-([1-9][0-9]*)$/.exec(r.workReceiptId);
 if(!order||!work||Number(order[1])!==r.number||!serial(Number(work[1]))||
  r.id!==`${r.orderId}-art-${r.workReceiptId}`||r.itemId!==`${r.orderId}-canvas`||r.supplyReceipt!==`${r.orderId}-materials`||
  r.timely!==(r.waitSeconds<=FRANCE_ART_TIMELY_SECONDS))return false;
 return r.outcome==='handoff'?r.completed===false&&r.accurate===false:
  r.completed===true&&r.accurate===true&&r.outcome===(r.timely?'completed':'late');
}
const RECEIPT_FIELDS=['source','id','workReceiptId','orderId','number','customerId','customerName','itemId','supplyReceipt','outcome','waitSeconds','completed','accurate','timely'];
export const sameFranceArtReceipt=(a,b)=>RECEIPT_FIELDS.every(key=>a?.[key]===b?.[key]);
export const franceArtReviewScore=r=>r.outcome==='completed'?1:r.outcome==='late'?0:-1;
