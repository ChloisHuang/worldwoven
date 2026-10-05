// Daichi lends the original dining service seat in this fictional bathhouse.
// Employment covers guest service, never the player's own meal or bath.
export const JAPAN_TABLE_SERVICE_ROLE=Object.freeze({
 id:'jp-table-service',name:'汤屋餐桌服务员',slotId:'jp-table-service-1',country:'japan',currency:'japan',
 employer:'Daichi',workplace:'霞汤屋 · 一层餐桌服务登记处',supervisorId:'jp-ramen',incumbentId:'jp-ramen',incumbentName:'Daichi',
 vacancyKind:'exclusive',careerKind:'technical-service',workSource:'jp-table-service-labor',wage:14,minimumAgeYears:18,
 skillRequirements:Object.freeze({ritual:1}),dutyWindow:Object.freeze({startHour:6,endHour:18}),earlyBeforeHour:12,preparationBonus:0,
 duties:'虚构汤屋的普通餐桌服务岗位。须满18岁、礼仪1级，由Daichi当面审核。录用后另行接班：查看原客单，到传菜位取同号寿司或拉面，核对客人与桌位后上菜；等原客用毕，再收回原盘并亲手洗净。06:00–18:00按实际在岗工时计薪，完整一班14日本券存入银行。准确完成送餐与收洗才积累礼仪经验；错客、错桌或错菜被拒会记差评，改正后可完成原单。评价不增扣工资，工作不包含泡汤或餐食，不授官品。',
});

export const JAPAN_TABLE_SERVICE_TIMELY_SECONDS=120;
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const serial=value=>Number.isSafeInteger(value)&&value>0;
const visitParts=value=>{
 if(typeof value!=='string')return null;
 const m=/^jp-visitor-(0|[1-9][0-9]*)-([1-9][0-9]*)$/.exec(value);
 return m&&Number.isSafeInteger(Number(m[1]))&&Number(m[1])<=0xffffffff&&serial(Number(m[2]))?m:null;
};
// Only the original board may issue this proof: completed service follows the
// guest's meal and the player's wash; a complaint follows actual rejection.
export function validJapanTableServiceReceipt(r){
 if(!object(r)||r.source!=='japan-table-service'||!['serve','complaint'].includes(r.kind)||!['sushi','ramen'].includes(r.dishId)||
  !serial(r.number)||typeof r.workReceiptId!=='string'||typeof r.customerName!=='string'||r.customerName.length<1||r.customerName.length>80||
  !Number.isFinite(r.waitSeconds)||r.waitSeconds<0)return false;
 const visit=visitParts(r.visitId),target=visitParts(r.targetVisitId),work=/^jp-table-service-labor-([1-9][0-9]*)$/.exec(r.workReceiptId);
 if(!visit||!target||visit[1]!==target[1]||!work||Number(visit[2])!==r.number||!serial(Number(work[1]))||
  r.customerId!==r.visitId||r.tokenId!==`${r.visitId}:token`||r.itemId!==`${r.visitId}:meal`||
  r.timely!==(r.waitSeconds<=JAPAN_TABLE_SERVICE_TIMELY_SECONDS))return false;
 if(r.kind==='complaint')return serial(r.attempt)&&r.id===`${r.visitId}-complaint-${r.attempt}-${r.workReceiptId}`&&
  ['wrong-guest','wrong-table','wrong-dish'].includes(r.reasonCode)&&(r.reasonCode!=='wrong-guest'||r.targetVisitId!==r.visitId)&&
  r.outcome==='rejected'&&r.completed===false&&r.accurate===false;
 if(r.id!==`${r.visitId}-serve-${r.workReceiptId}`||r.targetVisitId!==r.visitId||r.attempt!==undefined||r.reasonCode!==undefined)return false;
 return r.outcome==='handoff'?r.completed===false&&r.accurate===false:
  r.completed===true&&r.accurate===true&&r.outcome===(r.timely?'completed':'late');
}
const RECEIPT_FIELDS=['source','id','workReceiptId','visitId','number','customerId','customerName','kind','tokenId','itemId','dishId','targetVisitId','attempt','reasonCode','outcome','waitSeconds','completed','accurate','timely'];
export const sameJapanTableServiceReceipt=(a,b)=>RECEIPT_FIELDS.every(key=>a?.[key]===b?.[key]);
export const japanTableServiceReviewScore=r=>r.kind==='complaint'?-1:r.outcome==='completed'?1:r.outcome==='late'?0:-1;
