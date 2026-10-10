import {FRANCE_BEDCHAMBER_ROLE} from './france-bedchamber-role.js';
import {createJapanServiceEmployment} from './japan-service-employment.js';
export function createFranceBedchamberEmployment(options){return createJapanServiceEmployment({...options,duty:options.bedchamber??options.duty,role:FRANCE_BEDCHAMBER_ROLE,provider:'france-bedchamber-employment',reviewMethod:'recordFranceBedchamberReview',text:{keepMeetingWhileLocal:true,
 selfVisit:'请先结束自己的休息，等朱丽叶安全交出原寝室事务再接班',begin:'朱丽叶：只照料实际休息用过的同一张原床和同套寝具。核对床面、抚平原床罩、整理两只原枕与台上原织物，回床复核。候班与照料按实际工时结法国券，不按件或点击加钱',finishWork:'请先停妥当前原床照料动作，或在职业卡中选择中断，再当面交班',end:'朱丽叶已接回原寝室照料；请当面验收并领取本班工资',meeting:'请在白金皇家寝室登记处稍候，朱丽叶结束手上原事务后回来当面办理',
 actions:{'formal-view':'查看原寝室照料岗位','formal-apply':'自荐 · 提交寝室照料申请','formal-review':'请朱丽叶审核 · 确认照料职责与工钱','formal-resign':'办理寝室照料离职',accept:'显式接班 · 开始今日寝室照料',resume:'当面接回照料 · 继续原班',claim:'朱丽叶验收 · 法国券日薪入银行','end-shift':'当面交班 · 按实际工时结薪',cancel:'中断本班 · 停妥原床动作并交回照料'}
 }});}
