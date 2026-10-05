import {JAPAN_TABLE_SERVICE_ROLE} from './japan-table-service-role.js';
import {createJapanServiceEmployment} from './japan-service-employment.js';
export function createJapanTableServiceEmployment(options){return createJapanServiceEmployment({...options,duty:options.tableService,role:JAPAN_TABLE_SERVICE_ROLE,provider:'japan-table-service-employment',reviewMethod:'recordJapanTableServiceReview',text:{keepMeetingWhileLocal:true,
 selfVisit:'请先完成自己的泡汤或用餐，再接送餐班次',begin:'Daichi：可选原传菜盘并核对客名、份号和菜名。原客吃完后收回同盘清洗；错桌会被退回并记差评，可取回更正。一餐不封班',finishWork:'请先送妥或归还手上原盘，再当面交班',end:'Daichi已接回原送餐职责；请当面验收并领取日本券工资',meeting:'请在一层厨房送餐登记处稍候，Daichi会先把手中原盘交妥再回来',
 actions:{'formal-view':'查看送餐与收洗岗位','formal-apply':'自荐 · 提交送餐申请','formal-review':'请Daichi审核 · 核对送餐职责与工钱','formal-resign':'办理送餐岗位离职',accept:'接班 · 开始今日送餐与收洗',resume:'当面接回送餐 · 继续原班',claim:'Daichi验收 · 日本券日薪入银行','end-shift':'当面交班 · 按实际工时结薪',cancel:'中断本班 · 将手中原盘放回原处'}
 }});}
