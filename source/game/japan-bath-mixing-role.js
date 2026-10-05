// Itsuki lends the original pharmacy service seat. Preparing fictional bath
// blends is technical shop work; it grants no official rank or bath privileges.
export const JAPAN_BATH_MIXING_ROLE=Object.freeze({
 id:'jp-bath-mixing',name:'浴包配制员',slotId:'jp-bath-mixing-1',country:'japan',currency:'japan',
 employer:'Itsuki',workplace:'霞汤屋 · 四层浴包配制登记处',supervisorId:'jp-incense',incumbentId:'jp-incense',incumbentName:'Itsuki',
 vacancyKind:'exclusive',careerKind:'technical-service',workSource:'jp-bath-mixing-labor',wage:16,minimumAgeYears:18,
 skillRequirements:Object.freeze({care:1,writing:1}),dutyWindow:Object.freeze({startHour:6,endHour:18}),earlyBeforeHour:12,preparationBonus:0,
 duties:'须满18岁、照护1级、文书1级，由Itsuki当面审核。录用后另行开班：按浴牌核对客名、汤区与草木种类，在四层工台配制、封签，再放到取件角交配送。06:00–18:00按实际在岗工时计薪，完整一班16日本券存入银行。一单完成后继续候单；准确出品积累照护经验，及时、迟配与未完交班分别记录评价。草木浴包是虚构游戏道具，不含真实疗效。工作不包含泡汤或餐食。',
});

export const JAPAN_BATH_MIXING_TIMELY_SECONDS=90;
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const serial=value=>Number.isSafeInteger(value)&&value>0;
// Only the original service board issues this after the completed original bag
// returns to its delivery queue, or after Itsuki takes back an unfinished order.
export function validJapanBathMixingReceipt(r){
 if(!object(r)||r.source!=='japan-bath-mixing'||r.kind!=='prepare'||!['men','women'].includes(r.side)||
  !['cloud-leaf','lantern-petal'].includes(r.blendId)||!serial(r.number)||typeof r.visitId!=='string'||typeof r.workReceiptId!=='string'||
  typeof r.customerName!=='string'||r.customerName.length<1||r.customerName.length>80||
  !Number.isFinite(r.waitSeconds)||r.waitSeconds<0)return false;
 const visit=/^jp-visitor-(0|[1-9][0-9]*)-([1-9][0-9]*)$/.exec(r.visitId),work=/^jp-bath-mixing-labor-([1-9][0-9]*)$/.exec(r.workReceiptId);
 if(!visit||!work||!Number.isSafeInteger(Number(visit[1]))||Number(visit[1])>0xffffffff||Number(visit[2])!==r.number||!serial(Number(work[1]))||
  r.id!==`${r.visitId}-prepare-${r.workReceiptId}`||r.customerId!==r.visitId||r.tokenId!==`${r.visitId}:token`||r.itemId!==`${r.visitId}:mixture`||
  r.timely!==(r.waitSeconds<=JAPAN_BATH_MIXING_TIMELY_SECONDS))return false;
 return r.outcome==='handoff'?r.completed===false&&r.accurate===false:
  r.completed===true&&r.accurate===true&&r.outcome===(r.timely?'completed':'late');
}
const RECEIPT_FIELDS=['source','id','workReceiptId','visitId','number','customerId','customerName','kind','tokenId','itemId','side','blendId','outcome','waitSeconds','completed','accurate','timely'];
export const sameJapanBathMixingReceipt=(a,b)=>RECEIPT_FIELDS.every(key=>a?.[key]===b?.[key]);
export const japanBathMixingReviewScore=r=>r.outcome==='completed'?1:r.outcome==='late'?0:-1;
