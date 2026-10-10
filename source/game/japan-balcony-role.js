// Ren inspects the authored public gallery; no new goods, guests or damage.
export const JAPAN_BALCONY_ROLE=Object.freeze({
 id:'jp-balcony-service',name:'灯笼望景廊巡护员',slotId:'jp-balcony-service-1',country:'japan',currency:'japan',
 employer:'Ren',workplace:'四层 · 原灯笼望景廊巡护登记处',supervisorId:'jp-balcony',incumbentId:'jp-balcony',incumbentName:'Ren',
 vacancyKind:'exclusive',careerKind:'technical-service',workSource:'jp-balcony-labor',wage:12,minimumAgeYears:18,
 skillRequirements:Object.freeze({ritual:1}),dutyWindow:Object.freeze({startHour:6,endHour:18}),earlyBeforeHour:12,preparationBonus:0,
 duties:'原四层只有一条灯笼望景廊与6盏原高挂灯笼。满18岁、礼仪1级可请Ren当面审核，录用后另行接班。每个真实游戏日06:00–18:00登记一次原廊巡护：站在地面目视6盏原灯笼、检查原走道通畅、亲手擦拭可够到的原栏杆、回看并登记原廊本轮已复核。未完原轮跨日保留，离线不补造巡查，不虚构损坏、堵塞、顾客或库存，不攀爬触摸高灯。06:00–18:00按实际现场工时结固定完整日薪12日本券，经现有雇主保障工资通道存银行；巡护不按步或按轮加钱。完整同廊同班四步才记礼仪10经验，与学习共用每日4次上限。原廊始终公开可通行，复核不改变开放状态；暂停可处理自身急需，中断交回后仍由Ren接续。'
});
export const JAPAN_BALCONY_ITEM_IDS=Object.freeze(['jp-balcony-gallery-1']);
export const JAPAN_BALCONY_RECEIPT_FIELDS=Object.freeze(['source','id','itemId','cycle','day','workReceiptId','completed','accurate','outcome']);
const serial=x=>Number.isSafeInteger(x)&&x>0;
export function validJapanBalconyReceipt(r){
 if(!r||typeof r!=='object'||Array.isArray(r)||Object.keys(r).length!==JAPAN_BALCONY_RECEIPT_FIELDS.length||!JAPAN_BALCONY_RECEIPT_FIELDS.every(k=>Object.hasOwn(r,k))||r.source!=='japan-balcony'||!JAPAN_BALCONY_ITEM_IDS.includes(r.itemId)||!serial(r.cycle)||!Number.isSafeInteger(r.day)||r.day<0||r.completed!==true||r.accurate!==true||r.outcome!=='completed')return false;
 const m=typeof r.workReceiptId==='string'&&/^jp-balcony-labor-([1-9][0-9]*)$/.exec(r.workReceiptId);
 return !!m&&serial(Number(m[1]))&&r.id===`${r.itemId}-cycle-${r.cycle}-${r.workReceiptId}`;
}
export const sameJapanBalconyReceipt=(a,b)=>JAPAN_BALCONY_RECEIPT_FIELDS.every(k=>a?.[k]===b?.[k]);
export const japanBalconyReviewScore=()=>1;
