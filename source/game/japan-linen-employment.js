import {JAPAN_LINEN_ROLE} from './japan-linen-role.js';
import {createJapanServiceEmployment} from './japan-service-employment.js';
export function createJapanLinenEmployment(options){return createJapanServiceEmployment({...options,duty:options.linen,role:JAPAN_LINEN_ROLE,provider:'japan-linen-employment',reviewMethod:'recordJapanLinenReview',text:{keepMeetingWhileLocal:true,
 selfVisit:'请先完成自己的泡汤或用餐，再接布草洗涤班次',begin:'Yuki：收原号脏布草，到四层洗衣间洗涤、晾晒、收干、折叠归库。候班与工作按实际工时结日本券，不按件加钱',finishWork:'请先完成手上动作并放妥原布草，或在职业卡中选择中断，再当面交班',end:'Yuki已接回原布草工作；请当面验收并领取本班工资',meeting:'请在四层洗衣间登记处稍候，Yuki放妥手中布草后回来当面办理',
 actions:{'formal-view':'查看布草洗涤岗位','formal-apply':'自荐 · 提交布草洗涤申请','formal-review':'请Yuki审核 · 确认布草职责与工钱','formal-resign':'办理布草洗涤离职',accept:'显式接班 · 开始今日布草洗涤',resume:'当面接回布草 · 继续原班',claim:'Yuki验收 · 日本券日薪入银行','end-shift':'当面交班 · 按实际工时结薪',cancel:'中断本班 · 放回原布草并交回洗涤'}
 }});}
