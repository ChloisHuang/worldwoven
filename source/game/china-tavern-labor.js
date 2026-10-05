import {TAVERN_STEWARD_ROLE} from './formal-careers.js';
import {createFormalLaborContract} from './formal-labor-contract.js';
import {TAVERN_HELPER_ROLE} from './china-tavern-employment.js';
import {settleTemporaryWage} from './temporary-work-payroll.js';
// One real, repeatable house job: wipe both existing dining tables and return to
// Xu An for 12 fictional copper. This module never moves the player or NPCs.
const VERSION = 2, WAGE = 12, SECONDS = 5, FLOOR = .215;
const copy = value => JSON.parse(JSON.stringify(value));
const HOST = {id: 'cn-tavern-labor-host', name: '向许安接活或领工钱', position: [22.35, FLOOR, 11.7]};
const TABLES = [
  {id: 'cn-tavern-labor-west', name: '西窗餐桌 · 靠过道一侧', position: [19.3, FLOOR, 18.1], playerWorkTarget: [18.825, 1.19, 18.1]},
  {id: 'cn-tavern-labor-east', name: '东窗餐桌 · 靠过道一侧', position: [22.7, FLOOR, 18.1], playerWorkTarget: [23.175, 1.19, 18.1]},
];
const near = (position, point, radius = .2) => !!position &&
  Math.hypot(position.x - point[0], position.z - point[2]) <= radius && Math.abs(position.y - point[1]) <= .2;
const integer = n => Number.isSafeInteger(n) && n >= 0;
const empty = () => ({version: VERSION, serial: 0, job: null});

function restore(saved) {
  if (saved == null || (typeof saved === 'object' && !Array.isArray(saved) && !Object.keys(saved).length)) return empty();
  if (!saved || Array.isArray(saved) || ![1, VERSION].includes(saved.version) || !integer(saved.serial)) throw Error('invalid-saved-state');
  const job = saved.job;
  if (job != null && (!job || typeof job !== 'object' || job.id !== `cn-tavern-labor-${saved.serial}` ||
    job.receiptId !== job.id || (job.formalRoleId != null && (saved.version!==2||job.formalRoleId!==TAVERN_STEWARD_ROLE.id)) || saved.serial < 1 || !['working', 'ready'].includes(job.stage) ||
    !integer(job.completedTables) || (job.stage === 'ready' ? job.completedTables !== 2 : job.completedTables > 1) ||
    (job.settlementDay != null && (!integer(job.settlementDay) || job.stage !== 'ready' || job.formalRoleId)))) throw Error('invalid-saved-state');
  // Incomplete work must be done again after leaving/reloading. Only a durable
  // receipt proving both table completions restores the right to claim wages.
  return {version: VERSION, serial: saved.serial, job: job ? {
    id: job.id, receiptId: job.receiptId, stage: job.stage,
    completedTables: job.stage === 'ready' ? 2 : job.formalRoleId ? job.completedTables : 0,
    ...(job.formalRoleId?{formalRoleId:job.formalRoleId}:{}),
    ...(job.settlementDay!=null?{settlementDay:job.settlementDay}:{}),
  } : null};
}

/**
 * saveState(snapshot) MUST synchronously persist the detached whole labor
 * snapshot atomically, before returning. Throw/false rejects the mutation;
 * promises are unsupported. Use the same durable enclosing save as the ledger.
 * Completion and first settlement day are saved before bank credit; if payment
 * or cleanup fails, the shared ledger replays the original receipt exactly once.
 *
 * isHostAvailable() must exclude active meals/conversations; actual host home
 * position is checked here too. Block new meal requests while active() is true.
 * onIntent(intent) uses the shared controller to walk and execute once. It
 * must resolve the live intent again at the legal interaction point. playerStation() supplies the tidy target
 * to the normal player pose context. document:null supports headless logic.
 */
export function createChinaTavernLabor({getPlayer, getMounted = () => null, host, employment, careers, openRegistration,
  isHostAvailable = () => true, copperLedger, getClock, saved, saveState = () => {},
  notify = () => {}, onCompleted = () => {}, onIntent = () => {}, canSee = () => true, onOpen = () => {}, document: doc = globalThis.document} = {}) {
  if (typeof getPlayer !== 'function' || !copperLedger || typeof saveState !== 'function') throw new TypeError('labor requires player, ledger and synchronous saveState');
  let current, loadError = null;
  try { current = restore(saved); } catch { current = empty(); loadError = 'invalid-saved-state'; }
  let cleaning = false, pendingClean = false, elapsed = 0, origin = null, saving = false, paying = false, disposed = false, lastError = null;
  let ui = null, nextPayAt=0;
  const formal=createFormalLaborContract({careers,role:TAVERN_STEWARD_ROLE,getJob:()=>current.job,getPlayer,meetHost,notify,openRegistration});
  const hired=()=>formal.hired()||!!employment?.isHired();
  const player = () => getPlayer()?.root?.position;
  const active = () => !!current.job;
  const target = () => current.job?.stage === 'working' ? TABLES[current.job.completedTables] : HOST;
  const at = point => !getMounted() && near(player(), point);
  const hostReady = () => !!host && !host.walking &&
    near(host.root?.position, host.station?.npcPosition || [24.1, FLOOR, 11.4], .12) && isHostAvailable();
  const failure = (code, message) => { lastError = code; if (message) notify(message); return false; };
  const permitted = () => !disposed && !saving && !paying && !loadError && !copperLedger.loadError;
  const stopCleaning = () => { cleaning = false; pendingClean = false; elapsed = 0; origin = null; };
  function persist(next) {
    if (saving) return failure('labor-busy');
    saving = true;
    try {
      const result = saveState(copy(next));
      if (result === false) return failure('save-failed', '进度没能保存，请稍后再试');
      if (result && typeof result.then === 'function') {
        Promise.resolve(result).catch(() => {});
        return failure('async-save-unsupported', '进度没能保存，请稍后再试');
      }
      current = next; lastError = null; return true;
    } catch { return failure('save-failed', '进度没能保存，请稍后再试'); }
    finally { saving = false; }
  }
  function meetHost() {
    if (!at(HOST.position)) return failure('not-at-host', '请走到一层许安的迎客茶案前，站稳后再招呼他');
    if (!hostReady()) return failure('host-unavailable', '许安还在忙，请等他回到迎客茶案再来');
    return true;
  }
  function accept() {
    if (!permitted()) return failure(loadError || copperLedger.loadError || 'labor-busy');
    if (active()) return failure('job-active', '先完成或取消手上这份活');
    if (!hired()) return failure('not-employed', '先在迎客茶案的招工登记处应聘酒楼帮工，再向许安接活');
    if (!meetHost()) return false;
    const nextTransaction = copperLedger.state().nextTransaction;
    const resume=formal.pendingReceipt(),serial=resume?Number(resume.split('-').at(-1)):Math.max(current.serial + 1, nextTransaction);
    if (!Number.isSafeInteger(serial) || serial < 1) return failure('job-limit');
    const id = `cn-tavern-labor-${serial}`;
    const contract=formal.begin(id);if(!contract.ok)return false;
    if (!persist({version: VERSION, serial, job: {id, receiptId: id, stage: 'working', completedTables: 0,...(contract.formalRoleId?{formalRoleId:contract.formalRoleId}:{})}})) return false;
    stopCleaning(); notify(formal.pinned(current.job)?`许安：已登记今日班次。擦净两桌后回来验收，${formal.salary}日薪自动存银行，不另发临工工资。`:'许安：请擦净两张餐桌，回来验收后，12 铜文工资自动存银行'); ui?.refresh(true); return true;
  }
  function startCleaning() {
    if (!permitted() || current.job?.stage !== 'working' || cleaning || !formal.canWork(current.job)) return false;
    if (!at(target().position) || getPlayer()?.walking) return failure('not-at-table', '请站到这张餐桌靠过道的一侧，再开始擦拭');
    origin = {x: player().x, y: player().y, z: player().z}; elapsed = 0; cleaning = true; lastError = null;
    faceTable(); ui?.close(); return true;
  }
  function faceTable() {
    const actor = getPlayer(), point = target().playerWorkTarget;
    if (point && actor?.root?.rotation) actor.root.rotation.y = Math.atan2(point[0] - actor.root.position.x, point[2] - actor.root.position.z);
  }
  function stationary() {
    const p = player();
    return !!origin && at(target().position) && !getPlayer()?.walking &&
      Math.hypot(p.x - origin.x, p.z - origin.z) <= .015 && Math.abs(p.y - origin.y) <= .015;
  }
  function claim() {
    if (!permitted()) return failure(loadError || copperLedger.loadError || 'labor-busy');
    if (current.job?.stage !== 'ready') return failure('work-incomplete', '两张餐桌都擦净后，才能验收结算工钱');
    if (!meetHost()) return false;
    if(formal.pinned(current.job)){const r=formal.inspect(current.job);if(!r.ok)return false;return finishFormalPay(r);}
    onCompleted(copy(current.job));
    paying = true;
    let result;
    try { result = settleTemporaryWage({ledger: copperLedger, job: current.job, amount: WAGE, roleId: TAVERN_HELPER_ROLE,
      getClock, saveJob: job => persist({...current, job})}); }
    catch { return failure('payment-failed', '工钱暂未入账，请稍后找许安重试'); }
    finally { paying = false; }
    if (!result?.ok) return failure(result?.code || 'payment-failed', '工钱暂未入账，请稍后找许安重试');
    // Cleanup can fail after a successful ledger write. Keep the ready receipt:
    // claim after reload safely replays the canonical cash/bank receipt.
    if (!persist({...current, job: null})) {
      notify(result.legacyCash ? '旧工钱已在钱包中，收工记录暂未保存；再找许安确认，不会重复发薪' : '12 铜文工资已存银行；收工记录暂未保存，再找许安确认即可，不会重复发薪');
      ui?.refresh(true); return true;
    }
    stopCleaning(); notify(result.legacyCash ? '已在钱包的旧工钱保留，收工记录已确认' : '许安：验收完成，12 铜文工资已存银行；到中国钱庄取款后才进入钱包。'); ui?.refresh(true); return true;
  }
  function finishFormalPay(r){
    if(!r.ok||r.cleanupPending)return false;
    if(!persist({...current,job:null}))return false;
    stopCleaning();notify(`${r.wage}${formal.unit}日薪已存入银行账户；到中国钱庄取款后才进入钱包。`);ui?.refresh(true);return true;
  }
  function cancel() {
    if (!permitted() || !active()) return false;
    if (current.job.stage === 'ready') return failure('wage-ready', '这份活已经做完，工钱会保留，回许安处验收后存银行');
    if (!formal.cancel(current.job))return false;
    if (!persist({...current, job: null})) return false;
    stopCleaning(); notify('已取消这份擦桌活，未领取工钱'); ui?.refresh(true); return true;
  }
  function update(dt) {
    if (disposed) return;
    // Route arrival can still carry this frame's walking flag. Begin on the
    // next settled frame, at the same physical table, without a second click.
    if (pendingClean) {
      if (!at(target().position)) pendingClean = false;
      else if (!getPlayer()?.walking) { pendingClean = false; startCleaning(); }
    }
    if (cleaning) {
      if (!stationary() || !formal.canWork(current.job)) {
        stopCleaning(); notify('擦拭已停下；回到桌边后，重新点“开始擦拭”');
      } else {
        faceTable();
        // A suspended tab or a large clock step cannot stand in for work.
        if (Number.isFinite(dt) && dt > 0) elapsed = Math.min(SECONDS, elapsed + Math.min(dt, .1));
        if (elapsed >= SECONDS - 1e-8) {
          const done = current.job.completedTables + 1;
          const next = {...current, job: {...current.job, completedTables: done, stage: done === 2 ? 'ready' : 'working'}};
          stopCleaning();
          if (done===2&&!formal.complete(next.job))return;
          if (persist(next)) {if(done===2&&!formal.pinned(next.job))onCompleted(copy(next.job));notify(done === 2 ? formal.pinned(next.job)?'两桌已完成，回许安处验收今日班次':'两张桌面都擦净了，请回许安处验收，12 铜文工资自动存银行' : '西窗桌擦净了，请走到东窗桌靠过道的一侧');}
        }
      }
    }
    if(current.job?.stage==='ready'&&formal.pinned(current.job)&&['ready','paid'].includes(formal.duty(current.job)?.stage)){
      nextPayAt+=Math.max(0,Number.isFinite(dt)?dt:0);if(nextPayAt>=5){nextPayAt=0;finishFormalPay(formal.pay(current.job));}
    }
    ui?.refresh();
  }
  const view = () => ({...copy(current), active: active(), cleaning, progress: elapsed / SECONDS,
    wage: WAGE, seconds: SECONDS, target: copy(target()), atTarget: at(target().position),
    atHost: at(HOST.position), hostAvailable: hostReady(), employment: employment?.state() || null,
    hired: hired(), formalHired:formal.hired(),formalRole:formal.role,formalState:formal.state(),formalJob:formal.pinned(current.job),formalSalary:formal.salary, loadError: loadError || copperLedger.loadError || null, lastError});
  function intent(kind) {
    const job = current.job, employed = hired(), registration = employment?.state();
    kind ||= job ? job.stage === 'ready' ? 'claim' : 'clean' : employed ? 'accept' : 'view';
    if (disposed || !['view', 'apply', 'accept', 'claim', 'clean', 'resign', 'formal-view', 'formal-apply', 'formal-resign'].includes(kind)) return null;
    if (!['view','formal-view'].includes(kind) && (!permitted() || kind !== 'claim' && kind !== 'clean' && registration?.loadError)) return null;
    if (kind === 'apply' && (job || employed) || kind === 'resign' && (job || !employed || formal.hired()) ||
      kind === 'accept' && (job || !employed) || kind === 'claim' && job?.stage !== 'ready' ||
      kind === 'clean' && (job?.stage !== 'working' || cleaning || pendingClean)) return null;
    if(kind==='formal-apply'&&(job||formal.hired()||!careers)||kind==='formal-resign'&&(job||!formal.hired()))return null;
    if(kind==='clean'&&!formal.canWork(job))return null;
    const point = kind === 'clean' ? target() : HOST;
    return {...copy(point), id: `cn-tavern-labor-${kind}`, provider: 'china-tavern-labor', kind,
      name: kind === 'clean' ? point.name : '云来酒楼 · 招工登记案', npcName: '许安',
      action: {'formal-view':'查看正式职位与申请条件','formal-apply':'申请常任服务助理','formal-resign':'办理常任助理离职',view:'查看帮工与长期职位',apply:'申请酒楼帮工',accept:formal.hired()?'开始今日酒楼班次':'接下擦桌活',claim:formal.pinned(job)?'提交当班验收 · 工资存银行':'验收后工资存银行 · 12 铜文',clean:'擦拭餐桌 · 5 秒',resign:'办理离职'}[kind],
      intentKey: [registration?.revision ?? 0, formal.state()?.revision??0, job?.id || '-', job?.stage || '-', job?.completedTables || 0, kind].join(':'),
      interactionRadius: 2.8, executionRadius: .18, priority: 45};
  }
  function resolveIntent(selected) {
    const next = intent(selected?.kind);
    return next && selected?.provider === next.provider && selected.id === next.id && selected.intentKey === next.intentKey ? next : null;
  }
  function executeIntent(selected) {
    const next = resolveIntent(selected);
    if (!next || !at(next.position) || !canSee(next)) return false;
    if(next.kind==='formal-view'){formal.open();return true;}
    if(next.kind==='formal-apply')return formal.apply();
    if(next.kind==='formal-resign')return formal.resign();
    if (next.kind === 'view') { ui?.open(); return true; }
    if (next.kind === 'apply' || next.kind === 'resign') {
      const changed = employment[next.kind]();
      // Registration grants permission to choose work, never an automatic job.
      // Keep the local result and its explicit next action in the same panel.
      if (changed) ui?.open();
      return changed;
    }
    if (next.kind === 'clean') { pendingClean = true; return true; }
    if (next.kind === 'accept') {
      if (!accept()) return false;
      // Accepting this named two-table job also requests its first physical
      // work point. Main still owns the route, cancellation and final recheck.
      onIntent(intent('clean'));
      return true;
    }
    return claim();
  }
  const service = {
    active, accept, startCleaning, claim, cancel, update, view, state: view, meetHost, intent, resolveIntent, executeIntent,
    stopCleaning, isCleaning: () => cleaning, employment, formal,
    playerAction: () => cleaning && stationary() ? 'tidy' : null,
    playerStation: () => cleaning && stationary() ? copy(target()) : null,
    open: () => ui?.open(), close: () => ui?.close(), isOpen: () => !!ui?.isOpen(),
    dispose() { if (disposed) return; stopCleaning(); disposed = true; ui?.dispose(); },
  };
  if (doc?.createElement && doc.body) ui = createUI({doc, service, getPlayer, onIntent, canSee, onOpen});
  return service;
}

function createUI({doc, service, getPlayer, onIntent, canSee, onOpen}) {
  const make = (tag, text, cls) => { const e = doc.createElement(tag); if (text) e.textContent = text; if (cls) e.className = cls; return e; };
  const dialog = make('dialog', null, 'cn-labor-dialog'), style = make('style');
  dialog.setAttribute('aria-label', '酒楼短工与工钱');
  style.textContent = '.cn-labor-dialog{position:fixed;inset:0;margin:auto;width:min(380px,calc(100vw - 28px));max-height:calc(100dvh - 32px);overflow:auto;padding:22px;border:1px solid #c5af82;border-radius:16px;background:#f2ead7;color:#493f32}.cn-labor-dialog::backdrop{background:#30281966}.cn-labor-dialog h2{margin:0 30px 12px 0;font-size:22px}.cn-labor-dialog h3{margin:0 0 10px;font-size:16px}.cn-labor-role{padding:14px;margin:0 0 18px;border:1px solid #c5af82;border-radius:12px;background:#fff7e8}.cn-labor-dialog p{font-size:13px;line-height:1.6}.cn-labor-dialog button{min-height:44px;padding:10px 13px;border-radius:8px;background:#ded2b9;color:#493f32}.cn-labor-dialog button:disabled{opacity:.5}.cn-labor-dialog button:focus-visible{outline:3px solid #647e70;outline-offset:2px}.cn-labor-close{position:absolute;right:7px;top:7px;background:transparent!important;font-size:24px}.cn-labor-actions{display:flex;flex-wrap:wrap;gap:9px}.cn-labor-primary{background:#786345!important;color:#fff6de!important}@media(max-height:550px){.cn-labor-dialog{padding:16px}}';
  (doc.head || doc.body).append(style); doc.body.append(dialog);
  let signature = '';
  const nearHouse = () => { const p = getPlayer()?.root.position; return p && [service.view().target, HOST].some(current => current && near(p, current.position, 2.8) && canSee(current)); };
  const close = () => { if (dialog.open) dialog.close(); };
  const button = (text, handler, enabled = true, primary = false) => { const b = make('button', text, primary ? 'cn-labor-primary' : ''); b.type = 'button'; b.disabled = !enabled; b.onclick = handler; return b; };
  const request = selected => { close(); if (service.resolveIntent(selected)) onIntent(selected); };
  const actionButton = (kind, primary = false) => { const choice = service.intent(kind); return choice ? button(choice.action, () => request(choice), true, primary) : null; };
  function refresh(force = false) {
    const s = service.view(), ready = s.job?.stage === 'ready', age = getPlayer()?.ageYears;
    const ageText = Number.isFinite(age) ? `${Math.floor(age)}岁` : '未读取', skill = s.formalState?.skills?.ritual ?? 0;
    if (dialog.open && !nearHouse()) { close(); return; }
    if (!dialog.open && !force) return;
    const key = [s.job?.id, s.job?.stage, s.job?.completedTables, s.cleaning, s.atTarget, s.atHost, s.hostAvailable, s.loadError, s.lastError, s.employment?.revision, s.employment?.lastError,s.formalState?.revision, s.formalHired, age, skill].join('|');
    if (!force && key === signature) return; signature = key; dialog.replaceChildren();
    const x = button('×', close); x.className = 'cn-labor-close'; x.setAttribute('aria-label', '关闭短工面板，保留当前进度');
    dialog.append(x, make('h2', '云来酒楼 · 工作登记'));
    const actions = make('div', null, 'cn-labor-actions'), formalActions = make('div', null, 'cn-labor-actions');
    const roleCard = make('section', null, 'cn-labor-role');
    roleCard.append(make('h3', '正式职位 · 酒楼常任服务助理'),
      make('p', s.formalState?.loadError ? '正式任职：记录暂时无法读取' : s.formalHired ? '正式任职：已任职' : '正式任职：尚未任职'),
      make('p', `年龄：当前${ageText} / 要求年满${s.formalRole.minimumAgeYears}岁。待客礼仪：当前${skill}点 / 要求${s.formalRole.skillRequirements.ritual}点。`),
      make('p', `日薪：${s.formalSalary}，验收后存铜文账户；午前开班并完成另奖1文已计入上限。`),
      make('p', '职责：06:00–18:00开班，亲手擦净两张餐桌，再由许安当面验收。专设助理名额1席，许安保留原职。'));
    const catalogue=actionButton('formal-view');if(catalogue)formalActions.append(catalogue);
    if(!s.active&&s.formalHired){const resign=actionButton('formal-resign');if(resign)formalActions.append(resign);}
    roleCard.append(formalActions);dialog.append(roleCard);
    if(s.formalJob||s.formalHired&&!s.active)dialog.append(make('h3', '正式班次'));
    else dialog.append(make('h3', '临工 · 按次接活'), make('p', s.employment?.loadError ? '临工登记：记录暂时无法读取' : s.employment?.roleId === TAVERN_HELPER_ROLE ? '临工登记：可按次接活' : '临工登记：尚未登记'));
    if (s.loadError) dialog.append(make('p', '工钱记录暂时无法读取，请保留当前存档，稍后再试。'));
    else if (!s.active && s.formalHired) {
      dialog.append(make('p','你已长期任职。每天最多一班；今日结算后，下一模拟日再来。临工工资不会与同一份正式工作重复支付。'));
      const next=actionButton('accept',true);if(next)actions.append(next);
    } else if (!s.active) {
      dialog.append(make('p', '职责：擦净西窗、东窗两张餐桌，每张站稳擦拭 5 秒。工资：每完成两桌 12 铜文，回许安处验收后自动存银行，到中国钱庄取款后才进入钱包；可重复接活。'), make('p', '临工门槛：无需资历、技能或报名费，登记后可按次接活。结清手上活计后可取消登记、重新登记。'));
      dialog.append(make('p', s.hostAvailable ? '许安在迎客茶案，可当面办理登记或接活。' : '许安正在忙，回到迎客茶案后才可办理。'));
      const primary = actionButton(s.hired ? 'accept' : 'apply', true); if (primary) actions.append(primary);
      const resign = actionButton('resign'); if (resign) actions.append(resign);
    } else if (ready) {
      dialog.append(make('p', s.formalJob?'两张桌面都擦净了。回一层迎客茶案由许安验收，当日工资自动存银行。':'两张桌面都擦净了。工钱已记下，回一层迎客茶案由许安验收，工资自动存银行。'));
      actions.append(actionButton('claim', true));
    } else {
      dialog.append(make('p', `已擦净 ${s.job.completedTables}/2 张桌。下一处：${s.target.name}。`), make('p', s.formalJob?'移动会停止当前擦拭，已完成的桌面会保存；当天完成后回案验收。过期未完成只能取消，记一次差评，无日薪。':'选择擦拭后会走到桌边开始。擦拭时移动会重新计时；未完成整份活就离开或重载，需要重新擦两桌。'));
      const clean = actionButton('clean', true); if (clean) actions.append(clean);
      actions.append(button('取消这份活 · 无工钱', () => { if (service.cancel()) close(); }));
    }
    dialog.append(actions, make('p', '工钱为游戏铜文。关闭面板会保留当前任务。'));
  }
  const open = () => { if (!nearHouse()) return; onOpen(); refresh(true); if (!dialog.open) dialog.showModal(); refresh(true); };
  dialog.addEventListener('cancel', e => { e.preventDefault(); close(); }); refresh();
  return {open, close, refresh, isOpen: () => dialog.open, dispose() { close(); dialog.remove(); style.remove(); }};
}
