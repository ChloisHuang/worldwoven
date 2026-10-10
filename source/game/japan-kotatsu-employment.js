import {JAPAN_KOTATSU_ROLE} from './japan-kotatsu-role.js';
import {createJapanServiceEmployment} from './japan-service-employment.js';
export function createJapanKotatsuEmployment(options){return createJapanServiceEmployment({...options,duty:options.kotatsu,role:JAPAN_KOTATSU_ROLE,provider:'japan-kotatsu-employment',reviewMethod:'recordJapanKotatsuReview',text:{keepMeetingWhileLocal:true,
 selfVisit:'请先结束自己的泡汤或用餐，再接暖桌整理班次',begin:'Aoi：只整理原来客真正离座后的同一暖桌：收齐原座垫并检查被缘、理平、擦桌、原位排齐座垫。候班与整理按实际工时结日本券，不按点击或按桌加钱',finishWork:'请先把正在整理的原座垫排齐妥当，或在职业卡中选择中断，再当面交班',end:'Aoi已接回原暖桌整理；请当面验收并领取本班工资',meeting:'请在三层原暖桌登记处稍候，Aoi结束手上原事务后回来当面办理',
 actions:{'formal-view':'查看原暖桌整理岗位','formal-apply':'自荐 · 提交暖桌整理申请','formal-review':'请Aoi审核 · 确认整理职责与工钱','formal-resign':'办理暖桌整理离职',accept:'显式接班 · 开始今日暖桌整理',resume:'当面接回整理 · 继续原班',claim:'Aoi验收 · 日本券日薪入银行','end-shift':'当面交班 · 按实际工时结薪',cancel:'中断本班 · 安全排齐原座垫并交回整理'}
 }});}
