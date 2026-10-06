# Original-session receptionist work and personal life

The first two checkpoints follow dormant receipt/contract `b4937a3` (same tree saved privately as `b8188e6`); those checkpoints did not enable production main or needs. The R156-based integration is recorded separately below. No checkpoint adds visitors, initial funds, demand weight or wage changes. Preserve the R155 tea-lease fix and R156 archive paths when integrating.

## Physical defect found and bounded repair

The old desk center is 0.85 m from the original receptionist standing point, outside the ordinary writing pose's 0.57 m forward target. It also had no session-owned page or room plaque. Merely timing `calligraphy` there was insufficient evidence.

`china-salon-reception-props.js` now provides one original-session ledger page and one numbered room plaque at the near edge of the unchanged actual desk (tabletop y=8.875). The existing tea set, case, actor identity, body proportions, table geometry and standing point are unchanged. Registration writes the page; reservation lifts/slides the original plaque onto its reserved position; closure retrieves it and marks the original entry. The contract remains three bounded two-second operations, with the latter operation eligible only after actual original guest service.

Work accrues only when the original person's real rig produces a matching session/card/phase contact observation: pen tip within the actual page and 8 mm of its surface, or wrist at the authored palm/plaque contact within 8 mm. Iterative correction adjusts only the authored hand target; it does not relocate the page/person or stretch limb lengths to manufacture evidence. The current receptionist brush grip is adjusted locally, then the ordinary character animator resets it on the next action. A conversation freezes the existing physical grip and work time. Cancellation removes the original live page/plaque; an absent actor cannot leave a held plaque floating.

First visual review caught the initial plaque overlapping the writing area. The final narrower ledger and adjacent plaque positions remove that interference. A near-tip grip initially obscured the nib with the fingers; the final local grip leaves the actual nib visible against the page.

## Evidence and exact limits

- `node tests/china-salon-reception-service.mjs`: same original production salon/official settlement/artist/property/reception account path; final scenario uses the actual complete-adult Wenwan rig, brush and props without a contact double. It earns exactly one original 8-copper wage. Real held-card conversation preserves contact without work credit; cancellation clears the same props. Earlier cases use an explicitly labelled contact double to isolate transaction failures.
- `OUT=qa/salon-reception node development/salon-reception/contact.mjs`: 189 samples, original representative seeds 1/42/12345, registration/reservation/closure; final pen/page gap at most 2.42 mm and palm-target/plaque error at most 0.12 mm. All contacts satisfy the 8 mm acceptance bound; actor resource references return to zero.
- `development/salon-reception/export.mjs`: actual production furniture triangles and evaluated original character skeleton, cropped to this counter without rearranging geometry. `development/nose-brow-profile/render.py` renders those triangles with approximate diffuse lighting. Normal views use a 50° lens, 4.6 m distance and 0.22 pitch; close details supplement, rather than replace, the normal view. Review `qa/salon-reception/{register,reserve,close}/normal-front.png` and `contact-detail.png`.
- Actual rendered page, pen, plaque, hand and closure mark were visually reviewed. This isolated local crop is not a full-scene/main-navigation, browser, Three cel-shader or iOS screenshot claim. The partial floor triangles in the local crop are inspection clipping, not changed level geometry.
- Original salon wallet/service/UI/player-poet and new contract/account/service directed tests pass. Source-only build is checked separately; retained published cache graph belongs to release integration.

Multi-day unforced supply observation is an independent, explicitly bounded controller model; do not infer long-run food coverage from this contact test or enable needs from a single paid receipt.

## Conditional multi-day supply observation

`node --experimental-vm-modules tests/china-salon-reception-demand.cjs` retains the original six official brains/PRNGs, quote/meal budget gates, their actual eight-second office work and salary callback, original salon consent/rooms/artists/needs, ordinary tavern meals/lodging and transaction participants. The model explicitly supplies one completed-court input at noon each day, replaces world path collision with continuous open-passage 3D routes, and uses non-rendering actors plus an explicitly labelled desk-contact double. It neither creates nor forces a salon visitor, wage receipt, service receipt or personal starting balance. It is a conditional demand model, not a successful simulation of court attendance or the whole world.

Three seeds × five game days yield:
- Seed 1: daily completed orders `[0,0,6,0,5]`, 11 total, 88 copper; +58 against five 6-copper meals.
- Seed 42: `[0,0,5,1,3]`, 9 total, 72 copper; +42 against meals.
- Seed 12345: `[0,0,4,2,4]`, 10 total, 80 copper; +50 against meals.
- Mean 2.0 completed orders/day exceeds the 0.75/day arithmetic benchmark. Each seed records 30 actual official office-pay events, with arrival and ≥8 seconds verified in the actual payroll save callback. Salon and tavern failure lists are empty.
- First wage arrives after 2.560–2.591 game days. The longest uncensored interval between actual wages is 1.161–1.649 days. Average income therefore does not establish daily cash availability or cover the zero-origin startup period.

Keep receptionist needs disabled until a real earned wage and safe return, then preserve the ability of a hungry penniless receptionist to accept genuine work. Do not close her sole income source because hunger is high. A later main/meal/absence integration must still check this feedback loop and exact personal meal spending, which this model intentionally does not enable.

Reports are in ignored `qa/reception-demand/bounded-summary.json` and `bounded-seed-{seed}-5d.json`. `tests/china-salon-reception-demand-main.cjs` preserves the expensive real-main harness, but only a 0.102-day performance/zero-origin trace was observed (210 game seconds / 106.8 wall seconds), not a successful multi-day supply run. A default slot-availability setup error was corrected for the bounded final runs; its earlier zero-order trial was discarded. Neither the short main trace nor the setup-error run is income evidence.

## R156 main integration, earned meal and save continuation

The follow-on main candidate is based on stable `97e7790`, retaining R155 tea and R156 archive/meal provider support. Source `chinaSalon` now owns its dedicated personal-trip wrapper; there is no competing receptionist body controller. Admission, NPC offer/recheck, displayed candidates and player-poet new invitations close throughout a personal trip. First registration requires verified receptionist income, its own spendable6, actual home, and a clear original-service/return boundary. Hunger without enough meal money does not close genuine work. Role vacancy remains vacancy; a dead body receives no home movement or animation, while its exact reserved meal/fixture is cleaned up. Malformed saved trips naming another person fail closed and never cancel that person's meal.

### Actual-main evidence

`tests/china-salon-reception-income-main.cjs` begins with the existing verified `officialEarnedPayrollFixture` from `china-official-salon-economy.mjs`: four days of actual office-controller eight-second work receipts, with travel doubled in that financial fixture. It is not a new-game zero-official-balance demand run. Receptionist balance remains zero and her physiology is off; no visitor, activity choice, service, receptionist money or body coordinate is injected. Day4 13:00 and prior completed court are explicit saved-state setup. The independent bounded supply model above owns multi-day demand evidence.

The actual main then naturally selects `cn-minister-works` → original storyteller for40 copper. All original approach, response, room travel and service stages run; artist retains20 and the original reception wage is8. After the performer physically returns, Wenwan at her unchanged desk first enrolls healthy (hunger0.2917, toilet0, both strains0). This took3615 fixed0.1-second controller steps,81.8 wall seconds,739 MiB peak in the simulated DOM/renderer harness.

The first attempt correctly paid nothing: production poseContext supplied the old desk-center workHeight/workDistance, which the shared rig applied after explicit hand targets. Clearing only these inherited surface parameters in the dedicated props owner fixes the override. The189-point contact check now deliberately supplies those original main parameters; same source/body controller rerun succeeds. It is a real failed attempt and narrow repair, not a discarded successful-payment trace.

`tests/china-salon-reception-needs-main.cjs` starts from that real earned/healthy save and arranges only due-food/toilet ages. Wenwan follows public stairs to the original tavern, where the original host collects6 on `cn-tavern-order-3`, balance8→2. The388-step prepayment checkpoint includes201 stair-motion samples. Reopening that exact save with both stale personal task copies removed tests recovery from the authoritative same-person, same-provider, same-order prepaid lease. Bank2 does not prevent adoption. Original kitchen service completes once, then she uses the public cubicle once and returns to `[24.1442606,7.815,5.4519131]` near the original `[24.15,7.815,5.45]` counter. The resumed1296 steps include486 further stair-motion samples; account stays2, with one salary, one meal payment, one meal completion and one toilet receipt. All31 identities remain. A terminal re-open and one additional update preserve the same money, receipt identities and body position.

This proves the scoped main/controller/Three/navigation path, not browser/iOS or real frame-rate performance. The harness uses fixed0.1 steps and simulated DOM/renderer. The ordinary trip reuses the public ground-floor meal hub when routing to/from the public cubicle; it does not use private rooms or teleport shortcuts.

Reproduce:
1. Generate `qa/reception-main/official-earned-payroll.json` by calling exported `officialEarnedPayrollFixture()` from `tests/china-official-salon-economy.mjs` under `--experimental-vm-modules`.
2. Run `node --experimental-vm-modules tests/china-salon-reception-income-main.cjs`.
3. Run the needs script with `RECEPTION_STOP_PREPAID=1`.
4. Run it with `RECEPTION_NEEDS_RESUME=qa/reception-main/paid-meal.json RECEPTION_DROP_SOURCE_TASK=1`.
5. Run it with `RECEPTION_NEEDS_RESUME=qa/reception-main/needs-completed.json RECEPTION_NEEDS_FRAMES=2`.

The historical expensive `demand-main` harness now recognizes current main wiring instead of duplicate account/slot injection, while retaining its original needs-dormant supply-only scope. The transformed current source compiles and contains one real account/slot. Its35-second startup probe was intentionally time-bounded and is not a fresh multi-day result.
