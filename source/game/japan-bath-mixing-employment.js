import {JAPAN_BATH_MIXING_ROLE} from './japan-bath-mixing-role.js';
import {createJapanServiceEmployment} from './japan-service-employment.js';
export function createJapanBathMixingEmployment(options){return createJapanServiceEmployment({...options,duty:options.mixing,role:JAPAN_BATH_MIXING_ROLE,provider:'japan-bath-mixing-employment',reviewMethod:'recordJapanBathMixingReview',text:{keepMeetingWhileLocal:true,
 selfVisit:'请先完成自己的泡汤或用餐，再接浴包配制班次',begin:'Itsuki：按浴牌核客名和草木种类，配制封签后放到取件角。忙完一单继续候单，交班按工时结日本券',finishWork:'请先完成手上动作，或在职业卡中选择中断，再当面交班',end:'Itsuki已接班；请当面验收并领取本班工资',meeting:'请在四层配制登记处稍候，Itsuki放妥手中浴包后回来当面办理',
 actions:{'formal-view':'查看浴包配制岗位','formal-apply':'自荐 · 提交浴包配制申请','formal-review':'请Itsuki审核 · 确认配制职责与工钱','formal-resign':'办理浴包配制离职',accept:'显式接班 · 开始今日浴包配制',resume:'当面接回配制 · 继续原班',claim:'Itsuki验收 · 日本券日薪入银行','end-shift':'当面交班 · 按实际工时结薪',cancel:'中断本班 · 交回未完浴牌与浴包配制'}
 }});}
