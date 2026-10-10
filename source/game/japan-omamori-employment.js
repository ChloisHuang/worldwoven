import {JAPAN_OMAMORI_ROLE} from './japan-omamori-role.js';
import {createJapanServiceEmployment} from './japan-service-employment.js';
export function createJapanOmamoriEmployment(options){return createJapanServiceEmployment({...options,duty:options.omamori,role:JAPAN_OMAMORI_ROLE,provider:'japan-omamori-employment',reviewMethod:'recordJapanOmamoriReview',text:{keepMeetingWhileLocal:true,
 selfVisit:'请先结束自己的泡汤或用餐，再接御守照料班次',begin:'Emi：按实际取放过的原件，取下、检查绳结、核对刺绣并归回原位。候班与照料按实际工时结日本券，不按件加钱',finishWork:'请先把手上的原御守归回原位，或在职业卡中选择中断，再当面交班',end:'Emi已接回原摊照料；请当面验收并领取本班工资',meeting:'请在原摊照料登记处稍候，Emi放妥手上原物后回来当面办理',
 actions:{'formal-view':'查看御守绳结照料岗位','formal-apply':'自荐 · 提交御守照料申请','formal-review':'请Emi审核 · 确认照料职责与工钱','formal-resign':'办理御守照料离职',accept:'显式接班 · 开始今日御守照料',resume:'当面接回照料 · 继续原班',claim:'Emi验收 · 日本券日薪入银行','end-shift':'当面交班 · 按实际工时结薪',cancel:'中断本班 · 安全归还原御守并交回照料'}
 }});}
