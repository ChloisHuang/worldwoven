// One real, repeatable house job: wipe both existing dining tables and return to
// Xu An for 12 fictional copper. This module never moves the player or NPCs.
const VERSION = 1, WAGE = 12, SECONDS = 5, FLOOR = .215;
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
  if (!saved || Array.isArray(saved) || saved.version !== VERSION || !integer(saved.serial)) throw Error('invalid-saved-state');
  const job = saved.job;
  if (job != null && (!job || typeof job !== 'object' || job.id !== `cn-tavern-labor-${saved.serial}` ||
    job.receiptId !== job.id || saved.serial < 1 || !['working', 'ready'].includes(job.stage) ||
    !integer(job.completedTables) || (job.stage === 'ready' ? job.completedTables !== 2 : job.completedTables > 1))) throw Error('invalid-saved-state');
  // Incomplete work must be done again after leaving/reloading. Only a durable
  // receipt proving both table completions restores the right to claim wages.
  return {version: VERSION, serial: saved.serial, job: job ? {
    id: job.id, receiptId: job.receiptId, stage: job.stage,
    completedTables: job.stage === 'ready' ? 2 : 0,
  } : null};
}

/**
 * saveState(snapshot) MUST synchronously persist the detached whole labor
 * snapshot atomically, before returning. Throw/false rejects the mutation;
 * promises are unsupported. Use the same durable enclosing save as the ledger.
 * Completion is saved before earn; if payment or receipt cleanup fails, the
 * same receipt is retried. The copper ledger supplies durable exactly-once pay.
 *
 * isHostAvailable() must exclude active meals/conversations; actual host home
 * position is checked here too. Block new meal requests while active() is true.
 * onNavigate({id,name,position}) should start ordinary pathfinding. It must not
 * teleport, auto-accept or auto-clean. playerStation() supplies the tidy target
 * to the normal player pose context. document:null supports headless logic.
 */
export function createChinaTavernLabor({getPlayer, getMounted = () => null, host,
  isHostAvailable = () => true, copperLedger, saved, saveState = () => {},
  notify = () => {}, onNavigate = () => {}, onOpen = () => {}, document: doc = globalThis.document} = {}) {
  if (typeof getPlayer !== 'function' || !copperLedger || typeof saveState !== 'function') throw new TypeError('labor requires player, ledger and synchronous saveState');
  let current, loadError = null;
  try { current = restore(saved); } catch { current = empty(); loadError = 'invalid-saved-state'; }
  let cleaning = false, elapsed = 0, origin = null, saving = false, paying = false, disposed = false, lastError = null;
  let ui = null;
  const player = () => getPlayer()?.root?.position;
  const active = () => !!current.job;
  const target = () => current.job?.stage === 'working' ? TABLES[current.job.completedTables] : HOST;
  const at = point => !getMounted() && near(player(), point);
  const hostReady = () => !!host && !host.walking &&
    near(host.root?.position, host.station?.npcPosition || [24.1, FLOOR, 11.4], .12) && isHostAvailable();
  const failure = (code, message) => { lastError = code; if (message) notify(message); return false; };
  const permitted = () => !disposed && !saving && !paying && !loadError && !copperLedger.loadError;
  const stopCleaning = () => { cleaning = false; elapsed = 0; origin = null; };
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
    if (!meetHost()) return false;
    const nextTransaction = copperLedger.state().nextTransaction;
    const serial = Math.max(current.serial + 1, nextTransaction);
    if (!Number.isSafeInteger(serial) || serial < 1) return failure('job-limit');
    const id = `cn-tavern-labor-${serial}`;
    if (!persist({version: VERSION, serial, job: {id, receiptId: id, stage: 'working', completedTables: 0}})) return false;
    stopCleaning(); notify('许安：请擦净两张餐桌，做完回来领 12 铜文'); ui?.refresh(true); return true;
  }
  function startCleaning() {
    if (!permitted() || current.job?.stage !== 'working' || cleaning) return false;
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
    if (current.job?.stage !== 'ready') return failure('work-incomplete', '两张餐桌都擦净后，才能领工钱');
    if (!meetHost()) return false;
    paying = true;
    let result;
    try { result = copperLedger.earn(WAGE, current.job.receiptId); }
    catch { return failure('payment-failed', '工钱暂未入账，请稍后找许安重试'); }
    finally { paying = false; }
    if (!result?.ok) return failure(result?.code || 'payment-failed', '工钱暂未入账，请稍后找许安重试');
    // Cleanup can fail after a successful ledger write. Keep the ready receipt:
    // claim after reload safely replays earn instead of awarding copper twice.
    if (!persist({...current, job: null})) {
      notify('12 铜文已入账；收工记录暂未保存，再找许安确认即可，不会重复领钱');
      ui?.refresh(true); return true;
    }
    stopCleaning(); notify(result.replayed ? '这份工钱已经入账，收工记录已确认' : '许安：桌面擦净了，12 铜文工钱收好'); ui?.refresh(true); return true;
  }
  function cancel() {
    if (!permitted() || !active()) return false;
    if (current.job.stage === 'ready') return failure('wage-ready', '这份活已经做完，工钱会保留，回许安处领取即可');
    if (!persist({...current, job: null})) return false;
    stopCleaning(); notify('已取消这份擦桌活，未领取工钱'); ui?.refresh(true); return true;
  }
  function update(dt) {
    if (disposed) return;
    if (cleaning) {
      if (!stationary()) {
        stopCleaning(); notify('擦拭已停下；回到桌边后，重新点“开始擦拭”');
      } else {
        faceTable();
        // A suspended tab or a large clock step cannot stand in for work.
        if (Number.isFinite(dt) && dt > 0) elapsed = Math.min(SECONDS, elapsed + Math.min(dt, .1));
        if (elapsed >= SECONDS - 1e-8) {
          const done = current.job.completedTables + 1;
          const next = {...current, job: {...current.job, completedTables: done, stage: done === 2 ? 'ready' : 'working'}};
          stopCleaning();
          if (persist(next)) notify(done === 2 ? '两张桌面都擦净了，请回许安处领 12 铜文' : '西窗桌擦净了，请走到东窗桌靠过道的一侧');
        }
      }
    }
    ui?.refresh();
  }
  const view = () => ({...copy(current), active: active(), cleaning, progress: elapsed / SECONDS,
    wage: WAGE, seconds: SECONDS, target: copy(target()), atTarget: at(target().position),
    atHost: at(HOST.position), hostAvailable: hostReady(), loadError: loadError || copperLedger.loadError || null, lastError});
  const service = {
    active, accept, startCleaning, claim, cancel, update, view, state: view,
    playerAction: () => cleaning && stationary() ? 'tidy' : null,
    playerStation: () => cleaning && stationary() ? copy(target()) : null,
    open: () => ui?.open(), close: () => ui?.close(), isOpen: () => !!ui?.isOpen(),
    dispose() { if (disposed) return; stopCleaning(); disposed = true; ui?.dispose(); },
  };
  if (doc?.createElement && doc.body) ui = createUI({doc, service, getPlayer, onNavigate, onOpen});
  return service;
}

function createUI({doc, service, getPlayer, onNavigate, onOpen}) {
  const make = (tag, text, cls) => { const e = doc.createElement(tag); if (text) e.textContent = text; if (cls) e.className = cls; return e; };
  const badge = make('button', '酒楼短工 · 挣 12 铜文', 'cn-labor-badge'), dialog = make('dialog', null, 'cn-labor-dialog'), style = make('style');
  badge.type = 'button'; badge.setAttribute('aria-label', '酒楼擦桌短工'); dialog.setAttribute('aria-label', '酒楼短工与工钱');
  style.textContent = '.cn-labor-badge{position:fixed;left:max(18px,env(safe-area-inset-left));top:262px;z-index:18;max-width:calc(100vw - 180px);min-height:44px;padding:10px 14px;border:1px solid #bda575;border-radius:12px;background:#786345;color:#fff6de;font-size:12px}.cn-labor-dialog{position:fixed;inset:0;margin:auto;width:min(380px,calc(100vw - 28px));max-height:calc(100dvh - 32px);overflow:auto;padding:22px;border:1px solid #c5af82;border-radius:16px;background:#f2ead7;color:#493f32}.cn-labor-dialog::backdrop{background:#30281966}.cn-labor-dialog h2{margin:0 30px 12px 0;font-size:22px}.cn-labor-dialog p{font-size:13px;line-height:1.6}.cn-labor-dialog button{min-height:44px;padding:10px 13px;border-radius:8px;background:#ded2b9;color:#493f32}.cn-labor-dialog button:disabled{opacity:.5}.cn-labor-dialog button:focus-visible,.cn-labor-badge:focus-visible{outline:3px solid #647e70;outline-offset:2px}.cn-labor-close{position:absolute;right:7px;top:7px;background:transparent!important;font-size:24px}.cn-labor-actions{display:flex;flex-wrap:wrap;gap:9px}.cn-labor-primary{background:#786345!important;color:#fff6de!important}@media(max-height:550px){.cn-labor-badge{top:215px;font-size:10px;padding:8px 10px}.cn-labor-dialog{padding:16px}}';
  (doc.head || doc.body).append(style); doc.body.append(badge, dialog);
  let signature = '';
  const nearHouse = () => { const p = getPlayer()?.root.position; return p && p.x > 15.4 && p.x < 26.5 && p.z > 7.5 && p.z < 21.5 && Math.abs(p.y - FLOOR) < .3; };
  const close = () => { if (dialog.open) dialog.close(); };
  const button = (text, handler, enabled = true, primary = false) => { const b = make('button', text, primary ? 'cn-labor-primary' : ''); b.type = 'button'; b.disabled = !enabled; b.onclick = handler; return b; };
  const navigate = station => { close(); onNavigate(copy(station)); };
  function refresh(force = false) {
    const s = service.view(), ready = s.job?.stage === 'ready';
    badge.hidden = !nearHouse() && !s.active;
    badge.textContent = ready ? '酒楼短工 · 回许安处领 12 铜文' : s.cleaning ? `酒楼短工 · 擦拭中 ${Math.ceil((1 - s.progress) * SECONDS)} 秒` : s.active ? `酒楼短工 · 已擦净 ${s.job.completedTables}/2 桌` : '酒楼短工 · 挣 12 铜文';
    if (dialog.open && !nearHouse() && !s.active) { close(); return; }
    if (!dialog.open && !force) return;
    const key = [s.job?.id, s.job?.stage, s.job?.completedTables, s.cleaning, s.atTarget, s.atHost, s.hostAvailable, s.loadError, s.lastError].join('|');
    if (!force && key === signature) return; signature = key; dialog.replaceChildren();
    const x = button('×', close); x.className = 'cn-labor-close'; x.setAttribute('aria-label', '关闭短工面板，保留当前进度');
    dialog.append(x, make('h2', '云来酒楼 · 擦桌短工'));
    const actions = make('div', null, 'cn-labor-actions');
    if (s.loadError) dialog.append(make('p', '工钱记录暂时无法读取，请保留当前存档，稍后再试。'));
    else if (!s.active) {
      dialog.append(make('p', '替许安擦净西窗、东窗两张餐桌，每张站稳擦拭 5 秒。全部做完后回茶案领取 12 铜文，可重复接活。'), make('p', s.hostAvailable ? '许安在一层迎客茶案等候。请走到他面前接活。' : '许安正在忙，等他回到迎客茶案再接活。'));
      actions.append(button('走到许安面前', () => navigate(HOST)), button('接下擦桌活', () => service.accept(), s.atHost && s.hostAvailable, true));
    } else if (ready) {
      dialog.append(make('p', '两张桌面都擦净了。工钱已记下，回一层迎客茶案，等许安有空时领取。'));
      actions.append(button('走回许安面前', () => navigate(HOST)), button('领取 12 铜文', () => service.claim(), s.atHost && s.hostAvailable, true));
    } else {
      dialog.append(make('p', `已擦净 ${s.job.completedTables}/2 张桌。下一处：${s.target.name}。`), make('p', '走到桌边再点“开始擦拭”。擦拭时移动会重新计时；未完成整份活就离开或重载，需要重新擦两桌。'));
      actions.append(button('走到这张桌边', () => navigate(s.target)), button('开始擦拭 · 5 秒', () => service.startCleaning(), s.atTarget && !s.cleaning, true), button('取消这份活 · 无工钱', () => { if (service.cancel()) close(); }));
    }
    dialog.append(actions, make('p', '工钱为游戏铜文。关闭面板会保留当前任务。'));
  }
  const open = () => { if (!nearHouse() && !service.active()) return; onOpen(); refresh(true); if (!dialog.open) dialog.showModal(); refresh(true); };
  badge.onclick = open; dialog.addEventListener('cancel', e => { e.preventDefault(); close(); }); refresh();
  return {open, close, refresh, isOpen: () => dialog.open, dispose() { close(); badge.remove(); dialog.remove(); style.remove(); }};
}
