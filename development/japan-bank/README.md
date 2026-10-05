# Japan reception exchange desk

The unused southeast pocket of the existing ground-floor reception contains a
light-wood desk, original solid-stroke 両替 sign, stitched account book, inkstone
and divided ticket-counting tray. Customer anchor: `[9,0,6.2]`; teller bay:
`[9,0,8.35]`. Reception/queue, ramen, kitchen, public entry and stairs keep their
existing geometry. The two desk collision volumes end at 1.08 m, below upstairs
bath entrances. There is no new building or tall cabinet.

Sumie / 澄江 is one appended adult teller, age 42, with a stable station identity.
The original 14 service staff and three performance residents retain their
ordering and services. The teller uses the established bank work/conversation
behavior; there is no banker employment button.

The existing bank lifecycle slot selects `createBankCounterService` with Japan's
anchor, label and default currency. Ledger, ticket art, rates, receipt handling,
1% interest and save schema are unchanged; no starting funds or separate account
system are added. Main changes are imports, appearance selection and the existing
factory selection, plus the public station allowlist entry.

Verified 2026-10-05 on source `c1a3ffa`:

- `node tests/japan-exchange-counter.mjs`: Japan-bucket wage fixture, confirmed
  withdrawal/FX, original Japan ticket art, failed/stale/remote/cancel boundaries,
  persistence, local intent priority and bounded teller work/conversation
- `node tests/nearby-interaction-intents.mjs`: existing eligibility, floor,
  occlusion and service dispatch checks
- `npm run build`: 178 immutable assets, including the new bank module
- Guarded `development/japan-bank/check-main.cjs`: production-main route from
  the public approach `[0,0,14]` through the real entry to the counter and back
  outside. Manual cancellation, navigation-only arrival, manual E, explicit auto
  intent, shared-bank withdrawal/FX, modal movement lock and cleanup all passed.
  The wage is a fixture receipt through the established API, not a new payroll
  test. Existing payroll/shared-interest evidence is reused
- Inspected two offline Mesa images at normal close-TPS FOV 50, pitch .22 and
  distance 4.6; render canvas and camera aspect both 1000×750. Local evidence:
  `/workspace/shared/japan-bank-r1681-qa-1/01-counter-normal-view.png` and
  `02-counter-workspace.png`. Sign, desk, working teller, props and separate
  customer floor are visible. Draw calls 491/474; triangles 1,963,118/1,910,512;
  six-light budget unchanged. Guard passed in 34.322 s, tree peak 823.633 MiB

Scope: simulated DOM with production Three scene plus offline Mesa render, not
browser, iOS, device performance or all-country QA. An initial fixture assertion
counted Japan's automatically arriving visitor as an authored resident; it was
corrected to check the 18 authored stations separately. No product fix was needed.

To reproduce, use a fresh image output directory and the owner's heavy window:

    OUT_DIR=/workspace/shared/japan-bank-next-qa python scripts/guard-process-tree.py --seconds 300 --mib 1228.8 -- node --experimental-vm-modules development/japan-bank/check-main.cjs
