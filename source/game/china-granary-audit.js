// Xu checks already-settled official duty receipts. This metadata journal has
// no authority to pay wages, spend personal balances, or create a treasury.
import {CHINA_COURT_OFFICIAL_RANKS} from './china-official-ranks.js';
import {readCourtAuthority,sameCourtAuthority,sameCourtReceiptAuthority,validCourtRecipientProof} from './china-court-reports.js';

export const CHINA_GRANARY_AUDITOR = 'cn-minister-granary';
export const CHINA_GRANARY_AUDIT_POINT = Object.freeze([24, .215, 32.5]);
const RECIPIENT = 'cn-emperor', OFFICIALS = new Set(CHINA_COURT_OFFICIAL_RANKS.map(rank => rank.actorId));
const BATCH_LIMIT = 6, HISTORY_LIMIT = 8;
const copy = value => JSON.parse(JSON.stringify(value));
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const integer = value => Number.isSafeInteger(value) && value >= 0;
const positive = value => integer(value) && value > 0;
const identifier = (value, max = 256) => typeof value === 'string' && value.length > 0 && value.length <= max && value.trim() === value;
const canonical = value => Array.isArray(value) ? value.map(canonical) : object(value) ?
  Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
const freezeTree = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freezeTree); Object.freeze(value); } return value; };
const failure = code => ({ok: false, code});
const serial = id => typeof id === 'string' && /^official-[1-9][0-9]*$/.test(id) && positive(Number(id.slice(9))) ? Number(id.slice(9)) : null;
const batchSerial = id => typeof id === 'string' && /^cn-granary-audit-[1-9][0-9]*$/.test(id) && positive(Number(id.slice(17))) ? Number(id.slice(17)) : null;
const reportFor = (batch, day) => ({batchId: batch.id, reporterId: CHINA_GRANARY_AUDITOR, day});
const validRef = ref => object(ref) && identifier(ref.batchId) && ref.reporterId === CHINA_GRANARY_AUDITOR && integer(ref.day) && same(ref, reportFor({id: ref.batchId}, ref.day));
const completeProof = proof => object(proof) && proof.reporterId === CHINA_GRANARY_AUDITOR && validCourtRecipientProof(proof) && proof.reportSeconds === 6 && proof.responseSeconds === 4;

// Deliberately allowlist nested fields too. No balance, payment destination,
// meal/salon receipt, or arbitrary source property can enter an audit batch.
function receiptFor(row) {
  if (!object(row) || !serial(row.id) || !identifier(row.receiptId) || !OFFICIALS.has(row.actorId) || !integer(row.day) || !positive(row.amount)) throw Error('invalid-source');
  const e = row.evidence;
  if (!object(e) || e.kind !== 'office-work' || e.completed !== true || e.actorId !== row.actorId || e.day !== row.day || e.audienceDay !== row.day || e.audienceCompleted !== true ||
      !Number.isFinite(e.elapsed) || !Number.isFinite(e.duration) || e.duration < 8 || e.elapsed < e.duration) throw Error('invalid-source');
  const evidence = {kind: 'office-work', completed: true, actorId: row.actorId, day: row.day, elapsed: e.elapsed, duration: e.duration, audienceDay: row.day, audienceCompleted: true};
  if (!same(evidence, e)) throw Error('invalid-source');
  const result = {id: row.id, receiptId: row.receiptId, actorId: row.actorId, day: row.day, amount: row.amount, evidence};
  if (Object.hasOwn(row, 'payContract')) {
    const p = row.payContract;
    if (!object(p) || !positive(p.version) || !identifier(p.policyId) || !identifier(p.gradeId) || p.amount !== row.amount) throw Error('invalid-source');
    result.payContract = {version: p.version, policyId: p.policyId, gradeId: p.gradeId, amount: p.amount};
    if (!same(result.payContract, p)) throw Error('invalid-source');
  }
  if (!same(result, row)) throw Error('invalid-source');
  return result;
}
function inspectionFor(proof) {
  if (!object(proof) || proof.actorId !== CHINA_GRANARY_AUDITOR || !Array.isArray(proof.position) || proof.position.length !== 3 || !proof.position.every(Number.isFinite) ||
      Math.hypot(proof.position[0] - CHINA_GRANARY_AUDIT_POINT[0], proof.position[2] - CHINA_GRANARY_AUDIT_POINT[2]) > .3 ||
      Math.abs(proof.position[1] - CHINA_GRANARY_AUDIT_POINT[1]) > .3 || !Number.isFinite(proof.duration) || proof.duration < 15 || proof.duration > 27 ||
      !Number.isFinite(proof.elapsed) || proof.elapsed < proof.duration) return null;
  return {actorId: CHINA_GRANARY_AUDITOR, position: proof.position.slice(), elapsed: proof.elapsed, duration: proof.duration};
}
function receivedFor(batch, ref, proof = ref) {
  return {version: 1, ...reportFor(batch, ref.day), recipientId: proof.recipientId ?? RECIPIENT,
    ...(Object.hasOwn(proof, 'authority') ? {authority: {...proof.authority}} : {}), reportSeconds: 6, responseSeconds: 4};
}
function restore(value) {
  if (!object(value) || value.version !== 1 || typeof value.enabled !== 'boolean' || !(value.baseline === null || integer(value.baseline)) ||
      !integer(value.frontier) || !integer(value.sequence) || !Array.isArray(value.batches) || value.batches.length > HISTORY_LIMIT ||
      !same(Object.keys(value).sort(), ['version', 'enabled', 'baseline', 'frontier', 'sequence', 'batches'].sort())) throw Error('invalid-saved-state');
  if (value.baseline === null || !value.enabled) {
    if (value.enabled || value.frontier !== (value.baseline ?? 0) || value.sequence !== 0 || value.batches.length) throw Error('invalid-saved-state');
    return copy(value);
  }
  if (value.frontier < value.baseline || value.batches.length !== Math.min(value.sequence, HISTORY_LIMIT)) throw Error('invalid-saved-state');
  const receiptIds = new Set(), dutyIds = new Set();
  let previous = null;
  for (let i = 0; i < value.batches.length; i++) {
    const batch = value.batches[i], number = batchSerial(batch?.id);
    if (!object(batch) || number !== value.sequence - value.batches.length + i + 1 || !integer(batch.fromSerial) || batch.fromSerial < value.baseline ||
        !positive(batch.throughSerial) || batch.throughSerial <= batch.fromSerial || previous && batch.fromSerial !== previous.throughSerial ||
        !Array.isArray(batch.receipts) || !batch.receipts.length || batch.receipts.length > BATCH_LIMIT ||
        !same(Object.keys(batch).sort(), ['id', 'fromSerial', 'throughSerial', 'receipts', 'result', ...(Object.hasOwn(batch, 'received') ? ['received'] : [])].sort())) throw Error('invalid-saved-state');
    if (i === 0 && number === 1 && batch.fromSerial !== value.baseline) throw Error('invalid-saved-state');
    let last = batch.fromSerial;
    for (const raw of batch.receipts) {
      const receipt = receiptFor(raw), n = serial(receipt.id), dutyId = JSON.stringify([receipt.actorId, receipt.day]);
      if (n <= last || n > batch.throughSerial || receiptIds.has(receipt.receiptId) || dutyIds.has(dutyId)) throw Error('invalid-saved-state');
      receiptIds.add(receipt.receiptId); dutyIds.add(dutyId); last = n;
    }
    if (last !== batch.throughSerial) throw Error('invalid-saved-state');
    if (batch.result !== null && (!inspectionFor(batch.result) || !same(inspectionFor(batch.result), batch.result))) throw Error('invalid-saved-state');
    if (Object.hasOwn(batch, 'received')) {
      const r = batch.received;
      if (!batch.result || !object(r) || !completeProof(r) || !integer(r.day) || r.day < Math.max(...batch.receipts.map(row => row.day)) || !same(r, receivedFor(batch, r))) throw Error('invalid-saved-state');
    } else if (i !== value.batches.length - 1) throw Error('invalid-saved-state');
    previous = batch;
  }
  if (value.frontier !== (previous?.throughSerial ?? value.baseline)) throw Error('invalid-saved-state');
  return copy(value);
}

/** readReceipts(after) is the official ledger's narrow, read-only source:
 * {lastTransaction, receipts}. Receipts contain only settled duty source fields
 * and have transaction serials greater than after. lastTransaction includes
 * expense serials, but expense data never leaves the authoritative ledger.
 *
 * Construction captures the old-history cutoff exactly once. Even a failed
 * activation leaves that disabled plan in snapshot(), so an ordinary world
 * save and cold load cannot silently skip receipts paid during the retry.
 * No date is interpreted as a payment date; late-paid old duty uses its new
 * transaction serial. Original amounts/contracts are never repriced.
 *
 * Every durable transition saves a detached frozen candidate synchronously
 * before adopting it. False, {ok:false}, a throw, and a Promise reject it.
 * report()/restoreReport() only bind an ephemeral exact-day audience header;
 * they cannot freeze receipts, complete an audit, or acknowledge a report.
 */
export function createChinaGranaryAudit({readReceipts = () => null, readAuthority = null, saved, saveState} = {}) {
  if (typeof readReceipts !== 'function' || saveState !== undefined && typeof saveState !== 'function') throw TypeError('granary audit requires synchronous callbacks');
  let current = null, loadError = null, busy = false;
  const preparedReports = new Map();
  function source(after) {
    const value = readReceipts(after);
    if (!object(value) || !integer(value.lastTransaction) || value.lastTransaction < after || !Array.isArray(value.receipts)) throw Error('source-unavailable');
    let last = after;
    const receiptIds = new Set(), dutyIds = new Set();
    const receipts = value.receipts.map(raw => {
      const receipt = receiptFor(raw), n = serial(receipt.id), dutyId = JSON.stringify([receipt.actorId, receipt.day]);
      if (n <= last || n > value.lastTransaction || receiptIds.has(receipt.receiptId) || dutyIds.has(dutyId)) throw Error('source-mismatch');
      last = n; receiptIds.add(receipt.receiptId); dutyIds.add(dutyId); return receipt;
    });
    return {lastTransaction: value.lastTransaction, receipts};
  }
  function matchesSources(batches) {
    const live = source(batches.length ? batches[0].fromSerial : current?.frontier ?? 0);
    if (live.lastTransaction < (current?.frontier ?? 0)) return false;
    // Compare the entire frozen serial interval, not just the rows still
    // present in a saved batch. A removed first/middle receipt must not let a
    // forged throughSerial silently consume an unaudited original duty.
    return batches.every(batch => same(batch.receipts, live.receipts.filter(row =>
      serial(row.id) > batch.fromSerial && serial(row.id) <= batch.throughSerial)));
  }
  if (saved !== undefined && saved !== null) {
    try { current = restore(saved); }
    catch { loadError = 'invalid-saved-state'; }
    if (current) {
      try { if (!matchesSources(current.batches)) loadError = 'source-mismatch'; }
      catch { loadError = 'source-unavailable'; }
    }
  } else {
    let baseline = null;
    try { baseline = source(0).lastTransaction; } catch {}
    current = {version: 1, enabled: false, baseline, frontier: baseline ?? 0, sequence: 0, batches: []};
  }
  const snapshot = () => current ? copy(current) : saved == null ? null : copy(saved);
  const pending = () => current?.batches.find(batch => !Object.hasOwn(batch, 'received')) ?? null;
  const unavailable = () => loadError ? failure(loadError) : busy ? failure('busy') : null;
  function persist(candidate) {
    if (!saveState) return failure('persistence-unavailable');
    try {
      const stored = saveState(freezeTree(copy(candidate)));
      if (stored && typeof stored.then === 'function') { Promise.resolve(stored).catch(() => {}); return failure('async-save-unsupported'); }
      if (stored === false || stored?.ok === false) return failure('save-failed');
      current = candidate;
      return {ok: true, replayed: false};
    } catch { return failure('save-failed'); }
  }
  function job() {
    if (loadError || busy || !current?.enabled) return null;
    const batch = pending();
    return !batch || batch.result ? null : {id: batch.id, batchId: batch.id, point: [...CHINA_GRANARY_AUDIT_POINT], look: [23, 1, 32.5],
      place: '仓务案', label: `核对本批${batch.receipts.length}份已结算俸禄回执`, minDuration: 15, maxDuration: 27};
  }
  function validReport(ref) {
    if (!validRef(ref)) return null;
    const batch = current?.batches.find(item => item.id === ref.batchId);
    return batch?.result && ref.day >= Math.max(...batch.receipts.map(row => row.day)) ? batch : null;
  }
  function restoreReport(ref) {
    if (loadError || busy) return false;
    const batch = validReport(ref);
    if (!batch) return false;
    if (batch.received) return same(ref, reportFor(batch, batch.received.day));
    preparedReports.set(batch.id, Object.freeze(copy(ref)));
    return true;
  }
  return {
    get loadError() { return loadError; }, snapshot, state: snapshot, job, inspection: job, restoreReport,
    activate() {
      const blocked = unavailable(); if (blocked) return blocked;
      if (current.enabled) return {ok: true, replayed: true};
      // A missing initial cutoff cannot be guessed after an ordinary save has
      // already preserved that unavailable plan. Never rebaseline a cold load.
      if (!integer(current.baseline)) return failure('baseline-unavailable');
      busy = true;
      try {
        if (!matchesSources([])) return failure('source-mismatch');
        return persist({...current, enabled: true});
      } catch { return failure('source-unavailable'); } finally { busy = false; }
    },
    prepare() {
      const blocked = unavailable(); if (blocked) return blocked;
      if (!current.enabled) return failure('not-active');
      const existing = pending();
      if (existing) return {ok: true, replayed: true, batch: copy(existing)};
      busy = true;
      try {
        const live = source(current.frontier), receipts = live.receipts.slice(0, BATCH_LIMIT);
        if (!receipts.length) return {ok: true, replayed: true, batch: null};
        if (!positive(current.sequence + 1)) return failure('batch-limit');
        const batch = {id: `cn-granary-audit-${current.sequence + 1}`, fromSerial: current.frontier,
          throughSerial: serial(receipts.at(-1).id), receipts, result: null};
        const result = persist({...current, frontier: batch.throughSerial, sequence: current.sequence + 1, batches: [...current.batches, batch].slice(-HISTORY_LIMIT)});
        return result.ok ? {...result, batch: copy(batch)} : result;
      } catch { return failure('source-unavailable'); } finally { busy = false; }
    },
    inspected(id, proof) {
      const blocked = unavailable(); if (blocked) return blocked;
      const batch = current.batches.find(item => item.id === id), result = inspectionFor(proof);
      if (!current.enabled || !batch || !batch.result && batch !== pending()) return failure('invalid-batch');
      if (!result) return failure('invalid-inspection');
      busy = true;
      try {
        if (!matchesSources([batch])) return failure('source-mismatch');
        // A successful save contains the still-at-desk life runtime. Its cold
        // replay can have a little more elapsed time, including after receipt.
        if (batch.result) return result.duration === batch.result.duration && result.elapsed >= batch.result.elapsed
          ? {ok: true, replayed: true} : failure('inspection-conflict');
        const candidate = snapshot(); candidate.batches.find(item => item.id === id).result = result;
        return persist(candidate);
      } catch { return failure('source-unavailable'); } finally { busy = false; }
    },
    report(day) {
      const blocked = unavailable(); if (blocked) return blocked;
      if (!integer(day)) return failure('invalid-day');
      const batch = pending();
      if (!batch) return {text: '禀陛下，尚无已完成核对的新俸禄批次，候有实据再奏。', response: '依实据核对，不得虚记钱粮。'};
      if (!batch.result) return {text: `禀陛下，本批${batch.receipts.length}份已结算俸禄回执尚待到案逐笔核对，未作核毕。`, response: '先到案核对原单，核毕再奏。'};
      const ref = reportFor(batch, day);
      if (!restoreReport(ref)) return failure('invalid-day');
      const amount = batch.receipts.reduce((total, row) => total + BigInt(row.amount), 0n).toString();
      return {auditReport: Object.freeze(ref), text: `禀陛下，已在仓务案逐笔核对本批${batch.receipts.length}份已结算俸禄回执，原单合计${amount}文，值勤与原俸额均依原据登记。`,
        response: '本批俸禄回执核对结果收讫，照原据入册。'};
    },
    acknowledgeReport(ref, proof) {
      const blocked = unavailable(); if (blocked) return blocked;
      const batch = validReport(ref);
      if (!batch) return failure('invalid-report');
      if (!completeProof(proof) || proof.reporterId !== ref.reporterId) return failure('invalid-proof');
      if (batch.received && (!sameCourtReceiptAuthority(batch.received, proof, readAuthority) || !same(batch.received, receivedFor(batch, ref, batch.received)))) return failure('receipt-conflict');
      if (!batch.received && readAuthority !== null && !sameCourtAuthority(proof.authority, readCourtAuthority(readAuthority))) return failure('authority-changed');
      if (!batch.received && readAuthority === null && Object.hasOwn(proof, 'authority')) return failure('invalid-proof');
      if (!batch.received && !same(ref, preparedReports.get(batch.id))) return failure('report-not-prepared');
      busy = true;
      try {
        if (!matchesSources([batch])) return failure('source-mismatch');
        if (batch.received) return {ok: true, replayed: true};
        const candidate = snapshot(); candidate.batches.find(item => item.id === batch.id).received = receivedFor(batch, ref, proof);
        const result = persist(candidate);
        if (result.ok) preparedReports.delete(batch.id);
        return result;
      } catch { return failure('source-unavailable'); } finally { busy = false; }
    },
    hasPending: () => !loadError && !!pending(),
  };
}
