import {JAPAN_BALCONY_ROLE} from './japan-balcony-role.js';
import {createJapanServiceEmployment} from './japan-service-employment.js';
export function createJapanBalconyEmployment(options){
 let saving=false;const persist=options.saveState||(()=>true);
 const saveState=next=>{if(saving)return false;saving=true;try{const result=persist(next);return result?.ok===false?false:result;}finally{saving=false;}};
 return createJapanServiceEmployment({...options,saveState,duty:options.balcony,role:JAPAN_BALCONY_ROLE,provider:'japan-balcony-employment',reviewMethod:'recordJapanBalconyReview',text:{keepMeetingWhileLocal:true,
 selfVisit:'请先结束自己的泡汤或用餐，再接望景廊巡护班次',begin:'Ren：每天在地面目视6盏原高挂灯笼、检查原走道通畅、擦拭可够到的原栏杆，再登记原廊复核。原廊始终公开可通行。候班与巡护按实际工时结日本券，不按点击或按轮加钱',finishWork:'请先停止当前检查，再当面交班',end:'Ren已接回原望景廊巡护；请当面验收并领取本班工资',meeting:'请在四层原廊登记处稍候，Ren结束手上原事务后回来当面办理',
 actions:{'formal-view':'查看原望景廊巡护岗位','formal-apply':'自荐 · 提交望景廊巡护申请','formal-review':'请Ren审核 · 确认巡护职责与工钱','formal-resign':'办理望景廊巡护离职',accept:'显式接班 · 开始今日望景廊巡护',resume:'当面接回巡护 · 继续原班',claim:'Ren验收 · 日本券日薪入银行','end-shift':'当面交班 · 按实际工时结薪',cancel:'中断本班 · 安全交回原廊巡护'}
 }});}
