import {npcMealSourceSplit} from './npc-duty-account.js';

// A completed physical job and its private bank credit share one save boundary
// with the controller's world patch. No clock, starting purse or treasury gate.
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
const validMeal = input => object(input) && person(input.actorId) && typeof input.orderId === 'string' && /^cn-tavern-order-[1-9][0-9]*$/.test(input.orderId) && integer(input.amount) && input.amount > 0;

export function createNPCPieceworkAccount({role, namespace, saved, saveState = () => false} = {}) {
 if (typeof namespace !== 'string' || !/^[A-Za-z][A-Za-z0-9-]{0,79}$/.test(namespace) || ['constructor', 'prototype'].includes(namespace) || typeof saveState !== 'function') throw Error('invalid-npc-piecework-config');
 if (!person(role?.id) || !person(role.slotId) || role.currency !== 'copper' || !integer(role.amount) || role.amount < 1 || !integer(role.contractVersion) || role.contractVersion < 1 || typeof role.employer !== 'string' || !role.employer.trim()) throw Error('invalid-npc-piecework-role');
 const definition = copy(role);
 const empty = () => ({version: 1, namespace, accounts: {}, receipts: [], mealTransfers: []});
 function completedWork(input) {
  if (!object(input) || input.kind !== 'npc-edict-piecework' || input.version !== 1 || !person(input.actorId) || input.roleId !== definition.id || input.slotId !== definition.slotId || !integer(input.holderRevision) || !integer(input.day) || input.documentId !== `cn-edict-east-shore:${input.day}` || input.audienceId !== `cn-morning-audience:${input.day}` || input.amount !== definition.amount || input.contractVersion !== definition.contractVersion || !object(input.steps) || input.steps.received !== true || input.steps.filed !== true || input.steps.sweepSeconds !== 7) throw Error('invalid-npc-piecework-proof');
  const evidence = {kind: 'npc-edict-piecework', version: 1, actorId: input.actorId, roleId: definition.id, slotId: definition.slotId, holderRevision: input.holderRevision, documentId: input.documentId, audienceId: input.audienceId, day: input.day, amount: definition.amount, contractVersion: definition.contractVersion, steps: {received: true, filed: true, sweepSeconds: 7}};
  if (!same(input, evidence)) throw Error('invalid-npc-piecework-proof');
  // The work belongs to the original document, even after a holder change or
  // inquiry/reissue. Actor and holder revision must never create another fee.
  return {id: `${namespace}:piecework:${definition.id}:${evidence.documentId}`, source: 'npc-government-piecework', employer: definition.employer, currency: definition.currency, amount: definition.amount, evidence};
 }
 function credit(state, receipt) {
  if (state.receipts.some(old => old.id === receipt.id)) throw Error('duplicate-npc-piecework');
  const account = state.accounts[receipt.evidence.actorId] ??= {bank: 0, cash: 0};
  account.bank += receipt.amount;
  if (!integer(account.bank) || !integer(account.cash) || !integer(account.bank + account.cash)) throw Error('npc-balance-overflow');
  state.receipts.push(copy(receipt));
 }
 function transfer(state, input, kind) {
  if (!validMeal(input)) throw Error('invalid-npc-meal');
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
  const record = {kind, id: `${namespace}:${kind}:${input.orderId}`, actorId: input.actorId, orderId: input.orderId, amount: input.amount, sourceSplit, receiptsThrough: state.receipts.length};
  state.mealTransfers.push(record);
  return record;
 }

 let current = empty(), invalidSnapshot = null, loadError = null, lastError = null, busy = false, revision = 0;
 try {
  if (saved != null) {
   invalidSnapshot = copy(saved);
   if (!object(saved) || saved.version !== 1 || saved.namespace !== namespace || !object(saved.accounts) || !Array.isArray(saved.receipts) || !Array.isArray(saved.mealTransfers)) throw Error('invalid-npc-piecework-account');
   let transferIndex = 0;
   // Reconstruct each balance at the exact point a payment/refund happened.
   // Checking only final totals would let a later job fund an earlier meal.
   for (let receiptIndex = 0; receiptIndex <= saved.receipts.length; receiptIndex++) {
    while (transferIndex < saved.mealTransfers.length && saved.mealTransfers[transferIndex]?.receiptsThrough === receiptIndex) {
     const old = saved.mealTransfers[transferIndex++];
     if (!['meal-payment', 'meal-refund'].includes(old.kind) || !same(old, transfer(current, old, old.kind))) throw Error('invalid-npc-transfer');
    }
    if (receiptIndex === saved.receipts.length) break;
    const old = saved.receipts[receiptIndex], receipt = completedWork(old?.evidence);
    if (!same(old, receipt)) throw Error('invalid-npc-piecework-receipt');
    credit(current, receipt);
   }
   if (transferIndex !== saved.mealTransfers.length || !same(current, saved)) throw Error('invalid-npc-balance');
   invalidSnapshot = null;
  }
 } catch (error) {
  loadError = error.message;
  current = empty();
 }
 const fail = code => { lastError = code; return {ok: false, code}; };
 const snapshot = () => copy(loadError ? invalidSnapshot : current);
 function persist(next, record, patch) {
  busy = true;
  try {
   const result = saveState(copy(next), copy(record), copy(patch));
   if (result === false || result?.ok === false || result?.then) { lastError = 'save-failed'; return false; }
   current = next; revision++; lastError = null; return true;
  } catch { lastError = 'save-failed'; return false; }
  finally { busy = false; }
 }
 function prepareMeal(input, kind) {
  if (loadError || busy) return fail(loadError || 'npc-ledger-busy');
  // Validate replay too; the original payer and amount stay pinned forever.
  if (!validMeal(input)) return fail('invalid-npc-meal');
  if (kind === 'meal-payment' && current.mealTransfers.some(record => record.kind === 'meal-refund' && record.orderId === input.orderId)) return fail('npc-meal-conflict');
  const old = current.mealTransfers.find(record => record.kind === kind && record.orderId === input.orderId);
  if (old && (old.actorId !== input.actorId || old.amount !== input.amount)) return fail('npc-meal-conflict');
  const baseRevision = revision, next = copy(current); let record;
  try { record = old || transfer(next, input, kind); }
  catch (error) { return fail(error.message); }
  let committed = false;
  return {ok: true, snapshot: copy(next), balanceAfter: next.accounts[input.actorId].cash + next.accounts[input.actorId].bank, commit(patch = {}) {
   if (committed) return {ok: true, replayed: true};
   if (busy || revision !== baseRevision) return fail('stale-npc-meal');
   if (!object(patch) || Object.hasOwn(patch, namespace)) return fail('invalid-npc-meal-patch');
   if (!persist(next, record, patch)) return fail(lastError);
   committed = true; return {ok: true, replayed: !!old};
  }};
 }
 return {
  get loadError() { return loadError; }, get lastError() { return lastError; },
  // Keep a rejected save visible, never expose it as a valid empty account or
  // let a caller checkpoint zeroes over the corrupt evidence.
  snapshot, state: snapshot,
  account: id => loadError ? null : copy(Object.hasOwn(current.accounts, id) ? current.accounts[id] : {bank: 0, cash: 0}),
  hasIncome: id => !loadError && current.receipts.some(receipt => receipt.evidence.actorId === id && receipt.amount > 0),
  prepareMealPayment: input => prepareMeal(input, 'meal-payment'),
  prepareMealRefund: input => prepareMeal(input, 'meal-refund'),
  settle(proof, patch = {}) {
   if (loadError || busy) return fail(loadError || 'npc-ledger-busy');
   if (!object(patch) || Object.hasOwn(patch, namespace)) return fail('invalid-npc-piecework-patch');
   let receipt, next;
   try {
    receipt = completedWork(proof);
    const old = current.receipts.find(value => value.id === receipt.id);
    if (old) {
     if (!same(old, receipt)) return fail('npc-piecework-conflict');
     lastError = null; return {ok: true, replayed: true, receipt: copy(old)};
    }
    next = copy(current); credit(next, receipt);
   } catch (error) { return fail(error.message); }
   if (!persist(next, receipt, patch)) return fail(lastError);
   return {ok: true, replayed: false, receipt: copy(receipt)};
  },
 };
}
