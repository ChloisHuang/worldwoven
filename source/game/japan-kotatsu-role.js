// Aoi maintains only the four original third-floor tables after actual guests rest.
export const JAPAN_KOTATSU_ROLE=Object.freeze({
 id:'jp-kotatsu-service',name:'暖桌整理员',slotId:'jp-kotatsu-service-1',country:'japan',currency:'japan',
 employer:'Aoi',workplace:'霞汤屋三层 · 原暖桌整理登记处',supervisorId:'jp-tea',incumbentId:'jp-tea',incumbentName:'Aoi',
 vacancyKind:'exclusive',careerKind:'technical-service',workSource:'jp-kotatsu-labor',wage:12,minimumAgeYears:18,
 skillRequirements:Object.freeze({ritual:1,writing:1}),dutyWindow:Object.freeze({startHour:6,endHour:18}),earlyBeforeHour:12,preparationBonus:0,
 duties:'霞汤屋三层原暖桌整理岗位。须满18岁、礼仪1级、文书1级，由Aoi当面审核；录用后另行接班。只有4张原暖桌；原来客完成馆内活动后可自愿入座休息，真正离座后才需收齐原座垫并检查被缘、理平座垫与被缘、擦净桌面并在同桌原位排齐座垫，不新增商品、售卖或每日重置。06:00–18:00按实际在岗工时计薪，完整日班12日本券经现有雇主保障工资通道存入银行，不按点击或按桌加钱。同桌完成全部整理并排齐原座垫后才获礼仪10点经验，与读书共用每日4次成长；重复回执不重复成长。安全交回后仍由同一Aoi接续。工作不包含泡汤或餐食，不授官品。',
});
export const JAPAN_KOTATSU_ITEM_IDS=Object.freeze(Array.from({length:4},(_,i)=>`jp-kotatsu-${i+1}`));
export const JAPAN_KOTATSU_RECEIPT_FIELDS=Object.freeze(['source','id','itemId','cycle','workReceiptId','completed','accurate','outcome']);
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x),serial=x=>Number.isSafeInteger(x)&&x>0;
// This shape describes one completed care cycle of the same finite original
// object. The formal ledger separately checks it against the live source.
export function validJapanKotatsuReceipt(r){
 if(!object(r)||Object.keys(r).length!==JAPAN_KOTATSU_RECEIPT_FIELDS.length||!JAPAN_KOTATSU_RECEIPT_FIELDS.every(key=>Object.hasOwn(r,key))||
  r.source!=='japan-kotatsu'||!JAPAN_KOTATSU_ITEM_IDS.includes(r.itemId)||!serial(r.cycle)||r.completed!==true||r.accurate!==true||r.outcome!=='completed')return false;
 const work=typeof r.workReceiptId==='string'&&/^jp-kotatsu-labor-([1-9][0-9]*)$/.exec(r.workReceiptId);
 return !!(work&&serial(Number(work[1]))&&r.id===`${r.itemId}-cycle-${r.cycle}-${r.workReceiptId}`);
}
export const sameJapanKotatsuReceipt=(a,b)=>JAPAN_KOTATSU_RECEIPT_FIELDS.every(key=>a?.[key]===b?.[key]);
export const japanKotatsuReviewScore=()=>1;
