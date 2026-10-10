// Julie keeps the one original royal bed and its same reusable linen.
export const FRANCE_BEDCHAMBER_ROLE=Object.freeze({
 id:'fr-bedchamber-service',name:'皇家寝室照料员',slotId:'fr-bedchamber-service-1',country:'france',currency:'france',
 employer:'朱丽叶',workplace:'白金皇家寝室',supervisorId:'france-bedroom',incumbentId:'france-bedroom',incumbentName:'朱丽叶',
 vacancyKind:'exclusive',careerKind:'technical-service',workSource:'fr-bedchamber-labor',wage:12,minimumAgeYears:18,
 skillRequirements:Object.freeze({ritual:1}),dutyWindow:Object.freeze({startHour:6,endHour:18}),earlyBeforeHour:12,preparationBonus:0,
 duties:'白金皇家寝室的原床照料岗位。须满18岁、礼仪1级，由朱丽叶当面审核；录用后另行接班。只照料同一张原床和同套原寝具；玩家或原居民实际在原床休息后才产生待做照料，不虚构来客、库存或每日补货。06:00–18:00按实际在岗工时计薪，完整日班12法国券经现有工资通道存入银行，不按件或点击加钱。核对床面、抚平原床罩、整理两只原枕与台上原织物，回床复核；整轮全部由玩家在同班完成后，才获礼仪10点经验，与读书共用每日4次成长；混合代做、中途交回和重复凭记不获经验。有人使用原床时暂停照料；寝具始终留在原位，原床保持可用。安全交班后仍由同一朱丽叶接续，评价不增扣工资，不授官品。',
});
export const FRANCE_BEDCHAMBER_ITEM_ID='france-bed-linen';
export const FRANCE_BEDCHAMBER_BED_ID='france-furniture-bed-0';
export const FRANCE_BEDCHAMBER_RECEIPT_FIELDS=Object.freeze(['source','id','itemId','bedId','cycle','useId','workReceiptId','completed','accurate','outcome']);
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x),serial=x=>Number.isSafeInteger(x)&&x>0;
// Shape validation is only the first gate; formal careers also require the
// exact completed original-bed cycle from the live physical ledger.
export function validFranceBedchamberReceipt(r){
 if(!object(r)||Object.keys(r).length!==FRANCE_BEDCHAMBER_RECEIPT_FIELDS.length||!FRANCE_BEDCHAMBER_RECEIPT_FIELDS.every(key=>Object.hasOwn(r,key))||
  r.source!=='france-bedchamber'||r.itemId!==FRANCE_BEDCHAMBER_ITEM_ID||r.bedId!==FRANCE_BEDCHAMBER_BED_ID||!serial(r.cycle)||
  r.completed!==true||r.accurate!==true||r.outcome!=='completed')return false;
 const work=typeof r.workReceiptId==='string'&&/^fr-bedchamber-labor-([1-9][0-9]*)$/.exec(r.workReceiptId),
  use=typeof r.useId==='string'&&/^france-bed-use-([1-9][0-9]*)$/.exec(r.useId);
 return !!(work&&serial(Number(work[1]))&&use&&serial(Number(use[1]))&&r.id===`${r.itemId}-cycle-${r.cycle}-${r.workReceiptId}`);
}
export const sameFranceBedchamberReceipt=(a,b)=>FRANCE_BEDCHAMBER_RECEIPT_FIELDS.every(key=>a?.[key]===b?.[key]);
export const franceBedchamberReviewScore=()=>1;
