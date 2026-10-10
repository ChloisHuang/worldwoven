import {JAPAN_GARDEN_ROLE} from './japan-garden-role.js';
import {createJapanServiceEmployment} from './japan-service-employment.js';
export function createJapanGardenEmployment(options){return createJapanServiceEmployment({...options,duty:options.garden,role:JAPAN_GARDEN_ROLE,provider:'japan-garden-employment',reviewMethod:'recordJapanGardenReview',text:{keepMeetingWhileLocal:true,
 selfVisit:'请先结束自己的泡汤或用餐，再接映池照料班次',begin:'Akari：每个游戏日巡护同一原池：观察锦鲤、辨看水草与水面、擦拭原石池沿、回看复核。候班与巡护按实际工时结日本券，不按点击或按轮加钱',finishWork:'请先停止当前检查，再当面交班',end:'Akari已接回原映池照料；请当面验收并领取本班工资',meeting:'请在庭园原池登记处稍候，Akari结束手上原事务后回来当面办理',
 actions:{'formal-view':'查看原映池照料岗位','formal-apply':'自荐 · 提交映池照料申请','formal-review':'请Akari审核 · 确认巡护职责与工钱','formal-resign':'办理映池照料离职',accept:'显式接班 · 开始今日映池照料',resume:'当面接回巡护 · 继续原班',claim:'Akari验收 · 日本券日薪入银行','end-shift':'当面交班 · 按实际工时结薪',cancel:'中断本班 · 安全交回原池巡护'}
 }});}
