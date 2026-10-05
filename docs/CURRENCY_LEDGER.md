# Shared fictional currency ledger

`currency-ledger.js` supplies the shared wallet, bank, service holds and transaction receipts. These are game currencies only. `GAME_CURRENCIES` retains `copper` as Chinese copper (文), with provisional Japanese, Egyptian and French voucher labels. One voucher is configured as 2/3/4 copper-equivalent units; these fixed game rates are versioned, not market prices. Exchange rounds the received amount down with exact integer arithmetic, rejects zero output and never spends bank funds directly.

## Integration

Replace the old shared constructor in `main.js` with `createGameCurrencyLedger({saved, storage: gameStorage})`, retaining the variable name `copperLedger`. The injected preview storage remains authoritative. The constructor does not write on load. The first successful mutation atomically stores v2 at `saved.copperLedger`; the complete original valid v1 snapshot and journal remain under `legacyCopper`. Invalid saves lock mutations, report `invalid-saved-state`, and expose null balances; storage is never replaced.

Existing `earn`, `reserve`, `deposit`, `withdraw`, `openAccount`, `settle`, and `refund` calls default to copper. Existing helper wages and receipts retain their old behavior. A service hold permanently records its original currency. `refund(id)` and `settle(id)` look it up rather than consulting the player's current country.

Formal payroll calls `creditWageToBank({amount, receiptId, currency, roleId, slotId, day})`. New payroll accounts open in the same write as the credit. No cash is awarded. The caller owns the evidence of completed work, freezes the amount and currency, and reuses the same receipt after interrupted cleanup. A matching receipt returns success with `replayed:true` without another write or event; conflicting details fail. Missing persistence fails closed.

All mutations require a synchronous atomic save. The game wrapper serializes the complete game save before updating the enclosing in-memory object. False, throws and Promise results reject the operation and leave the live ledger unchanged. The persisted v2 `balances` is the only current balance source; `state().cash/bank/accountOpened/total` are derived copper compatibility fields, not duplicated persisted fields.

## Presentation contract

- `balances()` returns detached `{copper,japan,egypt,france}` buckets with `{cash,bank,held,accountOpened}`, or null when storage is invalid
- `snapshot()` returns lean `{version:2,balances,nextTransaction,loadError}`
- `history()` returns detached oldest-first legacy and new transactions. Legacy rows omit currency and mean copper
- `subscribeCommitted(listener)` returns an unsubscribe function. Only newly committed transactions are emitted; load and receipt replay emit nothing
- New rows contain `{id,requestId,action,currency,amount,before,after}` with complete before/after currency buckets. Wage rows also contain roleId/slotId/day; exchange rows contain their exact versioned quote
- Display currency quantities, not an invented inventory of individual banknote denominations. Artwork is a view of the aggregated balances

Animation is presentation only. It must never issue or replay a money command. Actions mean: `wage` job→bank; `withdraw` bank→wallet; `deposit` wallet→bank; `exchange` source wallet currency→target wallet currency; `reserve` wallet→held service funds; `refund` hold→original wallet currency; `settle` consumes an existing hold with no second wallet debit. `earn` remains the legacy helper→wallet event. Exceptions in animation listeners do not change transaction success; synchronous reentry is blocked.

`quoteExchange({from,to,amount})` returns `{ok,quote}`. `exchange({quote,requestId})` commits both cash changes together using that quote or fails. The rate version, input/output, numerator, denominator, rounding and fee must match. Game UI may call withdrawal/exchange only at the physically reached existing Chinese money-house counter. Other countries' bank locations are not supplied by this batch.

## Targeted validation

`node tests/currency-ledger.mjs` covers exact v1 migration with pending/settled holds and old receipts; one wage credit, metadata conflict and reload replay; new-account atomicity; failed/async/missing persistence; invalid/overflow amounts including refundable holds; atomic two-currency exchange, quote mismatches and nonprofitable round trips; original-currency refunds; animation listener isolation; corrupt-save lockout; and injected preview storage. `node tests/copper-ledger.mjs` remains the unchanged v1 behavioral baseline. Scenery and unrelated world systems are outside this check.

## Existing money-house counter

`createChinaMoneyHouseService` now requires `canSee: nearbyInteractionClear` from main. The existing intent system owns clicking/navigation and manual E arrival; the service rechecks same floor, less than 0.60 m from the authored counter point, and visibility before opening and before every mutation. Leaving closes the modal. Render/close generations invalidate old buttons, including buttons retained before an automatic payroll update.

The existing dialog selects a currency, separates bank savings from carried cash, explains atomic payroll-account creation, and displays the fixed rate and exact received quantity before exchange. Only this existing Chinese counter exposes these operations; no foreign building or remote withdrawal was added. It listens to committed events to refresh balances but never changes money from an event.

Additional checks: `node tests/china-money-house-banking.mjs` passes current counter UI against the real ledger, including failure, close/reopen, stale buttons, same-floor/visibility and refund-safe persistence. After main integration, `node --experimental-vm-modules tests/china-money-house-banking-main.cjs` passed the single existing-counter path (43.049 s, 620 MiB): intent navigation, bank-only wage, physical withdrawal, displayed-rate exchange once, modal input isolation, manual E reentry, and scene cleanup. This is production main with a simulated DOM/renderer, not browser visual evidence. Existing Chinese helper, French gardener (9 checks), and Japanese performance-payment tests also passed with only their ledger factory switched to v2, retaining original copper behavior.

Source-only build passed with 138 assets and no retained prior graph. The fresh worktree lacked some old published hashes, so the normal retained-graph build could not run there; publication must retain the prior graph in the integration workspace. No old scene/model/art changes were needed.
