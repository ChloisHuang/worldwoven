// Dana lends her existing dining-service seat. Work evidence belongs only to
// Samira's original resident order and the same dish washed after she eats.
export const EGYPT_TABLE_SERVICE_ROLE=Object.freeze({
 id:'eg-table-service',name:'尼罗餐桌服务员',slotId:'eg-table-service-1',country:'egypt',currency:'egypt',
 employer:'达娜',workplace:'尼罗餐厅 · 达娜的餐桌服务登记处',supervisorId:'egypt-royal-dining',incumbentId:'egypt-royal-dining',incumbentName:'达娜',
 vacancyKind:'exclusive',careerKind:'technical-service',workSource:'eg-table-service-labor',wage:14,minimumAgeYears:18,
 skillRequirements:Object.freeze({ritual:1}),dutyWindow:Object.freeze({startHour:6,endHour:18}),earlyBeforeHour:12,preparationBonus:0,
 duties:'虚构尼罗餐厅的普通服务岗位。须满18岁、礼仪1级，由达娜当面审核。录用后主动接班：替萨米拉记下原居民餐单，报给赫特，领取同号陶锅蔬食与面包并送给本人；等萨米拉实际用毕，再收回同一餐盘并亲手洗净。06:00–18:00真实安全交接后按现场职责覆盖工时计薪，正常候单计薪；上岗前、离岗与无效挂靠不计时，完整一班14埃及券存入银行。完整送餐与收洗才记评价和10点礼仪经验，与学习共用每日4次上限；120秒内完成记及时，迟做或未完交班另记评价，不增扣工时工资。架空技术服务岗位，不授官品。居民供膳只用现有一次性24份储备，无每日补货；玩家访客餐另付5埃及券。',
});

export const EGYPT_TABLE_SERVICE_TIMELY_SECONDS=120;
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const serial=value=>Number.isSafeInteger(value)&&value>0;
// Issued by the original meal service only after the resident has eaten and
// the original dish has been washed. Handoff is terminal unfinished evidence.
export function validEgyptTableServiceReceipt(r){
 if(!object(r)||r.source!=='egypt-table-service'||r.customerId!=='egypt-papyrus'||r.customerName!=='萨米拉'||
  r.dishId!=='visitor-bread-stew'||!serial(r.number)||typeof r.orderId!=='string'||typeof r.workReceiptId!=='string'||
  !Number.isFinite(r.waitSeconds)||r.waitSeconds<0)return false;
 const order=/^egypt-meal-([1-9][0-9]*)$/.exec(r.orderId),work=/^eg-table-service-labor-([1-9][0-9]*)$/.exec(r.workReceiptId);
 if(!order||!work||Number(order[1])!==r.number||!serial(Number(work[1]))||
  r.id!==`${r.orderId}-serve-${r.workReceiptId}`||r.itemId!==`${r.orderId}-dish`||r.supplyReceipt!==`${r.orderId}-prepared`||
  r.timely!==(r.waitSeconds<=EGYPT_TABLE_SERVICE_TIMELY_SECONDS))return false;
 return r.outcome==='handoff'?r.completed===false&&r.accurate===false:
  r.completed===true&&r.accurate===true&&r.outcome===(r.timely?'completed':'late');
}
const RECEIPT_FIELDS=['source','id','workReceiptId','orderId','number','customerId','customerName','itemId','dishId','supplyReceipt','outcome','waitSeconds','completed','accurate','timely'];
export const sameEgyptTableServiceReceipt=(a,b)=>RECEIPT_FIELDS.every(key=>a?.[key]===b?.[key]);
export const egyptTableServiceReviewScore=r=>r.outcome==='completed'?1:r.outcome==='late'?0:-1;
