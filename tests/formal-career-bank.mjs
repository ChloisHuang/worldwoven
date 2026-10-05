// Real career + currency-ledger integration. Override only while the bank
// implementation lives in a parallel worktree; merged checkouts need no env.
import assert from 'node:assert/strict';
import {createFormalCareers, COURT_CLERK_ROLE} from '../source/game/formal-careers.js';
const {createCurrencyLedger} = await import(process.env.CURRENCY_LEDGER_MODULE ||
  new URL('../source/game/currency-ledger.js', import.meta.url).href);
const clone = value => JSON.parse(JSON.stringify(value));
let durable = {untouched: 'other game progress', currency: {
  version: 1, cash: 37, bank: 0, accountOpened: false, nextTransaction: 1, transactions: [],
}};
const events = [];
function load(day = 1, hour = 8) {
  const saved = clone(durable), clock = {day, hour, seconds: 0};
  const failures = {bank: false, career: false};
  function save(key, next) {
    const candidate = {...saved, [key]: next};
    durable = clone(candidate);
    saved[key] = next;
  }
  const bank = createCurrencyLedger({saved: saved.currency, saveState: next => {
    if (failures.bank) return false;
    save('currency', next);
  }});
  bank.subscribeCommitted(transaction => events.push({transaction,
    wasDurable: JSON.stringify(durable.currency.transactions.at(-1)) === JSON.stringify(transaction)}));
  const careers = createFormalCareers({worldSeed:785,saved: saved.careers, getClock: () => clock,
    creditWageToBank: bank.creditWageToBank, saveState: next => {
      if (failures.career) return false;
      save('careers', next);
    }});
  const ready = arrival => {
    clock.hour = arrival; assert(careers.beginDuty().ok);
    clock.hour = 11.5; assert(careers.dutyEvent('court-start').ok);
    clock.hour = 12; assert(careers.dutyEvent('court-completed').ok);
    assert(careers.dutyEvent('archive-completed').ok);
  };
  return {bank, careers, clock, failures, ready};
}
const qualification=createFormalCareers({saveState:()=>{},getClock:()=>({day:0,hour:8,seconds:0})}).state();qualification.skills.ritual=2;qualification.skills.writing=2;durable.careers=qualification;
const first = load();
for (const source of ['cn-rest', 'cn-calligraphy']) {
  for (let i = 0; i < 2; i++) {
    const issued = first.careers.learningTicket(source); assert(issued.ok);
    assert.equal(first.careers.completeLearning(issued.ticket, {seconds: 8}).gained, 1);
  }
}
assert(first.careers.apply(COURT_CLERK_ROLE.id, {ageYears: 22}).ok);
first.ready(10);
assert.equal(first.careers.state().lastDuty.wage, 20);
assert.equal(events.length, 0, 'study, hiring and duty completion do not emit money events');
const beforeFailure = clone(durable);
first.failures.bank = true;
assert.equal(first.careers.settle().code, 'save-failed');
assert.deepEqual(durable, beforeFailure);
assert.deepEqual([first.bank.state().cash, first.bank.state().bank, first.bank.state().accountOpened], [37, 0, false]);
assert.equal(events.length, 0, 'an uncommitted bank write cannot animate a deposit');

first.failures.bank = false; first.failures.career = true;
const credited = first.careers.settle();
assert(credited.ok && credited.cleanupPending && !credited.replayed);
assert.equal(credited.receiptId, 'career:cn-court-clerk-1:1');
assert.deepEqual([first.bank.state().cash, first.bank.state().bank, first.bank.state().accountOpened], [37, 20, true]);
assert.equal(durable.careers.lastDuty.stage, 'ready', 'failed cleanup retains the exact wage receipt');
assert.equal(events.length, 1); assert.equal(events[0].wasDurable, true);
assert.equal(events[0].transaction.action, 'wage');
assert.equal(events[0].transaction.after.copper.bank - events[0].transaction.before.copper.bank, 20);

const reloaded = load(2, 9);
assert.equal(reloaded.bank.loadError, null); assert(reloaded.careers.isHired());
assert.equal(events.length, 1, 'restore must not emit a transaction');
const replay = reloaded.careers.settle();
assert(replay.ok && replay.replayed && !replay.cleanupPending);
assert.equal(replay.receiptId, credited.receiptId);
assert.deepEqual([reloaded.bank.state().cash, reloaded.bank.state().bank], [37, 20]);
assert.equal(events.length, 1, 'receipt replay must not emit a second transaction');
assert.equal(reloaded.careers.settle().code, 'work-incomplete');
reloaded.ready(11.49);
const late = reloaded.careers.settle(); assert(late.ok && !late.replayed);
assert.equal(late.wage, 18);
assert.deepEqual([reloaded.bank.state().cash, reloaded.bank.state().bank], [37, 38]);
assert.equal(reloaded.bank.history().filter(transaction => transaction.action === 'wage').length, 2);
assert.equal(events.length, 2); assert(events.every(event => event.wasDurable));
assert.deepEqual(events.map(event => event.transaction.amount), [20, 18]);
assert.equal(durable.untouched, 'other game progress');
const final = load(2, 12);
assert.deepEqual([final.bank.state().cash, final.bank.state().bank], [37, 38]);
assert.equal(final.careers.state().lastDuty.stage, 'paid');
assert.equal(events.length, 2);
console.log('PASS formal career + real currency ledger: bank-only 20/18 wages, durable replay, failed saves and committed-only events');
