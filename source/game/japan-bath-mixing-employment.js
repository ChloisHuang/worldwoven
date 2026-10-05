import {JAPAN_BATH_MIXING_ROLE} from './japan-bath-mixing-role.js';
import {createJapanServiceEmployment} from './japan-service-employment.js';
export function createJapanBathMixingEmployment(options){return createJapanServiceEmployment({...options,duty:options.mixing,role:JAPAN_BATH_MIXING_ROLE,provider:'japan-bath-mixing-employment',reviewMethod:'recordJapanBathMixingReview',text:{keepMeetingWhileLocal:true,
 selfVisit:'请先完成自己的泡汤或用餐，再接浴包配制班次',begin:'Itsuki：核对原来客号、浴牌、汤区与虚构配方，配好同号浴包后放回原配送队列。连续当班按实际工时结日本券，不授免费泡汤或餐食',finishWork:'请先配好原同号浴包并放回队列，或在职业卡选择中断并交回原单，再当面交班',end:'Itsuki已接回原浴包配制，工时与同号配制已封存；请当面验收结薪',meeting:'请在四层配制登记处稍候，Itsuki放妥原浴包后回来当面办理',
 actions:{'formal-view':'查看浴包配制岗位','formal-apply':'自荐 · 提交浴包配制申请','formal-review':'请Itsuki审核 · 确认配制职责与工钱','formal-resign':'办理浴包配制离职',accept:'显式接班 · 开始今日浴包配制',resume:'当面接回配制 · 继续原班',claim:'Itsuki验收 · 日本券日薪入银行','end-shift':'当面交班 · 按实际工时结薪',cancel:'中断本班 · 交回原单与浴包配制'}
 }});}
