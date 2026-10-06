import {EGYPT_KITCHEN_ROLE} from './egypt-kitchen-role.js';
import {createJapanServiceEmployment} from './japan-service-employment.js';
// Shared formal hiring/time ledger, with the original Egypt kitchen as evidence.
export function createEgyptKitchenEmployment(options){return createJapanServiceEmployment({...options,duty:options.kitchen,role:EGYPT_KITCHEN_ROLE,provider:'egypt-kitchen-employment',reviewMethod:'recordEgyptKitchenReview',text:{keepMeetingWhileLocal:true,
 selfVisit:'请先结清自己的访客餐，再接厨房班次',begin:'赫特：按萨米拉原单备料、热锅、装盘，再让达娜取同盘送本人。真实原单用毕才记评价与经验；现场候单持续计工时，另行交班',finishWork:'请先完成原餐并等萨米拉用毕，再当面交班；也可中断交回赫特',end:'赫特已接班；请当面验收并领取本班埃及券',meeting:'请在厨房登记处稍候，赫特做好手中原餐后回来当面办理',
 actions:{'formal-view':'查看厨房制作岗位','formal-apply':'自荐 · 提交厨房制作申请','formal-review':'请赫特审核 · 确认制作职责与工钱','formal-resign':'办理厨房制作离职',accept:'接班 · 开始今日厨房制作',resume:'当面接回制作 · 继续原班',claim:'赫特验收 · 埃及券日薪入银行','end-shift':'当面交班 · 按实际工时结薪',cancel:'中断本班 · 交回未完原餐'}
 }});}
