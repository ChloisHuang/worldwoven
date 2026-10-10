// Emi's existing fourteen display pouches are maintained only after real handling.
export const JAPAN_OMAMORI_ROLE=Object.freeze({
 id:'jp-omamori-service',name:'御守绳结照料员',slotId:'jp-omamori-service-1',country:'japan',currency:'japan',
 employer:'Emi',workplace:'参道 · 御守原摊照料登记处',supervisorId:'jp-omamori',incumbentId:'jp-omamori',incumbentName:'Emi',
 vacancyKind:'exclusive',careerKind:'technical-service',workSource:'jp-omamori-labor',wage:12,minimumAgeYears:18,
 skillRequirements:Object.freeze({ritual:1,writing:1}),dutyWindow:Object.freeze({startHour:6,endHour:18}),earlyBeforeHour:12,preparationBonus:0,
 duties:'虚构参道的普通御守照料岗位。须满18岁、礼仪1级、文书1级，由Emi当面审核；录用后另行接班。原摊只有14件御守（12件挂袋、2件托盘布袋）；原物实际被观赏取放后，才按原号取下、检查绳结、核对刺绣并归回同一原位，不虚构售卖、订单或每日重置。06:00–18:00按实际在岗工时计薪，完整日班12日本券经现有雇主保障工资通道存入银行，不按件加钱。每件原物完成全部照料并归位后才获礼仪10点经验，与读书共用每日4次成长；重复回执不重复成长。安全交回后仍由同一Emi接续。工作不包含泡汤或餐食，不授官品，也不宣称御守功效。',
});
export const JAPAN_OMAMORI_ITEM_IDS=Object.freeze(Array.from({length:14},(_,i)=>`jp-omamori-${i+1}`));
export const JAPAN_OMAMORI_RECEIPT_FIELDS=Object.freeze(['source','id','itemId','cycle','workReceiptId','completed','accurate','outcome']);
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x),serial=x=>Number.isSafeInteger(x)&&x>0;
// This shape describes one completed care cycle of the same finite original
// object. The formal ledger separately checks it against the live source.
export function validJapanOmamoriReceipt(r){
 if(!object(r)||Object.keys(r).length!==JAPAN_OMAMORI_RECEIPT_FIELDS.length||!JAPAN_OMAMORI_RECEIPT_FIELDS.every(key=>Object.hasOwn(r,key))||
  r.source!=='japan-omamori'||!JAPAN_OMAMORI_ITEM_IDS.includes(r.itemId)||!serial(r.cycle)||r.completed!==true||r.accurate!==true||r.outcome!=='completed')return false;
 const work=typeof r.workReceiptId==='string'&&/^jp-omamori-labor-([1-9][0-9]*)$/.exec(r.workReceiptId);
 return !!(work&&serial(Number(work[1]))&&r.id===`${r.itemId}-cycle-${r.cycle}-${r.workReceiptId}`);
}
export const sameJapanOmamoriReceipt=(a,b)=>JAPAN_OMAMORI_RECEIPT_FIELDS.every(key=>a?.[key]===b?.[key]);
export const japanOmamoriReviewScore=()=>1;
