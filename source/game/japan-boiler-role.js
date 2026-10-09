// Nagi's one original boiler seat serves real bath loads, never synthetic orders.
export const JAPAN_BOILER_ROLE=Object.freeze({
 id:'jp-boiler-service',name:'锅炉供热巡护员',slotId:'jp-boiler-service-1',country:'japan',currency:'japan',
 employer:'Nagi',workplace:'霞汤屋 · 四层锅炉供热巡护登记处',supervisorId:'jp-steam',incumbentId:'jp-steam',incumbentName:'Nagi',
 vacancyKind:'exclusive',careerKind:'technical-service',workSource:'jp-boiler-labor',wage:16,minimumAgeYears:18,
 skillRequirements:Object.freeze({care:1,writing:1}),dutyWindow:Object.freeze({startHour:6,endHour:18}),earlyBeforeHour:12,preparationBonus:0,
 duties:'虚构汤屋的普通锅炉供热巡护岗位。须满18岁、照护1级、文书1级，由Nagi当面审核；录用后另行接班。按男汤或女汤真实入浴负荷读表、调节原阀、检查原回水阀并复核，不凭空生成客单。06:00–18:00按实际在岗工时计薪，完整日班16日本券经现有雇主保障工资通道存入银行，不按件加钱。完整准确巡护后才获照护10点经验，与读书共用每日4次成长；重复回执不重复成长。原工作安全交回后仍由Nagi接续。工作不包含泡汤或餐食，不授官品。',
});
export {validJapanBoilerReceipt,sameJapanBoilerReceipt,JAPAN_BOILER_RECEIPT_FIELDS} from './japan-boiler-maintenance.js';
export const japanBoilerReviewScore=()=>1;
