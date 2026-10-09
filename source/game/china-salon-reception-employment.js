import {createJapanServiceEmployment} from './japan-service-employment.js';
import {SALON_RECEPTION_CAREER_ROLE as ROLE} from './china-salon-reception-career-role.js';
// The generic continuous contract owns salary time; the original salon owns
// every paid guest and physical ledger/card step. No per-order player money.
export function createChinaSalonReceptionEmployment(options){
 const {duty,careers,getClock,saved,saveState}=options;let queue=saved?.reviewQueue||null,base;
 const persistQueue=next=>{const s=base.state();const result=saveState({version:1,serial:s.serial,job:s.job,reviewQueue:next});if(result===false||result?.ok===false||result?.then)return false;queue=next;return true;};
 base=createJapanServiceEmployment({...options,role:ROLE,provider:'china-salon-reception-employment',reviewMethod:'recordChinaSalonReceptionReview',saveState:state=>saveState({...state,reviewQueue:queue}),text:{
  selfVisit:'须先完成原客单和餐厕事务，温晚安全让位后才接原接待案。',begin:'温晚：原客自费、艺者本人答应后，核记原簿、挂原房牌、实际服务后核销同单。现场候单按固定日薪计时。',finishWork:'请先核销并评价原客单，或明确撤单退款，再交回原接待案。',end:'温晚已接回原案，请当面验收本班工时，工资存入银行。',meeting:'温晚忙完原事务返案后，当面核验同一份申请。',keepMeetingWhileLocal:true,
  actions:{'formal-view':'查看雅集接待正式岗位','formal-apply':'现场登记 · 申请雅集接待','formal-review':'温晚本人面审 · 确认职责与固定日薪','formal-resign':'当面办理雅集接待离职',accept:'显式接班 · 等温晚安全交回原案',resume:'接回原案 · 继续本班',claim:'温晚验收 · 实际工时工资入银行','end-shift':'归还原案 · 当面交班',cancel:'撤下未完原单 · 原款退款并交回'}
 }});
 return {...base,
  executeIntent(intent){if(!base.resolveIntent(intent)||!base.atRegistration()&&!String(intent?.kind).startsWith('task'))return false;if(intent?.kind==='formal-review'&&!duty.meetingReady()){const a=careers.applicationResult(ROLE.id);if(!a||!persistQueue({applicationId:a.id,day:getClock().day,actorId:ROLE.incumbentId}))return false;}
   const result=base.executeIntent(intent);if(queue&&careers.applicationResult(ROLE.id)?.status!=='pending')persistQueue(null);return result;},
  update(dt,t){duty.update(dt,t);if(queue){const a=careers.applicationResult(ROLE.id);if(a?.id!==queue.applicationId||a.status!=='pending'||getClock().day!==queue.day)persistQueue(null);else if(base.atRegistration()&&duty.meetingReady()){const intent=base.intent('formal-review');if(intent)base.executeIntent(intent);if(careers.applicationResult(ROLE.id)?.status!=='pending')persistQueue(null);}}base.update(dt,t);},
  stopActivity(){base.stopActivity();if(queue)persistQueue(null);},state:()=>({...base.state(),reviewQueue:queue}),dispose(){base.dispose();duty.dispose?.();}
 };
}
