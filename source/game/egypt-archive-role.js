// Downstream custody of the eight actual R203 originals. No new commissions.
export const EGYPT_ARCHIVE_ROLE=Object.freeze({
 id:'eg-reception-archive',name:'接待卷轴登记员',slotId:'eg-reception-archive-1',country:'egypt',currency:'egypt',
 employer:'阿赫',workplace:'王室接待处 · 原卷登记收存',supervisorId:'egypt-royal-reception',incumbentId:'egypt-royal-reception',incumbentName:'阿赫',
 vacancyKind:'exclusive',careerKind:'technical-service',workSource:'eg-archive-labor',wage:16,minimumAgeYears:18,
 skillRequirements:Object.freeze({writing:1,ritual:1}),dutyWindow:Object.freeze({startHour:6,endHour:18}),earlyBeforeHour:12,preparationBonus:0,
 duties:'须满18岁、文书1级、礼仪1级，由阿赫当面审核。接班后只登记萨米拉已经制作并由阿赫验收的原号卷轴，核记原号、持原卷移至接待案右侧同号格收存。06:00–18:00按真实在岗工时计薪，正常候卷计薪，完整一班16埃及券存银行。收存原卷给文书经验10点，共用每日4次成长；180秒内记及时，迟做与未完交回另记评价，不增扣工资。只接原八份有限委托，不造来客、借阅或新材料；阿赫仍本人验收工艺原卷。',
});
export const EGYPT_ARCHIVE_TIMELY_SECONDS=180;
export function validEgyptArchiveReceipt(r){
 if(!r||r.source!=='egypt-archive'||r.customerId!=='egypt-royal-reception'||r.customerName!=='阿赫'||!Number.isSafeInteger(r.number)||r.number<1||r.number>8||r.orderId!==`egypt-artisan-${r.number}`||!/^eg-archive-labor-[1-9][0-9]*$/.test(r.workReceiptId)||!Number.isSafeInteger(Number(r.workReceiptId.split('-').at(-1)))||r.id!==`${r.orderId}-archive-${r.workReceiptId}`||r.itemId!==r.orderId+'-scroll'||r.supplyReceipt!==r.orderId+'-materials'||!Number.isFinite(r.waitSeconds)||r.waitSeconds<0||r.timely!==(r.waitSeconds<=180))return false;
 return r.outcome==='handoff'?r.completed===false&&r.accurate===false:r.completed===true&&r.accurate===true&&r.outcome===(r.timely?'completed':'late');
}
const FIELDS=['source','id','workReceiptId','orderId','number','customerId','customerName','itemId','supplyReceipt','outcome','waitSeconds','completed','accurate','timely'];
export const sameEgyptArchiveReceipt=(a,b)=>FIELDS.every(k=>a?.[k]===b?.[k]);
export const egyptArchiveReviewScore=r=>r.outcome==='completed'?1:r.outcome==='late'?0:-1;
