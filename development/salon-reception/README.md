# Original-session receptionist work: dormant physical verification

This follows the dormant receipt/contract checkpoint `b4937a3` (same tree saved privately as `b8188e6`). It does not enable the role or needs in production `main.js` and adds no visitors, initial funds, demand weight or wage changes. Preserve the later R155 tea-lease fix when integrating.

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
