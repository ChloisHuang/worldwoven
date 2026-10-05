// Temporary agreements keep their original copper amount and work receipt.
// The shared ledger remains the only money/receipt journal, including old cash
// payments. A paid receipt wins over the current date after interrupted cleanup.
export function settleTemporaryWage({ledger, job, amount, roleId, getClock, saveJob}) {
  const receiptId = job.receiptId;
  const previous = ledger.history().find(tx => tx.requestId === receiptId && !['settle', 'refund'].includes(tx.action));
  if (previous) {
    if (previous.amount !== amount || (previous.currency ?? 'copper') !== 'copper') return {ok: false, code: 'request-conflict'};
    if (previous.action === 'earn') return {...ledger.earn(amount, receiptId), legacyCash: true};
    if (previous.action !== 'wage') return {ok: false, code: 'request-conflict'};
    if (typeof ledger.creditWageToBank !== 'function') return {ok: false, code: 'bank-unavailable'};
    return ledger.creditWageToBank({amount: previous.amount, receiptId, currency: previous.currency,
      roleId: previous.roleId, slotId: previous.slotId, day: previous.day});
  }
  if (typeof ledger.creditWageToBank !== 'function') return {ok: false, code: 'bank-unavailable'};
  // Old pending slips have no known historic completion day. Record this real
  // first settlement day instead, never infer a date from their work serial.
  const day = job.settlementDay ?? getClock?.()?.day;
  if (!Number.isSafeInteger(day) || day < 0) return {ok: false, code: 'clock-unavailable'};
  if (job.settlementDay == null && !saveJob({...job, settlementDay: day})) return {ok: false, code: 'save-failed'};
  return ledger.creditWageToBank({amount, receiptId, currency: 'copper', roleId, slotId: `${roleId}:temporary`, day});
}
