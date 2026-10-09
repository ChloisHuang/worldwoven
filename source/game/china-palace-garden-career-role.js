// The player holds a fixed-salary duty seat; the historic NPC piecework seat
// remains a separate physical compatibility contract.
export const PALACE_GARDEN_CAREER_ROLE=Object.freeze({
 id:'cn-palace-garden-duty',name:'荷庭勤务',slotId:'cn-palace-garden-duty-1',country:'china',currency:'copper',
 employer:'Bo',workplace:'荷桥原岗 · 勤务登记',supervisorId:'cn-garden',incumbentId:'cn-garden',incumbentName:'Bo',
 vacancyKind:'exclusive',workSource:'cn-palace-garden-labor',wage:16,minimumAgeYears:18,
 skillRequirements:Object.freeze({ritual:1}),dutyWindow:Object.freeze({startHour:6,endHour:18}),earlyBeforeHour:12,preparationBonus:0,
 duties:'18岁起可申请，礼仪1级。Bo本人审核；录用后另行接班，06:00–18:00在荷桥原岗候令，接收同号清扫令、归档、亲手清扫并实际返岗。固定完整日薪16铜文，按实际在岗工时由原宫务工资通道结算，不逐令发工资。完成原令并手动评价后获得10点园艺经验，与读书共用每日4次成长；普通勤务岗位，不授官品。',
});
const FIELDS=['source','id','workReceiptId','documentId','audienceId','day','holderRevision','completed','accurate','proof'];
const PROOF_FIELDS=['version','actorId','documentId','audienceId','day','holderRevision','received','filed','sweepSeconds','returned'];
const exact=(value,fields)=>!!value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===fields.length&&fields.every(key=>Object.hasOwn(value,key));
export function validGardenDutyReceipt(r){
 if(!exact(r,FIELDS)||r.source!=='china-palace-garden'||typeof r.workReceiptId!=='string'||!/^cn-palace-garden-labor-[1-9][0-9]*$/.test(r.workReceiptId)||!Number.isSafeInteger(Number(r.workReceiptId.split('-').at(-1)))||
  !Number.isSafeInteger(r.day)||r.day<0||!Number.isSafeInteger(r.holderRevision)||r.holderRevision<0||
  r.documentId!==`cn-edict-east-shore:${r.day}`||r.audienceId!==`cn-morning-audience:${r.day}`||r.id!==`${r.documentId}-${r.workReceiptId}`||r.completed!==true||r.accurate!==true)return false;
 const p=r.proof;
 return exact(p,PROOF_FIELDS)&&p.version===1&&p.actorId==='player'&&p.documentId===r.documentId&&p.audienceId===r.audienceId&&p.day===r.day&&p.holderRevision===r.holderRevision&&p.received===true&&p.filed===true&&p.sweepSeconds===7&&p.returned===true;
}
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
export const sameGardenDutyReceipt=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
export const gardenDutyReviewScore=receipt=>validGardenDutyReceipt(receipt)?1:0;
