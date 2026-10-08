// Simulated DOM against real saved personnel cases. Guards against exposing
// answers before an actual read, auto-filling rows, losing frozen provenance,
// and letting the optional trial replace ordinary work/promotion controls.
import assert from 'node:assert/strict';
import {appendPersonnelWorkPanel} from '../source/game/china-personnel-work-panel.js';
import {createChinaPersonnelRecords, CHINA_PERSONNEL_OFFICIALS_V1 as OFFICIALS} from '../source/game/china-personnel-records.js';
import {createChinaPersonnelWork, CHINA_PERSONNEL_COMPILE_POINT, CHINA_PERSONNEL_REVIEWER} from '../source/game/china-personnel-work.js';

const DAY = 10, TENURE = 'cn-records-tenure:panel', CLERK = {id: 'cn-court-clerk'};
const copy = value => structuredClone(value);
const element = tag => ({tag, children: [], attributes: {}, textContent: '', className: '',
  setAttribute(key, value) { this.attributes[key] = value; }, append(...items) { this.children.push(...items); }});
const make = (tag, text, className) => Object.assign(element(tag), {textContent: text || '', className: className || ''});
const all = root => [root, ...root.children.flatMap(all)];
const text = root => all(root).map(node => node.textContent).join('\n');
const buttons = root => all(root).filter(node => node.tag === 'button');
const find = (root, key) => all(root).find(node => node.attributes['data-panel-key'] === key);
const ids = OFFICIALS.map(actor => actor.actorId);

function fixture({mode = 'trial', progression = false} = {}) {
  const actors = new Map(OFFICIALS.map(actor => [actor.actorId, {actorId: actor.actorId, alive: true, position: [...actor.office]}]));
  const ledger = createChinaPersonnelRecords({resolveActor: id => actors.get(id), saveState: () => true});
  assert(ledger.witnessCourt({id: `cn-morning-audience:${DAY}`, day: DAY, actorIds: ids}).ok);
  const archive = index => ledger.witnessArchive({id: `cn-official-archive:${ids[index]}:${DAY}`, actorId: ids[index], day: DAY,
    audienceId: `cn-morning-audience:${DAY}`, position: [...OFFICIALS[index].office], elapsed: 8, duration: 8});
  assert(archive(0).ok); assert(archive(3).ok);
  const reviewer = {actorId: CHINA_PERSONNEL_REVIEWER, bodyId: 'original-lu-body', alive: true, position: [19.3, 3.915, 32.15]};
  const options = {sourceFor: (day, serial) => ledger.sourceFor(day, serial),
    readAppointment: () => ({actorId: 'player', tenureId: TENURE, rankId: mode === 'duty' ? 'cn-records-personnel' : 'cn-records-regular'}),
    validateEligibility: request => request.officialTenureId === TENURE, resolveActor: () => reviewer, saveState: () => true};
  const work = createChinaPersonnelWork(options);
  const f = {ledger, work, options, archive, stateChanges: {}, dispatches: [], renderedKinds: []};
  f.current = () => f.work.current() || f.work.snapshot().cases.at(-1);
  f.claim = () => f.work.claim({day: DAY, mode, officialTenureId: TENURE});
  f.visit = index => f.work.visit({caseId: f.current().id, actorId: ids[index], proof: {caseId: f.current().id,
    actorId: 'player', targetId: ids[index], position: [...OFFICIALS[index].office], standing: true, clear: true, elapsed: 3, duration: 3}});
  f.record = (index, archiveStatus) => f.work.record({caseId: f.current().id, actorId: ids[index], archiveStatus});
  f.compile = () => f.work.compile({caseId: f.current().id, proof: {caseId: f.current().id, actorId: 'player',
    targetId: 'cn-court-career-desk', position: [...CHINA_PERSONNEL_COMPILE_POINT], standing: true, clear: true,
    elapsed: 8, duration: 8, revision: f.current().revision}});
  f.review = () => f.work.review({caseId: f.current().id, proof: {caseId: f.current().id, actorId: 'player',
    targetId: CHINA_PERSONNEL_REVIEWER, position: [...reviewer.position], standing: true, clear: true,
    elapsed: 4, duration: 4, revision: f.current().revision, recipientPosition: [...reviewer.position],
    recipientBodyId: reviewer.bodyId, recipientAlive: true}});
  f.service = {
    state: () => ({enabled: true, eligible: true, mode, sourceDay: DAY, availability: {ok: !f.current()}, case: f.current() || null,
      history: f.work.snapshot().cases, activity: null, progress: 0, waiting: null, ...f.stateChanges}),
    intent(kind) {
      const state = this.state(), job = state.case;
      if (!state.enabled || state.loadError) return null;
      if (kind === 'personnel-cancel') return state.activity || state.waiting ? {kind} : null;
      if (kind === 'personnel-view') return {kind};
      if (!state.eligible) return null;
      if (kind === 'personnel-claim') return state.availability?.ok && job?.status !== 'draft' ? {kind} : null;
      if (!job || job.status !== 'draft') return null;
      if (kind.startsWith('personnel-read:')) return job.rows.find(row => row.actorId === kind.slice('personnel-read:'.length))?.visit ? null : {kind};
      if (kind.startsWith('personnel-record:')) return job.rows.find(row => kind.startsWith(`personnel-record:${row.actorId}:`))?.visit ? {kind} : null;
      if (kind === 'personnel-compile') return job.rows.every(row => row.visit && row.archiveStatus) && !job.compiled ? {kind} : null;
      if (kind === 'personnel-review') return job.compiled ? {kind} : null;
      return null;
    },
  };
  f.render = ({role = CLERK, wrapper = false, duty = null} = {}) => {
    f.renderedKinds = [];
    const panel = {body: element('div'), actions: element('footer')};
    const ordinary = make('button', '原朝班报到'), promotion = make('button', '原首阶升阶');
    panel.actions.append(ordinary, promotion);
    const before = copy(f.work.snapshot());
    const service = wrapper ? {state: () => ({job: {stage: 'working'}}), personnelState: () => f.service.state()} : f.service;
    const shown = appendPersonnelWorkPanel({panel, role, service, make, duty, personnelProgressionEnabled: progression, action: (role, kind, label) => {
      f.renderedKinds.push(kind);
      const intent = f.service.intent(kind); if (!intent) return null;
      const button = make('button', label); button.onclick = () => f.dispatches.push({role, kind}); return button;
    }});
    assert.deepEqual(f.work.snapshot(), before, 'render never changes reads, answers, receipts or eligibility');
    assert.deepEqual(panel.actions.children, [ordinary, promotion], 'optional trial never replaces ordinary controls');
    return {...panel, shown};
  };
  return f;
}

// Feature off, other jobs and original junior rank have no new entry. The
// wrapper must keep the original court's state while exposing the trial view.
{
  const f = fixture();
  f.stateChanges.enabled = false; assert.equal(f.render().shown, false);
  f.stateChanges = {eligible: false}; assert.equal(f.render().shown, false);
  f.stateChanges = {}; assert.equal(f.render({role: {id: 'cn-tavern-chef'}}).shown, false);
  const view = f.render({wrapper: true}); assert(view.shown);
  assert(text(view.body).includes('试办不发工资或经验，不占普通朝班'));
  assert(text(view.body).includes('荐审与授任尚未开放'));
  const claim = buttons(view.body).find(button => button.textContent === '领取核籍试办原册'); assert(claim);
  claim.onclick(); assert.equal(f.dispatches.at(-1).kind, 'personnel-claim');
  assert.equal(f.work.current(), null, 'UI dispatch is not a fabricated claim');
  assert(!f.renderedKinds.some(kind => kind.startsWith('promotion-')));
  assert(!text(view.body).includes('26文'));
}

// Frozen names/grades and six unread physical choices, with no source answer
// or answer buttons until the player has actually completed that same read.
{
  const f = fixture(); assert(f.claim().ok);
  const view = f.render(), content = text(view.body);
  assert(content.includes('第1号试办名册 · 第11日'));
  assert(content.includes('领取时原据：第11日朝会 · 截至第3笔已存证记录'));
  assert.equal(buttons(view.body).filter(button => button.textContent.endsWith('原案读据')).length, 6);
  assert(!f.renderedKinds.some(kind => kind.startsWith('personnel-record:')));
  assert(!f.renderedKinds.includes('personnel-compile'));
  assert(!content.includes('领取时原据：已归档'));
  for (const actor of OFFICIALS) assert(content.includes(`${actor.name} · ${actor.roleLabel} · ${actor.gradeLabel}`));
  assert(!/cn-|throughSerial|archiveStatus|original-lu-body/.test(content), 'internal identifiers stay out of visible copy');
  assert(!all(view.body).some(node => ['dialog', 'nav'].includes(node.tag)), 'one compact existing-page section');
  buttons(view.body)[1].onclick(); assert.equal(f.dispatches.at(-1).kind, `personnel-read:${ids[1]}`);
  assert.equal(f.work.current().rows[1].visit, null);
  assert(f.visit(1).ok);
  let after = f.render();
  assert(text(find(after.body, 'personnel-row-1')).includes('领取时原据：尚无已存证归档实据'));
  assert(text(find(after.body, 'personnel-row-1')).includes('你的落记：尚未选择'));
  assert.equal(buttons(find(after.body, 'personnel-row-1')).length, 2);
  assert.equal(f.current().rows[1].archiveStatus, null);
  // A later committed archive is not substituted for the exact claim boundary.
  assert(f.archive(1).ok); after = f.render();
  assert(text(find(after.body, 'personnel-row-1')).includes('领取时原据：尚无已存证归档实据'));
  assert(text(after.body).includes('截至第3笔已存证记录'));
  assert(!text(after.body).includes('截至第4笔'));
  const accepted = buttons(find(after.body, 'personnel-row-1')).find(button => button.textContent === '记为已归档');
  accepted.onclick(); assert.equal(f.dispatches.at(-1).kind, `personnel-record:${ids[1]}:accepted`);
  assert.equal(f.current().rows[1].archiveStatus, null);
  assert(f.record(1, 'accepted').ok);
  const wrong = f.render();
  assert(text(find(wrong.body, 'personnel-row-1')).includes('你的落记：已归档'));
  assert(!text(wrong.body).includes('陆谦退改'), 'choosing a wrong answer is not pre-review feedback');
  assert(!all(wrong.body).some(node => node.className === 'career-negative'));
  assert.equal(buttons(find(wrong.body, 'personnel-row-1'))[0].attributes['aria-pressed'], 'true');
}

// Saved review feedback names only the rejected row; corrections keep all
// prior physical reads and require a fresh compile instead of a grant action.
{
  const f = fixture(); assert(f.claim().ok);
  for (let index = 0; index < 6; index++) {
    assert(f.visit(index).ok);
    assert(f.record(index, [0, 1, 3].includes(index) ? 'accepted' : 'awaiting').ok);
  }
  let view = f.render(); assert(f.renderedKinds.includes('personnel-compile')); assert(!f.renderedKinds.includes('personnel-review'));
  assert(text(find(view.body, 'personnel-row-0')).includes('第11日 · 本人原案归档已存证'));
  assert(f.compile().ok); f.render(); assert(f.renderedKinds.includes('personnel-review')); assert(!f.renderedKinds.includes('personnel-compile'));
  assert.equal(f.review().code, 'roster-rejected'); view = f.render();
  assert(text(find(view.body, 'personnel-row-1')).includes('陆谦退改：你记为已归档；领取时原据为尚无已存证归档实据'));
  assert(!text(find(view.body, 'personnel-row-0')).includes('陆谦退改'));
  const visits = copy(f.current().rows.map(row => row.visit));
  assert(f.record(1, 'awaiting').ok); view = f.render();
  assert.deepEqual(f.current().rows.map(row => row.visit), visits);
  assert(text(find(view.body, 'personnel-row-1')).includes('本行已改记，待重新汇总交验'));
  assert(!text(find(view.body, 'personnel-row-1')).includes('陆谦退改：'));
  assert(f.renderedKinds.includes('personnel-compile')); assert(!f.renderedKinds.includes('personnel-review'));
  assert(f.compile().ok); assert(f.review().ok); view = f.render();
  assert(text(view.body).includes('陆谦本人已签收 · 第11日同号原据 · 领取时截至第3笔存证记录'));
  assert.equal(buttons(view.body).length, 0, 'signed case offers no new wage, rank, replay or editing buttons');
  assert.equal(f.current().receipt.sourceDay, DAY);
  assert.equal(f.current().receipt.signerId, CHINA_PERSONNEL_REVIEWER);
  const saved = f.work.snapshot();
  f.work = createChinaPersonnelWork({...f.options, readAppointment: () => null, saved});
  assert.equal(f.work.loadError, null); f.stateChanges = {eligible: false};
  const restored = f.render();
  assert.equal(text(restored.body), text(view.body), 'cold historical receipt retains the original signature and boundary');
  f.stateChanges.case = null;
  const history = f.render({role: {id: 'cn-tavern-chef'}});
  assert(text(history.body).includes('已存试办原册'));
  assert(text(history.body).includes('陆谦本人已签收'));
  assert.equal(buttons(history.body).length, 0);
}

// Actual action progress uses 3/8/4 seconds, not a fake eligibility timer.
// Cancelling a queued review only dispatches the cancellable physical intent.
{
  const f = fixture(); assert(f.claim().ok);
  for (const [activity, expected] of [['read', '原案读据 1.5 / 3 秒'], ['compile', '本人原案汇总 4.0 / 8 秒'], ['review', '陆谦本人核验 2.0 / 4 秒']]) {
    f.stateChanges = {activity, progress: .5}; const view = f.render();
    assert(text(view.body).includes(expected));
    assert.equal(all(view.body).filter(node => node.tag === 'progress').length, 1);
  }
  f.stateChanges = {activity: 'review-wait', progress: .8, waiting: {actorId: CHINA_PERSONNEL_REVIEWER, bodyId: 'original-lu-body', caseId: f.current().id}};
  const view = f.render(); assert(text(view.body).includes('等待陆谦本人接待 · 等候不计核验时间'));
  assert(!all(view.body).some(node => node.tag === 'progress'));
  const cancel = buttons(view.body).find(button => button.textContent === '取消等候 · 保留原册'); assert(cancel);
  const before = copy(f.work.snapshot()); cancel.onclick();
  assert.equal(f.dispatches.at(-1).kind, 'personnel-cancel'); assert.deepEqual(f.work.snapshot(), before);
  f.stateChanges = {activity: 'review-approach'};
  assert(text(f.render().body).includes('抵达停步后核验4秒'));
  f.stateChanges = {loadError: 'source-mismatch'};
  const unavailable = f.render(); assert(text(unavailable.body).includes('原据或名册暂不可核验'));
  assert.equal(buttons(unavailable.body).length, 0);
  assert(!text(unavailable.body).includes('领取时原据：'), 'unverified source is not presented as an authentic receipt');
}

{
  const f = fixture(); assert(f.claim().ok); assert(f.visit(0).ok);
  assert(f.work.abandon({caseId: f.current().id}).ok);
  f.stateChanges = {case: null, eligible: false};
  const view = f.render();
  assert(text(view.body).includes('已中止 · 原册保留'));
  assert(text(view.body).includes('未取得签收回执'));
  assert(text(view.body).includes('读据 1/6 · 落记 0/6'));
  assert.equal(buttons(view.body).length, 0);
}

console.log('PASS compact trial panel with real frozen cases, six physical-read gates, manual answers, saved row corrections, 3/8/4 progress, cancel intent, no wage/promotion changes, and signed/abandoned reload history; simulated DOM, not browser/iOS');

// The same physical/manual workflow also serves paid day duties. Current-day
// availability must allow a new case even while yesterday's signed case is
// shown, and saved deferral must remain separate from an unsaved wait request.
{
  const f = fixture({mode: 'duty', progression: true});
  let view = f.render({wrapper: true});
  assert(text(view.body).includes('核籍日职'));
  assert(text(view.body).includes('按原职责日合同结薪'));
  assert(text(view.body).includes('核籍不另发一笔工资或经验'));
  assert.equal(buttons(view.body)[0].textContent, '领取本人本朝次核籍原册');
  assert(f.claim().ok);
  view = f.render();
  assert(text(view.body).includes('第1号日职名册 · 第11日'));
  assert.equal(buttons(view.body).filter(button => button.textContent.endsWith('原案读据')).length, 6);
  assert(!f.renderedKinds.some(kind => kind.startsWith('personnel-record:')));
  for (let index = 0; index < 6; index++) {
    assert(f.visit(index).ok); assert(f.record(index, [0, 3].includes(index) ? 'accepted' : 'awaiting').ok);
  }
  assert(f.compile().ok);
  f.stateChanges = {activity: 'review-wait', deferred: true, waiting: {deferred: true}};
  view = f.render();
  assert(text(view.body).includes('第11日原班已保存等候延期'));
  assert(text(view.body).includes('不另开新班或补发等候工资'));
  assert(text(view.body).includes('等待陆谦本人接待'));
  assert(!all(view.body).some(node => node.tag === 'progress'));
  f.stateChanges = {activity: 'review-wait', waiting: {savePending: true}};
  view = f.render();
  assert(text(view.body).includes('延期仍待保存'));
  assert(!text(view.body).includes('已保存等候延期'));
  f.stateChanges = {};
  assert(f.review().ok);
  view = f.render();
  assert(text(view.body).includes('本册已签收'));
  assert(text(view.body).includes('本人原案归档8秒'));
  assert.equal(buttons(view.body).length, 0);
  for (const stage of ['ready', 'paid']) {
    const settled = f.render({duty: {day: DAY, stage}});
    assert(text(settled.body).includes(stage === 'paid' ? '该原班已结薪' : '已完成本人归档，工资待入账'));
    assert(!text(settled.body).includes('先完成本人本朝次朝会'));
    assert(!text(settled.body).includes('本册已签收；原班须完成'));
  }
  f.stateChanges = {availability: {ok: false, code: 'personnel-court-required'}};
  assert(text(f.render().body).includes('先完成本人本朝次朝会'));
  f.stateChanges = {availability: {ok: true}};
  view = f.render();
  assert(buttons(view.body).some(button => button.textContent === '领取本人本朝次核籍原册'), 'signed historical case does not hide a genuinely available new duty claim');
  f.stateChanges = {case: null, eligible: false};
  view = f.render();
  assert(text(view.body).includes('已存核籍原册'));
  assert(text(view.body).includes('日职名册'));
  assert.equal(buttons(view.body).length, 0);
}
{
  const f = fixture({progression: true});
  const view = f.render();
  assert(text(view.body).includes('可作为申请从八品核籍实职的条件'));
  assert(!text(view.body).includes('荐审与授任尚未开放'));
  assert(!f.renderedKinds.some(kind => kind.startsWith('personnel-promotion-')));
}
console.log('PASS paid duty panel shares six manual-read gates, retains old-duty date/contract and honest saved versus pending deferral, requires original archive after signature, and permits an available next-day claim; optional trial remains unpaid');
