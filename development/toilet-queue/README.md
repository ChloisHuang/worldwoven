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
