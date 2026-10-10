// Akari inspects the authored pond; this is care, never fish/plant production.
export const JAPAN_GARDEN_ROLE=Object.freeze({
 id:'jp-garden-service',name:'锦鲤映池照料员',slotId:'jp-garden-service-1',country:'japan',currency:'japan',
 employer:'Akari',workplace:'庭园 · 原锦鲤映池照料登记处',supervisorId:'jp-garden-onsen',incumbentId:'jp-garden-onsen',incumbentName:'Akari',
 vacancyKind:'exclusive',careerKind:'technical-service',workSource:'jp-garden-labor',wage:12,minimumAgeYears:18,
 skillRequirements:Object.freeze({gardening:1,ritual:1}),dutyWindow:Object.freeze({startHour:6,endHour:18}),earlyBeforeHour:12,preparationBonus:0,
 duties:'原庭园只有一座锦鲤映池、9条原锦鲤与3组原水草。满18岁、园艺1级、礼仪1级可请Akari当面审核，录用后另行接班。每个真实游戏日06:00–18:00登记一次原池巡护：岸上观察原锦鲤、辨看原水草与水面、擦拭原东侧石池沿、回看原池完成复核。未完原轮次跨日保留，离线不补造检查、鱼食或库存，不移动鱼和水草，不制造事故。06:00–18:00按现场工时结固定完整日薪12日本券，经现有雇主保障工资通道存银行；巡护不按步加钱。完整同池同班四步才记园艺10经验，与学习共用每日4次上限。原池始终可欣赏，暂停可处理自身急需；中断交回后仍由Akari继续。'
});
export const JAPAN_GARDEN_ITEM_IDS=Object.freeze(['jp-garden-pond-1']);
export const JAPAN_GARDEN_RECEIPT_FIELDS=Object.freeze(['source','id','itemId','cycle','day','workReceiptId','completed','accurate','outcome']);
const serial=x=>Number.isSafeInteger(x)&&x>0;
export function validJapanGardenReceipt(r){
 if(!r||typeof r!=='object'||Array.isArray(r)||Object.keys(r).length!==JAPAN_GARDEN_RECEIPT_FIELDS.length||!JAPAN_GARDEN_RECEIPT_FIELDS.every(k=>Object.hasOwn(r,k))||r.source!=='japan-garden'||!JAPAN_GARDEN_ITEM_IDS.includes(r.itemId)||!serial(r.cycle)||!Number.isSafeInteger(r.day)||r.day<0||r.completed!==true||r.accurate!==true||r.outcome!=='completed')return false;
 const m=typeof r.workReceiptId==='string'&&/^jp-garden-labor-([1-9][0-9]*)$/.exec(r.workReceiptId);
 return !!m&&serial(Number(m[1]))&&r.id===`${r.itemId}-cycle-${r.cycle}-${r.workReceiptId}`;
}
export const sameJapanGardenReceipt=(a,b)=>JAPAN_GARDEN_RECEIPT_FIELDS.every(k=>a?.[k]===b?.[k]);
export const japanGardenReviewScore=()=>1;
