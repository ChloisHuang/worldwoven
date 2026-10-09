// One real Yuki seat; six original towels and two owned reusable guest-futon covers.
export const JAPAN_LINEN_ROLE=Object.freeze({
 id:'jp-linen-service',name:'汤屋布草洗涤员',slotId:'jp-linen-service-1',country:'japan',currency:'japan',
 employer:'Yuki',workplace:'霞汤屋 · 四层洗衣间布草登记处',supervisorId:'jp-rest',incumbentId:'jp-rest',incumbentName:'Yuki',
 vacancyKind:'exclusive',careerKind:'technical-service',workSource:'jp-linen-labor',wage:14,minimumAgeYears:18,
 skillRequirements:Object.freeze({ritual:1}),dutyWindow:Object.freeze({startHour:6,endHour:18}),earlyBeforeHour:12,preparationBonus:0,
 duties:'虚构汤屋的普通布草洗涤岗位。须满18岁、礼仪1级，由Yuki当面审核；录用后另行接班。原客离开后收取原号脏布草，送至四层洗衣间，亲手洗涤、晾晒、收干、折叠并归还净布草架，同一件布草循环供原客使用；唯一客房实际休息用过的两套有限寝具也须洗护，Nao收货并换回，未另设寝具计件工资。06:00–18:00按实际在岗工时计薪，完整日班14日本券经现有雇主保障工资通道存入银行，不按件加钱。准确完成折叠归库才获礼仪10点经验，与读书共用每日4次成长；重复回执不重复成长。工作不包含泡汤或餐食，不授官品。',
});
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const serial=x=>Number.isSafeInteger(x)&&x>0;
// The live linen ledger emits this only after fold/restock. The cycle identifies
// reuse of a physical linen; the work receipt identifies its admitted shift.
export const JAPAN_LINEN_RECEIPT_FIELDS=Object.freeze(['source','id','workReceiptId','linenId','cycle','visitId','customerName','completed','accurate','outcome']);
export function validJapanLinenReceipt(r){
 if(!object(r)||r.source!=='japan-linen'||!/^jp-(?:linen-[1-6]|bedding-[12])$/.test(r.linenId)||!serial(r.cycle)||
  typeof r.customerName!=='string'||r.customerName.length<1||r.customerName.length>80||r.completed!==true||r.accurate!==true||r.outcome!=='completed')return false;
 if(r.linenId.startsWith('jp-bedding-')?!r.visitId?.startsWith('jp-bedding-use-'):!r.visitId?.startsWith('jp-visitor-'))return false;
 const visit=typeof r.visitId==='string'&&/^jp-(?:visitor|bedding-use)-(0|[1-9][0-9]*)-([1-9][0-9]*)$/.exec(r.visitId);
 const work=typeof r.workReceiptId==='string'&&/^jp-linen-labor-([1-9][0-9]*)$/.exec(r.workReceiptId);
 return !!(visit&&Number.isSafeInteger(Number(visit[1]))&&Number(visit[1])<=0xffffffff&&serial(Number(visit[2]))&&work&&serial(Number(work[1]))&&r.id===`${r.linenId}-cycle-${r.cycle}-${r.workReceiptId}`);
}
export const sameJapanLinenReceipt=(a,b)=>JAPAN_LINEN_RECEIPT_FIELDS.every(key=>a?.[key]===b?.[key]);
export const japanLinenReviewScore=()=>1;
