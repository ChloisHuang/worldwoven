import {getChinaRecordsCareerRank} from './china-official-ranks.js';
import {CLERK_ENTRY_RANK, CLERK_NEXT_RANK, emptyOfficialCareer, officialTenureId, officialRankId, recordOfficialAppointment, recordOfficialService, closeOfficialAppointment, officialPromotionSummary, restoreOfficialCareer} from './official-career-progress.js';
import {SALON_POET_ROLE} from './china-salon-career-role.js';
import {ROYAL_KITCHEN_ROLE,ROYAL_KITCHEN_CHEF_DAYS,ROYAL_KITCHEN_CUSTOMERS,validTavernChefServiceReceipt,validRoyalKitchenServiceReceipt,sameKitchenReceipt} from './china-royal-kitchen-role.js';
export {ROYAL_KITCHEN_ROLE} from './china-royal-kitchen-role.js';
import {CLINIC_PHYSICIAN_ROLE} from './china-clinic-career-role.js';
export {CLINIC_PHYSICIAN_ROLE} from './china-clinic-career-role.js';
import {JAPAN_RECEPTION_ROLE,validJapanReceptionReceipt,sameJapanReceptionReceipt,japanReceptionReviewScore} from './japan-reception-role.js';
export {JAPAN_RECEPTION_ROLE} from './japan-reception-role.js';
import {JAPAN_BATH_DELIVERY_ROLES,japanBathDeliveryRole,validJapanBathDeliveryReceipt,sameJapanBathDeliveryReceipt,japanBathDeliveryReviewScore} from './japan-bath-delivery-role.js';
export {JAPAN_BATH_DELIVERY_ROLE,JAPAN_WOMEN_BATH_DELIVERY_ROLE,JAPAN_BATH_DELIVERY_ROLES,japanBathDeliveryRole} from './japan-bath-delivery-role.js';
import {JAPAN_BATH_MIXING_ROLE,validJapanBathMixingReceipt,sameJapanBathMixingReceipt,japanBathMixingReviewScore} from './japan-bath-mixing-role.js';
export {JAPAN_BATH_MIXING_ROLE} from './japan-bath-mixing-role.js';
import {JAPAN_KITCHEN_ROLE,validJapanKitchenReceipt,sameJapanKitchenReceipt,japanKitchenReviewScore} from './japan-kitchen-role.js';
export {JAPAN_KITCHEN_ROLE} from './japan-kitchen-role.js';
import {JAPAN_TABLE_SERVICE_ROLE,validJapanTableServiceReceipt,sameJapanTableServiceReceipt,japanTableServiceReviewScore} from './japan-table-service-role.js';
export {JAPAN_TABLE_SERVICE_ROLE} from './japan-table-service-role.js';
import {validGardenMaintenanceReceipt,sameGardenMaintenanceReceipt} from './france-gardener-role.js';
import {GAME_MINUTES_PER_SECOND} from './simulation-clock.js';
import {emptyApplications, restoreApplications, careerInterview, careerInterviewRoll, applicationId} from './career-applications.js';
import {STUDY_SOURCES, studyLesson, savedStudyLesson, defaultStudyLesson} from './study-lessons.js';
import {STUDY_XP, skillXPRequired, addSkillXP} from './skill-progress.js';
// Finite vacancies and one rotating player seat alongside each real incumbent.
export const COURT_CLERK_ROLE = Object.freeze({
  id: 'cn-court-clerk', name: '礼务录事', rank: 9, rankId: CLERK_ENTRY_RANK, gradeLabel: '从九品', slotId: 'cn-court-clerk-1', country: 'china', currency: 'copper', employer: '沈叙', workplace: '承务官署',
  wage: 18, minimumAgeYears: 18,
  skillRequirements: Object.freeze({ritual: 2, writing: 2}),
  dutyWindow: Object.freeze({startHour: 6, endHour: 11.5}),
});
export const COURT_SUPERVISOR = Object.freeze({id: 'cn-official-rites', conscientiousness: .85,
  earlyArrivalMinutes: 5, preparationBonus: 2});
export const TAVERN_STEWARD_ROLE = Object.freeze({id:'cn-tavern-steward',name:'酒楼常任服务助理',
  slotId:'cn-tavern-steward-1',country:'china',currency:'copper',employer:'许安',workplace:'云来酒楼',
  supervisorId:'cn-tavern-host',incumbentId:'cn-tavern-assistant',incumbentName:'陆青',vacancyKind:'exclusive',workSource:'cn-tavern-labor',wage:16,minimumAgeYears:18,
  skillRequirements:Object.freeze({ritual:2}),dutyWindow:Object.freeze({startHour:6,endHour:18}),earlyBeforeHour:12,preparationBonus:1});
// Unpublished host prototype is excluded from salaried vacancies: ownership purchase is required.
export const TAVERN_HOST_ROLE = Object.freeze({id:'cn-tavern-host',name:'酒楼掌柜（须购买经营权）',ownershipRequired:true,
  slotId:'cn-tavern-host-rotation-1',country:'china',currency:'copper',employer:'许安',workplace:'云来酒楼 · 掌柜登记案',
  supervisorId:'cn-tavern-host',incumbentId:'cn-tavern-host',incumbentName:'许安',vacancyKind:'rotation',workSource:'cn-tavern-host-labor',wage:24,minimumAgeYears:18,
  skillRequirements:Object.freeze({ritual:3,writing:1}),dutyWindow:Object.freeze({startHour:6,endHour:18}),earlyBeforeHour:12,preparationBonus:1,
  duties:'持续处理餐饮点单、餐费与住宿收款、招工登记；06:00–18:00当班，提前收工按实际工时计薪'});
export const TAVERN_CHEF_ROLE = Object.freeze({id:'cn-tavern-chef',name:'酒楼厨师',
  slotId:'cn-tavern-chef-rotation-1',country:'china',currency:'copper',employer:'许安',workplace:'云来酒楼 · 招工柜台',
  supervisorId:'cn-tavern-cook',incumbentId:'cn-tavern-cook',incumbentName:'沈禾',vacancyKind:'exclusive',workSource:'cn-tavern-chef-labor',wage:26,minimumAgeYears:18,
  skillRequirements:Object.freeze({cooking:2,ritual:1}),dutyWindow:Object.freeze({startHour:6,endHour:18}),earlyBeforeHour:12,preparationBonus:1,
  duties:'持续按订单备料、烹制、核对并出菜；06:00–18:00当班，提前收工按实际工时计薪'});
export const GARDEN_ASSISTANT_ROLE = Object.freeze({id:'fr-garden-assistant',name:'西苑常任园艺助理',
  slotId:'fr-garden-assistant-1',country:'france',currency:'france',employer:'埃米尔',workplace:'西苑工具架登记簿',
  supervisorId:'france-gardener',workSource:'fr-garden-labor',wage:8,minimumAgeYears:18,
  skillRequirements:Object.freeze({gardening:2}),dutyWindow:Object.freeze({startHour:6,endHour:18}),earlyBeforeHour:12,preparationBonus:1,
  duties:'06:00–18:00在西苑持续当班；借用原工具，给原玫瑰花畦浇水或修剪原黄杨篱，归还工具后由埃米尔记工作评价与园艺经验。基础8法国券按实际在岗工时折算，完整12小时9券；交班后存入银行，养护凭记不另发钱'});
export const PHARMACY_ASSISTANT_ROLE = Object.freeze({id:'cn-pharmacy-apprentice',name:'安和药铺助手',
  slotId:'cn-pharmacy-apprentice-1',country:'china',currency:'copper',employer:'许宁',workplace:'安和医馆 · 二层交单平台',
  supervisorId:'cn-clinic-physician',incumbentId:'cn-pharmacy-assistant',incumbentName:'苏禾',vacancyKind:'exclusive',workSource:'cn-pharmacy-labor',wage:12,minimumAgeYears:18,
  skillRequirements:Object.freeze({writing:1,ritual:1}),dutyWindow:Object.freeze({startHour:6,endHour:18}),earlyBeforeHour:12,preparationBonus:1,
  duties:'06:00–18:00在医馆候班；持续接原单、按号折包并交给本人，交班后按实际在岗工时结算，来客单独记评价'});
export const TEA_SERVER_ROLE = Object.freeze({id:'fr-tea-server',name:'宫苑茶廊侍茶员',
  slotId:'fr-tea-server-1',country:'france',currency:'france',employer:'玛农',workplace:'宫苑茶廊 · 侍茶登记',
  supervisorId:'france-salon',incumbentId:'france-salon',incumbentName:'玛农',vacancyKind:'exclusive',workSource:'fr-tea-labor',wage:10,minimumAgeYears:18,
  skillRequirements:Object.freeze({ritual:2,writing:1}),dutyWindow:Object.freeze({startHour:6,endHour:18}),earlyBeforeHour:12,preparationBonus:0,
  duties:'06:00–18:00在茶廊候班；记下原单、传单、接取茶盘、送到原座并收回杯碟；持续当班，交班按实际在岗工时计薪，顾客评价不另加薪'});
export const TEA_PASTRY_ROLE = Object.freeze({id:'fr-tea-pastry',name:'宫苑茶点制作员',
  slotId:'fr-tea-pastry-1',country:'france',currency:'france',employer:'卡米耶',workplace:'宫苑糕点房 · 制作登记',
  supervisorId:'france-bakery',incumbentId:'france-bakery',incumbentName:'卡米耶',vacancyKind:'exclusive',workSource:'fr-pastry-labor',wage:14,minimumAgeYears:18,
  skillRequirements:Object.freeze({cooking:2,ritual:1}),dutyWindow:Object.freeze({startHour:6,endHour:18}),earlyBeforeHour:12,preparationBonus:0,
  duties:'06:00–18:00在糕点房候班；核对玛农的原客单、分切蛋糕、备热茶、核对装盘并交原茶盘，等原杯碟收洗后记评价；另行交班按实际在岗工时计薪'});
export const PALACE_GUARD_ROLE = Object.freeze({id:'cn-palace-guard',name:'锦衣卫巡值',
  slotId:'cn-palace-guard-1',country:'china',currency:'copper',employer:'陆衡',workplace:'射圃 · 巡值登记',
  supervisorId:'cn-range-warden',incumbentId:'cn-archery',incumbentName:'沈砚',vacancyKind:'exclusive',workSource:'cn-guard-labor',wage:24,minimumAgeYears:18,
  skillRequirements:Object.freeze({martial:1,ritual:1}),dutyWindow:Object.freeze({startHour:6,endHour:18}),earlyBeforeHour:12,preparationBonus:0,
  duties:'06:00–18:00主动接班；沿门廊、殿阶及东西巷逐点巡查驻察，回圃当面交班；持续轮巡按实际巡行与驻察工时计薪。武艺须在射圃完成受控习射，陆衡继续照看射场'});
export const FORMAL_CAREER_ROLES = Object.freeze([COURT_CLERK_ROLE,TAVERN_STEWARD_ROLE,GARDEN_ASSISTANT_ROLE,TAVERN_CHEF_ROLE,PHARMACY_ASSISTANT_ROLE,TEA_SERVER_ROLE,TEA_PASTRY_ROLE,PALACE_GUARD_ROLE,SALON_POET_ROLE,CLINIC_PHYSICIAN_ROLE,ROYAL_KITCHEN_ROLE,JAPAN_RECEPTION_ROLE,...Object.values(JAPAN_BATH_DELIVERY_ROLES),JAPAN_BATH_MIXING_ROLE,JAPAN_KITCHEN_ROLE,JAPAN_TABLE_SERVICE_ROLE]);
export const FORMAL_CAREER_SLOTS = Object.freeze([
  ...FORMAL_CAREER_ROLES.map(role => Object.freeze({id:role.slotId,roleId:role.id,holderId:role.incumbentId||null,...(role.vacancyKind==='rotation'?{rotation:true}:role.vacancyKind==='exclusive'?{replacement:true}:{})})),
]);
const SKILLS = Object.freeze(['ritual', 'writing', 'gardening', 'art', 'cooking', 'martial', 'care']);
const emptyStudy = () => ({issued: 0, completed: 0, issuedDay: null, lessonId: null});
const WORK = Object.freeze({'cn-tavern-labor':'ritual','fr-garden-labor':'gardening'});
const STAGES = new Set(['arrived', 'attending', 'archive', 'ready', 'missed', 'paid', 'working', 'inspection']);
const copy = value => JSON.parse(JSON.stringify(value));
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const integer = value => Number.isSafeInteger(value) && value >= 0;
const dayOrNull = value => value === null || integer(value);
const validTenureApplication=tenure=>{if(tenure.applicationId===undefined)return true;const day=Number(String(tenure.applicationId).split(':').at(-1));return integer(day)&&day<=tenure.sinceDay&&tenure.applicationId===applicationId(tenure.roleId,day);};
const identifier = value => typeof value === 'string' && /^[a-z][a-z0-9-]{0,63}$/.test(value);
const own = (value, key) => Object.hasOwn(value, key);
const excused = duty => duty?.stage === 'missed' && duty.reason === 'court-postponed';
const supervisor = role => role.supervisorId || COURT_SUPERVISOR.id;
const completedWage = (role, arrivalHour) => role.workSource ? role.wage + (arrivalHour < role.earlyBeforeHour ? role.preparationBonus : 0) : role.wage + (COURT_SUPERVISOR.conscientiousness >= .8 &&
  arrivalHour <= role.dutyWindow.endHour - COURT_SUPERVISOR.earlyArrivalMinutes / 60 ? COURT_SUPERVISOR.preparationBonus : 0);
const emptyWorkExperience=()=>({tavernChef:[],royalKitchen:{receipts:[]}});
const empty = () => ({version: 10, workExperience:emptyWorkExperience(), revision: 0, skillXP: Object.fromEntries(SKILLS.map(skill=>[skill,0])), skills: {ritual: 0, writing: 0, gardening: 0, art: 0, cooking: 0, martial: 0, care: 0}, tenure: null,
  lastDuty: null, lastPaidDay: null, daily: {day: null, ritual: 0, writing: 0, gardening: 0, art: 0, cooking: 0, martial: 0, care: 0},
  learning: Object.fromEntries(STUDY_SOURCES.map(source => [source, emptyStudy()])),
  lowerWork: {'cn-tavern-labor': 0, 'fr-garden-labor': 0, 'cn-pharmacy-labor': 0}, performance: 0, promotionProgress: 0,
  lastEvaluatedDay: null, lastEvaluation: null, applications: emptyApplications(), officialCareer: emptyOfficialCareer()});

const tavernRole = role => role?.workSource?.startsWith('cn-tavern-');
const BATH_DELIVERY_ROLE_IDS=Object.freeze(Object.values(JAPAN_BATH_DELIVERY_ROLES).map(role=>role.id));
const bathDeliveryRole=role=>BATH_DELIVERY_ROLE_IDS.includes(role?.id);
const teaRole=role=>[TEA_SERVER_ROLE.id,TEA_PASTRY_ROLE.id].includes(role?.id);
const reviewRole=role=>tavernRole(role)||teaRole(role)||[GARDEN_ASSISTANT_ROLE.id,ROYAL_KITCHEN_ROLE.id,JAPAN_RECEPTION_ROLE.id,...BATH_DELIVERY_ROLE_IDS,JAPAN_BATH_MIXING_ROLE.id,JAPAN_KITCHEN_ROLE.id,JAPAN_TABLE_SERVICE_ROLE.id].includes(role?.id);
const continuousRole=role=>tavernRole(role)||[GARDEN_ASSISTANT_ROLE.id,PHARMACY_ASSISTANT_ROLE.id,CLINIC_PHYSICIAN_ROLE.id,ROYAL_KITCHEN_ROLE.id,PALACE_GUARD_ROLE.id,JAPAN_RECEPTION_ROLE.id,...BATH_DELIVERY_ROLE_IDS,JAPAN_BATH_MIXING_ROLE.id,JAPAN_KITCHEN_ROLE.id,JAPAN_TABLE_SERVICE_ROLE.id].includes(role?.id)||teaRole(role);
const availableSlot = (slot,role) => slot.holderId === null || slot.replacement === true && role.vacancyKind === 'exclusive' && slot.holderId === role.incumbentId || slot.rotation === true && role.vacancyKind === 'rotation' && slot.holderId === role.incumbentId;
// Tea, royal kitchen and bathhouse outcomes change the service record only. Tavern error/correction pairs
// retain their existing net deduction; genuine good service never mints wages.
const customerPenalty = duty => (duty?.customerReviews||[]).reduce((total,review)=>total-(['garden-maintenance-completed','tea-completed','royal-kitchen-completed','japan-reception-completed','japan-bath-delivery-completed','japan-bath-mixing-completed','japan-kitchen-completed','japan-table-service-completed'].includes(review.reasonCode)?0:review.score),0);
const coveredHours = duty => (duty.coveredSeconds||0)*GAME_MINUTES_PER_SECOND/60;
const attendanceWage = (role,hours) => Math.floor(role.wage*Math.min(1,hours/(role.dutyWindow.endHour-role.dutyWindow.startHour))+1e-9)+(hours>=role.dutyWindow.endHour-role.dutyWindow.startHour-1e-9?(role.preparationBonus||0):0);
// Versioned pay belongs to the admitted shift, never to today's rank.
const CLERK_PAY_V1=Object.freeze({[CLERK_ENTRY_RANK]:18,[CLERK_NEXT_RANK]:22});
const salaryRole=(role,row)=>role.id===COURT_CLERK_ROLE.id&&row?.officialPayVersion===1?{...role,wage:CLERK_PAY_V1[row.officialRankId]}:role;
const officialFields=row=>row?.officialPayVersion===1?{officialPayVersion:1,officialRankId:row.officialRankId,officialTenureId:row.officialTenureId}:{};
const validOfficialFields=(row,role)=>row.officialPayVersion===undefined?row.officialRankId===undefined&&row.officialTenureId===undefined:role.id===COURT_CLERK_ROLE.id&&row.officialPayVersion===1&&Object.hasOwn(CLERK_PAY_V1,row.officialRankId)&&typeof row.officialTenureId==='string';
const dutyWage = (rawRole,duty) => {const role=salaryRole(rawRole,duty);return duty.shiftKind==='continuous'?Math.max(0,attendanceWage(role,coveredHours(duty))-customerPenalty(duty)):Math.max(1,completedWage(role,duty.arrivalHour)-customerPenalty(duty));};
function validShift(duty,role){
 if(duty.shiftKind===undefined)return (!['cn-tavern-host','cn-tavern-chef','cn-pharmacy-apprentice',CLINIC_PHYSICIAN_ROLE.id,ROYAL_KITCHEN_ROLE.id,TEA_SERVER_ROLE.id,TEA_PASTRY_ROLE.id,PALACE_GUARD_ROLE.id,JAPAN_RECEPTION_ROLE.id,...BATH_DELIVERY_ROLE_IDS,JAPAN_BATH_MIXING_ROLE.id,JAPAN_KITCHEN_ROLE.id,JAPAN_TABLE_SERVICE_ROLE.id].includes(role.id)||duty.stage==='missed')&&!['startedSeconds','coveredSeconds','completedTasks','endedHour','endedSeconds'].some(key=>own(duty,key));
 if(duty.shiftKind!=='continuous'||!continuousRole(role)||!Number.isFinite(duty.startedSeconds)||duty.startedSeconds<0)return false;
 const done=['inspection','ready','paid'].includes(duty.stage),keys=['coveredSeconds','completedTasks','endedHour','endedSeconds'];
 if(!done)return keys.every(key=>duty[key]===null);
 const maxSeconds=(role.dutyWindow.endHour-duty.arrivalHour)*60/GAME_MINUTES_PER_SECOND;
 return Number.isFinite(duty.coveredSeconds)&&duty.coveredSeconds>=0&&duty.coveredSeconds<=maxSeconds+1e-7&&
   integer(duty.completedTasks)&&Number.isFinite(duty.endedHour)&&duty.endedHour>=duty.arrivalHour&&duty.endedHour<24&&
   Number.isFinite(duty.endedSeconds)&&duty.endedSeconds>=duty.startedSeconds&&duty.coveredSeconds<=duty.endedSeconds-duty.startedSeconds+1e-7&&
   duty.coveredSeconds<=(Math.min(role.dutyWindow.endHour,duty.endedHour)-duty.arrivalHour)*60/GAME_MINUTES_PER_SECOND+1e-7;
}
const textField = (value,max=80) => typeof value==='string' && value.length>0 && value.length<=max;
function validCustomerReviewId(review,receiptId){
  const legacy=new RegExp('^'+receiptId+'-order-([1-9][0-9]*)-'+review.reasonCode+'$').exec(review.id);
  if(legacy)return integer(Number(legacy[1]));
  const world=review.reasonCode==='dirty-table'?/^cn-tavern-table-use-([1-9][0-9]*)-(west|east)-(0|[1-9][0-9]*)$/.exec(review.id):
    ['wrong-table','wrong-dish'].includes(review.reasonCode)?new RegExp('^cn-tavern-delivery-([1-9][0-9]*)-'+review.reasonCode+'$').exec(review.id):null;
  return !!world&&integer(Number(world[1]))&&(review.reasonCode!=='dirty-table'||integer(Number(world[3])));
}
function validCustomerReviews(duty,role){
  if(!reviewRole(role))return duty.customerReviews===undefined;
  // Published garden slips predate maintenance reviews. Preserve the absent
  // field and their fixed wage; only continuous shifts require the new ledger.
  if(role.id===GARDEN_ASSISTANT_ROLE.id&&duty.shiftKind===undefined&&duty.customerReviews===undefined)return true;
  if(!Array.isArray(duty.customerReviews)||duty.customerReviews.length>(role.id===ROYAL_KITCHEN_ROLE.id?120:[GARDEN_ASSISTANT_ROLE.id,JAPAN_RECEPTION_ROLE.id,...BATH_DELIVERY_ROLE_IDS,JAPAN_BATH_MIXING_ROLE.id,JAPAN_KITCHEN_ROLE.id,JAPAN_TABLE_SERVICE_ROLE.id].includes(role.id)?128:64))return false;
  const seen=new Map();
  for(const review of duty.customerReviews){
    if(!object(review)||!textField(review.id,200)||seen.has(review.id)||!identifier(review.customerId)||
      !textField(review.customerName)||!textField(review.tableId,64)||!textField(review.dishId,64)||
      !textField(review.tableName)||!textField(review.dishName)||!textField(review.reason,320))return false;
    if(role.id===GARDEN_ASSISTANT_ROLE.id){
      const receipt=review.gardenMaintenanceReceipt;
      if(!validGardenMaintenanceReceipt(receipt)||receipt.workReceiptId!==duty.workReceiptId||receipt.day!==duty.day||review.id!==receipt.id||
        review.customerId!==GARDEN_ASSISTANT_ROLE.supervisorId||review.customerName!==GARDEN_ASSISTANT_ROLE.employer||
        review.tableId!=='fr-garden-maintenance'||review.tableName!=='工作评价'||review.dishId!==receipt.kind||
        review.dishName!==(receipt.kind==='water'?'原玫瑰花畦浇水':'原黄杨篱修剪')||review.reasonCode!=='garden-maintenance-completed'||
        review.correctedReviewId!==null||review.score!==1||review.positive!==true)return false;
      seen.set(review.id,review);continue;
    }
    if(role.id===JAPAN_RECEPTION_ROLE.id){
      const receipt=review.receptionReceipt;
      if(!validJapanReceptionReceipt(receipt)||receipt.workReceiptId!==duty.workReceiptId||review.id!==receipt.id||
        review.customerId!==receipt.customerId||review.customerName!==receipt.customerName||review.tableId!=='jp-reception'||review.dishId!==receipt.kind||
        review.reasonCode!=='japan-reception-completed'||review.correctedReviewId!==null||review.score!==japanReceptionReviewScore(receipt)||review.positive!==(review.score>0))return false;
      seen.set(review.id,review);continue;
    }
    if(bathDeliveryRole(role)){
      const receipt=review.bathDeliveryReceipt;
      if(!validJapanBathDeliveryReceipt(receipt)||japanBathDeliveryRole(receipt.side).id!==role.id||receipt.workReceiptId!==duty.workReceiptId||review.id!==receipt.id||
        review.customerId!==receipt.customerId||review.customerName!==receipt.customerName||review.tableId!==role.id||review.dishId!==receipt.kind||
        review.reasonCode!=='japan-bath-delivery-completed'||review.correctedReviewId!==null||review.score!==japanBathDeliveryReviewScore(receipt)||review.positive!==(review.score>0))return false;
      seen.set(review.id,review);continue;
    }
    if(role.id===JAPAN_BATH_MIXING_ROLE.id){
      const receipt=review.bathMixingReceipt;
      if(!validJapanBathMixingReceipt(receipt)||receipt.workReceiptId!==duty.workReceiptId||review.id!==receipt.id||
        review.customerId!==receipt.customerId||review.customerName!==receipt.customerName||review.tableId!=='jp-bath-mixing'||review.dishId!==receipt.kind||
        review.reasonCode!=='japan-bath-mixing-completed'||review.correctedReviewId!==null||review.score!==japanBathMixingReviewScore(receipt)||review.positive!==(review.score>0))return false;
      seen.set(review.id,review);continue;
    }
    if(role.id===JAPAN_KITCHEN_ROLE.id){
      const receipt=review.kitchenReceipt;
      if(!validJapanKitchenReceipt(receipt)||receipt.workReceiptId!==duty.workReceiptId||review.id!==receipt.id||
        review.customerId!==receipt.customerId||review.customerName!==receipt.customerName||review.tableId!=='jp-kitchen'||review.dishId!==receipt.dishId||
        review.reasonCode!=='japan-kitchen-completed'||review.correctedReviewId!==null||review.score!==japanKitchenReviewScore(receipt)||review.positive!==(review.score>0))return false;
      seen.set(review.id,review);continue;
    }
    if(role.id===JAPAN_TABLE_SERVICE_ROLE.id){
      const receipt=review.tableServiceReceipt;
      if(!validJapanTableServiceReceipt(receipt)||receipt.workReceiptId!==duty.workReceiptId||review.id!==receipt.id||
        review.customerId!==receipt.customerId||review.customerName!==receipt.customerName||review.tableId!=='jp-table-service'||review.dishId!==receipt.dishId||
        review.reasonCode!=='japan-table-service-completed'||review.correctedReviewId!==null||review.score!==japanTableServiceReviewScore(receipt)||review.positive!==(review.score>0))return false;
      seen.set(review.id,review);continue;
    }
    if(role.id===ROYAL_KITCHEN_ROLE.id){
      const order=/^cn-royal-meal-([1-9][0-9]*)-completed$/.exec(review.id);
      if(!order||!integer(Number(order[1]))||review.reasonCode!=='royal-kitchen-completed'||!Object.hasOwn(ROYAL_KITCHEN_CUSTOMERS,review.customerId)||review.dishId!=='royal-meal'||review.tableId!==review.customerId||review.correctedReviewId!==null||review.score!==1||review.positive!==true)return false;
      seen.set(review.id,review);continue;
    }
    if(teaRole(role)){
      const order=/^france-tea-([1-9][0-9]*)-order-done$/.exec(review.id);
      if(!order||!integer(Number(order[1]))||review.reasonCode!=='tea-completed'||review.customerId!=='france-cafe'||review.dishId!=='tea-cake'||
        review.correctedReviewId!==null||review.score!==1||review.positive!==true)return false;
      seen.set(review.id,review);continue;
    }
    const corrected=review.reasonCode==='corrected',original=seen.get(review.correctedReviewId);
    if(corrected ? !original||original.positive||review.id!==original.id+'-corrected'||review.score!==1||review.positive!==true||
      ['customerId','customerName'].some(key=>review[key]!==original[key]) :
      !['wrong-table','wrong-dish','dirty-table'].includes(review.reasonCode)||review.correctedReviewId!==null||review.score!==-2||review.positive!==false||
      !validCustomerReviewId(review,duty.workReceiptId))return false;
    seen.set(review.id,review);
  }
  return true;
}

function validWorkReceipt(source,receiptId){const m=typeof receiptId==='string'&&new RegExp('^'+source+'-([1-9][0-9]*)$').exec(receiptId);return !!m&&integer(Number(m[1]));}

function catalogue(roles, slots) {
  if (!Array.isArray(roles) || !roles.length || !Array.isArray(slots) || !slots.length) throw Error('invalid-career-catalogue');
  const roleMap = new Map(), slotMap = new Map();
  for (const role of roles) {
    if (!object(role) || !identifier(role.id) || roleMap.has(role.id) ||
      !integer(role.wage) || role.wage < 1 || !Number.isSafeInteger(role.wage + 2) || !integer(role.minimumAgeYears) ||
      !object(role.skillRequirements) || !Object.keys(role.skillRequirements).length ||
      Object.entries(role.skillRequirements).some(([key, value]) => !SKILLS.includes(key) || !integer(value) || value > 100) ||
      !object(role.dutyWindow) || !Number.isFinite(role.dutyWindow.startHour) ||
      !Number.isFinite(role.dutyWindow.endHour) || role.dutyWindow.startHour < 0 ||
      role.dutyWindow.endHour > 24 || role.dutyWindow.endHour <= role.dutyWindow.startHour) throw Error('invalid-career-catalogue');
    roleMap.set(role.id, copy(role));
  }
  for (const slot of slots) {
    if (!object(slot) || !identifier(slot.id) || slotMap.has(slot.id) || !roleMap.has(slot.roleId) ||
      !(slot.holderId === null || identifier(slot.holderId)) ||
      (slot.rotation!==undefined && (slot.rotation!==true || slot.holderId!==roleMap.get(slot.roleId).incumbentId || roleMap.get(slot.roleId).vacancyKind!=='rotation'))) throw Error('invalid-career-catalogue');
    slotMap.set(slot.id, copy(slot));
  }
  return {roleMap, slotMap};
}

function restore(saved, roleMap, slotMap) {
  if (saved == null) return empty();
  // Version 1 is the published clerk save. Add only the new practice skill and
  // receipt counter; preserve its tenure, duty, earned salary and study tickets.
  if (object(saved) && saved.version === 1 && object(saved.skills) && Object.keys(saved.skills).length === 2 &&
    object(saved.daily) && object(saved.lowerWork) && Object.keys(saved.lowerWork).length === 1) {
    saved = {...copy(saved), version:2,skills:{...saved.skills,gardening:0},
      daily:{...saved.daily,gardening:0},lowerWork:{...saved.lowerWork,'fr-garden-labor':0}};
  }
  // Published v2 saves retain all earned progress, employment and receipts.
  // Reject malformed old study rows before adding the selected lesson field.
  if (object(saved) && saved.version === 2 && object(saved.skills) && Object.keys(saved.skills).length === 3 &&
    object(saved.daily) && object(saved.learning) && Object.keys(saved.learning).length === 2 &&
    ['cn-rest','cn-calligraphy'].every(source => object(saved.learning[source]) && Object.keys(saved.learning[source]).length === 3)) {
    saved = {...copy(saved), version:3, skills:{...saved.skills,art:0}, daily:{...saved.daily,art:0},
      learning:Object.fromEntries(STUDY_SOURCES.filter(source=>!['jp-library','egypt-papyrus'].includes(source)).map(source => [source, saved.learning[source] ?
        {...saved.learning[source],lessonId:saved.learning[source].issued?defaultStudyLesson(source).id:null}:emptyStudy()]))};
  }
  // Only the exact published four-skill v3 shape may gain a fresh cooking skill.
  // Existing salary validation below still rejects altered wages and old progress.
  if(object(saved)&&saved.version===3&&object(saved.skills)&&Object.keys(saved.skills).length===4&&
    ['ritual','writing','gardening','art'].every(key=>own(saved.skills,key))&&object(saved.daily)&&
    Object.keys(saved.daily).length===5&&!own(saved.daily,'cooking')&&
    ![saved.tenure,saved.lastDuty,saved.lastEvaluation].some(row=>row&&[TAVERN_HOST_ROLE.id,TAVERN_CHEF_ROLE.id].includes(row.roleId))&&
    !(saved.lastDuty&&['customerReviews','shiftKind','startedSeconds','coveredSeconds','completedTasks','endedHour','endedSeconds'].some(key=>own(saved.lastDuty,key)))&&
    !(saved.lastEvaluation&&['servicePenalty','coverageHours'].some(key=>own(saved.lastEvaluation,key)))&&
    !Object.values(saved.learning||{}).some(row=>row?.lessonId==='cooking-intro')){
    saved={...copy(saved),version:4,skills:{...saved.skills,cooking:0},daily:{...saved.daily,cooking:0},
      lastDuty:saved.lastDuty&&tavernRole(roleMap.get(saved.lastDuty.roleId))?{...saved.lastDuty,customerReviews:[]}:saved.lastDuty};
  }
  // Published five-skill saves gain only the new, unearned range skill/ticket.
  // Match the complete old shape so malformed or partial new saves still fail.
  if(object(saved)&&[4,5].includes(saved.version)&&object(saved.skills)&&Object.keys(saved.skills).length===5&&
    ['ritual','writing','gardening','art','cooking'].every(key=>own(saved.skills,key))&&object(saved.daily)&&Object.keys(saved.daily).length===6&&
    object(saved.learning)&&[4,5].includes(Object.keys(saved.learning).length)&&['cn-rest','cn-calligraphy','france-salon','france-atelier'].every(key=>own(saved.learning,key))&&
    (!own(saved.learning,'cn-archery')||JSON.stringify(saved.learning['cn-archery'])===JSON.stringify(emptyStudy()))&&
    (saved.version===4||object(saved.skillXP)&&Object.keys(saved.skillXP).length===5&&!own(saved.skillXP,'martial'))){
    saved={...copy(saved),skills:{...saved.skills,martial:0},daily:{...saved.daily,martial:0},
      ...(saved.version===5?{skillXP:{...saved.skillXP,martial:0}}:{}),learning:{...saved.learning,'cn-archery':emptyStudy()}};
  }
  // Published six-skill saves gain no inferred clinic experience. Only the
  // clinic's original delivery receipts may establish the new order watermark.
  if(object(saved)&&[4,5,6].includes(saved.version)&&object(saved.skills)&&Object.keys(saved.skills).length===6&&
    SKILLS.filter(key=>key!=='care').every(key=>own(saved.skills,key))&&object(saved.daily)&&Object.keys(saved.daily).length===7&&!own(saved.daily,'care')&&
    object(saved.lowerWork)&&Object.keys(saved.lowerWork).length===2&&Object.keys(WORK).every(key=>own(saved.lowerWork,key))&&
    (saved.version===4||object(saved.skillXP)&&Object.keys(saved.skillXP).length===6&&!own(saved.skillXP,'care'))&&
    ![saved.tenure,saved.lastDuty,saved.lastEvaluation].some(row=>row?.roleId===CLINIC_PHYSICIAN_ROLE.id)&&
    !Object.values(saved.learning||{}).some(row=>row?.lessonId==='care-intro')){
    saved={...copy(saved),skills:{...saved.skills,care:0},daily:{...saved.daily,care:0},
      ...(saved.version>=5?{skillXP:{...saved.skillXP,care:0}}:{}),lowerWork:{...saved.lowerWork,'cn-pharmacy-labor':0}};
  }
  // Published saves have exactly these five physical learning sources. Add
  // only an unissued local library ticket; never infer progress or receipts.
  // A v9 save missing this row is damaged, not another migration opportunity.
  if(object(saved)&&[4,5,6,7,8].includes(saved.version)&&object(saved.learning)&&
    Object.keys(saved.learning).length===5&&['cn-rest','cn-calligraphy','cn-archery','france-salon','france-atelier'].every(source=>own(saved.learning,source))){
    saved={...copy(saved),learning:{...saved.learning,'jp-library':emptyStudy()}};
  }
  // The published v9 shape has exactly six sources. Append only the public
  // papyrus desk ticket, keeping every existing receipt, job and wage intact.
  // Missing rows in a v10 save are corruption, never an invitation to reset.
  if(object(saved)&&[4,5,6,7,8,9].includes(saved.version)&&object(saved.learning)&&
    Object.keys(saved.learning).length===6&&['cn-rest','cn-calligraphy','cn-archery','france-salon','france-atelier','jp-library'].every(source=>own(saved.learning,source))){
    saved={...copy(saved),learning:{...saved.learning,'egypt-papyrus':emptyStudy()}};
  }
  const validSlot = (roleId, slotId) => roleMap.has(roleId) && slotMap.get(slotId)?.roleId === roleId && availableSlot(slotMap.get(slotId),roleMap.get(roleId));
  if (!object(saved) || ![4,5,6,7,8,9,10].includes(saved.version) || !integer(saved.revision) || !object(saved.skills) ||
    Object.keys(saved.skills).length !== SKILLS.length || SKILLS.some(key => !integer(saved.skills[key])) ||
    SKILLS.some(key=>saved.skills[key]>100) || saved.skills.ritual + saved.skills.writing > 100 || !dayOrNull(saved.lastPaidDay) ||
    !object(saved.daily) || !dayOrNull(saved.daily.day) || SKILLS.some(key => !integer(saved.daily[key]) ||
      saved.daily[key] > 4 || saved.version===4 && saved.daily[key] > saved.skills[key]) ||
    (saved.daily.day === null && SKILLS.some(key => saved.daily[key] !== 0)) ||
    !object(saved.learning) || Object.keys(saved.learning).length !== STUDY_SOURCES.length ||
    !object(saved.lowerWork) || Object.keys(saved.lowerWork).length !== 3 || [...Object.keys(WORK),PHARMACY_ASSISTANT_ROLE.workSource].some(source=>!integer(saved.lowerWork[source])) ||
    !Number.isInteger(saved.performance) || Math.abs(saved.performance) > 100 ||
    !integer(saved.promotionProgress) || saved.promotionProgress > 100 || !dayOrNull(saved.lastEvaluatedDay)) throw Error('invalid-career-state');
  if(saved.version>=5&&(!object(saved.skillXP)||Object.keys(saved.skillXP).length!==SKILLS.length||
    SKILLS.some(key=>!integer(saved.skillXP[key])||saved.skillXP[key]>=skillXPRequired(saved.skills[key])||saved.skills[key]===100&&saved.skillXP[key]!==0)))throw Error('invalid-career-state');
  for (const source of STUDY_SOURCES) {
    const study = saved.learning[source];
    if (!object(study) || Object.keys(study).length !== 4 || !integer(study.issued) || !integer(study.completed) || study.completed > study.issued ||
      !dayOrNull(study.issuedDay) || (study.issued === 0) !== (study.issuedDay === null) ||
      (study.issued === 0 ? study.lessonId !== null : !savedStudyLesson(source,study.lessonId))) throw Error('invalid-career-state');
  }
  if (saved.tenure !== null && (!object(saved.tenure) || !validSlot(saved.tenure.roleId, saved.tenure.slotId) ||
    !integer(saved.tenure.sinceDay) || !Number.isFinite(saved.tenure.sinceHour) ||
    saved.tenure.sinceHour < 0 || saved.tenure.sinceHour >= 24 || !validTenureApplication(saved.tenure))) throw Error('invalid-career-state');
  const duty = saved.lastDuty;
  if (duty !== null && (!object(duty) || !validSlot(duty.roleId, duty.slotId) || !integer(duty.day) ||
    !STAGES.has(duty.stage) || !validOfficialFields(duty,roleMap.get(duty.roleId)) || typeof duty.started !== 'boolean' || !validShift(duty,roleMap.get(duty.roleId)) || !validCustomerReviews(duty,roleMap.get(duty.roleId)) ||
    !(duty.reason === null || typeof duty.reason === 'string' && duty.reason.length <= 80) ||
    !(duty.arrivalHour === null || Number.isFinite(duty.arrivalHour) &&
      duty.arrivalHour >= roleMap.get(duty.roleId).dutyWindow.startHour && duty.arrivalHour < roleMap.get(duty.roleId).dutyWindow.endHour) ||
    (duty.stage !== 'missed' && duty.arrivalHour === null) ||
    (duty.stage === 'arrived' && duty.started) ||
    (roleMap.get(duty.roleId).workSource ? !['working','inspection','ready','paid','missed'].includes(duty.stage) ||
      !(duty.workReceiptId === null && duty.stage === 'missed' || validWorkReceipt(roleMap.get(duty.roleId).workSource,duty.workReceiptId)) :
      ['working','inspection'].includes(duty.stage) || duty.workReceiptId != null) ||
    (['attending', 'archive', 'ready', 'paid', 'working', 'inspection'].includes(duty.stage) && !duty.started) ||
    (['arrived', 'attending', 'archive', 'ready', 'working', 'inspection'].includes(duty.stage) &&
      (!saved.tenure || duty.roleId !== saved.tenure.roleId || duty.slotId !== saved.tenure.slotId || duty.day < saved.tenure.sinceDay)) ||
    (['ready', 'paid'].includes(duty.stage) ? duty.wage !== dutyWage(roleMap.get(duty.roleId), duty) : duty.wage !== null) ||
    (duty.stage === 'paid' && saved.lastPaidDay !== duty.day) ||
    (saved.lastPaidDay !== null && (duty.day < saved.lastPaidDay || duty.day === saved.lastPaidDay && duty.stage !== 'paid')))) throw Error('invalid-career-state');
  if (saved.lastPaidDay !== null && duty === null) throw Error('invalid-career-state');
  const review = saved.lastEvaluation;
  if (review === null ? saved.lastEvaluatedDay !== null ||
      saved.performance !== (duty?.customerReviews||[]).reduce((total,r)=>Math.max(-100,Math.min(100,total+r.score)),0) ||
      saved.promotionProgress !== (duty?.customerReviews||[]).reduce((total,r)=>Math.max(0,Math.min(100,total+Math.min(0,r.score))),0) :
    !object(review) || !validSlot(review.roleId, review.slotId) || !validOfficialFields(review,roleMap.get(review.roleId)) || !integer(review.day) ||
    review.day !== saved.lastEvaluatedDay || review.id !== `career-review:${review.slotId}:${review.day}` ||
    review.evaluatorId !== supervisor(roleMap.get(review.roleId)) || typeof review.positive !== 'boolean' ||
    review.score !== (review.positive ? review.coverageHours===undefined||review.coverageHours>=12-1e-9?1:0 : -1) || typeof review.reason !== 'string' || review.reason.length > 80 ||
    typeof review.reasonCode !== 'string' || review.reasonCode.length > 80 ||
    (!integer(review.servicePenalty??0)|| (review.servicePenalty??0)>128 || (!tavernRole(roleMap.get(review.roleId))&&(review.servicePenalty??0)!==0)) ||
    (review.coverageHours!==undefined&&(!continuousRole(roleMap.get(review.roleId))||!Number.isFinite(review.coverageHours)||review.coverageHours<0||review.coverageHours>12+1e-9)) ||
    (review.positive ? review.coverageHours!==undefined?review.wage!==Math.max(0,attendanceWage(roleMap.get(review.roleId),review.coverageHours)-(review.servicePenalty??0)) : ![salaryRole(roleMap.get(review.roleId),review).wage,salaryRole(roleMap.get(review.roleId),review).wage+(roleMap.get(review.roleId).preparationBonus??2)].map(wage=>Math.max(1,wage-(review.servicePenalty??0))).includes(review.wage) : review.wage !== 0) ||
    !duty || review.day > duty.day || review.day === duty.day && (review.slotId !== duty.slotId ||
      (JSON.stringify(officialFields(review))!==JSON.stringify(officialFields(duty))) ||
      (review.positive ? !['ready', 'paid'].includes(duty.stage) || duty.wage !== review.wage || (duty.shiftKind==='continuous'?review.coverageHours!==coveredHours(duty):review.coverageHours!==undefined) || (review.servicePenalty??0)!==customerPenalty(duty) : duty.stage !== 'missed'))) throw Error('invalid-career-state');
  if (duty && ['ready', 'paid'].includes(duty.stage) && (!review || review.day !== duty.day || !review.positive)) throw Error('invalid-career-state');
  // Versioned saves retain earned rank history; v7 also protects care proof.
  if(saved.version>=6&&saved.officialCareer===undefined)throw Error('invalid-career-state');
  const officialCareer=restoreOfficialCareer(saved.officialCareer,{tenure:saved.tenure,lastDuty:duty,lastEvaluation:review});
  for(const row of [duty,review])if(row?.officialPayVersion===1){
    const appointment=officialCareer.appointments.find(a=>a.id===row.officialTenureId);
    const promoted=officialCareer.applications.find(a=>a.appointmentId===appointment?.id&&a.status==='approved');
    const arrival=row===duty?duty.arrivalHour:row.day===duty?.day?duty.arrivalHour:null;
    if(!appointment||row.day<appointment.tenure.sinceDay||appointment.endedAt&&row.day>appointment.endedAt.day||
      row.officialRankId===CLERK_NEXT_RANK&&(!promoted||promoted.decidedAt.day>row.day||promoted.decidedAt.day===row.day&&arrival!==null&&arrival<promoted.decidedAt.hour))throw Error('invalid-career-state');
    if(row===review){const evidence=officialCareer.service.find(r=>r.id===review.id);if(!evidence||evidence.appointmentId!==row.officialTenureId||evidence.rankId!==row.officialRankId||['positive','score','wage','reasonCode'].some(key=>evidence[key]!==row[key]))throw Error('invalid-career-state');}
  }
  // No wage total, skill growth or aggregate task counter can imply chef days.
  const workExperience=saved.version>=8?saved.workExperience:emptyWorkExperience();
  if(!object(workExperience)||Object.keys(workExperience).length!==2||!Array.isArray(workExperience.tavernChef)||workExperience.tavernChef.length>ROYAL_KITCHEN_CHEF_DAYS||
    workExperience.tavernChef.some(row=>!validTavernChefServiceReceipt(row))||['day','number','workReceiptId'].some(key=>new Set(workExperience.tavernChef.map(row=>row[key])).size!==workExperience.tavernChef.length)||
    !object(workExperience.royalKitchen)||Object.keys(workExperience.royalKitchen).length!==1||!Array.isArray(workExperience.royalKitchen.receipts)||workExperience.royalKitchen.receipts.length>120||workExperience.royalKitchen.receipts.some(row=>!validRoyalKitchenServiceReceipt(row))||new Set(workExperience.royalKitchen.receipts.map(row=>row.number)).size!==workExperience.royalKitchen.receipts.length)throw Error('invalid-career-state');
  if([saved.tenure,saved.lastDuty,saved.lastEvaluation].some(row=>row?.roleId===ROYAL_KITCHEN_ROLE.id)&&workExperience.tavernChef.length<ROYAL_KITCHEN_CHEF_DAYS)throw Error('invalid-career-state');
  return {version: 10, workExperience:copy(workExperience), officialCareer, skillXP: saved.version>=5?{...saved.skillXP}:Object.fromEntries(SKILLS.map(skill=>[skill,0])), revision: saved.revision, applications: restoreApplications(saved.applications, roleMap, slotMap), skills: {...saved.skills},
    tenure: saved.tenure === null ? null : {roleId: saved.tenure.roleId, slotId: saved.tenure.slotId,
      sinceDay: saved.tenure.sinceDay, sinceHour: saved.tenure.sinceHour,...(saved.tenure.applicationId!==undefined?{applicationId:saved.tenure.applicationId}:{})},
    lastDuty: duty === null ? null : {roleId: duty.roleId, slotId: duty.slotId, day: duty.day, stage: duty.stage,
      started: duty.started, reason: duty.reason, arrivalHour: duty.arrivalHour, wage: duty.wage,...officialFields(duty),...(roleMap.get(duty.roleId).workSource?{workReceiptId:duty.workReceiptId}: {}),...(reviewRole(roleMap.get(duty.roleId))&&duty.customerReviews!==undefined?{customerReviews:copy(duty.customerReviews)}:{}),...(duty.shiftKind?{shiftKind:duty.shiftKind,startedSeconds:duty.startedSeconds,coveredSeconds:duty.coveredSeconds,completedTasks:duty.completedTasks,endedHour:duty.endedHour,endedSeconds:duty.endedSeconds}:{})},
    lastPaidDay: saved.lastPaidDay, daily: {...saved.daily},
    learning: Object.fromEntries(STUDY_SOURCES.map(source => [source, {...saved.learning[source]}])),
    lowerWork: {...saved.lowerWork}, performance: saved.performance,
    promotionProgress: saved.promotionProgress, lastEvaluatedDay: saved.lastEvaluatedDay,
    lastEvaluation: review === null ? null : {id: review.id, evaluatorId: review.evaluatorId, day: review.day,
      roleId: review.roleId, slotId: review.slotId, positive: review.positive, score: review.score,
      reason: review.reason, reasonCode: review.reasonCode, wage: review.wage,...officialFields(review),...(review.servicePenalty?{servicePenalty:review.servicePenalty}:{}),...(review.coverageHours!==undefined?{coverageHours:review.coverageHours}:{})}};
}

/**
 * saveState must atomically persist a detached snapshot before returning;
 * false/throw/Promise rejects. Clock and witnessed events come from the host.
 * Allocate a study ticket at actual study start, then submit observed active
 * seconds. Only the newest ticket per source can complete, on its original day.
 * completedLowerWork is a trusted callback at the labor module's verified ready
 * boundary, before its receipt clears. Acceptance/cancellation must not call it.
 * creditWageToBank({amount,receiptId,currency,roleId,slotId,day}) must atomically
 * credit the role's bank currency with durable receipt dedupe and return synchronously.
 * Missing bank credit support locks settlement only; cash is never a fallback.
 * No passive simulation or wages. Failed paid-state cleanup keeps ready intact.
 */
export function createFormalCareers({saved, worldDuty=null, saveState, creditWageToBank, getClock, worldSeed=1, getHiringContext=()=>({}), getPoliticalTitle=()=>null,
  roles = FORMAL_CAREER_ROLES, slots = FORMAL_CAREER_SLOTS} = {}) {
  if (typeof saveState !== 'function' || typeof getClock !== 'function') {
    throw new TypeError('formal careers require synchronous saveState and getClock');
  }
  let current = empty(), loadError = null, lastError = null, saving = false, paying = false, lastClock = null;
  let observedDay = null, interruptedUnsaved = false, lastApplication = null;
  const activeStudies = new Map();
  let roleMap = new Map(), slotMap = new Map();
  try { ({roleMap, slotMap} = catalogue(roles, slots)); current = restore(saved, roleMap, slotMap); }
  catch (error) { loadError = error.message === 'invalid-career-catalogue' ? error.message : 'invalid-career-state'; }
  try { const clock = getClock(); if (integer(clock?.day)) observedDay = clock.day; } catch { /* checked at mutation */ }
  const state = () => ({...copy(current), loadError, lastError});
  const failure = (code, reasons = [code]) => { lastError = code; return {ok: false, code, reasons: [...reasons]}; };
  function readClock() {
    let clock;
    try { clock = getClock(); } catch { return null; }
    if (!object(clock) || !integer(clock.day) || !Number.isFinite(clock.hour) || clock.hour < 0 || clock.hour >= 24 ||
      !Number.isFinite(clock.seconds) || clock.seconds < 0) return null;
    const days = [current.lastDuty?.day, current.tenure?.sinceDay, current.lastPaidDay, current.daily.day, current.lastEvaluatedDay,
      ...current.officialCareer.appointments.flatMap(a=>[a.tenure.sinceDay,a.endedAt?.day]), ...current.officialCareer.service.map(r=>r.day), ...current.officialCareer.applications.flatMap(a=>[a.day,a.reviewedAt?.day,a.decidedAt?.day]),
      ...Object.values(current.learning).map(study => study.issuedDay), ...Object.values(current.applications.byRole).flatMap(result=>[result.day,result.reviewedAt?.day,result.decidedAt?.day])].filter(day => day != null);
    if (days.some(day => day > clock.day) || lastClock &&
      (clock.day < lastClock.day || clock.day === lastClock.day && clock.hour < lastClock.hour)) return null;
    return clock;
  }
  function now(){const clock=readClock();if(clock)lastClock={...clock};return clock;}
  function allowed() {
    return loadError || saving || paying ? failure(loadError || 'career-busy') : null;
  }
  function persist(next) {
    if (!Number.isSafeInteger(current.revision + 1)) return failure('revision-limit');
    next = {...next, revision: current.revision + 1}; saving = true;
    try {
      const result = saveState(copy(next));
      if (result === false) return failure('save-failed');
      if (result && typeof result.then === 'function') {
        Promise.resolve(result).catch(() => {}); return failure('async-save-unsupported');
      }
      current = next; lastError = null; return {ok: true};
    } catch { return failure('save-failed'); }
    finally { saving = false; }
  }
  function evaluate(next, positive, reason) {
    const duty = next.lastDuty;
    if (next.lastEvaluatedDay !== null && next.lastEvaluatedDay >= duty.day) return next;
    const role=salaryRole(roleMap.get(duty.roleId),duty),hours=duty.shiftKind==='continuous'?coveredHours(duty):null,score=positive?(hours===null||hours>=12-1e-9?1:0):-1;
    // The conscientious supervisor rewards completing both actual duties and
    // gives a small preparation bonus for arrival at least five minutes early.
    const servicePenalty=customerPenalty(duty),wage = positive ? dutyWage(role,duty) : 0;
    const currencyUnit=role.currency==='japan'?'日本券':role.currency==='france'?'法国券':'铜文';
    const reasonText = hours!==null&&positive?`当面交班已验收；实际当班${hours.toFixed(2)}小时，按工时计薪${wage}${currencyUnit}`:role.workSource ? positive ? `${role.employer}已验收完整当班职责${wage>role.wage?'；午前开班，勤勉奖励+1':''}` : '当班职责未完成，没有日薪' : positive ? wage > role.wage ? '提前到岗，朝会记录与归档均已完成' : '按时到岗，朝会记录与归档均已完成' :
      ({absent: '未按时到岗，缺席当日朝会', reloaded: '朝会中途离开，出勤记录未完成',
        resigned: '当日职责未完成即离任', 'day-ended': '当日朝会或归档未完成'})[reason] || '出勤中断，当日职责未完成';
    const reviewed={...next, performance: Math.max(-100, Math.min(100, next.performance + score)),
      promotionProgress: Math.max(0, Math.min(100, next.promotionProgress + score)), lastEvaluatedDay: duty.day,
      lastDuty: {...duty, wage: positive ? wage : null}, lastEvaluation: {
        id: `career-review:${duty.slotId}:${duty.day}`, evaluatorId: supervisor(role),
        day: duty.day, roleId: duty.roleId, slotId: duty.slotId, positive, score, reason: reasonText+(servicePenalty?`；顾客评价扣薪${Math.min(hours===null?completedWage(role,duty.arrivalHour)-1:attendanceWage(role,hours),servicePenalty)}${currencyUnit}`:''), reasonCode: reason, wage,...officialFields(duty),...(servicePenalty?{servicePenalty}:{}),...(positive&&hours!==null?{coverageHours:hours}:{})}};
    return {...reviewed,officialCareer:recordOfficialService(reviewed.officialCareer,reviewed.tenure,reviewed.lastEvaluation,duty.officialRankId||CLERK_ENTRY_RANK)};
  }
  function missed(next, reason) {
    next = {...next, lastDuty: {...next.lastDuty, stage: 'missed', reason, wage: null}};
    // The court's own cancellation is not a player absence. Keep its terminal
    // receipt without manufacturing either a positive or a negative review.
    if (excused(next.lastDuty)) return next;
    return next.lastDuty.started ? evaluate(next, false, reason) : next;
  }
  // Reloads cannot resume a live ceremony. Persist the recovery and evaluation
  // together; if recovery cannot save, all mutations remain locked fail closed.
  const resumableDuty=worldDuty?.version===1&&worldDuty.activity==='court'&&worldDuty.duty&&['roleId','slotId','day'].every(key=>worldDuty.duty[key]===current.lastDuty?.[key])&&worldDuty.duty.day===getClock()?.day;
  if (!loadError && !resumableDuty && ['arrived', 'attending'].includes(current.lastDuty?.stage)) {
    const recovered = missed(current, 'reloaded');
    const result = persist(recovered);
    if (!result.ok) { current = recovered; loadError = 'recovery-save-failed'; }
  }
  // The registry and the final physical application use the same requirements.
  // Reading eligibility never changes the clock, save, vacancy or error state.
  const politicalBlocker=()=>{try{const title=getPoliticalTitle();return title?.loadError?'political-state-unavailable':title?.active?'political-title-held':null;}catch{return 'political-state-unavailable';}};
  function eligibility(roleId = COURT_CLERK_ROLE.id, {ageYears} = {}) {
    const role = roleMap.get(roleId);
    const blocked = loadError || (!role ? 'unknown-role' : current.tenure ? 'already-employed' : politicalBlocker());
    if (blocked) return {ok: false, code: blocked, reasons: [blocked]};
    const reasons = [];
    if (!Number.isFinite(ageYears) || ageYears < role.minimumAgeYears) reasons.push('adult-required');
    if (Number.isFinite(ageYears) && role.maximumAgeYears!==undefined && ageYears>role.maximumAgeYears) reasons.push('age-range-required');
    for (const [skill, minimum] of Object.entries(role.skillRequirements)) if (current.skills[skill] < minimum) reasons.push(`${skill}-required`);
    if(roleId===ROYAL_KITCHEN_ROLE.id&&current.workExperience.tavernChef.length<ROYAL_KITCHEN_CHEF_DAYS)reasons.push('tavern-chef-days-required');
    if(roleId===CLINIC_PHYSICIAN_ROLE.id&&current.lowerWork[PHARMACY_ASSISTANT_ROLE.workSource]===0)reasons.push('clinic-experience-required');
    const slot = [...slotMap.values()].find(candidate => candidate.roleId === roleId && availableSlot(candidate,role));
    if (!slot) reasons.push('no-vacancy');
    return reasons.length ? {ok: false, code: 'ineligible', reasons} : {ok: true, slotId: slot.id};
  }
  function applicationView(value){
    if(!value)return null;const receipt=copy(value);
    const active=receipt.ok&&receipt.tenure&&current.tenure&&['roleId','slotId','sinceDay','sinceHour'].every(key=>current.tenure[key]===receipt.tenure[key])&&(!current.tenure.applicationId||current.tenure.applicationId===(receipt.id||receipt.tenure.applicationId));
    return {...receipt,employmentStatus:receipt.ok?(active?'active':'ended'):null};
  }
  function applicationResult(roleId) {
    const id=roleId??lastApplication?.roleId??current.applications.lastRoleId;
    return applicationView(lastApplication?.roleId===id?lastApplication:current.applications.byRole[id]?{...current.applications.byRole[id],saved:true}:null);
  }
  const applicationHistory=roleId=>(current.applications.history||[]).filter(r=>!roleId||r.roleId===roleId).map(r=>applicationView({...r,saved:true}));
  function applicationAvailability(roleId = COURT_CLERK_ROLE.id, applicant = {}) {
    const clock=readClock(),previous=current.applications.byRole[roleId];
    if(previous?.status==='pending')return {ok:false,code:'application-pending',reasons:['application-pending'],applicationId:previous.id,roleId};
    if(clock&&previous?.day===clock.day)return {ok:false,code:'already-applied-today',reasons:['already-applied-today'],nextDay:clock.day+1};
    return eligibility(roleId,applicant);
  }
  const checkedApplicant=(role,applicant)=>({ageYears:Number.isFinite(applicant.ageYears)&&applicant.ageYears>=0?applicant.ageYears:null,
    skills:Object.fromEntries(Object.keys(role.skillRequirements).map(key=>[key,current.skills[key]]))});
  function saveApplication(receipt,extra={}){
    const previous=current.applications.byRole[receipt.roleId],history=current.applications.history||[];
    const archived=previous?.ok&&previous.id!==receipt.id?[...history,copy(previous)]:history;
    const result=persist({...current,...extra,applications:{...current.applications,lastRoleId:receipt.roleId,byRole:{...current.applications.byRole,[receipt.roleId]:receipt},...(archived.length?{history:archived}:{})}});
    if(result.ok)lastApplication=null;return result;
  }
  function apply(roleId = COURT_CLERK_ROLE.id, applicant = {}) {
    const finish = result => {lastApplication = {roleId, ...copy(result),saved:false}; return result;};
    const blocked = allowed(); if (blocked) return finish(blocked);
    const role=roleMap.get(roleId);if(!role)return finish(failure('unknown-role'));
    const clock=now();if(!clock)return finish(failure('invalid-clock'));
    const previous=current.applications.byRole[roleId];
    if(previous?.status==='pending'){lastApplication=null;return failure('application-pending');}
    if(previous?.day===clock.day){lastApplication={...copy(previous),saved:true};return failure('already-applied-today');}
    const eligible=eligibility(roleId,applicant),receipt={id:applicationId(roleId,clock.day),roleId,status:eligible.ok?'pending':'rejected',
      stage:eligible.ok?'submitted':'decided',ok:false,code:eligible.ok?'submitted':eligible.code,reasons:eligible.reasons||[],
      day:clock.day,hour:clock.hour,roll:careerInterviewRoll(worldSeed,roleId,clock.day),checked:checkedApplicant(role,applicant),
      interview:null,reviewedAt:null,decidedAt:eligible.ok?null:{day:clock.day,hour:clock.hour},appointment:null,tenure:null};
    const saved=saveApplication(receipt);if(!saved.ok)return finish(saved);
    lastError=eligible.ok?null:eligible.code;
    return eligible.ok?{ok:true,code:'submitted',applicationId:receipt.id}:{ok:false,code:receipt.code,reasons:receipt.reasons};
  }
  function reviewApplication(roleId,{ageYears,applicationId:expectedId,step='interview'}={}){
    const blocked=allowed();if(blocked)return blocked;
    const role=roleMap.get(roleId),receipt=current.applications.byRole[roleId];
    if(!role||!receipt||receipt.status!=='pending')return failure('no-pending-application');
    if(expectedId!==receipt.id)return failure('stale-application');
    const clock=now();if(!clock)return failure('invalid-clock');
    const timestamp={day:clock.day,hour:clock.hour};
    if(step==='receive-document'){
      if(receipt.stage!=='document-ready')return failure('wrong-review-step');
      const saved=saveApplication({...receipt,stage:'document-held',code:'document-held'});
      return saved.ok?{ok:true,code:'document-held',applicationId:receipt.id}:saved;
    }
    if(step!=='interview'&&step!=='appointment'||step==='interview'&&receipt.stage!=='submitted'||step==='appointment'&&receipt.stage!=='document-held')return failure('wrong-review-step');
    const eligible=eligibility(roleId,{ageYears});let interview=receipt.interview,reviewedAt=receipt.reviewedAt,appointment=receipt.appointment;
    if(eligible.ok&&step==='interview'){
      let context;try{context=getHiringContext(role)||{};}catch{return failure('hiring-context-unavailable');}
      if(roleId===COURT_CLERK_ROLE.id)context={...context,recruiterTraits:{conscientiousness:COURT_SUPERVISOR.conscientiousness,...context.recruiterTraits}};
      interview={...careerInterview({role,skills:current.skills,performance:current.performance,context,worldSeed,day:receipt.day}),roll:receipt.roll};reviewedAt=timestamp;
    }
    const approved=eligible.ok&&interview.roll<interview.chance;
    if(approved&&roleId===COURT_CLERK_ROLE.id&&step==='interview'){
      appointment={id:`appointment:${receipt.id}`,text:'承务官署任命文书：履历与礼仪文书考核已核验。授从九品礼务录事，依班听记朝议，归档当日文书。领文宣读后生效。'};
      const saved=saveApplication({...receipt,stage:'document-ready',code:'document-ready',checked:checkedApplicant(role,{ageYears}),interview,reviewedAt,appointment});
      return saved.ok?{ok:true,code:'document-ready',applicationId:receipt.id}:saved;
    }
    const code=approved?'approved':eligible.ok?'interview-rejected':eligible.code,reasons=approved?[]:eligible.ok?['interview-rejected']:eligible.reasons;
    const tenure=approved?{roleId,slotId:eligible.slotId,sinceDay:clock.day,sinceHour:clock.hour,applicationId:receipt.id}:null;
    const saved=saveApplication({...receipt,status:approved?'approved':'rejected',stage:'decided',ok:approved,code,reasons,checked:checkedApplicant(role,{ageYears}),interview,reviewedAt,appointment,decidedAt:timestamp,tenure},tenure?{tenure,officialCareer:recordOfficialAppointment(current.officialCareer,tenure)}:{});
    if(!saved.ok)return saved;lastError=approved?null:code;
    return {ok:approved,code,reasons,...(tenure?{tenure:copy(tenure)}:{})};
  }
  function cancelApplication(roleId,expectedId){
    const blocked=allowed();if(blocked)return blocked;
    const receipt=current.applications.byRole[roleId];if(receipt?.status!=='pending')return failure('no-pending-application');
    if(receipt.id!==expectedId)return failure('stale-application');
    const clock=now();if(!clock)return failure('invalid-clock');
    const saved=saveApplication({...receipt,status:'cancelled',stage:'decided',ok:false,code:'withdrawn',reasons:['withdrawn'],decidedAt:{day:clock.day,hour:clock.hour}});
    return saved.ok?{ok:true,code:'withdrawn'}:saved;
  }
  function promotionSummary(){
    return {...officialPromotionSummary(current.officialCareer,current.tenure,readClock(),current.skills,current.lastDuty),loadError};
  }
  function promotionAvailability(){
    if(loadError)return {ok:false,code:loadError,reasons:[loadError]};
    const clock=readClock(),summary=promotionSummary();
    if(!clock)return {ok:false,code:'invalid-clock',reasons:['invalid-clock']};
    if(summary.application?.status==='pending')return {ok:false,code:'promotion-pending',reasons:['promotion-pending']};
    if(current.officialCareer.applications.some(a=>a.day===clock.day))return {ok:false,code:'promotion-applied-today',reasons:['promotion-applied-today']};
    return {ok:summary.eligible,code:summary.eligible?'eligible':summary.reasons[0],reasons:summary.reasons};
  }
  function savePromotion(receipt){
    const ledger=current.officialCareer,index=ledger.applications.findIndex(a=>a.id===receipt.id),applications=ledger.applications.slice();
    if(index<0)applications.push(receipt);else applications[index]=receipt;
    return persist({...current,officialCareer:{...ledger,applications}});
  }
  function applyPromotion(){
    const blocked=allowed();if(blocked)return blocked;
    const clock=now();if(!clock)return failure('invalid-clock');
    const available=promotionAvailability();if(!available.ok)return failure(available.code,available.reasons);
    const summary=promotionSummary(),receipt={id:`official-promotion:${COURT_CLERK_ROLE.id}:${clock.day}`,
      appointmentId:officialTenureId(current.tenure),fromRankId:CLERK_ENTRY_RANK,toRankId:CLERK_NEXT_RANK,
      day:clock.day,hour:clock.hour,status:'pending',stage:'submitted',code:'submitted',
      roll:careerInterviewRoll(worldSeed,COURT_CLERK_ROLE.id+':promotion',clock.day),
      checked:{qualifiedDays:summary.qualifiedDays,tenureDays:summary.tenureDays,balance:summary.balance},
      review:null,reviewedAt:null,decidedAt:null,appointment:null};
    const saved=savePromotion(receipt);return saved.ok?{ok:true,code:'submitted',applicationId:receipt.id}:saved;
  }
  function reviewPromotion({applicationId:expectedId,step='interview'}={}){
    const blocked=allowed();if(blocked)return blocked;
    const summary=promotionSummary(),receipt=summary.application;
    if(!receipt||receipt.status!=='pending')return failure('no-pending-promotion');
    if(expectedId!==receipt.id)return failure('stale-application');
    const clock=now();if(!clock)return failure('invalid-clock');
    if(!summary.eligible)return failure(summary.reasons[0],summary.reasons);
    const timestamp={day:clock.day,hour:clock.hour};
    if(step==='receive-document'){
      if(receipt.stage!=='document-ready')return failure('wrong-review-step');
      const saved=savePromotion({...receipt,stage:'document-held',code:'document-held'});
      return saved.ok?{ok:true,code:'document-held',applicationId:receipt.id}:saved;
    }
    if(step==='appointment'){
      if(receipt.stage!=='document-held'||!receipt.review?.passed)return failure('wrong-review-step');
      const saved=savePromotion({...receipt,status:'approved',stage:'decided',code:'approved',decidedAt:timestamp});
      return saved.ok?{ok:true,code:'approved',rankId:CLERK_NEXT_RANK}:saved;
    }
    if(step!=='interview'||receipt.stage!=='submitted')return failure('wrong-review-step');
    // Evidence earns a bounded opportunity. The stored day draw prevents reload
    // or repeated clicks from rerolling the supervisor's actual assessment.
    const chance=Math.min(.94,.70+Math.min(.20,Math.max(0,summary.qualifiedDays-3)*.04)+
      Math.min(.04,Math.max(0,current.skills.ritual-2+current.skills.writing-2)*.01)-Math.min(.30,Math.max(0,summary.qualifiedDays-summary.balance)*.05));
    const review={chance:Math.max(.4,Math.round(chance*10000)/10000),roll:receipt.roll,passed:false};review.passed=review.roll<review.chance;
    const appointment=review.passed?{id:`appointment:${receipt.id}`,text:'承务官署升阶文书：核验三日以上从九品实任朝班、归档及考语，沈叙当面考核通过。礼务录事升正九品；持文宣读后生效，下次新班基础日薪二十二文，既有薪据不改。'}:null;
    const next={...receipt,review,reviewedAt:timestamp,appointment,status:review.passed?'pending':'rejected',stage:review.passed?'document-ready':'decided',code:review.passed?'document-ready':'promotion-review-rejected',decidedAt:review.passed?null:timestamp};
    const saved=savePromotion(next);return saved.ok?{ok:review.passed,code:next.code,reasons:review.passed?[]:[next.code],applicationId:receipt.id}:saved;
  }
  function cancelPromotion(expectedId){
    const blocked=allowed();if(blocked)return blocked;
    const receipt=promotionSummary().application;if(!receipt||receipt.status!=='pending')return failure('no-pending-promotion');
    if(receipt.id!==expectedId)return failure('stale-application');
    const clock=now();if(!clock)return failure('invalid-clock');
    const saved=savePromotion({...receipt,status:'cancelled',stage:'decided',code:'withdrawn',decidedAt:{day:clock.day,hour:clock.hour}});
    return saved.ok?{ok:true,code:'withdrawn'}:saved;
  }
  function resign() {
    const blocked = allowed(); if (blocked) return blocked;
    if (!current.tenure) return failure('not-employed');
    if (['ready','inspection'].includes(current.lastDuty?.stage)) return failure('wage-ready');
    const next = ['arrived', 'attending', 'archive', 'working'].includes(current.lastDuty?.stage) ? missed(current, 'resigned') : current;
    const clock=now();if(!clock)return failure('invalid-clock');
    return persist({...next, tenure: null,officialCareer:closeOfficialAppointment(next.officialCareer,current.tenure,clock)});
  }
  function learningTicket(source, lessonId = defaultStudyLesson(source)?.id) {
    const blocked = allowed(); if (blocked) return blocked;
    if (!STUDY_SOURCES.includes(source)) return failure('unknown-learning-source');
    const lesson = studyLesson(source,lessonId); if (!lesson) return failure('unknown-learning-choice');
    const clock = now(); if (!clock) return failure('invalid-clock');
    const issued = current.learning[source].issued + 1;
    if (!Number.isSafeInteger(issued)) return failure('learning-limit');
    const result = persist({...current, learning: {...current.learning, [source]: {...current.learning[source], issued, issuedDay: clock.day, lessonId}}});
    if (!result.ok) return result;
    const ticket = {source, id: `${source}:${issued}:${clock.day}`, lessonId};
    activeStudies.set(source,ticket.id);
    return {ok: true, ticket};
  }
  // Cancellation loses the live witness. Only a matching world checkpoint
  // may resume it; loading the career ledger alone never grants completion.
  // A world checkpoint proves observed active progress, but cannot create a
  // ticket, change its day, or complete one that already has a receipt.
  function resumeLearning(ticket, {seconds} = {}) {
    if (!object(ticket) || !STUDY_SOURCES.includes(ticket.source) || !Number.isFinite(seconds) || seconds < 0) return failure('invalid-learning-ticket');
    const clock=now(), study=current.learning[ticket.source];
    if (!clock || study.issuedDay !== clock.day) return failure('learning-expired');
    if (study.issued===0 || ticket.id!==`${ticket.source}:${study.issued}:${study.issuedDay}` || ticket.lessonId!==study.lessonId) return failure('invalid-learning-ticket');
    if (study.completed>=study.issued) return failure('learning-replayed');
    if (!studyLesson(ticket.source,study.lessonId)) return failure('unknown-learning-choice');
    activeStudies.set(ticket.source,ticket.id);return {ok:true,ticket};
  }
  function cancelLearning(ticket) {
    if (ticket && activeStudies.get(ticket.source) === ticket.id) activeStudies.delete(ticket.source);
  }
  function grantSkill(next, skill, clock, fullWork=false) {
    const daily = current.daily.day === clock.day ? {...current.daily} : {day: clock.day, ritual: 0, writing: 0, gardening: 0, art: 0, cooking: 0, martial: 0, care: 0};
    const limited = daily[skill] >= 4 ? 'daily-skill-limit' : (['gardening','art','cooking','care'].includes(skill)?current.skills[skill]>=100:current.skills.ritual + current.skills.writing >= 100) ? 'skill-limit' : null;
    const gained = limited ? 0 : 1;
    // A complete work contract retains its published one-level reward. A short
    // lesson earns 10 XP; it never increments a level directly.
    const xpGained=gained?(fullWork?skillXPRequired(current.skills[skill]):STUDY_XP):0;
    const progress=addSkillXP(current.skills[skill],current.skillXP[skill],xpGained);
    const result = persist({...next, daily: {...daily, [skill]: daily[skill] + gained},
      skillXP:{...current.skillXP,[skill]:progress.xp},skills:{...current.skills,[skill]:progress.level}});
    return result.ok ? {ok:true,skill,gained,xpGained,level:progress.level,xp:progress.xp,required:skillXPRequired(progress.level),levelsGained:progress.levelsGained,limited} : result;
  }
  function completeLearning(ticket, {seconds} = {}) {
    const blocked = allowed(); if (blocked) return blocked;
    if (!object(ticket) || !STUDY_SOURCES.includes(ticket.source)) return failure('invalid-learning-ticket');
    const clock = now(); if (!clock) return failure('invalid-clock');
    const study = current.learning[ticket.source], lesson = studyLesson(ticket.source,study.lessonId);
    if (study.issued === 0 || ticket.id !== `${ticket.source}:${study.issued}:${study.issuedDay}` || ticket.lessonId !== study.lessonId) return failure('invalid-learning-ticket');
    if (study.completed >= study.issued) return failure('learning-replayed');
    if (study.issuedDay !== clock.day) return failure('learning-expired');
    if (activeStudies.get(ticket.source) !== ticket.id) return failure('learning-interrupted');
    if (!lesson) return failure('unknown-learning-choice');
    if (!Number.isFinite(seconds) || seconds < lesson.seconds) return failure('learning-incomplete');
    const result = grantSkill({...current, learning: {...current.learning, [ticket.source]: {...study, completed: study.issued}}}, lesson.skill, clock);
    if (result.ok) activeStudies.delete(ticket.source);
    return result;
  }
  function completedLowerWork({source, receiptId} = {}) {
    const blocked = allowed(); if (blocked) return blocked;
    if (!own(WORK,source)) return failure('unknown-work-source');
    const match = typeof receiptId === 'string' && new RegExp('^'+source+'-([1-9][0-9]*)$').exec(receiptId);
    const serial = match ? Number(match[1]) : NaN;
    if (!integer(serial)) return failure('invalid-work-receipt');
    if (serial <= current.lowerWork[source]) return failure('work-replayed');
    const clock = now(); if (!clock) return failure('invalid-clock');
    return grantSkill({...current, lowerWork: {...current.lowerWork, [source]: serial}}, WORK[source], clock, true);
  }
  // Trusted clinic callback after the original patient receives the same-number
  // card/packet. Wage slips alone and aggregate old task counts are not evidence.
  // The global order watermark is durable even when short clinic history rotates.
  function recordClinicAssistantService(receipt) {
    const blocked=allowed();if(blocked)return blocked;
    if(!object(receipt)||!integer(receipt.number)||receipt.number<1||
      !validWorkReceipt(PHARMACY_ASSISTANT_ROLE.workSource,receipt.receiptId)||
      receipt.orderId!==`cn-clinic-order-${receipt.number}`||receipt.cardId!==`cn-clinic-card-${receipt.number}`||
      receipt.packetId!==`cn-clinic-packet-${receipt.number}`||
      !['cn-tavern-diner-west','cn-tavern-diner-east'].includes(receipt.recipientId)||
      receipt.review?.positive!==true||receipt.review.evaluatorId!==receipt.recipientId)return failure('invalid-work-receipt');
    if(receipt.number<=current.lowerWork[PHARMACY_ASSISTANT_ROLE.workSource])return {ok:true,unchanged:true,replayed:true,xpGained:0};
    const clock=now();if(!clock)return failure('invalid-clock');
    return grantSkill({...current,lowerWork:{...current.lowerWork,[PHARMACY_ASSISTANT_ROLE.workSource]:receipt.number}},'care',clock);
  }
  const royalKitchenQualification=()=>({qualifiedDays:current.workExperience.tavernChef.length,requiredDays:ROYAL_KITCHEN_CHEF_DAYS,eligible:current.workExperience.tavernChef.length>=ROYAL_KITCHEN_CHEF_DAYS,receipts:copy(current.workExperience.tavernChef)});
  function recordTavernChefService(receipt){
    const blocked=allowed();if(blocked)return blocked;
    if(!validTavernChefServiceReceipt(receipt))return failure('invalid-work-receipt');
    const rows=current.workExperience.tavernChef,prior=rows.find(row=>row.number===receipt.number);
    if(prior)return sameKitchenReceipt(prior,receipt)?{ok:true,unchanged:true,replayed:true}:failure('work-receipt-conflict');
    if(rows.length>=ROYAL_KITCHEN_CHEF_DAYS||rows.some(row=>row.day===receipt.day))return {ok:true,unchanged:true};
    const duty=current.lastDuty;
    if(duty?.roleId!==TAVERN_CHEF_ROLE.id||duty.shiftKind!=='continuous'||duty.workReceiptId!==receipt.workReceiptId||duty.day!==receipt.day||!duty.started)return failure('wrong-duty-source');
    return persist({...current,workExperience:{...current.workExperience,tavernChef:[...rows,copy(receipt)]}});
  }
  function recordRoyalKitchenService(receipt){
    const blocked=allowed();if(blocked)return blocked;
    if(!validRoyalKitchenServiceReceipt(receipt))return failure('invalid-work-receipt');
    const receipts=current.workExperience.royalKitchen.receipts,prior=receipts.find(row=>row.number===receipt.number);
    if(prior)return sameKitchenReceipt(prior,receipt)?{ok:true,unchanged:true,replayed:true,xpGained:0}:failure('work-receipt-conflict');
    if(receipts.length>=120)return failure('invalid-work-receipt');
    const duty=current.lastDuty;
    // A durable original meal may arrive after day rollover marked its shift
    // missed. Record service only; never reopen that shift or its unpaid wage.
    if(duty?.roleId!==ROYAL_KITCHEN_ROLE.id||duty.shiftKind!=='continuous'||duty.workReceiptId!==receipt.workReceiptId||duty.day!==receipt.day||!['working','inspection','ready','paid','missed'].includes(duty.stage))return failure('wrong-duty-source');
    const clock=now();if(!clock)return failure('invalid-clock');
    const review={id:receipt.orderId+'-completed',customerId:receipt.actorId,customerName:ROYAL_KITCHEN_CUSTOMERS[receipt.actorId],tableId:receipt.actorId,tableName:'原来客用膳处',dishId:'royal-meal',dishName:'御膳原单',reasonCode:'royal-kitchen-completed',correctedReviewId:null,positive:true,score:1,reason:'同号御膳已交原来客用毕，原单服务完成'};
    const nextDuty={...duty,customerReviews:[...duty.customerReviews,review]};
    if(!validCustomerReviews(nextDuty,ROYAL_KITCHEN_ROLE))return failure('invalid-review');
    return grantSkill({...current,lastDuty:nextDuty,performance:Math.min(100,current.performance+1),workExperience:{...current.workExperience,royalKitchen:{receipts:[...receipts,copy(receipt)]}}},'cooking',clock);
  }
  // Original desk receipts survive interrupted handovers and reload. A late
  // verified completion still teaches; an unserved handoff cannot grant XP.
  // All three outcomes leave actual-hours salary completely unchanged.
  function recordJapanReceptionReview(receipt){
    const blocked=allowed();if(blocked)return blocked;
    if(!validJapanReceptionReceipt(receipt))return failure('invalid-work-receipt');
    const duty=current.lastDuty;
    if(duty?.roleId!==JAPAN_RECEPTION_ROLE.id||duty.shiftKind!=='continuous'||duty.workReceiptId!==receipt.workReceiptId||
      !['working','inspection','ready','paid','missed'].includes(duty.stage))return failure('wrong-duty-source');
    const prior=duty.customerReviews.find(r=>r.id===receipt.id);
    if(prior)return sameJapanReceptionReceipt(prior.receptionReceipt,receipt)?{ok:true,unchanged:true,replayed:true,xpGained:0,review:copy(prior),servicePenalty:0}:failure('review-conflict');
    const clock=now();if(!clock)return failure('invalid-clock');
    const score=japanReceptionReviewScore(receipt),task=receipt.kind==='register'?'同号客簿与浴牌登记':'同号浴牌核对归还';
    const review={id:receipt.id,customerId:receipt.customerId,customerName:receipt.customerName,tableId:'jp-reception',tableName:'霞汤屋接待台',
      dishId:receipt.kind,dishName:task,reasonCode:'japan-reception-completed',correctedReviewId:null,positive:score>0,score,
      reason:receipt.outcome==='handoff'?`${task}未完成，原客单已交回接待同伴`:receipt.outcome==='late'?`${task}准确完成，等候较久；记入培训，不改变工时工资`:`${task}准确且及时完成`,receptionReceipt:copy(receipt)};
    const nextDuty={...duty,customerReviews:[...duty.customerReviews,review]};
    if(!validCustomerReviews(nextDuty,JAPAN_RECEPTION_ROLE))return failure('invalid-customer-review');
    const next={...current,lastDuty:nextDuty,performance:Math.max(-100,Math.min(100,current.performance+score)),
      promotionProgress:Math.max(0,Math.min(100,current.promotionProgress+Math.min(0,score)))};
    const result=receipt.completed?grantSkill(next,receipt.kind==='register'?'writing':'ritual',clock):persist(next);
    return result.ok?{...result,review:copy(review),servicePenalty:0,...(!receipt.completed?{xpGained:0}:{})}:result;
  }
  // The bath operation supplies this only after the original same-number bag
  // reaches the original customer, or is handed back to the original attendant unfinished.
  // Commit the review and capped care XP together so retries teach only once.
  function recordJapanBathDeliveryReview(receipt){
    const blocked=allowed();if(blocked)return blocked;
    if(!validJapanBathDeliveryReceipt(receipt))return failure('invalid-work-receipt');
    const duty=current.lastDuty,role=japanBathDeliveryRole(receipt.side);
    if(duty?.roleId!==role.id||duty.shiftKind!=='continuous'||duty.workReceiptId!==receipt.workReceiptId||
      !['working','inspection','ready','paid','missed'].includes(duty.stage))return failure('wrong-duty-source');
    const prior=duty.customerReviews.find(r=>r.id===receipt.id);
    if(prior)return sameJapanBathDeliveryReceipt(prior.bathDeliveryReceipt,receipt)?{ok:true,unchanged:true,replayed:true,xpGained:0,review:copy(prior),servicePenalty:0}:failure('review-conflict');
    const clock=now();if(!clock)return failure('invalid-clock');
    const score=japanBathDeliveryReviewScore(receipt),sideName=receipt.side==='women'?'女汤':'男汤',task=`同号${sideName}浴包交付`;
    const review={id:receipt.id,customerId:receipt.customerId,customerName:receipt.customerName,tableId:role.id,tableName:`${sideName}原客服务交接点`,
      dishId:receipt.kind,dishName:task,reasonCode:'japan-bath-delivery-completed',correctedReviewId:null,positive:score>0,score,
      reason:receipt.outcome==='handoff'?`${task}未完成，原客单已交回${role.incumbentName}接续`:receipt.outcome==='late'?`${task}准确完成，等候较久；记入照护经验，不改变工时工资`:`${task}准确且及时完成`,bathDeliveryReceipt:copy(receipt)};
    const nextDuty={...duty,customerReviews:[...duty.customerReviews,review]};
    if(!validCustomerReviews(nextDuty,role))return failure('invalid-customer-review');
    const next={...current,lastDuty:nextDuty,performance:Math.max(-100,Math.min(100,current.performance+score)),
      promotionProgress:Math.max(0,Math.min(100,current.promotionProgress+Math.min(0,score)))};
    const result=receipt.completed?grantSkill(next,'care',clock):persist(next);
    return result.ok?{...result,review:copy(review),servicePenalty:0,...(!receipt.completed?{xpGained:0}:{})}:result;
  }
  // The board supplies this when the original completed bag returns to its
  // delivery queue. Customer use is a later step and does not gate mixing XP.
  // Commit the review and capped care XP together so retries teach only once.
  function recordJapanBathMixingReview(receipt){
    const blocked=allowed();if(blocked)return blocked;
    if(!validJapanBathMixingReceipt(receipt))return failure('invalid-work-receipt');
    const duty=current.lastDuty;
    if(duty?.roleId!==JAPAN_BATH_MIXING_ROLE.id||duty.shiftKind!=='continuous'||duty.workReceiptId!==receipt.workReceiptId||
      !['working','inspection','ready','paid','missed'].includes(duty.stage))return failure('wrong-duty-source');
    const prior=duty.customerReviews.find(r=>r.id===receipt.id);
    if(prior)return sameJapanBathMixingReceipt(prior.bathMixingReceipt,receipt)?{ok:true,unchanged:true,replayed:true,xpGained:0,review:copy(prior),servicePenalty:0}:failure('review-conflict');
    const clock=now();if(!clock)return failure('invalid-clock');
    const score=japanBathMixingReviewScore(receipt),task='浴包配制与封签';
    const review={id:receipt.id,customerId:receipt.customerId,customerName:receipt.customerName,tableId:'jp-bath-mixing',tableName:'四层草木工台',
      dishId:receipt.kind,dishName:task,reasonCode:'japan-bath-mixing-completed',correctedReviewId:null,positive:score>0,score,
      reason:receipt.outcome==='handoff'?`${task}未完成，原客单已交回Itsuki接续`:receipt.outcome==='late'?`${task}准确完成，等候较久；记入照护经验，不改变工时工资`:`${task}准确且及时完成`,bathMixingReceipt:copy(receipt)};
    const nextDuty={...duty,customerReviews:[...duty.customerReviews,review]};
    if(!validCustomerReviews(nextDuty,JAPAN_BATH_MIXING_ROLE))return failure('invalid-customer-review');
    const next={...current,lastDuty:nextDuty,performance:Math.max(-100,Math.min(100,current.performance+score)),
      promotionProgress:Math.max(0,Math.min(100,current.promotionProgress+Math.min(0,score)))};
    const result=receipt.completed?grantSkill(next,'care',clock):persist(next);
    return result.ok?{...result,review:copy(review),servicePenalty:0,...(!receipt.completed?{xpGained:0}:{})}:result;
  }
  // Cooking evidence belongs to the same original guest meal placed at its
  // original pickup. Daichi's later delivery does not delay cooking experience.
  // Save review and shared daily cooking XP in one atomic career update.
  function recordJapanKitchenReview(receipt){
    const blocked=allowed();if(blocked)return blocked;
    if(!validJapanKitchenReceipt(receipt))return failure('invalid-work-receipt');
    const duty=current.lastDuty;
    if(duty?.roleId!==JAPAN_KITCHEN_ROLE.id||duty.shiftKind!=='continuous'||duty.workReceiptId!==receipt.workReceiptId||
      !['working','inspection','ready','paid','missed'].includes(duty.stage))return failure('wrong-duty-source');
    const prior=duty.customerReviews.find(r=>r.id===receipt.id);
    if(prior)return sameJapanKitchenReceipt(prior.kitchenReceipt,receipt)?{ok:true,unchanged:true,replayed:true,xpGained:0,review:copy(prior),servicePenalty:0}:failure('review-conflict');
    const clock=now();if(!clock)return failure('invalid-clock');
    const score=japanKitchenReviewScore(receipt),dish=receipt.dishId==='sushi'?'寿司拼盘':'热汤拉面',task=`第${receipt.number}号${dish}`;
    const review={id:receipt.id,customerId:receipt.customerId,customerName:receipt.customerName,tableId:'jp-kitchen',tableName:'一层厨房传菜位',
      dishId:receipt.dishId,dishName:dish,reasonCode:'japan-kitchen-completed',correctedReviewId:null,positive:score>0,score,
      reason:receipt.outcome==='handoff'?`${task}未做完，已交回Haru接续`:receipt.outcome==='late'?`${task}已准确装盘交回传菜位，等候较久`:`${task}已准确及时装盘交回传菜位`,kitchenReceipt:copy(receipt)};
    const nextDuty={...duty,customerReviews:[...duty.customerReviews,review]};
    if(!validCustomerReviews(nextDuty,JAPAN_KITCHEN_ROLE))return failure('invalid-customer-review');
    const next={...current,lastDuty:nextDuty,performance:Math.max(-100,Math.min(100,current.performance+score)),
      promotionProgress:Math.max(0,Math.min(100,current.promotionProgress+Math.min(0,score)))};
    const result=receipt.completed?grantSkill(next,'cooking',clock):persist(next);
    return result.ok?{...result,review:copy(review),servicePenalty:0,...(!receipt.completed?{xpGained:0}:{})}:result;
  }
  // An actual rejection and its later completed correction are separate
  // immutable receipts. Neither changes attendance pay; only accurate service
  // followed by the player's wash earns the shared daily ritual XP.
  function recordJapanTableServiceReview(receipt){
    const blocked=allowed();if(blocked)return blocked;
    if(!validJapanTableServiceReceipt(receipt))return failure('invalid-work-receipt');
    const duty=current.lastDuty;
    if(duty?.roleId!==JAPAN_TABLE_SERVICE_ROLE.id||duty.shiftKind!=='continuous'||duty.workReceiptId!==receipt.workReceiptId||
      !['working','inspection','ready','paid','missed'].includes(duty.stage))return failure('wrong-duty-source');
    const prior=duty.customerReviews.find(r=>r.id===receipt.id);
    if(prior)return sameJapanTableServiceReceipt(prior.tableServiceReceipt,receipt)?{ok:true,unchanged:true,replayed:true,xpGained:0,review:copy(prior),servicePenalty:0}:failure('review-conflict');
    const clock=now();if(!clock)return failure('invalid-clock');
    const score=japanTableServiceReviewScore(receipt),dish=receipt.dishId==='sushi'?'寿司拼盘':'热汤拉面',task=`第${receipt.number}号${dish}`;
    const reason=receipt.kind==='complaint'?`${task}${receipt.reasonCode==='wrong-dish'?'菜品不符':receipt.reasonCode==='wrong-guest'?'送错客人':'送错桌位'}，来客已拒收；取回原盘后可改正`:
      receipt.outcome==='handoff'?`${task}服务未完成，已交回Daichi接续`:receipt.outcome==='late'?`${task}已送给原客用毕，原盘已亲手收洗，等候较久`:`${task}已及时送给原客用毕，原盘已亲手收洗`;
    const review={id:receipt.id,customerId:receipt.customerId,customerName:receipt.customerName,tableId:'jp-table-service',tableName:'一层原客餐桌',
      dishId:receipt.dishId,dishName:dish,reasonCode:'japan-table-service-completed',correctedReviewId:null,positive:score>0,score,reason,tableServiceReceipt:copy(receipt)};
    const nextDuty={...duty,customerReviews:[...duty.customerReviews,review]};
    if(!validCustomerReviews(nextDuty,JAPAN_TABLE_SERVICE_ROLE))return failure('invalid-customer-review');
    const next={...current,lastDuty:nextDuty,performance:Math.max(-100,Math.min(100,current.performance+score)),
      promotionProgress:Math.max(0,Math.min(100,current.promotionProgress+Math.min(0,score)))};
    const result=receipt.completed?grantSkill(next,'ritual',clock):persist(next);
    return result.ok?{...result,review:copy(review),servicePenalty:0,...(!receipt.completed?{xpGained:0}:{})}:result;
  }
  // The original garden workflow submits this only after returning the tool.
  // Review, proof and shared daily growth commit together; no bank call occurs.
  function gardenMaintenanceReceipt(receipt){
    const blocked=allowed();if(blocked)return blocked;
    if(!validGardenMaintenanceReceipt(receipt))return failure('invalid-work-receipt');
    const duty=current.lastDuty;
    if(duty?.roleId!==GARDEN_ASSISTANT_ROLE.id||duty.workReceiptId!==receipt.workReceiptId||duty.day!==receipt.day||
      !['working','inspection','ready','paid'].includes(duty.stage))return failure('wrong-duty-source');
    const reviews=duty.customerReviews||[],prior=reviews.find(review=>review.id===receipt.id);
    if(prior)return sameGardenMaintenanceReceipt(prior.gardenMaintenanceReceipt,receipt)?
      {ok:true,unchanged:true,replayed:true,xpGained:0,review:copy(prior),servicePenalty:0}:failure('review-conflict');
    const clock=now();if(!clock)return failure('invalid-clock');
    const task=receipt.kind==='water'?'原玫瑰花畦浇水':'原黄杨篱修剪';
    const review={id:receipt.id,customerId:GARDEN_ASSISTANT_ROLE.supervisorId,customerName:GARDEN_ASSISTANT_ROLE.employer,
      tableId:'fr-garden-maintenance',tableName:'工作评价',dishId:receipt.kind,dishName:task,
      reasonCode:'garden-maintenance-completed',correctedReviewId:null,positive:true,score:1,
      reason:`埃米尔工作评价：${task}已完成，原工具已归还`,gardenMaintenanceReceipt:copy(receipt)};
    const nextDuty={...duty,customerReviews:[...reviews,review]};
    if(!validCustomerReviews(nextDuty,GARDEN_ASSISTANT_ROLE))return failure('invalid-customer-review');
    const result=grantSkill({...current,lastDuty:nextDuty,performance:Math.min(100,current.performance+1)},'gardening',clock);
    return result.ok?{...result,review:copy(review),servicePenalty:0}:result;
  }
  // The handbook, world intents and final mutation share one start decision.
  // Reads do not observe a day, save state, advance lastClock or change errors.
  function beginDutyAvailability(roleId=current.tenure?.roleId,{receiptId}={}){
    const clock=readClock(),role=roleMap.get(roleId),duty=current.lastDuty;
    const context={roleId:roleId||null,day:clock?.day??null,hour:clock?.hour??null,
      window:role?copy(role.dutyWindow):null,stage:duty?.roleId===roleId?duty.stage:null};
    const no=code=>({...context,ok:false,code,reasons:[code]});
    if(loadError||saving||paying)return no(loadError||'career-busy');
    if(interruptedUnsaved)return no('interruption-unsaved');
    if(!current.tenure||current.tenure.roleId!==roleId||!role)return no('not-employed');
    if(!clock)return no('invalid-clock');
    if(role.paymentKind==='commission')return no('commission-service-required');
    if(role.workSource&&receiptId!==undefined&&!validWorkReceipt(role.workSource,receiptId))return no('invalid-work-receipt');
    // Recover an already admitted work slip even after the new-shift window closes.
    if(role.workSource&&duty?.day===clock.day&&duty.workReceiptId===receiptId&&duty.stage==='working')return {...context,ok:true,unchanged:true};
    if(['ready','inspection'].includes(duty?.stage))return no('wage-ready');
    if(current.lastPaidDay===clock.day)return no('already-paid-today');
    if(duty?.day===clock.day&&excused(duty))return no('court-postponed');
    if(duty?.day===clock.day&&(duty.started||duty.stage==='arrived'))return no(duty.stage==='missed'?'duty-missed':'duty-active');
    if(clock.hour<role.dutyWindow.startHour||clock.hour>=role.dutyWindow.endHour)return no('outside-arrival-window');
    return {...context,ok:true};
  }
  const currentOfficialFields=()=>current.tenure?.roleId===COURT_CLERK_ROLE.id?{officialPayVersion:1,officialRankId:officialRankId(current.officialCareer,current.tenure),officialTenureId:officialTenureId(current.tenure)}:{};
  function beginDuty({receiptId,shiftKind} = {}) {
    const blocked = allowed(); if (blocked) return blocked;
    if (interruptedUnsaved) return failure('interruption-unsaved');
    if (!current.tenure) return failure('not-employed');
    const rollover = observeDay(); if (!rollover.ok) return rollover;
    const clock = now(); if (!clock) return failure('invalid-clock');
    const duty = current.lastDuty, role = roleMap.get(current.tenure.roleId);
    shiftKind??=[TAVERN_HOST_ROLE.id,TAVERN_CHEF_ROLE.id,PHARMACY_ASSISTANT_ROLE.id,CLINIC_PHYSICIAN_ROLE.id,ROYAL_KITCHEN_ROLE.id,TEA_SERVER_ROLE.id,TEA_PASTRY_ROLE.id,PALACE_GUARD_ROLE.id,JAPAN_RECEPTION_ROLE.id,...BATH_DELIVERY_ROLE_IDS,JAPAN_BATH_MIXING_ROLE.id,JAPAN_KITCHEN_ROLE.id,JAPAN_TABLE_SERVICE_ROLE.id].includes(role.id)?'continuous':undefined;
    if(shiftKind!==undefined&&(shiftKind!=='continuous'||!continuousRole(role)))return failure('invalid-shift-kind');
    if (role.workSource && !validWorkReceipt(role.workSource,receiptId)) return failure('invalid-work-receipt');
    const availability=beginDutyAvailability(role.id,{receiptId});
    if(!availability.ok)return failure(availability.code,availability.reasons);
    if(availability.unchanged)return {ok:true,unchanged:true};
    const next = duty && duty.day < clock.day && ['arrived', 'attending', 'archive','working'].includes(duty.stage) ? missed(current, 'day-ended') : current;
    return persist({...next, lastDuty: {roleId: current.tenure.roleId, slotId: current.tenure.slotId,
      ...currentOfficialFields(),day: clock.day, stage: role.workSource?'working':'arrived', started:!!role.workSource, reason: null, arrivalHour: clock.hour, wage: null,...(role.workSource?{workReceiptId:receiptId}:{}),...(reviewRole(role)?{customerReviews:[]}:{}),...(shiftKind?{shiftKind,startedSeconds:clock.seconds,coveredSeconds:null,completedTasks:null,endedHour:null,endedSeconds:null}:{})}});
  }
  function dutyEvent(event) {
    const blocked = allowed(); if (blocked) return blocked;
    if (interruptedUnsaved) return failure('interruption-unsaved');
    if (roleMap.get(current.tenure?.roleId)?.workSource) return failure('wrong-duty-source');
    const transitions = {'court-start': ['arrived', 'attending'], 'court-completed': ['attending', 'archive'], 'archive-completed': ['archive', 'ready']};
    if (!own(transitions, event)) return failure('unknown-duty-event');
    if (!current.tenure) return failure('not-employed');
    const rollover = observeDay(); if (!rollover.ok) return rollover;
    const clock = now(); if (!clock) return failure('invalid-clock');
    const duty = current.lastDuty;
    if (duty?.day === clock.day && excused(duty)) return {ok: true, unchanged: true, excused: true};
    if (event === 'court-start' && (!duty || duty.day !== clock.day || duty.stage === 'missed' && !duty.started)) {
      if (current.tenure.sinceDay === clock.day && current.tenure.sinceHour >= roleMap.get(current.tenure.roleId).dutyWindow.endHour) return {ok: true, unchanged: true, exempt: true};
      if (duty?.stage === 'ready') return failure('wage-ready');
      if (current.lastPaidDay === clock.day || current.lastEvaluatedDay === clock.day) return failure('duty-evaluated');
      const next = duty && duty.day < clock.day && ['arrived', 'attending', 'archive','working'].includes(duty.stage) ? missed(current, 'day-ended') : current;
      return persist(evaluate({...next, lastDuty: {roleId: current.tenure.roleId, slotId: current.tenure.slotId,
        ...currentOfficialFields(),day: clock.day, stage: 'missed', started: true, reason: 'absent', arrivalHour: null, wage: null}}, false, 'absent'));
    }
    if (!duty) return failure('duty-not-started');
    if (duty.day !== clock.day) return failure('duty-expired');
    const [from, stage] = transitions[event];
    if (duty.stage !== from) return failure('invalid-duty-stage');
    let next = {...current, lastDuty: {...duty, stage, started: true}};
    if (stage === 'ready') next = evaluate(next, true, 'court-and-archive-completed');
    return persist(next);
  }
  function interruptDuty(reason = 'interrupted') {
    const blocked = allowed(); if (blocked) return blocked;
    if (typeof reason !== 'string' || !reason.length || reason.length > 80) return failure('invalid-interruption');
    if (!current.lastDuty || ['missed', 'paid', 'ready', 'inspection'].includes(current.lastDuty.stage)) return {ok: true, unchanged: true};
    const result = persist(missed(current, reason));
    interruptedUnsaved = !result.ok;
    return result;
  }
  function observeDay() {
    const blocked = allowed(); if (blocked) return blocked;
    const clock = now(); if (!clock) return failure('invalid-clock');
    if (observedDay === null || observedDay === clock.day) { observedDay = clock.day; return {ok: true, unchanged: true}; }
    const day = observedDay, tenure = current.tenure, duty = current.lastDuty;
    if (!tenure || roleMap.get(tenure.roleId)?.paymentKind==='commission' || tenure.sinceDay > day || tenure.sinceDay === day &&
      tenure.sinceHour >= roleMap.get(tenure.roleId).dutyWindow.endHour ||
      current.lastEvaluatedDay !== null && current.lastEvaluatedDay >= day || ['ready','inspection'].includes(duty?.stage) ||
      duty?.day === day && excused(duty)) {
      observedDay = clock.day; return {ok: true, unchanged: true};
    }
    const incomplete = duty?.day === day ? {...duty, started: true} : {roleId: tenure.roleId, slotId: tenure.slotId,
      ...currentOfficialFields(),day, stage: 'missed', started: true, reason: null, arrivalHour: null, wage: null,...(roleMap.get(tenure.roleId).workSource?{workReceiptId:null}:{}),...(reviewRole(roleMap.get(tenure.roleId))?{customerReviews:[]}:{})};
    const result = persist(missed({...current, lastDuty: incomplete}, 'day-ended'));
    if (result.ok) { observedDay = clock.day; interruptedUnsaved = false; }
    return result;
  }
  // Called only by the actual labor workflow, at durable physical completion
  // and by its real employer encounter. Raw court events cannot finish these.
  function laborEvent(event, {roleId, receiptId,coveredSeconds,completedTasks} = {}) {
    const blocked=allowed();if(blocked)return blocked;
    const duty=current.lastDuty,role=roleMap.get(roleId);
    if(!role?.workSource||!duty||duty.roleId!==roleId||duty.workReceiptId!==receiptId)return failure('wrong-duty-source');
    if(!now())return failure('invalid-clock');
    if(event==='completed'){
      if(['inspection','ready','paid'].includes(duty.stage))return {ok:true,unchanged:true};
      if(duty.stage!=='working')return failure('invalid-duty-stage');
      if(duty.day!==lastClock.day)return failure('duty-expired');
      const nextDuty={...duty,stage:'inspection',...(duty.shiftKind==='continuous'?{coveredSeconds,completedTasks,endedHour:lastClock.hour,endedSeconds:lastClock.seconds}:{})};
      if(!validShift(nextDuty,role))return failure('invalid-shift-work');
      return persist({...current,lastDuty:nextDuty});
    }
    if(event==='inspected'){
      if(['ready','paid'].includes(duty.stage))return {ok:true,unchanged:true};
      if(duty.stage!=='inspection')return failure('work-incomplete');
      return persist(evaluate({...current,lastDuty:{...duty,stage:'ready'}},true,'labor-inspected'));
    }
    return failure('unknown-duty-event');
  }
  // Trusted physical order callback. Review and performance commit together;
  // immutable work/order IDs make reload, repeated clicks and correction idempotent.
  function customerReview({roleId,receiptId,reviewId,customerId,customerName,tableId,dishId,tableName=tableId,dishName=dishId,reasonCode,correctedReviewId=null}={}){
    const blocked=allowed();if(blocked)return blocked;
    const duty=current.lastDuty,role=roleMap.get(roleId);
    if(!reviewRole(role)||!duty||duty.roleId!==roleId||duty.workReceiptId!==receiptId)return failure('wrong-duty-source');
    if(role.id===GARDEN_ASSISTANT_ROLE.id)return failure('invalid-customer-review');
    const prior=duty.customerReviews.find(r=>r.id===reviewId);
    if(prior)return ['customerId','customerName','tableId','dishId','tableName','dishName','reasonCode','correctedReviewId'].every(key=>prior[key]===({customerId,customerName,tableId,dishId,tableName,dishName,reasonCode,correctedReviewId})[key])?{ok:true,unchanged:true,review:copy(prior)}:failure('review-conflict');
    const clock=now();if(!clock)return failure('invalid-clock');
    if(duty.stage!=='working'||duty.day!==clock.day)return failure('invalid-duty-stage');
    const teaCompleted=teaRole(role)&&reasonCode==='tea-completed',positive=teaCompleted||reasonCode==='corrected',original=duty.customerReviews.find(r=>r.id===correctedReviewId);
    const review={id:reviewId,customerId,customerName,tableId,dishId,tableName,dishName,reasonCode,correctedReviewId,positive,score:positive?1:-2,
      reason:teaCompleted?`原座茶点已用毕，杯碟已收回：${tableName} · ${dishName}`:positive?`已改正${original?.reasonCode==='dirty-table'?'脏桌未清洁':original?.reasonCode==='wrong-table'?'送错桌位':'菜品不符'}：${tableName} · ${dishName}`:reasonCode==='dirty-table'?`脏桌未清洁：${tableName}还留着上一位客人的餐具和污渍`:reasonCode==='wrong-table'?`送错桌位：这份${dishName}应送到${tableName}`:`菜品不符：${tableName}点的是${dishName}`};
    const nextDuty={...duty,customerReviews:[...duty.customerReviews,review]};
    if(!validCustomerReviews(nextDuty,role))return failure('invalid-customer-review');
    const result=persist({...current,lastDuty:nextDuty,performance:Math.max(-100,Math.min(100,current.performance+review.score)),
      promotionProgress:Math.max(0,Math.min(100,current.promotionProgress+Math.min(0,review.score)))});
    return result.ok?{ok:true,review:copy(review),servicePenalty:customerPenalty(nextDuty)}:result;
  }
  function settle() {
    const blocked = allowed(); if (blocked) return blocked;
    if (interruptedUnsaved) return failure('interruption-unsaved');
    const duty = current.lastDuty;
    if (duty?.stage !== 'ready') return failure('work-incomplete');
    if (!now()) return failure('invalid-clock');
    const receiptId = `career:${duty.slotId}:${duty.day}`;
    // A very short voluntary handover can earn zero after prorating/penalties.
    // Mark the day once; never mint a minimum coin or call the bank with zero.
    if(duty.wage===0){const result=persist({...current,lastPaidDay:duty.day,lastDuty:{...duty,stage:'paid'}});return result.ok?{ok:true,paid:true,wage:0,receiptId,replayed:false,deposit:null}:result;}
    if (typeof creditWageToBank !== 'function') return failure('bank-unavailable');
    const deposit = {amount: duty.wage, receiptId, currency: roleMap.get(duty.roleId).currency || 'copper',
      roleId: duty.roleId, slotId: duty.slotId, day: duty.day};
    paying = true; let payment;
    try { payment = creditWageToBank({...deposit}); }
    catch { return failure('payment-failed'); }
    finally { paying = false; }
    if (payment && typeof payment.then === 'function') {
      Promise.resolve(payment).catch(() => {}); return failure('async-bank-credit-unsupported');
    }
    if (payment?.ok !== true) return failure(payment?.code || 'payment-failed');
    if (payment.receiptId !== undefined && payment.receiptId !== receiptId) return failure('bank-receipt-mismatch');
    const result = persist({...current, lastPaidDay: duty.day, lastDuty: {...duty, stage: 'paid'}});
    return {ok: true, paid: true, wage: duty.wage, receiptId, replayed: !!payment.replayed, deposit,
      cleanupPending: !result.ok, ...(result.ok ? {} : {code: result.code})};
  }
  return Object.freeze({state, isHired: (roleId = COURT_CLERK_ROLE.id) => !loadError && current.tenure?.roleId === roleId,
    canContinueLabor:receiptId=>{const d=current.lastDuty;let c;try{c=getClock();}catch{return false;}return !loadError&&d?.workReceiptId===receiptId&&(d.stage==='inspection'||d.stage==='working'&&d.day===c?.day);},
    currentRole:()=>{const role=roleMap.get(current.tenure?.roleId);if(!role)return null;const rank=role.id===COURT_CLERK_ROLE.id?getChinaRecordsCareerRank(officialRankId(current.officialCareer,current.tenure)):null;return copy(rank?{...role,rankId:rank.rankId,gradeLabel:rank.gradeLabel,wage:rank.basePay}:role);},
    slotHolder:roleId=>{if(loadError)return null;const slot=[...slotMap.values()].find(s=>s.roleId===roleId);return slot?current.tenure?.slotId===slot.id?'player':slot.holderId:null;},
    catalogue:()=>[...roleMap.values()].map(role=>({...copy(role),vacancy:[...slotMap.values()].filter(slot=>slot.roleId===role.id&&availableSlot(slot,role)&&slot.id!==current.tenure?.slotId).length})),
    eligibility, applicationAvailability, beginDutyAvailability, applicationResult, applicationHistory,
    promotionSummary, promotionAvailability, applyPromotion, reviewPromotion, cancelPromotion,
    laborEvent, customerReview, apply, reviewApplication, cancelApplication, resign, learningTicket, resumeLearning, cancelLearning, completeLearning, completedLowerWork, recordClinicAssistantService, recordTavernChefService, royalKitchenQualification, recordRoyalKitchenService, recordJapanReceptionReview, recordJapanBathDeliveryReview, recordJapanBathMixingReview, recordJapanKitchenReview, recordJapanTableServiceReview, gardenMaintenanceReceipt, beginDuty, dutyEvent, interruptDuty, observeDay, settle});
}
