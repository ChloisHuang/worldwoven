import {AIRY_UI_THEME} from './china-money-house-theme.js';
import {AIRY_PANEL_STYLE,createAiryPanelParts} from './airy-panel.js';
import {skillXPReceipt} from './skill-progress.js';
import {TAVERN_STEWARD_ROLE} from './formal-careers.js';
import {createFormalLaborContract} from './formal-labor-contract.js';
import {TAVERN_HELPER_ROLE} from './china-tavern-employment.js';
import {settleTemporaryWage} from './temporary-work-payroll.js';
// One real, repeatable house job: wipe both existing dining tables and return to
// Xu An for 12 fictional copper. This module never moves the player or NPCs.
const VERSION = 2, WAGE = 12, SECONDS = 5, FLOOR = .215;
const copy = value => JSON.parse(JSON.stringify(value));
const HOST = {id: 'cn-tavern-labor-host', name: '向许安接活或领工钱', position: [22.35, FLOOR, 6.7]};
// Registration is a conversation in the public reception bay, not precision
// table work. A visitor must not occupy the same floor dot as a passing actor.
const REGISTRATION_RADIUS = .9;
const registrationKinds = new Set(['view', 'formal-view', 'apply', 'resign', 'formal-apply', 'formal-resign']);
const TABLES = [
  {id: 'cn-tavern-labor-west', name: '西窗餐桌 · 靠过道一侧', position: [19.3, FLOOR, 16.2], playerWorkTarget: [18.825, 1.19, 16.2]},
  {id: 'cn-tavern-labor-east', name: '东窗餐桌 · 靠过道一侧', position: [22.7, FLOOR, 16.2], playerWorkTarget: [23.175, 1.19, 16.2]},
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
  // A completed physical table remains durable across leaving/reloading.
  // Partial wiping time resumes only through a matching actor checkpoint.
  return {version: VERSION, serial: saved.serial, job: job ? {
    id: job.id, receiptId: job.receiptId, stage: job.stage,
    completedTables: job.completedTables,
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
export function createChinaTavernLabor({getPlayer, getMounted = () => null, host, employment, careers, openRegistration,serviceAdapter=()=>null,
  isHostAvailable = () => true, copperLedger, getClock, saved, saveState = () => {},
  notify = () => {}, onCompleted = () => {}, onIntent = () => {}, canSee = () => true, onOpen = () => {}, document: doc = globalThis.document} = {}) {
  if (typeof getPlayer !== 'function' || !copperLedger || typeof saveState !== 'function') throw new TypeError('labor requires player, ledger and synchronous saveState');
  let current, loadError = null;
  try { current = restore(saved); } catch { current = empty(); loadError = 'invalid-saved-state'; }
  let cleaning = false, pendingClean = false, elapsed = 0, origin = null, saving = false, paying = false, disposed = false, lastError = null;
  let ui = null, nextPayAt=0, waitingRegistration=null;
  const formal=createFormalLaborContract({careers,workState:()=>careers?.workState?.()??careers?.state(),role:TAVERN_STEWARD_ROLE,getJob:()=>current.job,getPlayer,meetHost:meetRegistrationHost,notify,openRegistration});
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
  function meetHost(radius = .2) {
    if (getMounted() || !near(player(), HOST.position, radius) || !canSee(HOST)) return failure('not-at-host', '请走到一层许安的迎客茶案前，站稳后再招呼他');
    if (!hostReady()) return failure('host-unavailable', '许安还在忙，请等他回到迎客茶案再来');
    return true;
  }
  function meetRegistrationHost() { return meetHost(REGISTRATION_RADIUS); }
  const atRegistration = () => !getMounted() && near(player(), HOST.position, REGISTRATION_RADIUS) && canSee(HOST);
  const cancelRegistration = () => { waitingRegistration = null; };
  function finishRegistration(selected) {
    const next = resolveIntent(selected);
    if (!next || !atRegistration()) return false;
    if (!hostReady()) {
      waitingRegistration = copy(next);
      notify('许安正在忙，已在登记处等候；等他回案后办理这次登记，关闭面板可取消');
      ui?.open(); return true;
    }
    if (next.kind === 'formal-apply' || next.kind === 'formal-resign') return next.kind === 'formal-apply' ? formal.apply() : formal.resign();
    const changed = employment[next.kind]();
    if (changed) ui?.open();
    return changed;
  }
  function accept() {
    if(serviceAdapter()?.active())return failure('service-active','先交还当班岗位，再接另一份工作');
    if(formal.hired()&&!current.job&&serviceAdapter())return serviceAdapter().accept();
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
    if (waitingRegistration) {
      const selected = waitingRegistration;
      if (!atRegistration() || !resolveIntent(selected)) {
        cancelRegistration(); notify('登记等候已取消；需要办理时请重新选择');
      } else if (hostReady()) {
        cancelRegistration(); ui?.close(); finishRegistration(selected);
      }
    }
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
          if (persist(next)) {const learned=done===2&&!formal.pinned(next.job)?onCompleted(copy(next.job)):null;notify((done === 2 ? formal.pinned(next.job)?'两桌已完成，回许安处验收今日班次':'两张桌面都擦净了，请回许安处验收，12 铜文工资自动存银行' : '西窗桌擦净了，请走到东窗桌靠过道的一侧')+skillXPReceipt(learned,'礼仪'));}
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
    hired: hired(), waitingRegistration: waitingRegistration?.kind || null, formalHired:formal.hired(),formalRole:formal.role,formalState:formal.workState(),formalJob:formal.pinned(current.job),formalSalary:formal.salary,formalBeginAvailability:formal.beginAvailability(), loadError: loadError || copperLedger.loadError || null, lastError});
  function intent(kind) {
    if(formal.hired()&&!current.job&&serviceAdapter())return serviceAdapter().intent(kind==='view'?'formal-view':kind);
    const job = current.job, employed = hired(), registration = employment?.state();
    kind ||= job ? job.stage === 'ready' ? 'claim' : 'clean' : formal.hired() ? 'formal-view' : 'view';
    if (disposed || !['view', 'apply', 'accept', 'claim', 'clean', 'resign', 'formal-view', 'formal-apply', 'formal-resign'].includes(kind)) return null;
    if (!['view','formal-view'].includes(kind) && (!permitted() || kind !== 'claim' && kind !== 'clean' && registration?.loadError)) return null;
    if (kind === 'apply' && (job || employed) || kind === 'resign' && (job || !employed || formal.hired()) ||
      kind === 'accept' && (job || !employed || serviceAdapter()?.active()) || kind === 'claim' && job?.stage !== 'ready' ||
      kind === 'clean' && (job?.stage !== 'working' || cleaning || pendingClean)) return null;
    if(kind==='formal-apply'&&(job||formal.hired()||!careers)||kind==='formal-resign'&&(job||!formal.hired()))return null;
    if(kind==='accept'&&formal.hired()&&!formal.beginAvailability().ok)return null;
    if(kind==='clean'&&!formal.canWork(job))return null;
    const point = kind === 'clean' ? target() : HOST;
    return {...copy(point), id: `cn-tavern-labor-${kind}`, provider: 'china-tavern-labor', kind,
      name: kind === 'clean' ? point.name : '云来酒楼 · 招工登记案', npcName: '许安',
      action: {'formal-view':formal.hired()?'查看今日安排与任职登记':'查看正式职位与申请条件','formal-apply':'申请常任服务助理','formal-resign':'办理常任助理离职',view:'查看酒楼职位与办理登记',apply:'申请酒楼帮工',accept:formal.hired()?'开始今日酒楼班次':'接下擦桌活',claim:formal.pinned(job)?'提交当班验收 · 工资存银行':'验收后工资存银行 · 12 铜文',clean:'擦拭餐桌 · 5 秒',resign:'办理离职'}[kind],
      ...(kind==='formal-view'?{registration:{scope:'role',roleId:formal.role.id}}:{}),
      intentKey: [registration?.revision ?? 0, formal.workState()?.revision??0, job?.id || '-', job?.stage || '-', job?.completedTables || 0, kind].join(':'),
      interactionRadius: 2.8, executionRadius: registrationKinds.has(kind) ? REGISTRATION_RADIUS : .18, priority: 45};
  }
  function resolveIntent(selected) {
    const next = intent(selected?.kind);
    if(!next || selected?.provider !== next.provider || selected.id !== next.id || selected.intentKey !== next.intentKey)return null;
    if(next.kind==='formal-view'){
      const context=selected.registration||next.registration;
      if(context.roleId!==formal.role.id||!['role','catalogue'].includes(context.scope))return null;
      next.registration=copy(context);
    }
    return next;
  }
  function executeIntent(selected) {
    const next = resolveIntent(selected);
    if (!next || !(registrationKinds.has(next.kind) ? atRegistration() : at(next.position)) || !canSee(next)) return false;
    if(next.kind==='formal-view'){formal.open(next.registration);return true;}
    if (next.kind === 'view') { ui?.open(); return true; }
    if (registrationKinds.has(next.kind)) return finishRegistration(next);
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
    active, accept, startCleaning, claim, cancel, update, view, state:()=>({...view(),formalState:formal.state()}), meetHost, meetRegistrationHost, intent, resolveIntent, executeIntent, cancelRegistration,
    stopCleaning, isCleaning: () => cleaning, employment, formal,
    playerAction: () => cleaning && stationary() ? 'tidy' : null,
    playerStation: () => cleaning && stationary() ? copy(target()) : null,
    open: () => ui?.open(), close: () => ui?.close(), isOpen: () => !!ui?.isOpen(),
    snapshot:()=>({version:1,receiptId:current.job?.receiptId||null,stage:current.job?.stage||null,completedTables:current.job?.completedTables||0,cleaning,pendingClean,elapsed,origin:origin?copy(origin):null,waitingRegistration:waitingRegistration?copy(waitingRegistration):null}),
    restore(s){if(!s||s.version!==1||s.receiptId!==(current.job?.receiptId||null)||s.stage!==(current.job?.stage||null)||s.completedTables!==(current.job?.completedTables||0)||!Number.isFinite(s.elapsed)||s.elapsed<0||s.elapsed>SECONDS)return false;waitingRegistration=s.waitingRegistration&&resolveIntent(s.waitingRegistration)&&atRegistration()?copy(s.waitingRegistration):null;const p=player(),same=!!s.origin&&p&&Math.hypot(p.x-s.origin.x,p.z-s.origin.z)<.03&&Math.abs(p.y-s.origin.y)<.03;cleaning=!!s.cleaning&&same&&at(target().position)&&current.job?.stage==='working'&&formal.canWork(current.job);pendingClean=!!s.pendingClean&&at(target().position);elapsed=cleaning?s.elapsed:0;origin=cleaning?copy(s.origin):null;return true;},
    dispose() { if (disposed) return; cancelRegistration(); stopCleaning(); disposed = true; ui?.dispose(); },
  };
  if (doc?.createElement && doc.body) ui = createUI({doc, service, getPlayer, onIntent, canSee, onOpen});
  return service;
}

function createUI({doc, service, getPlayer, onIntent, canSee, onOpen}) {
  const make=(tag,text,cls)=>{const e=doc.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
  const dialog=make('dialog',null,'cn-labor-dialog ww-airy-theme ww-airy-panel'),style=make('style');
  dialog.setAttribute('aria-label','云来酒楼工作登记');
  style.textContent=AIRY_UI_THEME+AIRY_PANEL_STYLE+`
.cn-labor-dialog.ww-airy-panel{position:fixed;inset:0;margin:auto;width:min(720px,var(--ww-ui-width,calc(100vw - 24px)));max-width:none;height:min(340px,var(--ww-ui-height,calc(100dvh - 24px)));padding:16px 20px 12px;border:1px solid #d4e5dc;border-radius:20px 7px 20px 7px;background:linear-gradient(115deg,#f7f9ef,#edf5f1 72%,#eff0fa);color:#355e68;box-shadow:0 14px 42px #274b6426;font-family:Georgia,"Songti SC","Noto Serif CJK SC",serif;line-height:1.4}
.cn-labor-dialog::backdrop{background:#173b493d;backdrop-filter:blur(3px)}.cn-labor-dialog *{box-sizing:border-box}.cn-labor-dialog h2{font-family:inherit;font-weight:600;font-size:21px;line-height:1.3;letter-spacing:.08em;margin:0}.cn-labor-dialog h3{font-size:19px;line-height:1.3;margin:0 0 5px;font-weight:500}.cn-labor-dialog p{font-size:13px;line-height:1.5;margin:5px 0}.cn-labor-dialog button{font-family:inherit;min-height:44px;cursor:pointer;box-shadow:none}.cn-labor-dialog button:disabled{opacity:.5;cursor:default}.cn-labor-dialog .cn-labor-close{position:absolute;right:8px;top:7px;width:44px;padding:0;border:0;border-radius:0;background:transparent;color:#7b999b;font-size:26px}.cn-labor-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-right:34px;border-bottom:1px solid #d5e5dc;padding-bottom:9px;margin-bottom:10px}.cn-labor-heading>span{font-size:12px;color:#759297;white-space:nowrap}
.cn-labor-content{display:grid;grid-template-columns:minmax(0,.85fr) minmax(0,1.45fr);gap:18px;overflow:hidden}.cn-labor-menu,.cn-labor-detail{min-width:0;min-height:0;overflow:auto;overscroll-behavior:contain}.cn-labor-choices{display:grid;gap:8px}.cn-labor-dialog.ww-airy-theme .cn-labor-choices button{display:block;width:100%;min-height:65px;padding:9px 12px;text-align:left;border:0;border-left:2px solid transparent;border-radius:3px;background:#ffffff65;color:#61848a;font-size:14px}.cn-labor-dialog.ww-airy-theme .cn-labor-choices button[aria-pressed=true]{border-left-color:#84bdb0;background:linear-gradient(90deg,#dceee4,#e9f4eb70);color:#305f66}.cn-labor-choices strong{display:block;font-size:16px;font-weight:500;margin-bottom:4px}.cn-labor-choices span{display:block;font-size:12px;color:#7c9696}.cn-labor-detail{position:relative;padding:10px 15px;background:#fffefa80;border:1px solid #dfebe2;border-radius:10px 3px 13px 3px}.cn-labor-kicker{font-size:11px!important;color:#83a0a0;margin:0 0 4px!important;letter-spacing:.08em}.cn-labor-value{display:flex;align-items:baseline;gap:6px;margin:7px 0;color:#5b7b94;font-size:12px}.cn-labor-value strong{font-size:29px;line-height:1;font-weight:500}.cn-labor-status{color:#557c7a}.cn-labor-note{font-size:12px!important;color:#819698}.cn-labor-error{color:#aa726b!important}.cn-labor-dialog .cn-labor-more{margin:3px 0 0;padding:0;border-top:1px solid #dfebe2;color:#789094}.cn-labor-more summary{display:flex;align-items:center;min-height:44px;cursor:pointer;font-size:12px;list-style:none}.cn-labor-more summary:after{content:'＋';margin-left:auto;color:#8aabaa}.cn-labor-more[open] summary:after{content:'−'}.cn-labor-more p{font-size:12px}.cn-labor-more button{display:block;width:100%;padding:6px 0;text-align:left;font-size:12px;border:0;border-radius:0;background:transparent;color:#827780}.cn-labor-actions{padding-top:7px;border-top:1px solid #d5e5dc}.cn-labor-dialog.ww-airy-theme .cn-labor-primary{width:100%;min-height:44px;font-size:14px;letter-spacing:.02em;padding:8px 14px}
@media(max-height:500px){.cn-labor-dialog.ww-airy-panel{padding:12px 18px 10px}.cn-labor-heading{height:30px;padding-bottom:5px;margin-bottom:7px}.cn-labor-dialog h2{font-size:18px}.cn-labor-dialog h3{font-size:17px}.cn-labor-detail{padding:8px 13px}.cn-labor-value{margin:5px 0}.cn-labor-value strong{font-size:26px}.cn-labor-actions{padding-top:5px}}
@media(max-width:600px){.cn-labor-dialog.ww-airy-panel{height:min(540px,var(--ww-ui-height,calc(100dvh - 24px)));padding:16px}.cn-labor-heading{display:block}.cn-labor-heading>span{display:block;margin-top:3px}.cn-labor-content{display:block;overflow:auto}.cn-labor-menu,.cn-labor-detail{overflow:visible}.cn-labor-menu{margin-bottom:12px}.cn-labor-choices{grid-template-columns:1fr 1fr}.cn-labor-choices button{padding:8px}.cn-labor-choices strong{font-size:14px}.cn-labor-choices span{font-size:11px}}`;
  (doc.head||doc.body).append(style);doc.body.append(dialog);
  let signature='',selected='temporary',revision=0,detailsOpen=false,disposed=false;
  const nearHouse=()=>{const p=getPlayer()?.root.position;return p&&[service.view().target,HOST].some(t=>t&&near(p,t.position,2.8)&&canSee(t));};
  const close=()=>{revision++;service.cancelRegistration();if(dialog.open)dialog.close();};
  const button=(text,fn,cls)=>{const e=make('button',text,cls);e.type='button';e.onclick=fn;return e;};
  const request=choice=>{if(!service.resolveIntent(choice)){refresh(true);return;}close();onIntent(choice);};
  const secondsLeft=s=>s.cleaning?Math.ceil((1-s.progress)*s.seconds):null;
  const stateKey=s=>JSON.stringify([selected,s.job,s.cleaning,secondsLeft(s),s.waitingRegistration,s.atTarget,s.atHost,s.hostAvailable,s.loadError,s.lastError,s.employment,s.formalState?.revision,s.formalState?.loadError,s.formalState?.skills?.ritual,s.formalHired,s.formalBeginAvailability,getPlayer()?.ageYears,service.intent('clean')?.intentKey]);
  function refresh(force=false){
    if(!dialog.open&&!force)return;
    const s=service.view();if(dialog.open&&!nearHouse()){close();return;}
    const key=stateKey(s);if(!force&&key===signature)return;signature=key;const rendered=++revision;dialog.replaceChildren();
    // Replaced controls must never navigate after closing, apply twice or cancel
    // a newer work slip. The service still rechecks reach and live intent.
    const guard=fn=>()=>{if(disposed||!dialog.open||rendered!==revision)return;if(!nearHouse()){close();return;}if(stateKey(service.view())!==key){refresh(true);return;}fn();};
    const x=button('×',guard(close),'cn-labor-close');x.setAttribute('aria-label','关闭工作面板，保留进度并取消登记等候');
    const {header,body,actions}=createAiryPanelParts(doc);header.className+=' cn-labor-heading';body.className+=' cn-labor-content';actions.className+=' cn-labor-actions';
    header.append(make('h2','云来酒楼 · 工作登记'),make('span','许安 · 迎客茶案'));
    const menu=make('section',null,'cn-labor-menu'),choices=make('div',null,'cn-labor-choices'),detail=make('section',null,'cn-labor-detail');
    choices.setAttribute('aria-label','选择云来酒楼工作');
    const localChoices=[['temporary',s.formalJob?'已有班次':'临时帮工',s.job?`手上这份 · ${s.job.completedTables}/2 桌`:s.employment?.roleId===TAVERN_HELPER_ROLE?'已登记 · 按次接活':`${s.wage} 铜文 / 份 · 免费登记`],['formal','长期职位',s.formalHired?'常任服务助理 · 已任职':'常任服务助理 · 查看条件']];
    for(const [id,title,summary] of localChoices.filter(([id])=>id==='formal'||!s.formalHired||s.job)){
      const b=button(null,guard(()=>{selected=id;detailsOpen=false;refresh(true);}));b.setAttribute('aria-pressed',String(selected===id));b.append(make('strong',title),make('span',summary));choices.append(b);
    }
    menu.append(choices,make('p',selected==='formal'?'登记 → 审核 → 当面报到':'登记 → 擦两桌 → 当面验收','cn-labor-note'));
    const more=make('details',null,'cn-labor-more');more.open=detailsOpen;more.addEventListener('toggle',()=>{if(rendered===revision)detailsOpen=more.open;});
    let choice,label,blocked=false,primaryAction;
    if(s.waitingRegistration){
      detail.append(make('p','登记等候 · 尚未办理','cn-labor-kicker'),make('h3','等许安回案'),make('p','已在迎客茶案旁等候','cn-labor-status'),make('p','没有开始工作，也没有扣取费用。','cn-labor-note'));
      more.append(make('summary','等候与退出'),make('p','许安空闲后会重新核对这次申请或离职。关闭面板、离开登记处或取消等候，都会撤销本次等候。'));
      label='取消这次登记等候';primaryAction=()=>{service.cancelRegistration();refresh(true);};
    }else if(selected==='formal'){
      const role=s.formalRole,age=getPlayer()?.ageYears,skill=s.formalState?.skills?.ritual,availability=s.formalBeginAvailability;
      detail.append(make('p','长期职位 · 中国本地登记','cn-labor-kicker'),make('h3','常任服务助理'));
      const value=make('div',null,'cn-labor-value');value.append(make('strong',s.formalSalary),make('span','/ 日 · 按工时结算'));detail.append(value);
      detail.append(make('p',`年龄 ${Number.isFinite(age)?Math.floor(age)+'岁':'未读取'} / ${role.minimumAgeYears}岁 · 礼仪 ${Number.isFinite(skill)?skill+'点':'未读取'} / ${role.skillRequirements.ritual}点`,'cn-labor-status'));
      const status=s.formalState?.loadError?'职业记录暂时无法读取':s.job?'先结清手上这份工作，再办理长期任职':!s.formalHired?'申请、审核与报到，在岗位手册中分别办理':availability.ok?'已任职 · 可在岗位手册中另行报到':availability.code==='outside-arrival-window'?`现在休班 · ${String(availability.window?.startHour??role.dutyWindow.startHour).padStart(2,'0')}:00–${String(availability.window?.endHour??role.dutyWindow.endHour).padStart(2,'0')}:00 可报到`:availability.code==='already-paid-today'?'今天已结薪 · 下一模拟日可报到':'当前不能开新班 · 查看本日岗位安排';
      detail.append(make('p',status,s.formalState?.loadError?'cn-labor-error':'cn-labor-note'));
      more.append(make('summary','职责、交班与日薪'),make('p',`${String(role.dutyWindow.startHour).padStart(2,'0')}:00–${String(role.dutyWindow.endHour).padStart(2,'0')}:00 报到，与陆青当面交接。持续处理真实客单：送菜、收碗擦桌与退房清洁。`),make('p',`交班前归还岗位物品，按实际在岗工时及服务评价结算；午前开班并完成另奖 ${role.preparationBonus} 文，已计入日薪上限。工资存银行，同一份工作不另发临工工资。`));
      choice=service.intent('formal-view');if(choice)choice={...choice,registration:{scope:'role',roleId:role.id}};label=s.formalHired?'查看岗位与班次':'查看职位与申请条件';
    }else{
      const j=s.job,ready=j?.stage==='ready',formalJob=s.formalJob,unavailable=j?.stage==='working'&&!s.cleaning&&!service.intent('clean');
      detail.append(make('p',formalJob?'已保存班次 · 两桌任务':j?'手上的擦桌活':'临时工作 · 按份结算','cn-labor-kicker'),make('h3',j?'西窗与东窗餐桌':s.hired?'酒楼帮工 · 已登记':'酒楼帮工'));
      const value=make('div',null,'cn-labor-value');value.append(make('strong',j?`${j.completedTables} / 2`:String(s.wage)),make('span',j?formalJob?'桌已完成 · 正式工资单独验收':`桌已完成 · 验收 ${s.wage} 铜文`:'铜文 / 份 · 验收后存银行'));detail.append(value);
      const status=s.loadError||s.employment?.loadError?'记录暂时无法读取，请保留存档':s.cleaning?`正在擦拭 · 还需 ${secondsLeft(s)} 秒`:ready?'两桌已完成 · 工钱待当面验收':unavailable?'当前任务暂不可继续 · 请查看班次安排':j?`下一处：${s.target.name}`:s.hired?s.hostAvailable?'登记已保存 · 可以接下一份活':'许安正在忙 · 回案后可接活':'无需资历或技能 · 报名费 0 铜文';
      detail.append(make('p',status,s.loadError||s.employment?.loadError?'cn-labor-error':'cn-labor-status'));
      detail.append(make('p',j?'关闭保留已完成餐桌；移动停止当前擦拭。':`每桌站稳擦拭 ${s.seconds} 秒，完成两桌后回案验收。`,'cn-labor-note'));
      more.append(make('summary',formalJob?'验收与退出':'工钱、成长与退出'),make('p',formalJob?'这是存档中尚未结清的两桌班次，按原正式班次验收；不另发 12 铜文临工工资。':`${s.wage} 铜文验收后存银行，到中国钱庄取款后进入钱包。完整临工获得待客礼仪成长，每天最多 4 份有效成长。`),make('p',formalJob?'当日未完成的过期班次须取消，记一次差评，无日薪。已完成的工资保留，不能取消。':'取消未完成的活没有工钱；两桌完成后工资保留，不能取消。已完成餐桌会保存，重回桌边只需继续剩余工作。'));
      if(!j&&s.hired){const resign=service.intent('resign');if(resign)more.append(button('取消临工登记',guard(()=>request(resign))));}
      if(j?.stage==='working')more.append(button('取消这份活 · 无工钱',guard(()=>{if(service.cancel())close();else refresh(true);})));
      choice=service.intent(j?ready?'claim':'clean':s.hired?'accept':'apply');
      label=s.cleaning?`正在擦拭 · ${secondsLeft(s)} 秒`:unavailable?'当前任务暂不可继续':choice?.kind==='apply'?'当面登记临时帮工':choice?.kind==='claim'?formalJob?'当面验收 · 正式工资存银行':`当面验收 · ${s.wage} 铜文存银行`:choice?.action||'当前暂不可办理';
      blocked=!!(s.loadError||!j&&s.employment?.loadError||s.cleaning);
      if(!j&&s.hired&&!s.hostAvailable||ready&&!s.hostAvailable){label='等许安回迎客茶案';blocked=true;}
    }
    detail.append(more);const primary=button(label,guard(primaryAction||(()=>request(choice))),'cn-labor-primary ww-airy-action');primary.disabled=blocked||!primaryAction&&!choice;actions.append(primary);body.append(menu,detail);dialog.append(x,header,body,actions);
  }
  const open=()=>{if(disposed||!nearHouse())return;revision++;onOpen();if(service.view().job)selected='temporary';else if(service.view().formalHired)selected='formal';refresh(true);if(!dialog.open)dialog.showModal();refresh(true);};
  dialog.addEventListener('cancel',e=>{e.preventDefault();close();});refresh();
  return {open,close,refresh,isOpen:()=>dialog.open,dispose(){disposed=true;close();dialog.remove();style.remove();}};
}
