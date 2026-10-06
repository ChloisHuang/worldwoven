import {GAME_MINUTES_PER_SECOND as RATE} from './simulation-clock.js';

// One durable unit for observed NPC attendance and that person's money. The
// world supplies physical coverage; only adjacent loaded clock samples earn it.
// Attendance, wages and meal-world patches share one synchronous save boundary.
const copy = structuredClone;
const integer = value => Number.isSafeInteger(value) && value >= 0;
const person = value => typeof value === 'string' && /^[a-z][a-z0-9]*-[a-z0-9-]{1,60}$/.test(value);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const same = (a, b) => {
 if (a === b) return true;
 if (!object(a) && !Array.isArray(a) || !object(b) && !Array.isArray(b) || Array.isArray(a) !== Array.isArray(b)) return false;
 const keys = Object.keys(a);
 return keys.length === Object.keys(b).length && keys.every(key => Object.hasOwn(b, key) && same(a[key], b[key]));
};
const key = ({actorId, roleId, day}) => JSON.stringify([actorId, roleId, day]);
const minutes = seconds => 600 + seconds * RATE;
const overlaps = (a, b) => a.startHour < b.endHour && b.startHour < a.endHour;
const failure = code => ({ok: false, code});

// Kept pure so other personal-account implementations can use the same rule.
// This does not grant cash or implement an ATM/withdrawal path.
export function npcMealSourceSplit(account, amount) {
 if (!account || !integer(account.cash) || !integer(account.bank) || !integer(account.cash + account.bank) || !integer(amount) || amount < 1) throw Error('invalid-npc-meal');
 if (account.cash + account.bank < amount) throw Error('insufficient-npc-funds');
 return {cash: Math.min(account.cash, amount), bank: Math.max(0, amount - account.cash)};
}

export function createNPCDutyAccount({role, roles = role ? [role] : [], namespace, saved, saveState = () => false} = {}) {
 if (typeof namespace !== 'string' || !/^[A-Za-z][A-Za-z0-9-]{0,79}$/.test(namespace) || ['constructor', 'prototype'].includes(namespace) || !Array.isArray(roles) || !roles.length) throw Error('invalid-npc-account-config');
 const definitions = new Map();
 for (const value of roles) {
  const window = value?.dutyWindow;
  if (!person(value?.id) || !person(value.slotId) || value.currency !== 'copper' || !integer(value.wage) || !window || !Number.isFinite(window.startHour) || !Number.isFinite(window.endHour) || window.startHour < 0 || window.endHour > 24 || window.startHour >= window.endHour || definitions.has(value.id)) throw Error('invalid-npc-account-role');
  definitions.set(value.id, copy(value));
 }
 const empty = () => ({version: 1, namespace, accounts: {}, rows: [], receipts: [], mealTransfers: []});
 function duty(input, closed) {
  const definition = definitions.get(input?.roleId);
  if (!definition || input.kind !== 'npc-observed-duty' || input.closed !== closed || !person(input.actorId) || input.slotId !== definition.slotId || !integer(input.day) || !Array.isArray(input.segments) || !input.segments.length) throw Error('invalid-npc-duty');
  let end = Math.max(definition.dutyWindow.startHour, input.day === 0 ? 10 : 0);
  const segments = input.segments.map(segment => {
   if (!integer(segment?.holderRevision) || !Number.isFinite(segment.startHour) || !Number.isFinite(segment.endHour) || segment.startHour < end || segment.endHour <= segment.startHour || segment.endHour > definition.dutyWindow.endHour) throw Error('invalid-npc-coverage');
   end = segment.endHour;
   return {startHour: segment.startHour, endHour: segment.endHour, holderRevision: segment.holderRevision};
  });
  const result = {kind: 'npc-observed-duty', closed, actorId: input.actorId, roleId: definition.id, slotId: definition.slotId, day: input.day, segments};
  if (!same(input, result)) throw Error('invalid-npc-duty');
  return result;
 }
 function wage(proof) {
  const evidence = duty(proof, true), definition = definitions.get(evidence.roleId);
  const hours = evidence.segments.reduce((total, segment) => total + segment.endHour - segment.startHour, 0);
  const amount = Math.floor(definition.wage * Math.min(1, hours / (definition.dutyWindow.endHour - definition.dutyWindow.startHour)) + 1e-9);
  if (!integer(amount)) throw Error('invalid-npc-wage');
  return {id: `${namespace}:wage:${evidence.roleId}:${evidence.actorId}:${evidence.day}`, source: 'npc-employer-payroll', currency: definition.currency, amount, evidence};
 }
 function rejectOverlap(proof, others) {
  for (const old of others) {
   if (proof.day !== old.day || proof.actorId !== old.actorId && proof.slotId !== old.slotId) continue;
   if (proof.segments.some(a => old.segments.some(b => overlaps(a, b)))) throw Error('overlapping-npc-coverage');
  }
 }
 function credit(state, receipt) {
  if (state.receipts.some(old => old.id === receipt.id)) throw Error('duplicate-npc-wage');
  rejectOverlap(receipt.evidence, state.receipts.map(old => old.evidence));
  const account = state.accounts[receipt.evidence.actorId] ??= {bank: 0, cash: 0};
  account.bank += receipt.amount;
  if (!integer(account.bank) || !integer(account.bank + account.cash)) throw Error('npc-balance-overflow');
  state.receipts.push(copy(receipt));
 }
 function transfer(state, input, kind) {
  if (!person(input?.actorId) || !/^cn-tavern-order-[1-9][0-9]*$/.test(input?.orderId || '') || !integer(input.amount) || input.amount < 1) throw Error('invalid-npc-meal');
  const paid = state.mealTransfers.find(old => old.orderId === input.orderId && old.kind === 'meal-payment');
  const refunded = state.mealTransfers.find(old => old.orderId === input.orderId && old.kind === 'meal-refund');
  if (kind === 'meal-payment' && paid || kind === 'meal-refund' && (!paid || refunded || paid.actorId !== input.actorId || paid.amount !== input.amount)) throw Error('npc-meal-conflict');
  const account = state.accounts[input.actorId];
  if (!account) throw Error('insufficient-npc-funds');
  const sourceSplit = kind === 'meal-payment' ? npcMealSourceSplit(account, input.amount) : copy(paid.sourceSplit);
  const sign = kind === 'meal-payment' ? -1 : 1;
  account.cash += sign * sourceSplit.cash;
  account.bank += sign * sourceSplit.bank;
  if (!integer(account.cash) || !integer(account.bank) || !integer(account.cash + account.bank)) throw Error('npc-balance-overflow');
  const record = {kind, id: `${namespace}:${kind}:${input.orderId}`, actorId: input.actorId, orderId: input.orderId, amount: input.amount, sourceSplit, wagesThrough: state.receipts.length};
  state.mealTransfers.push(record);
  return record;
 }

 let current = empty(), invalidSnapshot = null, loadError = null, lastError = null, anchor = null, dirty = false, busy = false, revision = 0;
 try {
  if (saved != null) {
   invalidSnapshot = copy(saved);
   if (saved.version !== 1 || saved.namespace !== namespace || !object(saved.accounts) || !Array.isArray(saved.rows) || !Array.isArray(saved.receipts) || !Array.isArray(saved.mealTransfers)) throw Error('invalid-npc-account');
   let transferIndex = 0;
   for (let wageIndex = 0; wageIndex <= saved.receipts.length; wageIndex++) {
    while (transferIndex < saved.mealTransfers.length && saved.mealTransfers[transferIndex].wagesThrough === wageIndex) {
     const old = saved.mealTransfers[transferIndex++];
     if (!['meal-payment', 'meal-refund'].includes(old.kind)) throw Error('invalid-npc-transfer');
     if (!same(old, transfer(current, old, old.kind))) throw Error('invalid-npc-transfer');
    }
    if (wageIndex === saved.receipts.length) break;
    const old = saved.receipts[wageIndex], receipt = wage(old?.evidence);
    if (!same(old, receipt)) throw Error('invalid-npc-receipt');
    credit(current, receipt);
   }
   const seen = new Set(current.receipts.map(receipt => key(receipt.evidence)));
   for (const old of saved.rows) {
    const row = duty(old, false);
    if (seen.has(key(row))) throw Error('duplicate-npc-duty');
    rejectOverlap(row, [...current.rows, ...current.receipts.map(receipt => receipt.evidence)]);
    seen.add(key(row)); current.rows.push(row);
   }
   if (transferIndex !== saved.mealTransfers.length || !same(current, saved)) throw Error('invalid-npc-balance');
   invalidSnapshot = null;
  }
 } catch (error) { loadError = error.message; current = empty(); }
 let rowIndex, issued;
 const reindex = () => {
  rowIndex = new Map(current.rows.map(row => [key(row), row]));
  issued = new Set(current.receipts.map(receipt => key(receipt.evidence)));
 };
 reindex();
 function persist(next, record, patch = {}) {
  busy = true;
  try {
   const result = saveState(copy(next), record && copy(record), copy(patch));
   if (result === false || result?.ok === false || result?.then) { lastError = 'save-failed'; return false; }
   current = next; revision++; dirty = false; reindex(); lastError = null; return true;
  } catch { lastError = 'save-failed'; return false; }
  finally { busy = false; }
 }
 function coverageAt(coverage) {
  if (!Array.isArray(coverage)) return null;
  const valid = coverage.filter(value => {
   const definition = definitions.get(value?.roleId);
   return definition && value.slotId === definition.slotId && person(value.actorId) && integer(value.holderRevision) && value.alive !== false && value.available !== false && (value.status === undefined || value.status === 'npc');
  }).map(({actorId, roleId, slotId, holderRevision}) => ({actorId, roleId, slotId, holderRevision}));
  if (new Set(valid.map(value => value.actorId)).size !== valid.length || new Set(valid.map(value => value.slotId)).size !== valid.length) return null;
  return valid;
 }
 function prepareMeal(input, kind) {
  if (loadError || busy) return failure(loadError || 'npc-ledger-busy');
  // Validate even replay input. An order belongs to its original payer forever.
  if (!person(input?.actorId) || !/^cn-tavern-order-[1-9][0-9]*$/.test(input?.orderId || '') || !integer(input.amount) || input.amount < 1) return failure('invalid-npc-meal');
  if (kind === 'meal-payment' && current.mealTransfers.some(record => record.kind === 'meal-refund' && record.orderId === input.orderId)) return failure('npc-meal-conflict');
  const old = current.mealTransfers.find(record => record.kind === kind && record.orderId === input.orderId);
  if (old && (old.actorId !== input.actorId || old.amount !== input.amount)) return failure('npc-meal-conflict');
  const baseRevision = revision, next = copy(current); let record;
  try { record = old || transfer(next, input, kind); }
  catch (error) { return failure(error.message); }
  let committed = false, locked = false;
  // A meal-only coordinator locks every participant before its one whole-world
  // save. Exposed snapshots are detached; adoption always uses this candidate.
  const valid = () => !loadError && !committed && !busy && revision === baseRevision;
  return {ok: true, snapshot: copy(next), patch: {[namespace]: copy(next)}, transfer: copy(record), balanceAfter: next.accounts[input.actorId].cash + next.accounts[input.actorId].bank,
   valid, lock() { if (!valid()) return false; busy = true; locked = true; return true; },
   release() { if (locked) { locked = false; busy = false; } },
   committed() {
    if (committed) return {ok: true, replayed: true};
    if (!locked || revision !== baseRevision) return failure('stale-npc-meal');
    current = next; revision++; dirty = false; reindex(); lastError = null; committed = true;
    return {ok: true, replayed: !!old};
   }, commit(patch = {}) {
   if (committed) return {ok: true, replayed: true};
   if (busy || revision !== baseRevision) return failure('stale-npc-meal');
   if (!object(patch) || Object.hasOwn(patch, namespace)) return failure('invalid-npc-meal-patch');
   if (!persist(next, record, patch)) return failure(lastError);
   committed = true; return {ok: true, replayed: !!old};
  }};
 }
 return {
  get loadError() { return loadError; }, get lastError() { return lastError; },
  snapshot: () => copy(loadError ? invalidSnapshot : current),
  account: id => loadError ? null : copy(Object.hasOwn(current.accounts, id) ? current.accounts[id] : {bank: 0, cash: 0}),
  hasIncome: id => !loadError && current.receipts.some(receipt => receipt.evidence.actorId === id && receipt.amount > 0),
  // A zero-portion provider still guards the shared order-ID namespace while
  // another employer's payment is persisted. No balance is adopted by a guard.
  prepareMealGuard() {
   const baseRevision = revision; let locked = false;
   const valid = () => !loadError && !busy && revision === baseRevision;
   return {valid, lock() { if (!valid()) return false; busy = true; locked = true; return true; }, release() { if (locked) { locked = false; busy = false; } }};
  },
  mealAccountIdentity: () => ({version: 1, namespace, currency: 'copper', roleIds: [...definitions.keys()].sort()}),
  mealTransfer: (orderId, kind) => loadError ? null : copy(current.mealTransfers.find(row => row.orderId === orderId && row.kind === kind) || null),
  prepareMealPayment: input => prepareMeal(input, 'meal-payment'),
  prepareMealRefund: input => prepareMeal(input, 'meal-refund'),
  suspend() { anchor = null; },
  observe({seconds, dt, coverage = []} = {}) {
   if (loadError || busy) { anchor = null; return false; }
   const valid = coverageAt(coverage);
   const now = Number.isFinite(seconds) && seconds >= 0 && minutes(seconds) <= Number.MAX_SAFE_INTEGER ? seconds : null;
   const previous = anchor;
   anchor = now !== null && valid && Number.isFinite(dt) && dt > 0 && dt <= .25 ? {seconds: now, coverage: valid} : null;
   if (!anchor || !previous || now <= previous.seconds || Math.abs(now - previous.seconds - dt) > 1e-7) return false;
   const start = minutes(previous.seconds), finish = minutes(now), additions = [];
   for (const entry of valid) {
    if (!previous.coverage.some(old => same(old, entry))) continue;
    const definition = definitions.get(entry.roleId);
    for (let day = Math.floor(start / 1440); day <= Math.floor(finish / 1440); day++) {
     const from = Math.max(start, day * 1440 + definition.dutyWindow.startHour * 60);
     const to = Math.min(finish, day * 1440 + definition.dutyWindow.endHour * 60);
     if (to <= from || issued.has(key({...entry, day}))) continue;
     const segment = {startHour: (from - day * 1440) / 60, endHour: (to - day * 1440) / 60, holderRevision: entry.holderRevision};
     const proof = {kind: 'npc-observed-duty', closed: false, actorId: entry.actorId, roleId: entry.roleId, slotId: entry.slotId, day, segments: [segment]};
     try { rejectOverlap(proof, [...current.rows, ...current.receipts.map(receipt => receipt.evidence), ...additions.map(value => value.proof)]); }
     catch (error) { lastError = error.message; return false; }
     const row = rowIndex.get(key(proof));
     if (row && segment.startHour < row.segments.at(-1).endHour) { lastError = 'nonmonotonic-npc-coverage'; return false; }
     additions.push({proof, segment, row});
    }
   }
   for (const {proof, segment, row} of additions) {
    if (!row) { current.rows.push(proof); rowIndex.set(key(proof), proof); }
    else {
     const tail = row.segments.at(-1);
     // Merge exactly adjacent samples only; preserve even very short real gaps.
     if (tail.holderRevision === segment.holderRevision && tail.endHour === segment.startHour) tail.endHour = segment.endHour;
     else row.segments.push(segment);
    }
   }
   if (additions.length) { dirty = true; revision++; }
   lastError = null; return true;
  },
  checkpoint({day, hour} = {}) {
   if (loadError || busy) { lastError = loadError || 'npc-ledger-busy'; return false; }
   if (!integer(day) || !Number.isFinite(hour) || hour < 0 || hour >= 24) { lastError = 'invalid-npc-clock'; return false; }
   const closed = current.rows.filter(row => row.day < day || row.day === day && hour >= definitions.get(row.roleId).dutyWindow.endHour);
   if (!dirty && !closed.length) { lastError = null; return true; }
   const next = copy(current), closedKeys = new Set(closed.map(key));
   try {
    for (const row of closed) credit(next, wage({...row, closed: true}));
    next.rows = next.rows.filter(row => !closedKeys.has(key(row)));
   } catch (error) { lastError = error.message; return false; }
   return persist(next);
  },
 };
}
