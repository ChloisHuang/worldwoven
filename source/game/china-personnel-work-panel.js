import {CHINA_PERSONNEL_WORK_DURATIONS, chinaPersonnelWorkRankId} from './china-personnel-work.js';
import {getChinaRecordsCareerRank} from './china-official-ranks.js';

const CLERK = 'cn-court-clerk';
const archiveText = status => status === 'accepted' ? '已归档' : '尚无已存证归档实据';
const statusText = {draft: '逐案核对中', signed: '陆谦已签收', abandoned: '已中止 · 原册保留'};
const availabilityText = {
  'source-unavailable': '尚无可领取的已存证朝会原据。',
  'no-source': '尚无可领取的已存证朝会原据。',
  'signed-trial-complete': '本任核籍试办已有签收原册。',
  'trial-complete': '本任核籍试办已有签收原册。',
  'unfinished-case': '请继续当前同号原册。',
  'trial-in-progress': '请继续当前同号试办原册。',
  'duty-in-progress': '请继续当前职责日的同号核籍原册。',
  'trial-already-signed': '本任核籍试办已有签收原册。',
  'source-already-claimed': '该朝次原据已领取，请查看已存同号原册。',
  'personnel-court-required': '先完成本人本朝次朝会，再领取该职责日的核籍原册。',
  'not-eligible': '当前任职不开放新的核籍办理；原册仍保留。',
};
const dayText = day => Number.isSafeInteger(day) && day >= 0 ? `第${day + 1}日` : '原职责日待核对';
const sourceText = job => `领取时原据：${dayText(job.source?.day)}朝会 · 截至第${job.source?.throughSerial}笔已存证记录`;
const caseText = (job, history) => {
  const index = history.findIndex(row => row.id === job.id);
  const rank = job.mode === 'duty' ? getChinaRecordsCareerRank(chinaPersonnelWorkRankId(job)) : null;
  return `${index >= 0 ? `第${index + 1}号` : '同号'}${job.mode === 'duty' ? '日职' : '试办'}名册 · ${dayText(job.day)}${rank ? ` · ${rank.gradeLabel}` : ''}`;
};
const signerName = job => job.source?.audience?.actors?.find(actor => actor.actorId === job.receipt?.signerId)?.name || '原签收人';

// Read-only projection of the persisted same-number case. Rendering cannot
// visit an original, fill an answer, compile, review, promote or change pay.
// The adapter still checks every selected physical intent at execution time.
export function appendPersonnelWorkPanel({panel, role, service, make, action, personnelProgressionEnabled = false, duty = null}) {
  const state = service?.personnelState?.() || service?.state?.();
  if (!state?.enabled) return false;
  const history = Array.isArray(state.history) ? state.history.filter(job => ['trial', 'duty'].includes(job.mode)) : [];
  const current = ['trial', 'duty'].includes(state.case?.mode) ? state.case : null;
  const mode = state.mode || current?.mode || 'trial', daily = mode === 'duty';
  if (!(role?.id === CLERK && state.eligible) && !current && !history.length) return false;
  const section = make('section', null, 'career-table-orders');
  section.setAttribute('data-panel-key', daily ? 'personnel-duty' : 'personnel-trial');
  section.append(make('h3', daily ? '核籍日职' : '核籍试办'));
  const currentRank = daily ? getChinaRecordsCareerRank(state.rankId) : null;
  if (currentRank) section.append(make('p', `现任${currentRank.gradeLabel}${currentRank.title}；每册保留原职责日品级，已完成旧阶原册不计为新阶履职。`, 'career-status-note'));
  section.append(make('p', daily ? '本人朝会完成后，逐一到六官原案读据3秒并自行落记，回原案汇总8秒、请陆谦核验4秒，再回本人原案归档8秒，按原职责日合同结薪。核籍不另发一笔工资或经验。' : `试办不发工资或经验，不占普通朝班；${personnelProgressionEnabled ? '本任原册由陆谦本人签收后，可作为申请从八品核籍实职的条件。' : '更高实职的荐审与授任尚未开放。'}`, 'career-status-note'));
  if (daily && current?.mode !== 'trial' && Number.isSafeInteger(state.sourceDay)) section.append(make('p', `本册对应${dayText(state.sourceDay)}原职责；不会因今天重新打开而改成新班。`, 'career-status-note'));
  if (daily && state.deferred) section.append(make('p', `${dayText(state.sourceDay)}原班已保存等候延期；继续同号原册，仍按原职责日合同结薪，不另开新班或补发等候工资。`, 'career-status-note'));
  else if (daily && state.waiting?.savePending) section.append(make('p', '原班延期仍待保存；尚未确认可跨日续办，请稍后重试。', 'career-negative'));
  const appendAction = (root, kind, label) => {
    const button = action(role, kind, label);
    if (!button) return null;
    button.className = kind === 'personnel-cancel' ? 'career-withdraw' : 'ww-airy-action';
    button.setAttribute('data-career-action', 'personnel');
    root.append(button);
    return button;
  };
  if (state.loadError) {
    section.append(make('p', '原据或名册暂不可核验；已存记录保留，请稍后重试。', 'career-negative'));
    panel.body.append(section);
    return true;
  }

  function appendCase(root, job, editable) {
    root.append(make('strong', `${caseText(job, history)} · ${statusText[job.status] || '原册待核对'}`));
    root.append(make('p', sourceText(job), 'career-status-note'));
    root.append(make('p', '后补归档不改本册的领取时原据；尚无实据不表示缺勤。', 'career-status-note'));
    const rows = job.rows || [], read = rows.filter(row => row.visit).length;
    const recorded = rows.filter(row => row.archiveStatus !== null).length;
    root.append(make('p', `读据 ${read}/6 · 落记 ${recorded}/6 · ${job.compiled ? '已汇总' : '待汇总'}`));
    const review = job.reviews?.at(-1);
    if (review?.rejectedRows?.length) root.append(make('p', '陆谦退回了具体行；已读原据与其余落记保留，改记后须重新汇总交验。', 'career-status-note'));
    const roster = make('details', null, 'career-card-details');
    roster.setAttribute('data-panel-key', `personnel-roster-${history.findIndex(row => row.id === job.id)}`);
    roster.append(make('summary', '六官原案与逐行落记'));
    for (const [index, row] of rows.entries()) {
      const actor = job.source?.audience?.actors?.find(item => item.actorId === row.actorId);
      const entry = make('section', null, 'career-requirements');
      entry.setAttribute('data-panel-key', `personnel-row-${index}`);
      entry.append(make('strong', `${actor?.name || '原名册官员'} · ${actor?.roleLabel || '原职'} · ${actor?.gradeLabel || '原品级待核对'}`));
      if (!row.visit) {
        entry.append(make('p', '尚未实际读据 · 须到本人原案停步核对3秒。', 'career-status-note'));
        if (editable) appendAction(entry, `personnel-read:${row.actorId}`, `前往${actor?.name || '本人'}原案读据`);
      } else {
        const original = job.source?.archives?.find(item => item.actorId === row.actorId);
        entry.append(make('p', `领取时原据：${archiveText(original ? 'accepted' : 'awaiting')}`));
        entry.append(make('p', original ? `${dayText(original.day)} · 本人原案归档已存证` : '仅按领取时存证范围落记，之后补存不改变本册答案。', 'career-status-note'));
        entry.append(make('p', row.archiveStatus === null ? '你的落记：尚未选择' : `你的落记：${archiveText(row.archiveStatus)}`));
        if (editable) {
          const choices = make('div', null, 'career-actions');
          for (const [answer, label] of [['accepted', '记为已归档'], ['awaiting', '记为尚无实据']]) {
            const button = appendAction(choices, `personnel-record:${row.actorId}:${answer}`, label);
            if (button) button.setAttribute('aria-pressed', String(row.archiveStatus === answer));
          }
          entry.append(choices);
        }
        // Only saved review feedback calls a choice wrong. Source visibility
        // after a physical read is not an automatic answer or hidden grading.
        if (review?.rejectedRows?.some(item => item.actorId === row.actorId)) {
          const reviewedAnswer = review.answers?.[index];
          entry.append(make('p', row.archiveStatus !== reviewedAnswer ? '本行已改记，待重新汇总交验。' :
            `陆谦退改：你记为${archiveText(reviewedAnswer)}；领取时原据为${archiveText(original ? 'accepted' : 'awaiting')}。`,
          row.archiveStatus !== reviewedAnswer ? 'career-status-note' : 'career-negative'));
        }
      }
      roster.append(entry);
    }
    root.append(roster);
    if (job.status === 'signed' && job.receipt) root.append(make('p', `${signerName(job)}本人已签收 · ${dayText(job.receipt.sourceDay)}同号原据 · 领取时截至第${job.source.throughSerial}笔存证记录。`, 'career-positive'));
    if (job.status === 'abandoned') root.append(make('p', '本册已中止，原据与已做进度保留，未取得签收回执。', 'career-status-note'));
  }

  if (current) appendCase(section, current, current.status === 'draft');
  const settled = current?.mode === 'duty' && duty?.day === current.day && duty.officialTenureId === current.officialTenureId &&
    duty.officialRankId === chinaPersonnelWorkRankId(current) && ['ready', 'paid'].includes(duty.stage);
  if (settled) section.append(make('p', duty.stage === 'paid' ? '该原班已结薪；历史原册保留，不重复发薪。' : '该原班已完成本人归档，工资待入账。', 'career-status-note'));
  else if (!current || current.status !== 'draft') section.append(make('p', availabilityText[state.availability?.code] || (state.availability?.ok ? daily ? '可领取本人本朝次核籍原册。' : '先领取一份朝会原据，再逐案核对。' : '已存核籍原册保留。'), 'career-status-note'));
  if (current?.mode === 'duty' && current.status === 'signed' && !settled) section.append(make('p', '本册已签收；原班须完成本人原案归档8秒方可结薪，已结原班不会重复发薪。签收原册不另发工资。', 'career-status-note'));
  if (state.lastError) section.append(make('p', ['save-failed', 'async-save-unsupported', 'persistence-unavailable'].includes(state.lastError) ? '本次进度仍待保存；原册保留，请稍后重试。' : '本次办理暂未完成，请按原册继续核对。', 'career-negative'));

  if (state.activity) {
    const kind = {read: 'visit', compile: 'compile', review: 'review'}[state.activity];
    if (kind) {
      const duration = CHINA_PERSONNEL_WORK_DURATIONS[kind];
      const seconds = Math.max(0, Math.min(1, Number.isFinite(state.progress) ? state.progress : 0)) * duration;
      const label = {visit: '原案读据', compile: '本人原案汇总', review: '陆谦本人核验'}[kind];
      const progress = make('progress');
      progress.max = duration;
      progress.value = seconds;
      progress.setAttribute('aria-label', `${label}进度`);
      section.append(progress, make('p', `${label} ${seconds.toFixed(1)} / ${duration} 秒`, 'career-status-note'));
    } else if (state.activity === 'review-wait' || state.waiting) section.append(make('p', '等待陆谦本人接待 · 等候不计核验时间。', 'career-status-note'));
    else if (state.activity === 'review-approach') section.append(make('p', '前往陆谦本人面前，抵达停步后核验4秒。', 'career-status-note'));
  } else if (state.waiting) section.append(make('p', '等待陆谦本人接待 · 等候不计核验时间。', 'career-status-note'));

  const controls = make('div', null, 'career-actions');
  if (state.eligible && state.availability?.ok && current?.status !== 'draft') appendAction(controls, 'personnel-claim', daily ? '领取本人本朝次核籍原册' : '领取核籍试办原册');
  if (current?.status === 'draft') {
    if (current.rows.every(row => row.visit && row.archiveStatus !== null) && !current.compiled) appendAction(controls, 'personnel-compile', '回本人原案汇总 · 8秒');
    if (current.compiled) appendAction(controls, 'personnel-review', '请陆谦本人核验 · 4秒');
  }
  if (state.activity || state.waiting) {
    if (appendAction(controls, 'personnel-cancel', state.waiting || state.activity === 'review-wait' ? '取消等候 · 保留原册' : '停止当前动作 · 保留原册')) section.append(make('p', '停止仅取消当前动作，已读原据和落记继续保留。', 'career-status-note'));
  }
  if (controls.children.length) section.append(controls);
  const older = history.filter(job => job.id !== current?.id);
  if (older.length) {
    const details = make('details', null, 'career-card-details career-employment-history');
    details.setAttribute('data-panel-key', 'personnel-trial-history');
    details.append(make('summary', history.some(job => job.mode === 'duty') ? '已存核籍原册' : '已存试办原册'));
    for (const job of older) {
      const record = make('details', null, 'career-card-details');
      record.setAttribute('data-panel-key', `personnel-history-${history.indexOf(job)}`);
      record.append(make('summary', `${caseText(job, history)} · ${statusText[job.status] || '原册待核对'}`));
      appendCase(record, job, false);
      details.append(record);
    }
    section.append(details);
  }
  panel.body.append(section);
  return true;
}
