// The existing men's-bath attendant lends one service seat. Employment does
// not confer an official rank, a bath ticket or permission to eat shop meals.
export const JAPAN_BATH_DELIVERY_ROLE=Object.freeze({
 id:'jp-bath-delivery',name:'男汤浴包配送员',slotId:'jp-bath-delivery-1',country:'japan',currency:'japan',
 employer:'Sora',workplace:'霞汤屋 · 男汤配送登记处',supervisorId:'jp-onsen',incumbentId:'jp-onsen',incumbentName:'Sora',
 vacancyKind:'exclusive',careerKind:'technical-service',workSource:'jp-bath-delivery-labor',wage:14,minimumAgeYears:18,
 skillRequirements:Object.freeze({ritual:1}),dutyWindow:Object.freeze({startHour:6,endHour:18}),earlyBeforeHour:12,preparationBonus:0,
 duties:'须满18岁、礼仪1级，由Sora当面审核。录用后另行开班，06:00–18:00在馆候单；接原男汤客单，到四层取同号浴包，再送到原客服务交接点，核对原浴牌与本人。交班按实际现场工时计薪；及时、迟送与交回分别记评价，不增扣工资。真实准确交付才积累有限照护经验。技术服务不授官品，工作不授免费泡汤或用餐资格。',
});
export const JAPAN_WOMEN_BATH_DELIVERY_ROLE=Object.freeze({
 id:'jp-women-bath-delivery',name:'女汤浴包配送员',slotId:'jp-women-bath-delivery-1',country:'japan',currency:'japan',
 employer:'Mei',workplace:'霞汤屋 · 二层共用服务门厅女汤配送登记处',supervisorId:'jp-women-onsen',incumbentId:'jp-women-onsen',incumbentName:'Mei',
 vacancyKind:'exclusive',careerKind:'technical-service',workSource:'jp-women-bath-delivery-labor',wage:14,minimumAgeYears:18,
 skillRequirements:Object.freeze({ritual:1}),dutyWindow:Object.freeze({startHour:6,endHour:18}),earlyBeforeHour:12,preparationBonus:0,
 duties:'须满18岁、礼仪1级，在二层共用服务门厅由Mei当面审核。录用后另行开班，06:00–18:00在馆候单；接原女汤客单，到四层取同号浴包，再送到原客服务交接点，核对原浴牌与本人。交班按实际现场工时计薪；及时、迟送与交回分别记评价，不增扣工资。真实准确交付才积累有限照护经验。技术服务不授官品，工作不授免费泡汤或用餐资格，不改变汤区通行规则。',
});
export const JAPAN_BATH_DELIVERY_ROLES=Object.freeze({men:JAPAN_BATH_DELIVERY_ROLE,women:JAPAN_WOMEN_BATH_DELIVERY_ROLE});
export const japanBathDeliveryRole=(side='men')=>Object.hasOwn(JAPAN_BATH_DELIVERY_ROLES,side)?JAPAN_BATH_DELIVERY_ROLES[side]:null;

// The four-floor round trip receives its own service window; desk work keeps
// the reception role's shorter deadline.
export const JAPAN_BATH_DELIVERY_TIMELY_SECONDS=180;
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const serial=value=>Number.isSafeInteger(value)&&value>0;
export function validJapanBathDeliveryReceipt(r){
 if(!object(r)||r.source!=='japan-bath-delivery'||r.kind!=='deliverMix'||!['men','women'].includes(r.side)||
  !serial(r.number)||typeof r.customerName!=='string'||r.customerName.length<1||r.customerName.length>80||
  !Number.isFinite(r.waitSeconds)||r.waitSeconds<0)return false;
 const visit=/^jp-visitor-(0|[1-9][0-9]*)-([1-9][0-9]*)$/.exec(r.visitId),work=new RegExp('^'+japanBathDeliveryRole(r.side).workSource+'-([1-9][0-9]*)$').exec(r.workReceiptId);
 if(!visit||!work||!Number.isSafeInteger(Number(visit[1]))||Number(visit[1])>0xffffffff||Number(visit[2])!==r.number||!serial(Number(work[1]))||
  r.id!==`${r.visitId}-deliverMix-${r.workReceiptId}`||r.customerId!==r.visitId||r.tokenId!==`${r.visitId}:token`||r.itemId!==`${r.visitId}:mixture`||
  r.timely!==(r.waitSeconds<=JAPAN_BATH_DELIVERY_TIMELY_SECONDS))return false;
 return r.outcome==='handoff'?r.completed===false&&r.accurate===false:
  r.completed===true&&r.accurate===true&&r.outcome===(r.timely?'completed':'late');
}
const RECEIPT_FIELDS=['source','id','workReceiptId','visitId','number','customerId','customerName','kind','tokenId','itemId','side','outcome','waitSeconds','completed','accurate','timely'];
export const sameJapanBathDeliveryReceipt=(a,b)=>RECEIPT_FIELDS.every(key=>a?.[key]===b?.[key]);
export const japanBathDeliveryReviewScore=r=>r.outcome==='completed'?1:r.outcome==='late'?0:-1;
