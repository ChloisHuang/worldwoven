// Reproduces lost/duplicated official salon escrow, spending unpaid salary,
// stealing a meal reserve, stale whole-world writes, and tampered old journals.
// Real office controller earns every starting coin; only travel is doubled.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createChinaOfficialEconomy, CHINA_OFFICIAL_IDS, CHINA_OFFICIAL_TAVERN_ID} from '../source/game/china-official-economy.js';
const copy = value => JSON.parse(JSON.stringify(value));
const [actorId, otherId] = CHINA_OFFICIAL_IDS, artistId = 'cn-tavern-reciter';
const policy = {version: 1, performerShareBps: 5000, rounding: 'floor'};
const order = (orderId = 'cn-salon-npc-1', amount = 40) => ({actorId, orderId, amount, artistId, activity: 'poetry', incomePolicy: copy(policy)});
const completed = input => ({...input, evidence: {kind: 'salon-service', completed: true, orderId: input.orderId,
  customerId: input.actorId, artistId: input.artistId, activity: input.activity, elapsed: 2.2, duration: 2.2}});
const code = (result, expected) => {assert.equal(result.ok, false); assert.equal(result.code, expected);};
const conserved = state => {
  const accounts = Object.values(state.accounts).reduce((n, a) => n + BigInt(a.bank) + BigInt(a.cash), 0n);
  const held = Object.values(state.salonHolds || {}).reduce((n, h) => n + (h.status === 'reserved' ? BigInt(h.amount) : 0n), 0n);
  const legacy = state.legacyFunding ? BigInt(state.legacyFunding.initialTreasury.amount - state.legacyFunding.treasury) : 0n;
  assert.equal(accounts + held + BigInt(state.destinations[CHINA_OFFICIAL_TAVERN_ID]), legacy + BigInt(state.governmentPaid));
};
function fixture(saved) {
  let durable = saved ? {chinaOfficialEconomy: copy(saved)} : {}, reject = false, day = 0, writes = 0;
  const appointed = new Set(CHINA_OFFICIAL_IDS);
  const economy = createChinaOfficialEconomy({saved, initialTreasury: undefined, isAppointed: id => appointed.has(id), getDay: () => day,
    saveState(next, tx, patch) {if (reject) return false; conserved(next); durable = {...durable, ...copy(patch), chinaOfficialEconomy: copy(next)}; writes++; return true;}});
  return {economy, appointed, get durable() {return copy(durable);}, get writes() {return writes;},
    set reject(v) {reject = v;}, set day(v) {day = v;}, externalWrite(candidate, patch) {
      assert(candidate.valid()); if (reject) return false;
      durable = {...durable, ...copy(patch), ...copy(candidate.patch)}; writes++; return candidate.committed();
    }};
}

// Actual court-completed -> desk archive for eight seconds -> earned certificate.
const context = vm.createContext({console}), modules = new Map(), source = path.resolve('source');
function module(file) {
  if (!modules.has(file)) modules.set(file, new vm.SourceTextModule(fs.readFileSync(file, 'utf8'), {context, identifier: file}));
  return modules.get(file);
}
const linker = (specifier, from) => module(specifier === 'three' ? path.join(source, 'vendor/three/build/three.module.js') : path.resolve(path.dirname(from.identifier), specifier));
const lifeModule = module(path.join(source, 'game/china-official-life.js')); await lifeModule.link(linker); await lifeModule.evaluate();
const facilitiesModule = module(path.join(source, 'game/npc-facilities.js')); await facilitiesModule.link(linker); await facilitiesModule.evaluate();
const threeModule = module(path.join(source, 'vendor/three/build/three.module.js'));
if (threeModule.status === 'unlinked') await threeModule.link(linker);
if (threeModule.status !== 'evaluated') await threeModule.evaluate();
const T = threeModule.namespace;
const B = modules.get(path.join(source, 'game/china-official-bureau.js')).namespace.CHINA_OFFICIAL_BUREAU;
const earned = fixture(), officials = CHINA_OFFICIAL_IDS.map((id, i) => {
  const root = new T.Group(); root.position.set(...B.offices[i]);
  return {station: {id}, root, home: root.position.clone(), phase: 0, route: [], animate() {}};
});
let day = 0, time = 0;
const life = lifeModule.namespace.createChinaOfficialLife({officials, npcs: officials, economy: earned.economy,
  lot: {colliders: [], walkableSurfaces: [], bounds: {minX: -40, maxX: 40, minZ: -40, maxZ: 40}},
  furniture: {items: [], facilities: facilitiesModule.namespace.createFacilityQueue()}, doors: {},
  planPath: (_, target) => [target], poseContext: () => ({}), safety: () => [], getClock: () => ({day}),
  travel(n, stage) {n.root.position.set(...stage.path.at(-1)); stage.arrived = true;}});
const tick = () => {time += .1; life.tick(.1, {hour: 10, day}); for (const npc of officials) life.update(npc, .1, time);};
assert.deepEqual(earned.economy.account(actorId), {cash: 0, bank: 0});
code(earned.economy.prepareSalonReserve(order()), 'insufficient-funds');
assert(!Object.hasOwn(earned.economy.snapshot(), 'salonHolds'));
for (day = 0; day < 4; day++) {
  earned.day = day;
  life.courtCompleted(day); officials.forEach(npc => life.resume(npc));
  if (day === 0) {
    earned.reject = true;
    for (let i = 0; i < 100; i++) tick();
    assert.equal(earned.economy.state().governmentPaid, 0, 'Completed but unpersisted duties cannot fund leisure');
    code(earned.economy.prepareSalonReserve(order()), 'insufficient-funds');
    earned.reject = false;
  }
  for (let i = 0; i < 1200 && officials.some(npc => earned.economy.account(npc.station.id).bank < (day + 1) * 24); i++) tick();
  for (const npc of officials) assert.equal(earned.economy.account(npc.station.id).bank, (day + 1) * 24);
}
life.dispose();
const payroll = earned.economy.snapshot();
assert.equal(payroll.transactions.length, 24); assert.equal(payroll.governmentPaid, 576);
assert(payroll.transactions.every(tx => tx.action === 'duty' && tx.evidence.completed && tx.evidence.audienceCompleted && tx.evidence.elapsed >= 8));
assert.equal(fixture(payroll).economy.loadError, null);
assert.deepEqual(fixture(payroll).economy.snapshot(), payroll, 'Loading old v2 without salon events adds no state or money');
console.log('PASS actual audience certificates and completed desk work fund salon only after confirmed saves; unchanged 24-copper wages and six fixed officials');

const boundary = fixture(payroll);
code(boundary.economy.prepareSalonReserve(order('cn-salon-npc-1', 95)), 'insufficient-meal-reserve');
const exact = boundary.economy.prepareSalonReserve(order('cn-salon-npc-1', 90)); assert(exact.ok);
assert(exact.commit().ok); assert.deepEqual(boundary.economy.account(actorId), {bank: 6, cash: 0});
assert.equal(boundary.economy.state().destinations[CHINA_OFFICIAL_TAVERN_ID], 0, 'A hold is never earned tavern revenue');
for (const bad of ['player', 'cn-tavern-host', artistId, 'visiting-official']) code(boundary.economy.prepareSalonReserve({...order(), actorId: bad}), 'invalid-actor');
for (const id of ['cn-salon-1-1', 'cn-salon-npc-0', 'cn-salon-npc-01', 'cn-salon-npc-9007199254740992', 'cn-salon-npc--1']) code(boundary.economy.prepareSalonReserve(order(id)), 'invalid-order-id');
for (const amount of [19, 21, 501]) code(boundary.economy.prepareSalonReserve(order('cn-salon-npc-2', amount)), 'invalid-salon-fee');
code(boundary.economy.prepareSalonReserve({...order(), artistId: 'cn-tavern-host'}), 'invalid-salon-artist');
code(boundary.economy.prepareSalonReserve({...order(), activity: 'banquet'}), 'invalid-salon-artist');
code(boundary.economy.prepareSalonReserve({...order(), incomePolicy: {...policy, performerShareBps: 7500}}), 'invalid-salon-income-policy');

// All cash, all bank, and mixed refunds restore the frozen source, even when
// a separate withdrawal happens between reserve and cancellation.
for (const cash of [0, 8, 96]) {
  const f = fixture(payroll), economy = f.economy, input = order();
  if (cash) assert(economy.withdraw({actorId, amount: cash, receiptId: 'prior-withdraw'}).ok);
  const before = economy.account(actorId), reserve = economy.prepareSalonReserve(input), split = {cash: Math.min(40, cash), bank: Math.max(0, 40 - cash)};
  assert(reserve.ok); assert.deepEqual(reserve.sourceSplit, split); assert.equal(economy.salonHold(input.orderId), null);
  const stored = f.durable, state = economy.snapshot(); f.reject = true;
  code(reserve.commit({chinaSalonNPC: {order: input}}), 'save-failed'); assert(reserve.valid());
  assert.deepEqual(economy.snapshot(), state); assert.deepEqual(f.durable, stored);
  reserve.snapshot.accounts[actorId].bank = 99999; reserve.candidate.governmentPaid = 99999; reserve.patch.chinaOfficialEconomy.governmentPaid = 99999;
  reserve.transaction.sourceSplit.bank = 99999; f.reject = false;
  assert(reserve.commit({chinaSalonNPC: {order: input}}).ok); assert(!reserve.valid());
  const count = f.writes; assert(reserve.commit().replayed); assert(economy.prepareSalonReserve(input).commit().replayed); assert.equal(f.writes, count);
  assert.equal(economy.nextSalonOrderId(), 'cn-salon-npc-2'); assert.deepEqual(economy.salonHold(input.orderId).sourceSplit, split);
  assert.equal(economy.snapshot().destinations[CHINA_OFFICIAL_TAVERN_ID], 0);
  const withWithdrawal = economy.account(actorId).bank > 0;
  if (withWithdrawal) assert(economy.withdraw({actorId, amount: 1, receiptId: 'during-hold-withdraw'}).ok);
  const reloaded = fixture(economy.snapshot()); assert.equal(reloaded.economy.loadError, null);
  reloaded.appointed.delete(actorId); // Loss of appointment cannot confiscate this original hold.
  const refund = reloaded.economy.prepareSalonRefund(input); assert(refund.ok); assert.deepEqual(refund.sourceSplit, split);
  reloaded.reject = true; code(refund.commit({chinaSalonNPC: {order: null}}), 'save-failed'); assert(refund.valid());
  assert.equal(reloaded.economy.salonHold(input.orderId).status, 'reserved'); reloaded.reject = false;
  assert(refund.commit({chinaSalonNPC: {order: null}}).ok);
  assert.deepEqual(reloaded.economy.account(actorId), {cash: before.cash + (withWithdrawal ? 1 : 0), bank: before.bank - (withWithdrawal ? 1 : 0)});
  assert(reloaded.economy.prepareSalonRefund(input).commit().replayed);
  reloaded.appointed.add(actorId);
  code(reloaded.economy.prepareSalonReserve(input), 'salon-already-refunded');
  code(reloaded.economy.prepareSalonSettle(completed(input)), 'salon-already-refunded');
  assert.equal(fixture(reloaded.economy.snapshot()).economy.loadError, null);
}
console.log('PASS original cash/bank split, six-copper meal retention, pending escrow separate from revenue, failed-save retry and pre-service cancellation across reload');

const f = fixture(payroll), e = f.economy, input = order();
const first = e.prepareSalonReserve(input), stale = e.prepareSalonReserve(order('cn-salon-npc-2'));
assert(first.commit({chinaSalonNPC: {order: input}}).ok); assert(!stale.valid()); code(stale.commit(), 'stale-candidate'); code(stale.committed(), 'stale-candidate');
for (const changes of [{actorId: otherId}, {amount: 45}, {artistId: 'cn-tavern-storyteller', activity: 'story'}]) {
  code(e.prepareSalonReserve({...input, ...changes}), 'request-conflict');
  code(e.prepareSalonRefund({...input, ...changes}), 'request-conflict');
  code(e.prepareSalonSettle(completed({...input, ...changes})), 'request-conflict');
}
code(e.prepareSalonRefund(order('cn-salon-npc-99')), 'salon-reserve-not-found');
code(e.prepareSalonSettle(input), 'incomplete-salon-service');
for (const change of [{completed: false}, {orderId: 'cn-salon-npc-9'}, {customerId: otherId}, {artistId: 'cn-tavern-storyteller'}, {activity: 'chess'}, {elapsed: 2.199}, {elapsed: Infinity}, {duration: 2.1}]) {
  const proof = completed(input); code(e.prepareSalonSettle({...proof, evidence: {...proof.evidence, ...change}}), 'incomplete-salon-service');
}
const finish = e.prepareSalonSettle(completed(input)); assert(finish.valid());
f.appointed.delete(actorId); assert(!finish.valid()); code(finish.commit(), 'actor-not-appointed'); code(finish.committed(), 'actor-not-appointed');
f.appointed.add(actorId); assert(finish.valid());
const beforeSettlement = f.durable; f.reject = true; assert.equal(f.externalWrite(finish, {chinaSalonNPC: {order: null}}), false);
assert.deepEqual(f.durable, beforeSettlement); assert.equal(e.salonHold(input.orderId).status, 'reserved');
f.reject = false; assert(f.externalWrite(finish, {chinaSalonNPC: {order: null}}).ok); assert(!finish.valid());
assert.equal(e.salonHold(input.orderId).status, 'settled'); assert.equal(e.state().destinations[CHINA_OFFICIAL_TAVERN_ID], 40);
const settled = e.history().at(-1); assert.equal(settled.action, 'salon-settle'); assert.equal(settled.artistId, artistId);
assert.equal(settled.activity, 'poetry'); assert.equal(settled.amount, 40); assert.deepEqual(settled.incomePolicy, policy); assert.deepEqual(settled.evidence, completed(input).evidence);
assert(finish.committed().replayed); assert(e.prepareSalonSettle(completed(input)).commit().replayed);
code(e.prepareSalonRefund(input), 'salon-already-settled'); code(e.prepareSalonReserve(input), 'salon-already-settled');
assert.equal(fixture(e.snapshot()).economy.loadError, null); assert.deepEqual(fixture(e.snapshot()).economy.snapshot(), e.snapshot());
const mutated = completed(input); mutated.evidence.elapsed = 3; code(e.prepareSalonSettle(mutated), 'request-conflict');
console.log('PASS synchronized coordinator hooks, stale/removed-appointment rejection, completion proof, frozen 50:50 terms and exactly-once terminal settlement');

// Independent v1 fixture: no new implementation creates its old receipts.
const old = {version: 1, initialTreasury: {amount: 100, sourceId: 'historical-budget'}, dailyWage: 24, treasury: 100,
  accounts: Object.fromEntries(CHINA_OFFICIAL_IDS.map(id => [id, {bank: 0, cash: 0}])), destinations: {[CHINA_OFFICIAL_TAVERN_ID]: 0}, nextTransaction: 1, transactions: []};
const oldBalances = () => ({treasury: old.treasury, accounts: copy(old.accounts), destinations: copy(old.destinations)});
for (const tx of payroll.transactions.filter(tx => tx.actorId === actorId).slice(0, 2)) {
  const before = oldBalances(); old.treasury -= 24; old.accounts[actorId].bank += 24;
  old.transactions.push({id: `official-${old.nextTransaction++}`, action: 'duty', actorId, amount: 24, receiptId: tx.receiptId,
    day: tx.day, evidence: copy(tx.evidence), from: 'official-treasury', to: `${actorId}:bank`, before, after: oldBalances()});
}
const legacy = fixture(old); assert.equal(legacy.economy.loadError, null); assert.deepEqual(legacy.economy.history(), old.transactions);
assert(legacy.economy.prepareSalonReserve(order()).commit().ok); assert.deepEqual(legacy.economy.history().slice(0, 2), old.transactions);
assert.equal(fixture(legacy.economy.snapshot()).economy.loadError, null); assert.equal(legacy.economy.account(actorId).bank, 8);
for (const change of [
  saved => {saved.salonHolds[input.orderId].amount++;},
  saved => {saved.salonHolds[input.orderId].status = 'reserved';},
  saved => {saved.salonHolds[input.orderId].sourceSplit.bank--;},
  saved => {saved.transactions.at(-1).evidence.completed = false;},
  saved => {saved.transactions.at(-1).evidence.customerId = otherId;},
  saved => {saved.transactions.at(-1).incomePolicy.performerShareBps = 7500;},
  saved => {saved.transactions.at(-1).artistId = 'cn-tavern-storyteller';},
  saved => {saved.transactions.at(-1).sourceSplit.bank--;},
  saved => {saved.transactions.at(-1).before.salonHolds[input.orderId].status = 'settled';},
  saved => {saved.transactions.at(-1).after.accounts[actorId].bank++;},
  saved => {delete saved.salonHolds;},
  saved => {saved.transactions.splice(saved.transactions.length - 2, 1);}
]) {
  const bad = e.snapshot(); change(bad); const broken = fixture(bad).economy;
  assert.equal(broken.loadError, 'invalid-saved-state'); assert.equal(broken.snapshot(), null); code(broken.prepareSalonReserve(order()), 'invalid-saved-state');
}
const injected = copy(payroll); injected.salonHolds = {}; assert.equal(fixture(injected).economy.loadError, 'invalid-saved-state');
console.log('PASS independent v1 migration and unchanged v2 replay; held/settled/source/proof tampering fails closed');
// Financial fixture only: real office controller archive receipts, no scene or
// needs completion. Consumers must independently run the actual body/service.
export const officialEarnedPayrollFixture=()=>copy(payroll);
