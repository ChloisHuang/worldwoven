# France reception bank counter

The existing music reception now contains a small green/ivory exchange desk,
ledger cabinet, original CHANGE lettering and one adult teller, Claire. The
original six actors retain their ordering and appearance inputs; the bank actor
is appended. The nearby piano, chairs, garden door and their geometry are intact.

`createBankCounterService` configures the existing bank service with the France
station, approach, local name, French default currency and south-facing teller.
`createChinaMoneyHouseService` retains its API, station, defaults and request-ID
prefix. Both use the existing central ledger, allocation slider, confirmed FX,
original ticket images and transaction receipts. Ledger/rate/interest/save-schema
code is unchanged. No banker career is added.

Main integration is limited to imports, the appearance wrapper in configureNPCs,
and the existing bank lifecycle factory selection. The public station allowlist
includes the counter; authored priority applies only within its 1.4 m prompt
radius, preserving the reception chairs' own approaches. Opening and submitting
still require the shared precise-arrival and visibility guards.

Verified 2026-10-05:

- `node tests/china-money-house-banking.mjs`: existing China/default UI boundary
  tests pass, including confirmed allocation, FX, stale/repeated clicks, failed
  save and cancel/reload
- `node tests/france-exchange-counter.mjs`: shared French wage bucket, withdrawal,
  FX into copper, original France art, failed/stale/remote/cancel boundaries,
  persisted four buckets, local intent priority and bounded teller work/talking
- `node tests/nearby-interaction-intents.mjs`: existing public intent checks
- `npm run build`: 176 immutable assets; no new external dependency
- Guarded `development/france-bank/check-main.cjs`: one production-main France
  route from the garden path through the music-room doorway to the counter,
  cancel by manual movement, navigation-only arrival without auto-opening,
  manual E and explicit intent, confirmed shared-ledger withdrawal/FX, modal
  movement lock and actor cleanup. The wage is a fixture receipt credited through
  the same bank API; prior garden employment/payroll coverage is reused
- Two inspected offline Mesa frames at ordinary third-person fov 50, pitch .22,
  distance 4.6 show the counter, reading teller, ledger, cabinet/sign and retained
  piano/door context. Local outputs are
  `/workspace/shared/france-bank-r1678-qa-1/01-counter-normal-view.png` and
  `02-counter-workspace.png`. Calls 212/222; triangles 2,136,448/2,445,519; six-light
  budget unchanged. Guard passed in 36.432 s, process-tree peak 1005.699 MiB,
  below the 300 s / 1228.8 MiB cap

This is a focused simulated-DOM/production-scene and offline-render check, not
browser, iOS, mobile frame-rate or all-country validation. The shared bank dialog
layout and original ticket assets reuse existing UI evidence. Initial runs caught
missing methods in the older test DOM (prepend/getClientRects); the local fixture
uses the established substitutes without changing production behavior.

Reproduce the optional image capture with a fresh OUT_DIR under the owner's
heavy-test window:

    OUT_DIR=/workspace/shared/france-bank-next-qa python scripts/guard-process-tree.py --seconds 300 --mib 1228.8 -- node --experimental-vm-modules development/france-bank/check-main.cjs
