import {getChinaRecordsCareerRank,CHINA_OFFICIAL_GRADES,CHINA_OFFICIAL_GRADE_PAY_V1,CHINA_COURT_OFFICIAL_RANKS} from './china-official-ranks.js';
const stageText={submitted:'待当值礼仪主管当面考核','document-ready':'考核通过 · 待领文','document-held':'文书在手 · 待宣读',approved:'授任已生效','promotion-review-rejected':'当面考核未通过',withdrawn:'已撤回','appointment-ended':'离任终止申请'};
const reasonText={'service-days-required':'需3日合格朝班与归档','tenure-days-required':'本次任职需满3日','service-performance-required':'本任考语净值需达3','promotion-duty-unsettled':'先完成本班并结清工资','promotion-applied-today':'今日已申请 · 次日可再试','ritual-required':'礼仪需2级','writing-required':'文书需2级','promotion-route-complete':'更高实职路线尚未开放'};
export function appendOfficialPromotionPanel({careers,role,panel,metric,make,action,buttonFor}){
 const summary=careers.promotionSummary?.();if(!summary?.rank)return;
 const pending=summary.application?.status==='pending',available=careers.promotionAvailability(),r=summary.application,next=getChinaRecordsCareerRank(summary.rank.nextRankId);
 metric('◇ 官品',summary.rank.gradeLabel,summary.rank.title);
 metric('▣ 实任资历',`${summary.qualifiedDays} / 3 合格日`,`本次任职 ${summary.tenureDays}日 · 考语净值 ${summary.balance} / 3 · 历任合格 ${summary.lifetimeQualifiedDays}日`);
 metric('↗ 升阶',r?stageText[r.code]||stageText[r.stage]||r.code:next?`${summary.rank.gradeLabel} → ${next.gradeLabel}`:'正九品路线已完成',pending?summary.eligible?'达标仍须当面考核、领文并宣读':summary.reasons.map(c=>reasonText[c]||c).join('；'):next?available.ok?'已获审核资格 · 通过后新班22–24文':available.reasons.map(c=>reasonText[c]||c).join('；'):'更高官职需新的实职与资历路线');
 // Promotion is a separate transaction, not the current shift's next step.
 const kind=pending?({submitted:'promotion-review','document-ready':'promotion-receive-document','document-held':'promotion-appointment'})[r.stage]:available.ok?'promotion-apply':null;
 if(kind){const b=action(role,kind,kind==='promotion-apply'?'向当值礼仪主管申请升正九品':undefined);if(b){b.className='career-current-action ww-airy-action';b.setAttribute('data-career-action','promotion');panel.actions.append(b);}}
 if(pending){const detail=make('details',null,'career-card-details');detail.append(make('summary','升阶条件与申请'));
  detail.append(make('p','本任从九品至少3个不同模拟日朝会与归档合格，实任满3日、考语净值≥3，礼仪/文书各2级。未结班或待薪时先结清。'));
  const cancel=buttonFor('撤回升阶申请',()=>{careers.cancelPromotion(r.id);});cancel.className='career-withdraw';detail.append(cancel);panel.body.append(detail);
 }
}
export function appendOfficialCareerHistory({careers,panel,make}){
 const ledger=careers.state().officialCareer;if(!ledger?.appointments.length)return;
 const details=make('details',null,'career-card-details career-employment-history');details.append(make('summary','官品与实任履历'));
 for(const a of ledger.appointments){const rows=ledger.service.filter(s=>s.appointmentId===a.id),promotions=ledger.applications.filter(r=>r.appointmentId===a.id),promoted=promotions.find(r=>r.status==='approved');
  details.append(make('p',`第${a.tenure.sinceDay+1}日起 · 礼务录事 · ${a.endedAt?`第${a.endedAt.day+1}日离任`:'在任'} · ${promoted?'正九品':'从九品'} · 已记合格 ${rows.filter(r=>r.positive).length}日`));
  for(const r of rows)details.append(make('p',`第${r.day+1}日 · ${getChinaRecordsCareerRank(r.rankId).gradeLabel} · ${r.positive?'朝班与归档合格':'当班未完成'} · 考语 ${r.score>0?'+':''}${r.score} · 核薪${r.wage}文`));
  for(const r of promotions)details.append(make('p',`第${r.day+1}日申请正九品 · ${stageText[r.code]||stageText[r.stage]||r.code}${r.review?` · 当值礼仪主管已当面考核${r.review.passed?'通过':'未通过'}`:''}${r.status==='approved'?` · 第${r.decidedAt.day+1}日宣读生效`:''}`));
 }
 details.append(make('p','离任保留履历；新任期重新积累升阶资历。'));
 panel.body.append(details);
}

// Read-only context: complete pay grades never create high-office vacancies.
export function appendCourtRankReference({panel,make,policy=null,day=0,granaryAudit=null}){
 const details=make('details',null,'career-card-details career-court-ranks');
 details.append(make('summary','朝廷官职与品级俸例'));
 details.append(make('p','架空朝廷的游戏日俸；品级名称不代表历史官职或俸米换算。玩家仍从九品入仕，当前可玩升阶只到正九品，更高实职需后续真实履历和授任。'));
 details.append(make('p',policy?day<policy.effectiveDay?`六官新俸例自第${policy.effectiveDay+1}日的新职责生效；当前日和此前未结职责仍按原约。`:'六官新职责按品级俸例计薪；历史已付、待归档和已完成未付职责保原约。':'六官新薪政尚未保存，旧账保留；本页只展示新俸例。'));
 details.append(make('p','六官须真实完成朝会，再回本人书案归档8秒才入银行；不按离线或闲站时间补薪。玩家录事原18/22文基础与至多2文准备奖保留。'));
 for(let rank=9;rank>=1;rank--){const junior=CHINA_OFFICIAL_GRADES.find(g=>g.gradeId===`cn-grade-${rank}-junior`),regular=CHINA_OFFICIAL_GRADES.find(g=>g.gradeId===`cn-grade-${rank}-regular`);details.append(make('p',`${junior.gradeLabel} ${CHINA_OFFICIAL_GRADE_PAY_V1[junior.gradeId]}文 · ${regular.gradeLabel} ${CHINA_OFFICIAL_GRADE_PAY_V1[regular.gradeId]}文`));}
 for(const rank of [...CHINA_COURT_OFFICIAL_RANKS].sort((a,b)=>a.gradeOrder-b.gradeOrder)){
  details.append(make('p',`${rank.roleLabel} · ${rank.gradeLabel} · 新俸${rank.currentWage}文：${rank.responsibility}。`));
  details.append(make('p',`现已接：${rank.implemented}。仍待接：${rank.remaining}。`,'career-status-note'));
 }
 if(granaryAudit?.loadError)details.append(make('p','仓务原俸据暂时无法核验，原记录保留，未作核毕。','career-status-note'));
 const audit=granaryAudit?.batches?.at(-1);
 if(audit){
  const sum=audit.receipts.reduce((total,row)=>total+BigInt(row.amount),0n).toString(),days=[...new Set(audit.receipts.map(row=>row.day+1))].join('、');
  details.append(make('p',`仓务俸据 · ${audit.id.replace('cn-granary-audit-','第')}批：职责日${days}，已入账${audit.receipts.length}份、合${sum}文。${audit.received?'许知远已奏，皇帝已收讫附册':audit.result?'许知远案前核对完成，待实际朝会奏报收讫':'待许知远本人在原案核对'}。`));
  details.append(make('p','仅核已付原俸据；职责日期不是到账日期，迟付凭据另批补核。不改变工资、个人消费或仓储库存。','career-status-note'));
 }
 details.append(make('p','本页不是招聘名额；六人身份、原房床与朝会班位保持。朝会当前仅工务和仓务两人有奏报，其余部门专属实务继续建设。'));
 panel.body.append(details);
}
