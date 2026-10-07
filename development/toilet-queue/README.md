# W03 / W04 / W09 — remote toilet admission and physical egress

User feedback 1791367077.788089 (R186): multiple original officials, physician and teller crowded outside Yunlai's public toilet at 22:03. The previous single-obstructed-landing repair did not cover concurrent independent need controllers.

## Changes

- `npc-personal-trip` (teller, tea, archive, scribe, herald, gardener, reception, guards, royal kitchen) and `china-clinic-needs` now reserve before leaving for the shared toilet. Previously they walked through the full stairs/inside approach and only then requested the slot.
- A durable shared FIFO ticket records waiting identities, while their controllers wait remotely at their existing post. Advisory availability does not bypass actor-specific admission. Stale/dead/cancelled tickets clear without need relief or relocation.
- A released seat is not an empty room: the next reservation waits until the previous body actually leaves the private enclosure.
- Officials and tavern guests explicitly walk out on their existing public routes before ordinary idle behavior resumes. Old in-room idle and old unreserved approach saves assign a physical return, not a teleport.
- Player automatic routes across all five fixtures also reserve before approaching and stop if ownership is lost. Manual movement remains available.
- Existing receipt/outbox, cancellation, death, role ownership, save-failure and nearby-conversation boundaries remain authoritative. A failed transition from a restored mounted body never falls through to old route movement.

## Scope

China's two late-admission controllers and two post-use idle controllers are the source-specific repair. Palace residents, artists, tavern host/kitchen and Japanese staff already reserved before travelling and explicitly returned. The shared room-clear/FIFO and player route rules apply to China's two toilets and Japan/France/Egypt's existing private toilets. France/Egypt remain player-only admission; no NPC physiology or new room is invented. Egypt's attendant home is outside the room and its existing physical curtain-yield route is unchanged.

## Validation status

Small focused checks after executor recovery: admission/FIFO/room-clear, lifecycle, personal-trip (five cases), clinic including mounted-save failure, official life/toilet, tavern guest/host/kitchen, shared China/Japan/France and Egypt adapters. New admission test is catalogued. These do not replace actual-main concurrency evidence.

Before executor replacement, the unmodified R186 main with five original identities having due toilet needs produced a real two-person inter-controller conflict: physician at [23.8,4.015,5.5], reserved records official at [23.7454,4.015,5.521], only about 5.8cm apart; room-occupied/doors-open prevented use. This seed did not reproduce the screenshot's larger crowd and is not described as doing so. The first test threshold required three and therefore failed despite this concrete counterexample.

The patched natural run was last readable at frame 1500: physician had a real receipt and was returning; teller owned reservation 2 and was travelling; no group was waiting at the door. That process later exited 0, but its redirected final log and all saved checkpoints were lost when the executor was replaced. A CHECKPOINT exit is also 0, so five-person completion is **not yet verified**. A single bounded actual-main chain must be completed on restored code before publication.

The diagnostic `check-main.cjs` seeds only due needs at original positions. `QUEUE_LOAD` resumes its exact saved state without changing time/needs/positions. It writes every 300 steps and stops at the configured segment budget or when all five have completed. It is simulated DOM/renderer with production Three/controllers/navigation/doors, not browser/iPhone acceptance. No user save has been read.


## Resource-bounded continuation (2026-10-07)

The surviving final checkpoint contains all five receipts and cleared physician/teller personal tasks, but rites still has an unfinished `toiletExit` route. Completion now also requires all original officials to finish that route. No product code or physics is bypassed.

The probe-local DOM adapter enumerates attached dynamic nodes from the fixture's static HTML ID roots/body instead of retaining every allocated element. Detach/reattach, nested selectors, replaceChildren, innerHTML and 10,000 removals passed a lightweight isolated DOM check; JavaScript and shell syntax checks passed. This is a possible harness memory-growth correction, not evidence that previous executor deaths were OOM.

Use `QUEUE_LOAD=qa/toilet-queue-fixed.json bash development/toilet-queue/run-bounded.sh` only when the heavy-test slot is cleared. The wrapper enforces one toilet process, 300 simulation steps (plus at most 250 privacy/use finishing steps), 768 MiB Node old-space, 1,152 MiB whole-process-tree RSS and 180 seconds. It persists output in ignored `qa/toilet-queue-run-*.log`; guard termination is not a product failure or a passing test. Do not run other heavy scenes concurrently. Runtime verification of this revised probe is still pending.


Stepwise diagnosis: run `bash development/toilet-queue/run-bounded.sh unit` first (fixture only), then `... init` (production main import, no region travel), then `QUEUE_LOAD=qa/toilet-queue-fixed.json ... load` (restore original checkpoint, no simulation steps), then the same command with `segment` (default 30, maximum 300 simulation steps). Do not automatically advance stages after a failure. Only `unit` has been run so far: exit 0. Main import/load/simulation remain unrun.

All Worldwoven heavy runners must acquire `/workspace/shared/worldwoven-heavy-scene.lock` using `flock -n` for the whole supervised run, across worktrees. Logs now include per-stage output, explicit exit status and one-second process-tree RSS samples under `qa/`. Sampled peaks can miss sub-100ms spikes; Node final maxRSS remains an independent measurement. One-second samples are not proof of old OOM causes. The external guard still polls every 100ms.


## Verified terminal continuation (2026-10-07 12:13 UTC)

Candidate `c3c645f` completed the authorized stepwise checks: init 1.712s / tree peak182.285 MiB; unchanged checkpoint load49.757s /677.543 MiB; 30-step continuation50.040s /674.047 MiB; final bounded continuation PASS after176 of300 steps,55.888s /696.062 MiB (Node maxRSS684.871 MiB). Each process exited0 below the1152 MiB/180s guard. System sampler recorded an8 GiB limit, peak2377142272 bytes and zero OOM/kill events in this boot; this does not diagnose prior executor losses.

The preserved1005.8s checkpoint contained all five actual receipts; the30-step continuation moved rites physically along the second-floor hall. At1026.4s, rites reached[14,0.115,8.8517376] beyond the public stairs, `toiletExit` cleared, and the original controller chose its ordinary nighttime `life-rest` route. Physician remained at clinic[23.5406,4.015,-30.6217], teller at money house[-21,0.215,-28.25]. All five receipts remained, no selected actor remained in the toilet room, no exit stage remained, and identity order stayed unchanged. Final segment maximum doorway crowd0. This verifies the surviving five-completion checkpoint's real egress and resumption, not a new uninterrupted five-person chain, next morning's court attendance, browser/GPU or phone acceptance.

Durable ignored evidence: `qa/toilet-queue-init-20261007T120840Z.*`, `qa/toilet-queue-load-20261007T120931Z.*`, `qa/toilet-queue-segment-20261007T121100Z.*`, `qa/toilet-queue-segment-20261007T121223Z.*`; original checkpoint `qa/toilet-queue-segment-origin.json`, final `qa/toilet-queue-fixed.json`. No further or full-suite run. Production changes remain the original small candidate; release integration/build/public-site check is still pending.
