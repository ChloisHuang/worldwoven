import {PERFORMANCE_ACTIVITIES,PERFORMANCE_DRINKS,PERFORMANCE_CAST} from './japan-performance-cast.js';

// Three existing people, three exclusive seats. The 43-year-old storyteller is
// eligible under the same adult rule as every applicant; no salon age ceiling.
const role=(id,name,specialty,activities,skills,wage,work)=>{
 const incumbent=PERFORMANCE_CAST.find(actor=>actor.id===id);
 return Object.freeze({id,name,specialty,activity:activities[0],activities:Object.freeze(activities),slotId:id+'-1',
  country:'japan',currency:'japan',employer:'绫乃',workplace:'霞汤屋 · 三层町街演艺小厅',
  supervisorId:'jp-performance-reception',incumbentId:id,incumbentName:incumbent.name,vacancyKind:'exclusive',paymentKind:'commission',
  careerKind:'technical-service',workSource:id+'-labor',wage,minimumAgeYears:18,
  skillRequirements:Object.freeze(skills),dutyWindow:Object.freeze({startHour:6,endHour:22}),
  duties:`本岗位长期仅一席，须满18岁，由绫乃在原接待案当面审核。录用后另行主动开班，${work}。你可接受或谢绝原居民的自愿邀约，亲自完成后按原单日本券价目入银行；无客、未完成与空班不生薪。未开班或交班后由${incumbent.name}代管；普通演艺与饮品服务不包含亲密安排、免费餐饮或泡汤，也不授官品。`});
};
export const JAPAN_PERFORMANCE_RECEPTION_ROLE=role('jp-performance-reception','演艺厅接待奉茶员','接待奉茶',['drink'],{ritual:1},2,'核对原客的焙茶或清酒，实际备饮、送达并等本人用毕');
export const JAPAN_PERFORMANCE_MAI_ROLE=role('jp-salon-mai','演艺厅折扇舞者','折扇小舞',['dance','tea'],{art:1,ritual:1},8,'在原舞台完整演绎折扇小舞，或在原茶席陪席茶谈');
export const JAPAN_PERFORMANCE_ICHIRO_ROLE=role('jp-salon-ichiro','演艺厅町街说书人','町街说书',['story','tea'],{art:1,writing:1},7,'在原舞台完整讲述町街短篇，或在原茶席陪席茶谈');
export const JAPAN_PERFORMANCE_ROLES=Object.freeze([JAPAN_PERFORMANCE_RECEPTION_ROLE,JAPAN_PERFORMANCE_MAI_ROLE,JAPAN_PERFORMANCE_ICHIRO_ROLE]);
export const japanPerformanceRole=id=>JAPAN_PERFORMANCE_ROLES.find(role=>role.id===id)||null;
export const JAPAN_PERFORMANCE_CUSTOMERS=Object.freeze(PERFORMANCE_CAST.map(actor=>actor.id));
export function japanPerformanceCommission(roleId,activity,drink=null){
 const role=japanPerformanceRole(roleId);
 if(!role?.activities.includes(activity))return null;
 return activity==='drink'?PERFORMANCE_DRINKS.find(item=>item.id===drink)?.fee??null:
  drink===null?PERFORMANCE_ACTIVITIES[activity]?.fee??null:null;
}
export const japanPerformanceServiceSeconds=activity=>activity==='drink'?9.2:PERFORMANCE_ACTIVITIES[activity]?.duration??null;
export const japanPerformanceSkill=activity=>activity==='dance'?'art':activity==='story'?'writing':'ritual';
const serial=id=>{const m=typeof id==='string'&&/^jp-performance-work-([1-9][0-9]*)$/.exec(id);return m&&Number.isSafeInteger(Number(m[1]))?Number(m[1]):null;};
const RECEIPT_FIELDS=Object.freeze(['version','id','roleId','slotId','day','orderId','customerId','customerName','artistId','activity','drink','currency','amount','serviceSeconds','completedAt','sourcePaymentId']);
// Structural evidence is necessary but not a payment authorization. The live
// service controller must match this to the original earned-NPC-funds payment,
// completed physical service and exact pending bank transaction atomically.
export function validJapanPerformanceReceipt(r){
 if(!r||typeof r!=='object'||Array.isArray(r)||Object.keys(r).length!==RECEIPT_FIELDS.length||!RECEIPT_FIELDS.every(key=>Object.hasOwn(r,key)))return false;
 const role=japanPerformanceRole(r.roleId),duration=japanPerformanceServiceSeconds(r.activity);
 return !!role&&r.version===1&&!!serial(r.id)&&r.id===r.orderId&&r.sourcePaymentId===r.orderId&&r.slotId===role.slotId&&
  Number.isSafeInteger(r.day)&&r.day>=0&&r.artistId===role.incumbentId&&
  JAPAN_PERFORMANCE_CUSTOMERS.includes(r.customerId)&&r.customerId!==role.incumbentId&&
  typeof r.customerName==='string'&&r.customerName.length>0&&r.customerName.length<=80&&r.currency==='japan'&&
  Number.isSafeInteger(r.amount)&&r.amount>0&&r.amount===japanPerformanceCommission(r.roleId,r.activity,r.drink)&&
  Number.isFinite(duration)&&Number.isFinite(r.serviceSeconds)&&r.serviceSeconds>=duration-1e-9&&
  Number.isFinite(r.completedAt)&&r.completedAt>=r.serviceSeconds;
}
export const sameJapanPerformanceReceipt=(a,b)=>RECEIPT_FIELDS.every(key=>a?.[key]===b?.[key]);
