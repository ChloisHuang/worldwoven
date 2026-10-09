import {JAPAN_BOILER_ROLE} from './japan-boiler-role.js';
import {createJapanServiceEmployment} from './japan-service-employment.js';
export function createJapanBoilerEmployment(options){return createJapanServiceEmployment({...options,duty:options.boiler,role:JAPAN_BOILER_ROLE,provider:'japan-boiler-employment',reviewMethod:'recordJapanBoilerReview',text:{keepMeetingWhileLocal:true,
 selfVisit:'请先完成自己的泡汤或用餐，再接锅炉供热巡护班次',begin:'Nagi：按原男汤或女汤负荷读表、调节、检查原回水阀并复核。候班与巡护按实际工时结日本券，不按件加钱',finishWork:'请先完成手上原阀动作，或在职业卡中选择中断，再当面交班',end:'Nagi已接回原锅炉巡护；请当面验收并领取本班工资',meeting:'请在四层锅炉登记处稍候，Nagi完成原阀动作后回来当面办理',
 actions:{'formal-view':'查看锅炉供热巡护岗位','formal-apply':'自荐 · 提交锅炉巡护申请','formal-review':'请Nagi审核 · 确认巡护职责与工钱','formal-resign':'办理锅炉巡护离职',accept:'显式接班 · 开始今日锅炉巡护',resume:'当面接回巡护 · 继续原班',claim:'Nagi验收 · 日本券日薪入银行','end-shift':'当面交班 · 按实际工时结薪',cancel:'中断本班 · 停止原阀动作并交回巡护'}
 }});}
