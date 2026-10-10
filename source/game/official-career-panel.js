import {getChinaOfficialCareerRank,CHINA_JUSTICE_PRINCIPAL_RANK,CHINA_RECORDS_CAREER_RANKS,CHINA_OFFICIAL_GRADES,CHINA_OFFICIAL_GRADE_PAY_V1,CHINA_COURT_OFFICIAL_RANKS} from './china-official-ranks.js';
import {personnelRequirements,isPersonnelRank as personnelRank,isPersonnelApplication as personnelApplication,PRINCIPAL_RANK} from './official-personnel-policy.js';
const stageText={submitted:'待当值礼仪主管当面考核','document-ready':'考核通过 · 待领文','document-held':'文书在手 · 待宣读',approved:'授任已生效','promotion-review-rejected':'当面考核未通过',withdrawn:'已撤回','appointment-ended':'离任终止申请'};
const personnelStageText={submitted:'待陆谦当面核荐','document-ready':'陆谦已荐 · 待领原件','document-held':'原荐书在手 · 待皇帝阅批','imperial-approved':'皇帝已准任 · 待宣读登记',approved:'授任已生效','promotion-review-rejected':'皇帝未准本次任命','promotion-eligibility-changed':'任职条件变化 · 本次申请已结束','promotion-identity-changed':'原经办人身份变化 · 本次申请已结束',withdrawn:'已撤回','appointment-ended':'离任终止申请'};
const reasonText={'service-days-required':'需3日合格朝班与归档','tenure-days-required':'本次任职需满3日','service-performance-required':'本任考语净值需达3','promotion-duty-unsettled':'先完成本班并结清工资','promotion-applied-today':'今日已申请 · 次日可再试','ritual-required':'礼仪需2级','writing-required':'文书需2级','promotion-route-complete':'当前任职路线已完成','principal-vacancy-unavailable':'刑名主官须有原在任者离世后可核验的真实空缺','principal-vacancy-changed':'原空缺已变化，原荐书不能移用','principal-duty-required':'现任刑名主官须办理原案复核与归档','personnel-trial-required':'须完成一份本任核籍试办并获陆谦签收'};
const applicationText=r=>personnelApplication(r)&&r.code==='approved'?`${getChinaOfficialCareerRank(r.toRankId).gradeLabel}${r.toRankId===PRINCIPAL_RANK?'刑名主官实职':''}授任已生效`:(personnelApplication(r)?personnelStageText:stageText)[r.code]||(personnelApplication(r)?personnelStageText:stageText)[r.stage]||'申请待核对';
export function appendOfficialPromotionPanel({careers,role,panel,metric,make,action,buttonFor,service=null}){
 const summary=careers.promotionSummary?.();if(!summary?.rank)return;
 if(summary.rankId===PRINCIPAL_RANK){
  const appointed=careers.currentOfficialAppointment?.();
  metric('◇ 实任官职',`${summary.rank.gradeLabel} · ${summary.rank.title}`,'原刑名主官实缺，皇帝准任并宣读登记生效');
  metric('▣ 本职职责','原案实据复核与具名归档','原案职责完成后才核当日168文，不再办理录事朝班核籍或领取录事工资');
  if(appointed)metric('▤ 任命原件',`第${appointed.sinceDay+1}日授任`,'原荐书、皇帝阅批和宣读凭据保留于履历');
  panel.body.append(make('p','承接原刑名主官待办原案；复核事实并给出具名意见，不增加刑罚或其他部门权力。','career-status-note'));
  return;
 }
 const enabled=careers.personnelProgressionEnabled?.()===true,personnelRoute=personnelRank(summary.routeId)||summary.routeId===PRINCIPAL_RANK||[2,3,4].includes(summary.application?.routeVersion),personnel=enabled&&personnelRoute,runtime=personnel?service?.personnelAppointmentState?.():null;
 const blockedRoute=!enabled&&personnelRoute,r=blockedRoute||personnel&&!personnelApplication(summary.application)?null:summary.application,pending=r?.status==='pending';
 const next=(personnelRank(summary.rank.nextRankId)||summary.rank.nextRankId===PRINCIPAL_RANK)&&!enabled?null:getChinaOfficialCareerRank(summary.rank.nextRankId),available=careers.promotionAvailability();
 const requirements={serviceDays:3,tenureDays:3,positiveBalance:3,ritual:2,writing:personnel?3:2,...summary.requirements},trialRequired=personnel&&next?.rankId==='cn-records-personnel',dailyPersonnel=personnelRank(summary.rank.rankId),principalRoute=next?.rankId===PRINCIPAL_RANK;
 const requirementText={'service-days-required':`需${requirements.serviceDays}日合格${dailyPersonnel?'朝班、核籍与归档':'朝班与归档'}`,'tenure-days-required':`本任${summary.rank.gradeLabel}需满${requirements.tenureDays}日`,'service-performance-required':`本任考语净值需达${requirements.positiveBalance}`,'ritual-required':`礼仪需${requirements.ritual}级`,'writing-required':`文书需${requirements.writing}级`,'personnel-trial-required':dailyPersonnel?'须有本品已签收并归档的核籍日职原册':reasonText['personnel-trial-required'],'personnel-duty-required':'须完成本品核籍日职并获陆谦签收'};
 const reasons=codes=>(codes||[]).map(c=>requirementText[c]||reasonText[c]||'任职条件暂不可核验').join('；');
 metric('◇ 官品',summary.rank.gradeLabel,summary.rank.title);
 metric('▣ 实任资历',`${summary.qualifiedDays}${next?` / ${requirements.serviceDays}`:''} 合格日`,`${personnel&&next?`本任${summary.rank.gradeLabel}`:'本次任职'} ${summary.tenureDays}日 · 考语净值 ${summary.balance}${next?` / ${requirements.positiveBalance}`:''} · 历任合格 ${summary.lifetimeQualifiedDays}日`);
 metric('↗ 升阶',r?applicationText(r):next?`${summary.rank.gradeLabel} → ${next.gradeLabel}${principalRoute?'刑名主官实职':''}`:`${summary.rank.gradeLabel}路线已完成`,pending?summary.eligible?personnel?'陆谦核荐、领取原荐书、皇帝阅批后，仍须回原登记处宣读':'达标仍须当面考核、领文并宣读':reasons(summary.reasons):next?available.ok?principalRoute?'已具实缺核荐资格 · 授任后完成本职原案日职核俸168文':`${personnel?'已获核荐资格 · 授任后下一':'已获审核资格 · 通过后'}新班${next.basePay}–${next.basePay+2}文`:reasons(available.reasons):'更高官职需新的实职与资历路线');
 if(trialRequired)metric('▤ 核籍试办',summary.trialComplete?'本任原册已签收':'尚未完成','一次真实试办，不另发工资或经验');
 if(personnel&&pending)panel.body.append(make('p',`申请与既定结果保留；遇朝班先去当值，之后继续呈办。等候荐审或皇帝阅批不免除本任${summary.rank.gradeLabel}${dailyPersonnel?'朝班、核籍与归档职责':'朝班'}。`,'career-status-note'));
 // Promotion is a separate transaction, not the current shift's next step.
 const kind=blockedRoute?null:personnel?pending?({submitted:'personnel-promotion-review','document-ready':'personnel-promotion-receive-document','document-held':'personnel-promotion-imperial-review','imperial-approved':'personnel-promotion-appointment'})[r.stage]:available.ok?'personnel-promotion-apply':null:pending?({submitted:'promotion-review','document-ready':'promotion-receive-document','document-held':'promotion-appointment'})[r.stage]:available.ok?'promotion-apply':null;
 if(kind&&!runtime?.loadError&&!runtime?.activity&&!runtime?.waiting){const b=action(role,kind,kind==='promotion-apply'?'向当值礼仪主管申请升正九品':undefined);if(b){b.className='career-current-action ww-airy-action';b.setAttribute('data-career-action','promotion');panel.actions.append(b);}}
 if(personnel&&(runtime?.loadError||runtime?.lastError))panel.body.append(make('p',runtime.loadError?'任命原件暂不可核验，原申请保留，请稍后重试。':['save-failed','async-save-unsupported','persistence-unavailable'].includes(runtime.lastError)?'原完成凭据待保存，尚未进入下一步；请稍后重试。':'本次办理暂未完成；原申请与原件保留。','career-negative'));
 if(personnel&&pending&&(runtime?.activity||runtime?.waiting)){
  const box=make('section',null,'career-requirements');box.setAttribute('data-panel-key','personnel-appointment-runtime');
  const waiting=runtime.waiting||['review-wait','imperial-wait'].includes(runtime.activity),label={review:'陆谦当面核荐','imperial-review':'皇帝当面阅批',appointment:'原登记处宣读'}[runtime.activity],duration={review:4,'imperial-review':4,appointment:3}[runtime.activity];
  if(waiting)box.append(make('p',runtime.activity==='imperial-wait'?'持原荐书在公共听候处等候皇帝 · 等候不计阅批时间。':'等待陆谦本人接待 · 等候不计核荐时间。','career-status-note'));
  else if(runtime.activity==='review-approach')box.append(make('p','前往陆谦本人面前，抵达停步后核荐4秒。','career-status-note'));
  else if(duration){const elapsed=Math.max(0,Math.min(1,Number.isFinite(runtime.progress)?runtime.progress:0))*duration,progress=make('progress');progress.max=duration;progress.value=elapsed;progress.setAttribute('aria-label',`${label}进度`);box.append(progress,make('p',`${label} ${elapsed.toFixed(1)} / ${duration} 秒`,'career-status-note'));}
  const stop=action(role,'personnel-promotion-cancel',waiting?'取消等候 · 保留申请与原件':'停止当前动作 · 保留申请与原件');if(stop){stop.className='career-withdraw';stop.setAttribute('data-career-action','promotion-cancel');box.append(stop);}
  box.append(make('p','停止当前动作不撤回申请，也不重抽已保存的阅批结果。','career-status-note'));panel.body.append(box);
 }
 if(pending||personnel&&next){const detail=make('details',null,'career-card-details');detail.setAttribute('data-panel-key','official-promotion-conditions');detail.append(make('summary','升阶条件与申请'));
  detail.append(make('p',`本任${summary.rank.gradeLabel}至少${requirements.serviceDays}个不同模拟日${dailyPersonnel?'朝会、逐案读据与手动核录、汇总、陆谦核验及本人归档合格':'朝会与归档合格'}，本品实任满${requirements.tenureDays}日、考语净值≥${requirements.positiveBalance}，礼仪${requirements.ritual}级、文书${requirements.writing}级${trialRequired?'，并完成一份陆谦本人签收的核籍试办':''}${principalRoute?'；另须原刑名主官真实离世后的同一可核实空缺，暂时离案、重置或身体不可见均不算空缺':''}。未结班或待薪时先结清。`));
  if(personnel)detail.append(make('p',`陆谦当面核荐4秒并出具原荐书；领取同一原件，亲呈原皇帝阅批4秒。每份申请只保存一次抽签结果，通过后持同一任命文书回原登记处宣读3秒。${principalRoute?'实缺在申请、核荐、领文、皇帝阅批及宣读时逐次核对；授任后承接原刑名主官原案复核及具名归档，本职日俸168文，不再领录事工资。':next?`${next.gradeLabel}新班基础${next.basePay}文，沿用至多2文准备奖；旧班按原约结清。`:''}${dailyPersonnel&&!principalRoute?'升品后仍办理本人核籍原册，不替换六官身份或职责。':''}`));
  if(pending){const cancel=buttonFor('撤回升阶申请',()=>{careers.cancelPromotion(r.id);});cancel.className='career-withdraw';detail.append(cancel);}panel.body.append(detail);
 }
}
export function appendOfficialCareerHistory({careers,panel,make}){
 const ledger=careers.state().officialCareer;if(!ledger?.appointments.length)return;
 const details=make('details',null,'career-card-details career-employment-history');details.append(make('summary','官品与实任履历'));
 for(const a of ledger.appointments){const rows=ledger.service.filter(s=>s.appointmentId===a.id),promotions=ledger.applications.filter(r=>r.appointmentId===a.id),promoted=promotions.findLast(r=>r.status==='approved'),rank=getChinaOfficialCareerRank(promoted?.toRankId||'cn-records-junior');
  details.append(make('p',`本任第${a.tenure.sinceDay+1}日入仕 · ${rank.title} · ${a.endedAt?`第${a.endedAt.day+1}日离任`:'在任'} · ${rank.gradeLabel} · 已记合格 ${rows.filter(r=>r.positive).length}日`));
  for(const r of rows)details.append(make('p',`第${r.day+1}日 · ${getChinaOfficialCareerRank(r.rankId).gradeLabel} · ${r.positive?personnelRank(r.rankId)?'朝班、核籍与归档合格':'朝班与归档合格':'当班未完成'} · 考语 ${r.score>0?'+':''}${r.score} · 核薪${r.wage}文`));
  for(const r of promotions){const target=getChinaOfficialCareerRank(r.toRankId);details.append(make('p',`第${r.day+1}日申请${target?.gradeLabel||'官品待核对'} · ${applicationText(r)}${personnelApplication(r)?`${r.recommendation?' · 陆谦当面核荐通过':''}${r.imperialDecision?` · 皇帝原次阅批${r.imperialDecision.passed?'通过':'未通过'}，结果已保存`:''}`:r.review?` · 当值礼仪主管已当面考核${r.review.passed?'通过':'未通过'}`:''}${r.status==='approved'?` · 第${r.decidedAt.day+1}日宣读生效`:''}`));}
 }
 details.append(make('p','离任保留履历；新任期重新积累升阶资历。'));
 panel.body.append(details);
}

// Read-only context: complete pay grades never create high-office vacancies.
export function appendCourtRankReference({panel,make,policy=null,day=0,granaryAudit=null,personnelProgressionEnabled=false}){
 const personnelRanks=CHINA_RECORDS_CAREER_RANKS.filter(rank=>personnelRank(rank.rankId)),highestPersonnel=personnelRanks.at(-1);
 const details=make('details',null,'career-card-details career-court-ranks');
 details.append(make('summary','朝廷官职与品级俸例'));
 details.append(make('p',personnelProgressionEnabled?`架空朝廷的游戏日俸；品级名称不代表历史官职或俸米换算。玩家仍从九品入仕，当前可玩升阶到${highestPersonnel.gradeLabel}${highestPersonnel.title}；逐阶办理本人核籍职责。正六品资历达标后，仅可在刑名主官真实空缺时，经原核荐、皇帝阅批及宣读接任该实职。`:'架空朝廷的游戏日俸；品级名称不代表历史官职或俸米换算。玩家仍从九品入仕，当前可玩升阶只到正九品，更高实职需后续真实履历和授任。'));
 if(personnelProgressionEnabled){
  const ladder=make('details',null,'career-card-details career-rank-ladder');ladder.setAttribute('data-panel-key','official-player-rank-ladder');ladder.append(make('summary','本岗完整升品路线与条件'));
  ladder.append(make('p','从九品礼务录事入仕，基础18文。每一级只累计本品不同模拟日的真实合格职责；此前品级资历不抵下一级，未结班或待薪须先结清。'));
  for(let index=1;index<CHINA_RECORDS_CAREER_RANKS.length;index++){
   const from=CHINA_RECORDS_CAREER_RANKS[index-1],to=CHINA_RECORDS_CAREER_RANKS[index],q=personnelRequirements(to.rankId)||{serviceDays:3,tenureDays:3,positiveBalance:3,ritual:2,writing:2};
   ladder.append(make('p',`${from.gradeLabel} → ${to.gradeLabel}：本品合格${q.serviceDays}日、实任满${q.tenureDays}日、考语净值≥${q.positiveBalance}，礼仪${q.ritual}级、文书${q.writing}级；新班基础${to.basePay}文＋至多2文准备奖。${to.rankId==='cn-records-personnel'?'另须一份本任核籍试办由陆谦本人签收。':''}`));
  }
  ladder.append(make('p','从九升正九须当值礼仪主管当面审核、领文及宣读；此后每级均由陆谦核荐4秒、领取原荐书、原皇帝阅批4秒、原登记处宣读3秒生效。从八品起须完成本人朝班、逐案读据与手动核录、汇总8秒、陆谦核验4秒、本人归档8秒，才记合格日与按原合同结薪。'));
  const principal=CHINA_JUSTICE_PRINCIPAL_RANK,q=personnelRequirements(principal.rankId);
  ladder.append(make('p',`${highestPersonnel.gradeLabel} → ${principal.gradeLabel}${principal.title}实职：本品合格${q.serviceDays}日、实任满${q.tenureDays}日、考语净值≥${q.positiveBalance}，礼仪${q.ritual}级、文书${q.writing}级；原刑名主官真实离世且实缺可核验，全程同一空缺和原件。授任后转办原案复核与具名归档，按本职核俸168文；录事工作与工资停止。其他主职仍未开放接任。`));details.append(ladder);
 }
 details.append(make('p',policy?day<policy.effectiveDay?`六官新俸例自第${policy.effectiveDay+1}日的新职责生效；当前日和此前未结职责仍按原约。`:'六官新职责按品级俸例计薪；历史已付、待归档和已完成未付职责保原约。':'六官新薪政尚未保存，旧账保留；本页只展示新俸例。'));
 details.append(make('p',`六官须真实完成朝会，再回本人书案归档8秒才入银行；不按离线或闲站时间补薪。玩家录事原18/22文基础与至多2文准备奖保留。${personnelProgressionEnabled?`${personnelRanks.map(rank=>`${rank.gradeLabel}新班基础${rank.basePay}文`).join('；')}，各品沿用至多2文准备奖，均须逐案读据、手动落记、汇总8秒、陆谦核验4秒，再本人归档8秒结薪。`:''}`));
 for(let rank=9;rank>=1;rank--){const junior=CHINA_OFFICIAL_GRADES.find(g=>g.gradeId===`cn-grade-${rank}-junior`),regular=CHINA_OFFICIAL_GRADES.find(g=>g.gradeId===`cn-grade-${rank}-regular`);details.append(make('p',`${junior.gradeLabel} ${CHINA_OFFICIAL_GRADE_PAY_V1[junior.gradeId]}文 · ${regular.gradeLabel} ${CHINA_OFFICIAL_GRADE_PAY_V1[regular.gradeId]}文`));}
 for(const rank of [...CHINA_COURT_OFFICIAL_RANKS].sort((a,b)=>a.gradeOrder-b.gradeOrder)){
  details.append(make('p',`${rank.roleLabel} · ${rank.gradeLabel} · 新俸${rank.currentWage}文：${rank.responsibility}。`));
  const personnel=personnelProgressionEnabled&&rank.actorId==='cn-official-personnel',implemented=personnel?`朝会与本人归档；本人核籍原册逐行验收与正九品至${highestPersonnel.gradeLabel}逐阶实任履历核荐，及刑名主官原实缺核荐，皇帝最终授任`:rank.implemented,remaining=personnel?'其他主职任免及完整人员名册变更':rank.remaining;
  details.append(make('p',`现已接：${implemented}。仍待接：${remaining}。`,'career-status-note'));
 }
 if(granaryAudit?.loadError)details.append(make('p','仓务原俸据暂时无法核验，原记录保留，未作核毕。','career-status-note'));
 const audit=granaryAudit?.batches?.at(-1);
 if(audit){
  const sum=audit.receipts.reduce((total,row)=>total+BigInt(row.amount),0n).toString(),days=[...new Set(audit.receipts.map(row=>row.day+1))].join('、');
  details.append(make('p',`仓务俸据 · ${audit.id.replace('cn-granary-audit-','第')}批：职责日${days}，已入账${audit.receipts.length}份、合${sum}文。${audit.received?'许知远已奏，皇帝已收讫附册':audit.result?'许知远案前核对完成，待实际朝会奏报收讫':'待许知远本人在原案核对'}。`));
  details.append(make('p','仅核已付原俸据；职责日期不是到账日期，迟付凭据另批补核。不改变工资、个人消费或仓储库存。','career-status-note'));
 }
 details.append(make('p','本页列俸例不代表自动空缺；在任六官不被替换，原房床与朝会班位保持。朝会当前仅工务和仓务两人有奏报，其余部门专属实务继续建设。'));
 panel.body.append(details);
}
