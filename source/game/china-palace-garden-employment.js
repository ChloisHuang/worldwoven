import {createJapanServiceEmployment} from './japan-service-employment.js';
import {PALACE_GARDEN_CAREER_ROLE as ROLE} from './china-palace-garden-career-role.js';
// Formal employment owns time wages; the original edict owns every physical step.
// Player work never creates the NPC piecework payment.
export function createChinaPalaceGardenEmployment(options){
 const {duty,careers,getClock,saved,saveState}=options;let queue=saved?.reviewQueue||null,base;
 const persistQueue=next=>{const s=base.state();const result=saveState({version:1,serial:s.serial,job:s.job,reviewQueue:next});if(result===false||result?.ok===false||result?.then)return false;queue=next;return true;};
 base=createJapanServiceEmployment({...options,role:ROLE,provider:'china-palace-garden-employment',reviewMethod:'recordPalaceGardenReview',saveState:state=>saveState({...state,reviewQueue:queue}),text:{
  selfVisit:'须先完成原令和餐厕事务，Bo安全让位后才接荷桥原岗。',begin:'Bo：候令、领取原令、归档、清扫七秒、实际返岗后当面评价。06–18时在原岗按16文固定日薪计真实工时。勤务不授官。',finishWork:'请先办结、返岗并评价原令，再交回荷桥原岗。',end:'Bo已接回原岗，请当面验收本班工时，工资存入银行。',meeting:'Bo忙完原事务返案后，当面核验同一份申请。',keepMeetingWhileLocal:true,
  actions:{'formal-view':'查看荷庭勤务正式岗位','formal-apply':'现场登记 · 申请荷庭勤务','formal-review':'Bo本人面审 · 确认职责与固定日薪','formal-resign':'当面办理荷庭勤务离职',accept:'显式接班 · 等Bo安全交回原岗',resume:'接回原岗 · 继续本班',claim:'Bo验收 · 实际工时工资入银行','end-shift':'归还原岗 · 当面交班',cancel:'结束本班 · 原令须先办结交回'}
 }});
 return {...base,
  executeIntent(intent){if(!base.resolveIntent(intent)||!base.atRegistration()&&!String(intent?.kind).startsWith('task'))return false;if(intent?.kind==='formal-review'&&!duty.meetingReady()){const a=careers.applicationResult(ROLE.id);if(!a||!persistQueue({applicationId:a.id,day:getClock().day,actorId:ROLE.incumbentId}))return false;}
   const result=base.executeIntent(intent);if(queue&&careers.applicationResult(ROLE.id)?.status!=='pending')persistQueue(null);return result;},
  update(dt,t){duty.update(dt,t);if(queue){const a=careers.applicationResult(ROLE.id);if(a?.id!==queue.applicationId||a.status!=='pending'||getClock().day!==queue.day)persistQueue(null);else if(base.atRegistration()&&duty.meetingReady()){const intent=base.intent('formal-review');if(intent)base.executeIntent(intent);if(careers.applicationResult(ROLE.id)?.status!=='pending')persistQueue(null);}}base.update(dt,t);},
  stopActivity(){base.stopActivity();if(queue)persistQueue(null);},state:()=>({...base.state(),reviewQueue:queue}),dispose(){base.dispose();duty.dispose?.();}
 };
}
