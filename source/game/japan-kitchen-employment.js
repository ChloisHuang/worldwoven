import {JAPAN_KITCHEN_ROLE} from './japan-kitchen-role.js';
import {createJapanServiceEmployment} from './japan-service-employment.js';
export function createJapanKitchenEmployment(options){return createJapanServiceEmployment({...options,duty:options.kitchen,role:JAPAN_KITCHEN_ROLE,provider:'japan-kitchen-employment',reviewMethod:'recordJapanKitchenReview',text:{keepMeetingWhileLocal:true,
 selfVisit:'请先完成自己的泡汤或用餐，再接厨房制作班次',begin:'Haru：看清来客号和寿司或拉面单，制作装盘后放回原传菜位，让Daichi取盘送餐。忙完一单继续候单，交班按工时结日本券',finishWork:'请先完成手上餐点，或在职业卡中选择中断，再当面交班',end:'Haru已接班；请当面验收并领取本班工资',meeting:'请在一层厨房登记处稍候，Haru放妥手中餐点后回来当面办理',
 actions:{'formal-view':'查看厨房制作岗位','formal-apply':'自荐 · 提交厨房制作申请','formal-review':'请Haru审核 · 确认制作职责与工钱','formal-resign':'办理厨房制作离职',accept:'接班 · 开始今日厨房制作',resume:'当面接回制作 · 继续原班',claim:'Haru验收 · 日本券日薪入银行','end-shift':'当面交班 · 按实际工时结薪',cancel:'中断本班 · 交回未完餐单与餐点'}
 }});}
