// Samira's original workshop lends one technical-service seat. Only Ahe's
// acceptance of the same numbered materials and scroll proves finished work.
export const EGYPT_ARTISAN_ROLE=Object.freeze({
 id:'eg-papyrus-artisan',name:'纸莎草工艺师',slotId:'eg-papyrus-artisan-1',country:'egypt',currency:'egypt',
 employer:'萨米拉',workplace:'神殿书吏壁龛 · 纸莎草工案',supervisorId:'egypt-papyrus',incumbentId:'egypt-papyrus',incumbentName:'萨米拉',
 vacancyKind:'exclusive',careerKind:'technical-service',workSource:'eg-papyrus-labor',wage:16,minimumAgeYears:18,
 skillRequirements:Object.freeze({art:1,writing:1}),dutyWindow:Object.freeze({startHour:6,endHour:18}),earlyBeforeHour:12,preparationBonus:0,
 duties:'须满18岁、艺术1级、文书1级，由萨米拉当面审核。主动接班后核对阿赫的原编号委托，领用有限同号材料，制作纸莎草卷并交本人验收。06:00–18:00按真实在岗工时计薪，正常候单计薪，完整一班16埃及券存银行。阿赫验收后每单艺术经验10点，与学习共用每日4次成长；180秒内记及时，迟做与未完交班另记评价，不增扣工资。八份初始来访图卷，每日最多登记下一份；独立8张纸与8份颜料不每日补货，不授官品。',
});

export const EGYPT_ARTISAN_TIMELY_SECONDS=180;
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const serial=value=>Number.isSafeInteger(value)&&value>0;
export function validEgyptArtisanReceipt(r){
 if(!object(r)||r.source!=='egypt-artisan'||r.customerId!=='egypt-royal-reception'||r.customerName!=='阿赫'||
  !serial(r.number)||typeof r.orderId!=='string'||typeof r.workReceiptId!=='string'||
  !Number.isFinite(r.waitSeconds)||r.waitSeconds<0)return false;
 const order=/^egypt-artisan-([1-9][0-9]*)$/.exec(r.orderId),work=/^eg-papyrus-labor-([1-9][0-9]*)$/.exec(r.workReceiptId);
 if(!order||!work||Number(order[1])!==r.number||!serial(Number(work[1]))||
  r.id!==`${r.orderId}-art-${r.workReceiptId}`||r.itemId!==`${r.orderId}-scroll`||r.supplyReceipt!==`${r.orderId}-materials`||
  r.timely!==(r.waitSeconds<=EGYPT_ARTISAN_TIMELY_SECONDS))return false;
 return r.outcome==='handoff'?r.completed===false&&r.accurate===false:
  r.completed===true&&r.accurate===true&&r.outcome===(r.timely?'completed':'late');
}
const RECEIPT_FIELDS=['source','id','workReceiptId','orderId','number','customerId','customerName','itemId','supplyReceipt','outcome','waitSeconds','completed','accurate','timely'];
export const sameEgyptArtisanReceipt=(a,b)=>RECEIPT_FIELDS.every(key=>a?.[key]===b?.[key]);
export const egyptArtisanReviewScore=r=>r.outcome==='completed'?1:r.outcome==='late'?0:-1;
