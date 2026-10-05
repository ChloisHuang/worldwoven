import {COURT_CLERK_ROLE} from './formal-careers.js';
import {COURT_CAREER_PLACE as P} from './china-court-career-place.js';
import {createCourtPosture} from './china-court-posture.js';
import {nearbyInteraction} from './player-interaction-intents.js';

const FORMAL = new Set(['kneeling','report','response','dismissal','rising']);
const copy = value => JSON.parse(JSON.stringify(value));
const REASONS={'interview-rejected':'本次面谈未录用，结果已保存，下一模拟日可再申请','already-applied-today':'本岗位今天已提交过申请，请查看已保存结果，下一模拟日再来','bank-unavailable':'钱庄入账暂不可用，已完成工资会保留并自动重试','adult-required':'需年满18岁','ritual-required':'礼仪经验需达到2点','writing-required':'文书经验需达到2点','no-vacancy':'当前没有可申请的空缺','already-employed':'你已有长期职位','save-failed':'登记没能保存，请稍后重试','async-save-unsupported':'登记没能保存，请稍后重试','outside-arrival-window':'请在06:00至11:30之间提前到班','court-postponed':'本日朝会已延期，不计薪也不记缺勤差评','duty-missed':'本日朝班已经错过，下一模拟日再来','duty-evaluated':'本日履职已结算或评价','wage-ready':'先等已完成的工资存入钱庄，再办理离职','work-incomplete':'本轮工作尚未完整完成','not-employed':'请先在铨录登记案申请任职','invalid-career-state':'职业存档暂时无法核对，请保留存档后再试'};

// A world adapter only: every journey uses the controller's shared intent
// planner. This module neither moves actors nor changes the six NPC holders.
export function createChinaCourtCareer({careers, audience, getPlayer, getClock,
  getBusy=()=>false, canSee=()=>true, notify=()=>{}, openRegistration=()=>{}}) {
  let activity=null, progress=0, pending=false, disposed=false, posture=null, postureActor=null, lastNotice=null, nextSettlementAt=0;
  const at = point => nearbyInteraction({position:point},getPlayer()?.root.position,{radius:.18,clear:canSee});
  const duty = () => {const d=careers.state().lastDuty;return d?.roleId===COURT_CLERK_ROLE.id?d:null;};
  const relevantDuty = () => duty()?.day===getClock().day ? duty() : null;
  const result = (r, text) => {if(!r?.ok)notify(r?.reasons?.map(reason=>REASONS[reason]||'本次办理未完成，请稍后再试').join('；')||'登记暂未保存，请稍后再试');else if(text)notify(text);return !!r?.ok;};
  function nextKind() {
    if(!careers.isHired())return 'view';
    const d=duty();if(d?.stage==='ready')return 'settle';
    if(relevantDuty()?.stage==='archive')return 'archive';
    if(!activity&&careers.beginDutyAvailability(COURT_CLERK_ROLE.id).ok)return 'attend';
    return 'view';
  }
  function intent(kind=nextKind()) {
    if(disposed||!['view','apply','resign','attend','archive','settle'].includes(kind))return null;
    const s=careers.state(),d=relevantDuty(),hired=careers.isHired();
    if(kind==='apply'&&hired||kind==='resign'&&!hired||!['view','apply'].includes(kind)&&!hired)return null;
    if(kind==='attend'&&(activity||!careers.beginDutyAvailability(COURT_CLERK_ROLE.id).ok))return null;
    if(kind==='archive'&&(activity||d?.stage!=='archive')||kind==='settle'&&s.lastDuty?.stage!=='ready')return null;
    const position=kind==='attend'?P.court:kind==='archive'||kind==='settle'?P.archive:P.registration;
    return {id:'cn-court-career-'+kind,provider:'china-court-career',kind,position:[...position],...(kind==='view'?{registration:{scope:'role',roleId:COURT_CLERK_ROLE.id}}:{}),
      name:kind==='attend'?'承光正殿 · 第七录事班位':kind==='archive'||kind==='settle'?'承务官署 · 礼务归档案':'承务官署 · 铨录登记',
      npcName:kind==='attend'?'礼务录事':'铨录簿',
      action:{view:'查看正式职位',apply:'申请九品礼务录事',resign:'办理录事离职',attend:'11:30前赴班 · 持笏候朝',archive:'抄录朝会归档 · 8秒',settle:'核对本日工资银行入账'}[kind],
      intentKey:[s.revision,getClock().day,kind].join(':'),interactionRadius:2.8,executionRadius:.18,priority:55};
  }
  const resolveIntent = selected => {const next=intent(selected?.kind);if(!next||selected?.provider!==next.provider||selected.id!==next.id||selected.intentKey!==next.intentKey)return null;if(next.kind==='view'){const context=selected.registration||next.registration;if(context.roleId!==COURT_CLERK_ROLE.id||!['role','catalogue'].includes(context.scope))return null;return {...next,registration:{...context}};}return next;};
  function executeIntent(selected) {
    const next=resolveIntent(selected);if(!next||getBusy()||!at(next.position))return false;
    if(next.kind==='view'){openRegistration({...next.registration,country:'china'});return true;}
    if(next.kind==='apply'){const ok=result(careers.apply(COURT_CLERK_ROLE.id,{ageYears:getPlayer().ageYears}),'已录用：九品礼务录事，独立空缺已由你任职。请查看职业手册与11:30朝班。');openRegistration({country:'china',roleId:COURT_CLERK_ROLE.id,scope:'role'});return ok;}
    if(next.kind==='resign'){const ok=result(careers.resign(),'离职已登记，录事空缺重新开放；已得技能和评价保留。');if(ok)stopActivity();return ok;}
    if(next.kind==='settle')return result(careers.settle(),'本日工资已核对存入钱庄，同一日不会重复发放。');
    if(next.kind==='attend'){
      if(!result(careers.beginDuty(),'已在录事班位候朝，11:30随班行礼并听记；移动或按E可离开。'))return false;
      activity='court';progress=0;pending=true;return true;
    }
    activity='archive';progress=0;pending=true;notify('正在抄录本日朝会并归档；移动会中止这一段。');return true;
  }
  function stopActivity(reason='主动离开本轮工作') {
    if(activity==='court')careers.interruptDuty(reason);
    activity=null;progress=0;pending=false;posture?.stop();
  }
  function reviewNotice() {
    const review=careers.state().lastEvaluation;if(review?.roleId===COURT_CLERK_ROLE.id&&review.id!==lastNotice){lastNotice=review.id;notify(`${review.positive?'👍':'👎'} 沈叙：${review.reason}`);}
  }
  function settleReady() {
    if(duty()?.stage!=='ready'||getClock().seconds<nextSettlementAt)return;
    nextSettlementAt=getClock().seconds+5;
    const paid=careers.settle();
    if(paid?.ok&&!paid.replayed)notify(`${paid.wage}铜文工资已存入当地钱庄；取款后才会进随身钱包。`);
  }
  function update(dt) {
    if(disposed)return;
    if(!activity){
      const a=audience.state(),s=careers.state(),c=getClock();
      if(careers.isHired()&&s.lastEvaluatedDay!==c.day&&a.schedule.day===c.day&&a.schedule.outcome==='in-session'&&FORMAL.has(a.phase)&&
        !(s.tenure.sinceDay===c.day&&s.tenure.sinceHour>=11.5))careers.dutyEvent('court-start');
      reviewNotice();settleReady();return;
    }
    const p=getPlayer(),point=activity==='court'?P.court:P.archive;
    if(!p||!at(point)||getBusy()){stopActivity('中途离开班位或工作台');reviewNotice();return;}
    if(pending){if(p.walking)return;pending=false;}
    if(p.walking){stopActivity('中途离开班位');reviewNotice();return;}
    p.root.rotation.y=activity==='court'?Math.PI:Math.atan2(P.archiveTarget[0]-p.root.position.x,P.archiveTarget[2]-p.root.position.z);
    if(activity==='archive'){
      progress=Math.min(8,progress+Math.max(0,Math.min(.1,Number.isFinite(dt)?dt:0)));
      if(progress>=8-1e-8){
        const r=careers.dutyEvent('archive-completed');activity=null;progress=0;
        if(result(r)){reviewNotice();settleReady();if(duty()?.stage==='ready')notify('朝会记录已归档，工资正在等待钱庄入账；会自动重试，不会重复发薪。');}
      }
      return;
    }
    const a=audience.state(),d=duty();
    if(a.schedule.day!==getClock().day||['missed','postponed','interrupted'].includes(a.schedule.outcome)){
      stopActivity('court-postponed');notify('今日朝会延期，本轮不计薪，也不计作你的缺勤差评。');reviewNotice();return;
    }
    if(d?.stage==='arrived'&&FORMAL.has(a.phase)&&a.schedule.outcome==='in-session'){
      if(!result(careers.dutyEvent('court-start'))){stopActivity('朝班记录未保存');return;}
    }
    if(duty()?.stage==='attending'&&a.schedule.outcome==='completed'){
      const r=careers.dutyEvent('court-completed');activity=null;posture?.stop();
      result(r,'随班听记完成。请沿公共通路回官署抄录归档，日薪随后自动存入钱庄。');
    }else if(duty()?.stage==='arrived'&&getClock().hour>=11.5&&!FORMAL.has(a.phase)&&a.phase!=='holding'&&a.phase!=='assembling')stopActivity('未赶上本日完整朝会');
  }
  function syncPlayer(t) {
    const p=getPlayer();
    if(postureActor!==p){posture?.dispose();posture=null;postureActor=p;}
    if(activity!=='court'||pending){posture?.stop();return;}
    if(!posture&&p?.root.userData.body)posture=createCourtPosture(p);
    const a=audience.state();
    const kneeling=a.phase==='kneeling'?Math.min(1,a.phaseTime/1.8):a.phase==='rising'?Math.max(0,1-a.phaseTime/1.8):['report','response','dismissal'].includes(a.phase)?1:0;
    posture?.apply({kneeling,holding:true,raised:.15,time:t});
  }
  return {intent,resolveIntent,executeIntent,update,syncPlayer,stopActivity,
    isActing:()=>!!activity,
    playerAction:()=>activity==='archive'&&!pending?'calligraphy':null,
    playerStation:()=>activity==='archive'?{playerWorkTarget:P.archiveTarget}:null,
    label:()=>activity==='court'?(duty()?.stage==='attending'?'随班行礼 · 听记朝议':'第七班位持笏候朝 · 11:30'):activity==='archive'?`抄录归档 · ${Math.ceil(8-progress)}秒`:null,
    state:()=>({...careers.state(),activity,progress:progress/8,place:copy(P)}),
    dispose(){if(disposed)return;stopActivity('离开地区');posture?.dispose();disposed=true;},
  };
}
