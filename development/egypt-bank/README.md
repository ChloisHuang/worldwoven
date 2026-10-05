# Egypt public court exchange counter

The active Egypt scene is `egypt-temple.js`; the older Egypt house in
`regions-west.js` is not the playable pyramid. A compact sandstone and timber
counter now sits east of the existing public reception. Its customer point is
`[3.9,0,7.65]`, with a separate staff bay at z=9.72 and a shallow papyrus cabinet
against the inner entry return. The central pyramid passage, east column,
reception desk, stairs, burial sequence and ritual rooms are unchanged.

Original solid strokes spell 兑换 above the counter. Papyrus account rolls,
counting tray and ticket/arrow reliefs make its purpose readable. The new teller,
奈赫特, is a stable 41-year-old adult with a linen tunic and blue trim. All 15
existing station records and their order are retained; the teller is appended.
This is a fictional localized game service, not a historical banking claim.

The existing `createBankCounterService` receives only local configuration. Its
central four-currency ledger, rates, interest, account schema, allocation slider,
confirmed FX, transaction receipts and original ticket images are unchanged.
Egypt is the initial currency; the user can select any existing currency. No
banking career, job registration, additional account or gifted money is added.

Verified 2026-10-05:

- `node tests/egypt-exchange-counter.mjs`: local factory/intent/appearance,
  Egyptian bank bucket, withdrawal, FX, original ticket art, persistence,
  save-failure, stale/repeated callbacks, cancel, distance/floor/visibility guards,
  and teller reading/counting/conversation bounded to the staff bay
- `node tests/currency-ledger.mjs` and
  `node tests/nearby-interaction-intents.mjs`: existing shared contracts pass
- `npm run build`: 178 immutable assets, no added dependency
- Guarded `development/egypt-bank/check-main.cjs`: actual production main starts
  at the desert spawn, crosses the thick pyramid entrance, reaches the counter,
  keeps navigation-only arrival closed, opens through E or explicit intent,
  confirms withdrawal/FX, then walks back out to the original sphinx station.
  It also checks manual navigation cancellation, modal movement lock, original
  authored actors, six-light budget and actor cleanup. The initial bank balance
  comes from a fixture wage receipt through the existing shared API; this does
  not imply that an Egypt employment provider has been implemented
- Two inspected normal third-person offline Mesa images at fov 50, pitch .22,
  requested distance 4.6, and matching 1000×750 renderer/camera dimensions:
  `/workspace/shared/egypt-bank-qa-3/01-counter-normal-view.png` and
  `02-counter-workspace.png`. The current camera collision naturally shortens
  the orbit beside the painted gateway. Counter/sign, player/teller separation,
  work surface and unchanged thick entrance remain readable
- Final guard: PASS in 19.427 s; process-tree peak 789.125 MiB, below the
  300 s / 1228.8 MiB caps. First witness attempts used an unregistered exit target
  and then a precision threshold intended for explicit interaction. The final
  witness uses the original sphinx station and production navigation-only
  arrival tolerance of .14 m (observed endpoint error .078 m). No production
  navigation behavior was changed for those fixture issues

This is targeted simulated-DOM/production-scene and offline-render evidence,
not browser, mobile performance or all-country validation. Shared bank dialog
layout and previously tested interest behavior reuse the existing evidence.

Reproduce with a fresh image directory and the coordinated heavy-test window:

    OUT_DIR=/workspace/shared/egypt-bank-next-qa python scripts/guard-process-tree.py --seconds 300 --mib 1228.8 -- node --experimental-vm-modules development/egypt-bank/check-main.cjs
