import {JAPAN_RECEPTION_ROLE} from './japan-reception-role.js';
import {createJapanServiceEmployment} from './japan-service-employment.js';
export function createJapanReceptionEmployment(options){return createJapanServiceEmployment({...options,duty:options.reception,role:JAPAN_RECEPTION_ROLE,provider:'japan-reception-employment',reviewMethod:'recordJapanReceptionReview',text:{
 selfVisit:'请先完成自己的泡汤或用餐，再接前台班次',begin:'Koharu：请逐号核对客簿与原浴牌。前台候单计时，另行交班后日薪存入日本币银行',finishWork:'请先核对完手上原牌，再当面交班',end:'Koharu已接回原柜台，工时与逐客记录已封存；请当面验收结薪',meeting:'请在原前台稍候，Koharu收好原单后回来当面办理',
 actions:{'formal-view':'查看汤馆接待见习岗位','formal-apply':'自荐 · 提交接待见习申请','formal-review':'请Koharu审核 · 确认店规与工钱','formal-resign':'办理接待见习离职',accept:'显式接班 · 开始今日前台工作',resume:'当面接回前台 · 继续原班',claim:'Koharu验收 · 日薪入银行','end-shift':'当面交班 · 按实际工时结薪',cancel:'中断本班 · 原柜台交回'}
 }});}
