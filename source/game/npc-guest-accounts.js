// Employers keep their own strict income journals. This meal-only coordinator
// combines already-owned copper; it neither migrates balances nor creates pay.
export const NPC_GUEST_MEAL_PROVIDER = 'npc-personal-meal-accounts';
export const NPC_GUEST_MEAL_NAMESPACE = 'chinaGuestMealAccounts';
const copy = structuredClone;
const integer = value => Number.isSafeInteger(value) && value >= 0;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const same = (a, b) => {
 if (a === b) return true;
 if ((!object(a) && !Array.isArray(a)) || (!object(b) && !Array.isArray(b)) || Array.isArray(a) !== Array.isArray(b)) return false;
 const keys = Object.keys(a);
 return keys.length === Object.keys(b).length && keys.every(key => Object.hasOwn(b, key) && same(a[key], b[key]));
};
const validInput = input => object(input) && /^cn-[a-z0-9-]{1,60}$/.test(input.actorId || '') && /^cn-tavern-order-[1-9][0-9]*$/.test(input.orderId || '') && integer(input.amount) && input.amount > 0;
const validBalance = a => a && integer(a.cash) && integer(a.bank) && integer(a.cash + a.bank);
const failure = code => ({ok: false, code});

// Pure allocation rule. All owned cash precedes any bank money, including cash
// held by a later provider. Each employer still debits its own cash first.
export function npcGuestMealPortions(accounts, amount) {
 if (!integer(amount) || amount < 1 || !Array.isArray(accounts) || accounts.some(a => !validBalance(a))) throw Error('invalid-guest-meal');
 const total = accounts.reduce((sum, a) => sum + a.cash + a.bank, 0);
 if (!integer(total) || total < amount) throw Error('insufficient-guest-funds');
 const result = accounts.map(() => ({cash: 0, bank: 0})); let remaining = amount;
 for (const field of ['cash', 'bank']) for (let i = 0; i < accounts.length; i++) {
  result[i][field] = Math.min(accounts[i][field], remaining); remaining -= result[i][field];
 }
 return result;
}

export function createNPCGuestAccounts(providers, {saved, saveState = null} = {}) {
 const namespace = NPC_GUEST_MEAL_NAMESPACE, empty = () => ({version: 1, transfers: []});
 let current = empty(), loadError = null, invalidSnapshot = null, busy = false;
 const catalogue = providers.map(provider => ({...provider, identity: provider.economy.mealAccountIdentity?.() || null}));
 try {
  const ids = new Set(), economies = new Set(), namespaces = new Set(), roles = new Set();
  for (const p of catalogue) {
   if (typeof p.id !== 'string' || ids.has(p.id) || economies.has(p.economy) || p.id === NPC_GUEST_MEAL_PROVIDER) throw Error('ambiguous-guest-provider');
   ids.add(p.id); economies.add(p.economy);
   if (!p.identity) continue; // Historical single-provider adapters remain usable.
   const d = p.identity;
   if (d.version !== 1 || d.currency !== 'copper' || typeof d.namespace !== 'string' || d.namespace === namespace || namespaces.has(d.namespace) || !Array.isArray(d.roleIds) || !d.roleIds.length || d.roleIds.some(id => typeof id !== 'string' || roles.has(id)) || new Set(d.roleIds).size !== d.roleIds.length || !same(d, {version: 1, namespace: d.namespace, currency: 'copper', roleIds: d.roleIds})) throw Error('ambiguous-guest-provider');
   namespaces.add(d.namespace); for (const id of d.roleIds) roles.add(id);
  }
  if (saved != null) {
   invalidSnapshot = copy(saved);
   if (!object(saved) || saved.version !== 1 || !Array.isArray(saved.transfers) || !same(saved, {version: 1, transfers: saved.transfers})) throw Error('invalid-guest-meal-journal');
   validateHistory(saved); current = copy(saved); invalidSnapshot = null;
  }
  // Never reinterpret duplicate historical reserves as a fresh split order if
  // its coordinating evidence is absent. A legacy single source is unchanged.
  const orders = new Set(catalogue.flatMap(p => p.economy.mealTransferOrderIds?.() || p.economy.snapshot?.()?.mealTransfers?.map(row => row.orderId) || []));
  for (const orderId of orders) if (transfers(orderId, 'meal-payment').length > 1 && !entry(orderId, 'meal-payment')) throw Error('ambiguous-guest-meal');
 } catch (error) { loadError = error.message; if (saved != null) invalidSnapshot = copy(saved); }
 const unhealthy = () => loadError || catalogue.some(p => p.economy.loadError);
 // Fixed, replay-proven personal opening funds are ownership, not earned income.
 const ownsAccount = (p, id) => typeof p.economy.ownsPersonalMealAccount === 'function' ? p.economy.ownsPersonalMealAccount(id) : p.economy.hasIncome?.(id) === true;
 const owners = id => unhealthy() ? [] : catalogue.filter(p => ownsAccount(p, id));
 const providerFor = id => { const found = owners(id); return found.length > 1 ? NPC_GUEST_MEAL_PROVIDER : found[0]?.id || null; };
 const account = id => {
  const found = owners(id); if (!found.length) return null;
  const amounts = found.map(p => p.economy.account(id)); if (amounts.some(a => !validBalance(a))) return null;
  const result = amounts.reduce((sum, a) => ({cash: sum.cash + a.cash, bank: sum.bank + a.bank}), {bank: 0, cash: 0});
  return validBalance(result) ? result : null;
 };
 function transfers(orderId, kind) {
  return catalogue.flatMap(provider => {
   const row = provider.economy.mealTransfer ? provider.economy.mealTransfer(orderId, kind) : provider.economy.snapshot?.()?.mealTransfers?.find(r => r.orderId === orderId && r.kind === kind);
   return row ? [{provider, row}] : [];
  });
 }
 function entry(orderId, kind, state = current) { return state.transfers.find(row => row.orderId === orderId && row.kind === kind); }
 function verifyPortions(record, rows) {
  if (rows.length !== record.portions.length) return false;
  return record.portions.every(part => rows.some(({provider, row}) => provider.id === part.providerId && same(provider.identity, part.identity) && row.actorId === record.actorId && row.amount === part.amount && same(row.sourceSplit, part.sourceSplit)));
 }
 function validateHistory(state) {
  const seen = new Set();
  for (const record of state.transfers) {
   if (!validInput(record) || record.version !== 1 || !['meal-payment', 'meal-refund'].includes(record.kind) || !Array.isArray(record.portions) || !record.portions.length || !same(record, {version: 1, kind: record.kind, actorId: record.actorId, orderId: record.orderId, amount: record.amount, portions: record.portions})) throw Error('invalid-guest-meal-journal');
   const key = record.kind + ':' + record.orderId, sources = new Set(); let amount = 0;
   if (seen.has(key)) throw Error('duplicate-guest-meal'); seen.add(key);
   for (const part of record.portions) {
    const provider = catalogue.find(p => p.id === part.providerId);
    if (!provider?.identity || provider.economy.loadError || !same(part.identity, provider.identity) || sources.has(part.providerId) || !integer(part.amount) || part.amount < 1 || !validBalance(part.sourceSplit) || part.amount !== part.sourceSplit.cash + part.sourceSplit.bank || !same(part, {providerId: part.providerId, identity: part.identity, amount: part.amount, sourceSplit: part.sourceSplit})) throw Error('invalid-guest-meal-portion');
    sources.add(part.providerId); amount += part.amount;
   }
   if (!integer(amount) || amount !== record.amount) throw Error('invalid-guest-meal-total');
   if (record.kind === 'meal-refund') {
    const paid = entry(record.orderId, 'meal-payment', state);
    if (!seen.has('meal-payment:' + record.orderId) || !paid || paid.actorId !== record.actorId || paid.amount !== record.amount || !same(paid.portions, record.portions)) throw Error('invalid-guest-meal-refund');
   }
   if (!verifyPortions(record, transfers(record.orderId, record.kind))) throw Error('unverified-guest-meal-portion');
  }
  for (const paid of state.transfers.filter(row => row.kind === 'meal-payment')) {
   if (!entry(paid.orderId, 'meal-refund', state) && transfers(paid.orderId, 'meal-refund').length) throw Error('unrecorded-guest-meal-refund');
  }
 }
 function prepare(input, kind, pinnedProvider = null) {
  if (unhealthy() || busy) return failure(loadError || 'guest-account-unavailable');
  if (!validInput(input)) return failure('invalid-guest-meal');
  const paid = entry(input.orderId, 'meal-payment'), refunded = entry(input.orderId, 'meal-refund');
  const payments = transfers(input.orderId, 'meal-payment'), refunds = transfers(input.orderId, 'meal-refund');
  if (pinnedProvider && pinnedProvider !== NPC_GUEST_MEAL_PROVIDER) {
   const provider = catalogue.find(p => p.id === pinnedProvider);
   if (paid || !provider || !ownsAccount(provider, input.actorId) || payments.some(p => p.provider !== provider) || refunds.some(p => p.provider !== provider)) return failure('guest-provider-conflict');
   return provider.economy[kind === 'meal-payment' ? 'prepareMealPayment' : 'prepareMealRefund'](input);
  }
  if (!paid && (payments.length || refunds.length)) {
   // A historical single-provider order remains that provider's order forever.
   // Multiple old reserves are ambiguous unless a split journal proves them.
   if (pinnedProvider === NPC_GUEST_MEAL_PROVIDER || payments.length !== 1 || refunds.some(p => p.provider !== payments[0].provider)) return failure('ambiguous-guest-meal');
   return payments[0].provider.economy[kind === 'meal-payment' ? 'prepareMealPayment' : 'prepareMealRefund'](input);
  }
  if (paid && (paid.actorId !== input.actorId || paid.amount !== input.amount) || kind === 'meal-payment' && refunded) return failure('guest-meal-conflict');
  if (kind === 'meal-refund' && !paid) return failure('guest-meal-unpaid');
  let portions;
  if (paid) {
   if (!verifyPortions(paid, payments) || (refunded ? !verifyPortions(refunded, refunds) : refunds.length)) return failure('unverified-guest-meal-portion');
   portions = paid.portions;
  } else {
   const found = owners(input.actorId);
   if (!found.length) return failure('guest-account-unavailable');
   if (found.length === 1 && !pinnedProvider) return found[0].economy.prepareMealPayment(input);
   if (found.some(p => !p.identity)) return failure('guest-participant-unavailable');
   try {
    const splits = npcGuestMealPortions(found.map(p => p.economy.account(input.actorId)), input.amount);
    portions = found.map((p, i) => ({providerId: p.id, identity: copy(p.identity), amount: splits[i].cash + splits[i].bank, sourceSplit: splits[i]})).filter(part => part.amount > 0);
   } catch (error) { return failure(error.message); }
  }
  if (typeof saveState !== 'function') return failure('guest-persistence-unavailable');
  const candidates = portions.map(part => {
   const provider = catalogue.find(p => p.id === part.providerId);
   return {part, candidate: provider.economy[kind === 'meal-payment' ? 'prepareMealPayment' : 'prepareMealRefund']({...input, amount: part.amount})};
  });
  if (candidates.some(({part, candidate: c}) => !c?.ok || !c.valid || !c.lock || !c.release || !c.committed || !same(c.transfer?.sourceSplit, part.sourceSplit))) return failure('guest-participant-unavailable');
  // Even a zero-portion provider must not introduce another receipt for this
  // order between preparation and save, or reentrantly inside the save callback.
  const guards = catalogue.filter(p => !portions.some(part => part.providerId === p.id)).map(p => p.economy.prepareMealGuard?.());
  if (guards.some(guard => !guard?.valid || !guard.lock || !guard.release)) return failure('guest-participant-unavailable');
  const participants = [...candidates.map(({candidate}) => candidate), ...guards];
  const old = entry(input.orderId, kind), record = old || {version: 1, kind, actorId: input.actorId, orderId: input.orderId, amount: input.amount, portions: copy(portions)};
  const base = current, next = copy(current); if (!old) next.transfers.push(record);
  const before = account(input.actorId); if (!before) return failure('guest-account-unavailable');
  const balanceAfter = before.cash + before.bank + (old ? 0 : kind === 'meal-payment' ? -input.amount : input.amount);
  let accepted = false;
  return {ok: true, balanceAfter, snapshot: copy(next), commit(patch = {}) {
   if (accepted) return {ok: true, replayed: true};
   if (busy || current !== base || participants.some(candidate => !candidate.valid())) return failure('stale-guest-meal');
   if (!object(patch) || Object.hasOwn(patch, namespace) || catalogue.some(p => p.identity && Object.hasOwn(patch, p.identity.namespace))) return failure('invalid-guest-meal-patch');
   const locked = []; busy = true;
   try {
    // Some native purses require a full original order even for a partial debit.
    // Only this private coordinating record may establish the full-price split.
    if (candidates.some(({candidate}) => candidate.validateMealWorld && candidate.validateMealWorld(copy(patch), copy(record)) !== true)) return failure('invalid-guest-meal-world');
    for (const candidate of participants) { if (!candidate.lock()) return failure('stale-guest-meal'); locked.push(candidate); }
    const providerPatch = Object.assign({}, ...candidates.map(({candidate}) => candidate.patch));
    const result = saveState(copy(next), {...copy(patch), ...copy(providerPatch)});
    if (result?.then) { Promise.resolve(result).catch(() => {}); return failure('async-save-unsupported'); }
    if (result === false || result?.ok === false) return failure('save-failed');
    for (const {candidate} of candidates) if (!candidate.committed()?.ok) throw Error('guest-adoption-conflict');
    current = next; accepted = true; return {ok: true, replayed: !!old};
   } catch { return failure('save-failed'); }
   finally { for (const candidate of locked) candidate.release(); busy = false; }
  }};
 }
 function validMealLease(lease, order) {
  if (unhealthy() || !order || order.customerId !== lease?.actorId || order.id !== lease.orderId) return false;
  const payments = transfers(order.id, 'meal-payment'), refunds = transfers(order.id, 'meal-refund');
  if (!order.collected) return !payments.length && !refunds.length && !entry(order.id, 'meal-payment') && (lease.accountProvider === NPC_GUEST_MEAL_PROVIDER ? providerFor(lease.actorId) === NPC_GUEST_MEAL_PROVIDER : catalogue.some(p => p.id === lease.accountProvider && ownsAccount(p, lease.actorId)));
  if (lease.accountProvider === NPC_GUEST_MEAL_PROVIDER) {
   const paid = entry(order.id, 'meal-payment');
   return !!paid && paid.actorId === lease.actorId && paid.amount === order.price && !entry(order.id, 'meal-refund') && !refunds.length && verifyPortions(paid, payments);
  }
  return !entry(order.id, 'meal-payment') && payments.length === 1 && payments[0].provider.id === lease.accountProvider && payments[0].row.actorId === lease.actorId && payments[0].row.amount === order.price && !refunds.length;
 }
 const api = {get loadError() { return loadError; }, snapshot: () => copy(loadError && invalidSnapshot ? invalidSnapshot : current), providerFor, account, hasIncome: id => !unhealthy() && catalogue.some(p => p.economy.hasIncome?.(id) === true), ownsPersonalMealAccount: id => owners(id).length > 0, validMealLease,
  prepareMealPayment: input => prepare(input, 'meal-payment'), prepareMealRefund: input => prepare(input, 'meal-refund'),
  forProvider(id) {
   if (id === NPC_GUEST_MEAL_PROVIDER) return {account, prepareMealPayment: input => prepare(input, 'meal-payment', id), prepareMealRefund: input => prepare(input, 'meal-refund', id)};
   const provider = catalogue.find(p => p.id === id); if (!provider) return null;
   return {account: actorId => !unhealthy() && ownsAccount(provider, actorId) ? provider.economy.account(actorId) : null, prepareMealPayment: input => prepare(input, 'meal-payment', id), prepareMealRefund: input => prepare(input, 'meal-refund', id)};
  },
 };
 return api;
}
