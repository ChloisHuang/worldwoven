import {JAPAN_BATH_DELIVERY_ROLE} from './japan-bath-delivery-role.js';
import {createJapanServiceEmployment} from './japan-service-employment.js';
export function createJapanBathDeliveryEmployment(options){return createJapanServiceEmployment({...options,duty:options.delivery,role:JAPAN_BATH_DELIVERY_ROLE,provider:'japan-bath-delivery-employment',reviewMethod:'recordJapanBathDeliveryReview',text:{keepMeetingWhileLocal:true,
 selfVisit:'请先完成自己的泡汤或用餐，再接配送班次',begin:'Sora：从四层药房领原号浴包，沿楼梯到男汤服务侧交原客。连续当班按实际工时结日本券，不授免费泡汤或餐食',finishWork:'请先把手中原包交给原客，或在职业卡选择中断并送回药房，再当面交班',end:'Sora已接回原男汤配送，工时与同号交付已封存；请当面验收结薪',meeting:'请在汤室外服务交班处稍候，Sora送妥原包后回来当面办理',
 actions:{'formal-view':'查看男汤浴包配送岗位','formal-apply':'自荐 · 提交男汤配送申请','formal-review':'请Sora审核 · 确认原包职责与工钱','formal-resign':'办理男汤配送离职',accept:'显式接班 · 开始今日男汤配送',resume:'当面接回配送 · 继续原班',claim:'Sora验收 · 日本券日薪入银行','end-shift':'当面交班 · 按实际工时结薪',cancel:'中断本班 · 送回原包并交回配送'}
 }});}
