import {COURT_CLERK_ROLE} from './formal-careers.js';
import {CHINA_OFFICIAL_BUREAU as B} from './china-official-bureau.js';
import {COURT_CAREER_PLACE as P} from './china-court-career-place.js';
import {createCourtPosture} from './china-court-posture.js';
import {nearbyInteraction} from './player-interaction-intents.js';

const FORMAL = new Set(['kneeling','report','response','dismissal','rising']);
const copy = value => JSON.parse(JSON.stringify(value));
const REASONS={'promotion-pending':'已有升阶申请，请继续当面审核','promotion-applied-today':'今日升阶申请已记录，下一模拟日再试','promotion-duty-unsettled':'请先完成当前朝班、归档并结清工资，再办理升阶','service-days-required':'需完成至少三个不同模拟日的朝班与归档','tenure-days-required':'本次录事实任需满三个模拟日','service-performance-required':'本任职正面考语减去差评需达到三次','promotion-route-complete':'正九品以后的实职路线尚未开放','promotion-review-rejected':'沈叙：本次升阶考核未通过，结果已入档。继续履职后，下一模拟日可再申请','interview-rejected':'本次面谈未录用，结果已保存，下一模拟日可再申请','already-applied-today':'本岗位今天已提交过申请，请查看已保存结果，下一模拟日再来','bank-unavailable':'钱庄入账暂不可用，已完成工资会保留并自动重试','adult-required':'需年满18岁','ritual-required':'礼仪经验需达到2点','writing-required':'文书经验需达到2点','no-vacancy':'当前没有可申请的空缺','already-employed':'你已有长期职位','save-failed':'登记没能保存，请稍后重试','async-save-unsupported':'登记没能保存，请稍后重试','outside-arrival-window':'请在06:00至11:30之间提前到班','court-postponed':'本日朝会已延期，不计薪也不记缺勤差评','appointed-after-court-start':'任命在本日开朝之后，明日再到班','duty-missed':'本日朝班已经错过，下一模拟日再来','duty-evaluated':'本日履职已结算或评价','wage-ready':'先等已完成的工资存入钱庄，再办理离职','work-incomplete':'本轮工作尚未完整完成','not-employed':'请先在铨录登记案申请任职','invalid-career-state':'职业存档暂时无法核对，请保留存档后再试'};

// A world adapter only: every journey uses the controller's shared intent
// planner. This module neither moves actors nor changes the six NPC holders.
export function createChinaCourtCareer({careers, audience, getPlayer, getClock,
  getBusy=()=>false, canSee=()=>true, notify=()=>{}, openRegistration=()=>{},getRecruiter=()=>null,requestMeeting=()=>true,releaseMeeting=()=>{},documentObject=null}) {
  let activity=null, reviewOnArrival=null, progress=0, pending=false, disposed=false, posture=null, postureActor=null, lastNotice=null, nextSettlementAt=0;
  const at = point => nearbyInteraction({position:point},getPlayer()?.root.position,{radius:.18,clear:canSee});
  const application=()=>careers.applicationResult(COURT_CLERK_ROLE.id);
  const promotion=()=>careers.promotionSummary?.().application;
  const documentApplication=()=>careers.isHired()?promotion():application();
  const promotionKind=()=>({submitted:'promotion-review','document-ready':'promotion-receive-document','document-held':'promotion-appointment'})[promotion()?.stage];
  const documentHome=documentObject?{parent:documentObject.parent,position:documentObject.position.clone(),rotation:documentObject.rotation.clone()}:null;
  function syncDocument(){if(!documentObject)return;const r=documentApplication(),hand=getPlayer()?.root?.userData?.hands?.[1],held=r?.status==='pending'&&r.stage==='document-held';documentObject.userData.applicationId=r?.appointment?.id||null;
    if(held&&hand){if(['appointment','promotion-appointment'].includes(activity)&&getPlayer()?.root.userData.tools?.book)getPlayer().root.userData.tools.book.visible=false;if(documentObject.parent!==hand)hand.add(documentObject);documentObject.position.set(0,-.055,.035);documentObject.rotation.set(.2,0,Math.PI/2);}
    else if(documentHome){if(documentObject.parent!==documentHome.parent)documentHome.parent.add(documentObject);documentObject.position.copy(documentHome.position);documentObject.rotation.copy(documentHome.rotation);}
  }
  const recruiterReady=()=>{const npc=getRecruiter();return !!npc&&!npc.walking&&!FORMAL.has(audience.state()?.phase)&&canSee({position:npc.root.position.toArray()});};
  const duty = () => {const d=careers.state().lastDuty;return d?.roleId===COURT_CLERK_ROLE.id?d:null;};
  const relevantDuty = () => duty()?.day===getClock().day ? duty() : null;
  const result = (r, text) => {if(!r?.ok)notify(r?.reasons?.map(reason=>REASONS[reason]||'本次办理未完成，请稍后再试').join('；')||'登记暂未保存，请稍后再试');else if(text)notify(text);return !!r?.ok;};
  function nextKind() {
    if(!careers.isHired()){const a=application();return a?.status==='pending'?({submitted:'review','document-ready':'receive-document','document-held':'appointment'})[a.stage]:'view';}
    const d=duty();if(d?.stage==='ready')return 'settle';
    if(relevantDuty()?.stage==='archive')return 'archive';
    if(promotion()?.status==='pending'&&!activity&&careers.promotionSummary?.().eligible)return promotionKind();
    if(!activity&&careers.beginDutyAvailability(COURT_CLERK_ROLE.id).ok)return 'attend';
    return 'view';
  }
  function intent(kind=nextKind()) {
    if(disposed||!['view','apply','review','receive-document','appointment','resign','attend','archive','settle','promotion-apply','promotion-review','promotion-receive-document','promotion-appointment'].includes(kind))return null;
    const s=careers.state(),d=relevantDuty(),hired=careers.isHired();
    const reviewKinds=['review','receive-document','appointment'],promotionKinds=['promotion-review','promotion-receive-document','promotion-appointment'];
    if(kind==='promotion-apply'&&(!hired||activity||!careers.promotionAvailability?.().ok))return null;
    if(promotionKinds.includes(kind)&&(!hired||activity||promotion()?.status!=='pending'||kind!==promotionKind()||!careers.promotionSummary?.().eligible))return null;
    if(kind==='apply'&&hired||kind==='resign'&&!hired||!['view','apply',...reviewKinds].includes(kind)&&!hired)return null;
    if(reviewKinds.includes(kind)&&(kind!==nextKind()||activity))return null;
    if(kind==='attend'&&(activity||!careers.beginDutyAvailability(COURT_CLERK_ROLE.id).ok))return null;
    if(kind==='archive'&&(activity||d?.stage!=='archive')||kind==='settle'&&s.lastDuty?.stage!=='ready')return null;
    const npc=getRecruiter(),q=npc?.root.position;
    // The upstairs desk aisle is bounded by the dormitory wall to the south.
    // Meet alongside the official there, not inside that wall.
    const inDeskAisle=q&&Math.abs(q.y-B.upperFloorY)<.3&&q.z>31.7&&q.z<32.5&&q.x>=16.6&&q.x<25.4;
    const reviewPoint=q?[q.x+(inDeskAisle?(q.x>24.5?-.72:.72):0),q.y,q.z+(inDeskAisle?0:.72)]:P.registration;
    const position=['review','promotion-review'].includes(kind)?reviewPoint:kind==='attend'?P.court:['archive','settle','receive-document','promotion-receive-document'].includes(kind)?P.archive:P.registration;
    return {id:'cn-court-career-'+kind,provider:'china-court-career',kind,position:[...position],...(kind==='view'?{registration:{scope:'role',roleId:COURT_CLERK_ROLE.id}}:{}),
      name:kind==='attend'?'承光正殿 · 第七录事班位':kind==='archive'||kind==='settle'?'承务官署 · 礼务归档案':'承务官署 · 铨录登记',
      npcName:['review','promotion-review'].includes(kind)?'沈叙 · 礼仪官':kind==='attend'?'礼务录事':['receive-document','appointment','promotion-receive-document','promotion-appointment'].includes(kind)?'官署任命文书':'铨录簿',
      action:{'promotion-apply':'提交正九品升阶申请','promotion-review':'向沈叙呈实任考语并接受升阶考核','promotion-receive-document':'领取升阶文书','promotion-appointment':'宣读升阶文书并受任',view:'查看正式职位',apply:'提交从九品礼务录事申请',review:'向沈叙呈履历并接受审核','receive-document':'领取已核验任命文书',appointment:'宣读任命文书并受职',resign:'办理录事离职',attend:'11:30前赴班 · 持笏候朝',archive:'抄录朝会归档 · 8秒',settle:'核对本日工资银行入账'}[kind],
      intentKey:[s.revision,getClock().day,kind,...(['review','promotion-review'].includes(kind)?position.map(v=>v.toFixed(1)):[])].join(':'),interactionRadius:2.8,executionRadius:.18,priority:55};
  }
  const resolveIntent = selected => {const next=intent(selected?.kind);if(!next||selected?.provider!==next.provider||selected.id!==next.id||selected.intentKey!==next.intentKey)return null;if(next.kind==='view'){const context=selected.registration||next.registration;if(context.roleId!==COURT_CLERK_ROLE.id||!['role','catalogue'].includes(context.scope))return null;return {...next,registration:{...context}};}return next;};
  function prepareIntent(selected){
    if(!['review','promotion-review'].includes(selected?.kind))return true;
    const next=resolveIntent(selected),npc=getRecruiter();if(!next||!npc)return false;
    if(!requestMeeting(npc)){notify('沈叙正忙或尚未回到案前。申请已保留，请待他回官署停步后再约当面审核。');return false;}
    notify('沈叙已在官署案旁留步等候。请沿公共楼梯前往；取消行程或朝会召集会解除等候。');return true;
  }
  function executeIntent(selected) {
    const next=resolveIntent(selected);if(!next||getBusy()||!at(next.position))return false;
    // Shared navigation may arrive on its final moving frame. Keep the same
    // intent at the meeting point, then assess only after the player stops.
    if(['review','promotion-review'].includes(next.kind)&&getPlayer()?.walking){reviewOnArrival=copy(next);activity='review-arrival';pending=true;return true;}
    if(next.kind==='view'){openRegistration({...next.registration,country:'china'});return true;}
    if(next.kind==='apply'){const ok=result(careers.apply(COURT_CLERK_ROLE.id,{ageYears:getPlayer().ageYears}),'申请已收下。请向沈叙当面呈履历；审核通过后还需到归档案领文，再宣读受职。');openRegistration({country:'china',roleId:COURT_CLERK_ROLE.id,scope:'role'});return ok;}
    if(next.kind==='promotion-apply'){
      const ok=result(careers.applyPromotion(),'升阶履历已登记。请当面向沈叙呈交实任考语；达标仅获审核机会。');openRegistration({country:'china',roleId:COURT_CLERK_ROLE.id,scope:'role'});return ok;
    }
    if(['promotion-review','promotion-receive-document','promotion-appointment'].includes(next.kind)){
      if(next.kind==='promotion-review'&&!recruiterReady()){releaseMeeting();notify('沈叙正在行礼或途中，请待他停步后当面核阅升阶履历。');return false;}
      if(next.kind==='promotion-receive-document'&&!documentObject){notify('升阶文书尚未就案，请稍后再来。');return false;}
      const r=promotion();
      if(next.kind==='promotion-appointment'){
        if(!documentObject||documentObject.parent!==getPlayer()?.root?.userData?.hands?.[1])return false;
        activity='promotion-appointment';progress=0;pending=true;notify(r.appointment.text);return true;
      }
      const ok=result(careers.reviewPromotion({applicationId:r.id,step:next.kind==='promotion-review'?'interview':'receive-document'}),next.kind==='promotion-review'?'沈叙：实任考语与当面考核已通过。请到归档案领升阶文书，再回登记处宣读。':'升阶文书已领取。请持文到铨录登记处宣读受任。');
      releaseMeeting();syncDocument();openRegistration({country:'china',roleId:COURT_CLERK_ROLE.id,scope:'role'});return ok;
    }
    if(['review','receive-document','appointment'].includes(next.kind)){
      if(next.kind==='review'&&!recruiterReady()){releaseMeeting();notify('沈叙正在行礼或途中，请待他停步后当面呈履历；申请会保留。');return false;}
      if(next.kind==='receive-document'&&!documentObject){notify('任命文书尚未就案，请稍后再来。');return false;}
      if(next.kind==='appointment'&&(!documentObject||documentObject.parent!==getPlayer()?.root?.userData?.hands?.[1]))return false;
      const r=application();if(next.kind==='appointment'){activity='appointment';progress=0;pending=true;notify(r.appointment.text);return true;}
      const step=next.kind==='review'?'interview':next.kind;
      const ok=result(careers.reviewApplication(COURT_CLERK_ROLE.id,{ageYears:getPlayer().ageYears,applicationId:r?.id,step}),next.kind==='review'?'沈叙：履历已核验。请到楼下归档案领取任命文书，再持文宣读。':next.kind==='receive-document'?'已从归档案领取任命文书。请持文到铨录登记处宣读受职。':'任命已宣读，九品礼务录事自此刻生效。朝班请另行报到。');
      releaseMeeting();syncDocument();openRegistration({country:'china',roleId:COURT_CLERK_ROLE.id,scope:'role'});return ok;
    }
    if(next.kind==='resign'){const ok=result(careers.resign(),'离职已登记，录事空缺重新开放；已得技能和评价保留。');if(ok)stopActivity();return ok;}
    if(next.kind==='settle')return result(careers.settle(),'本日工资已核对存入钱庄，同一日不会重复发放。');
    if(next.kind==='attend'){
      if(!result(careers.beginDuty(),'已在录事班位候朝，齐班后可提前行礼听记；移动或按E可离开。'))return false;
      activity='court';progress=0;pending=true;return true;
    }
    activity='archive';progress=0;pending=true;notify('正在抄录本日朝会并归档；移动会中止这一段。');return true;
  }
  function stopActivity(reason='主动离开本轮工作') {
    releaseMeeting();reviewOnArrival=null;
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
    if(disposed)return;syncDocument();
    if(reviewOnArrival){
      const selected=reviewOnArrival,p=getPlayer();if(!p||!at(selected.position)||getBusy()){stopActivity();return;}
      if(p.walking)return;reviewOnArrival=null;activity=null;pending=false;
      if(!executeIntent(selected))releaseMeeting();return;
    }
    if(!activity){
      const a=audience.state(),s=careers.state(),c=getClock();
      if(careers.isHired()&&a.schedule.lastStartedDay===c.day&&Number.isFinite(a.schedule.startedAt)&&s.tenure.sinceDay===c.day&&s.tenure.sinceHour>=a.schedule.startedAt){const r=careers.deferAfterCourtStart({day:c.day,startedAt:a.schedule.startedAt});if(r.ok&&!r.unchanged)notify('本日开朝后受任，明日再到班。');return;}
      if(careers.isHired()&&s.lastEvaluatedDay!==c.day&&a.schedule.day===c.day&&a.schedule.outcome==='in-session'&&FORMAL.has(a.phase)&&
        !(s.tenure.sinceDay===c.day&&s.tenure.sinceHour>=11.5))careers.dutyEvent('court-start');
      reviewNotice();settleReady();return;
    }
    const p=getPlayer(),point=activity==='court'?P.court:['appointment','promotion-appointment'].includes(activity)?P.registration:P.archive;
    if(!p||!at(point)||getBusy()){stopActivity('中途离开班位或工作台');reviewNotice();return;}
    if(pending){if(p.walking)return;pending=false;}
    if(p.walking){stopActivity('中途离开班位');reviewNotice();return;}
    p.root.rotation.y=activity==='court'?Math.PI:Math.atan2(P.archiveTarget[0]-p.root.position.x,P.archiveTarget[2]-p.root.position.z);
    if(['appointment','promotion-appointment'].includes(activity)){
      if(documentApplication()?.stage!=='document-held'){stopActivity();return;}
      progress=Math.min(3,progress+Math.max(0,Math.min(.1,Number.isFinite(dt)?dt:0)));
      if(progress>=3-1e-8){const promoted=activity==='promotion-appointment',r=documentApplication(),review=promoted?careers.reviewPromotion({applicationId:r.id,step:'appointment'}):careers.reviewApplication(COURT_CLERK_ROLE.id,{ageYears:p.ageYears,applicationId:r.id,step:'appointment'});activity=null;progress=0;result(review,promoted?'升阶文书已宣读，正九品礼务录事即刻生效。下一新班按22文基础日薪核薪；已结工资不变。':'任命文书已宣读，从九品礼务录事自此刻受职。');syncDocument();openRegistration({country:'china',roleId:COURT_CLERK_ROLE.id,scope:'role'});}
      return;
    }
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
  return {readyForEarlyCourt:()=>!careers.isHired(COURT_CLERK_ROLE.id)||activity==='court'&&!pending&&relevantDuty()?.stage==='arrived'&&!getPlayer()?.walking&&at(P.court),intent,resolveIntent,prepareIntent,cancelApproach:releaseMeeting,executeIntent,update,syncPlayer,stopActivity,
    isActing:()=>!!activity,
    playerAction:()=>['appointment','promotion-appointment'].includes(activity)&&!pending?'read':activity==='archive'&&!pending?'calligraphy':null,
    playerStation:()=>activity==='archive'?{playerWorkTarget:P.archiveTarget}:null,
    label:()=>activity==='review-arrival'?'停步呈交履历 · 等候当面核验':['appointment','promotion-appointment'].includes(activity)?`持文宣读任命 · ${Math.ceil(3-progress)}秒`:documentApplication()?.stage==='document-held'?'持任命文书 · 待宣读受职':activity==='court'?(duty()?.stage==='attending'?'随班行礼 · 听记朝议':'第七班位持笏候朝 · 待齐班'):activity==='archive'?`抄录归档 · ${Math.ceil(8-progress)}秒`:null,
    snapshot:()=>({version:1,duty:copy(duty()),activity,progress,pending,lastNotice,nextSettlementAt}),
    restore(s){if(s?.version!==1||s.duty&&['roleId','slotId','day'].some(k=>s.duty[k]!==duty()?.[k]))return false;activity=['court','archive'].includes(s.activity)?s.activity:['appointment','promotion-appointment'].includes(s.activity)&&documentApplication()?.stage==='document-held'?s.activity:null;progress=Math.max(0,Math.min(8,s.progress||0));pending=!!s.pending;lastNotice=s.lastNotice||null;nextSettlementAt=Math.max(0,s.nextSettlementAt||0);return true;},
    state:()=>({...careers.state(),activity,progress:progress/(['appointment','promotion-appointment'].includes(activity)?3:8),place:copy(P)}),
    dispose({suspend=false}={}){if(disposed)return;releaseMeeting();if(!suspend)stopActivity('离开地区');posture?.dispose();if(documentHome&&documentObject){documentHome.parent.add(documentObject);documentObject.position.copy(documentHome.position);documentObject.rotation.copy(documentHome.rotation);}disposed=true;},
  };
}
