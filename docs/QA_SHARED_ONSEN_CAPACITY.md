# Japanese shared-pool capacity foundation

Both existing Japanese pools retain their logical IDs and one menu entry each. Each continuous 6.32 m submerged ledge now provides three physical seats, derived from 0.75 m end clearance and 1.65 m seat pitch. Every seat carries its own anchor, approach, supported pose, and camera context. The pool mesh, water, character pose and appearance implementation are unchanged.

Scene-local FIFO reservations distinguish facility, seat, actor, purpose and reserved/occupied state. Player entry takes a free seat without evicting a bather. Cleaning reserves one seat. Exiting releases only that actor; cancellation and region disposal release reservations and waiters. Collision-checked side exits prevent a waiting player from blocking the departing NPC.

## Focused verification, 2026-10-03

- `node tests/shared-facilities.mjs`: passed capacity, FIFO, cancellation, disposal, non-preemption and retained exclusive-fixture behavior
- `node tests/npc-player-priority.cjs`: passed retained single-user fixture handover behavior
- `tests/japan-player-service-frames.cjs`, real Japan scene with exact production input/frame/camera functions: passed player plus two NPCs concurrently; all posed skin bounds separated; max-leg-length 1.06 broad masculine player; 21-frame one-click entry into the empty seat; full-pool queue followed by 2-frame entry after a genuine NPC task exit; individual player exit; E/manual cancellation; exact player appearance restoration; actual `disposeLot` and fresh facility recreation
- Both pools' three anchors remain inside the real support ledge and each has a clear entry transfer
- Normal TPS image reviewed: all three supported bodies, arms and parallel legs remain distinct; no geometry/pose changes were needed
- Final same-namespace PPid process-tree guard: 7.72 seconds, 741,834,752 bytes peak observed RSS, exit 0, no budget termination (175 s / 1228 MiB limits)
- Evidence: `qa/shared-pool-final-lifecycle/report.json`, `resource-result.json`, `shared-pool-tps.png` and `shared-pool-front.png` in the working checkout; generated images are not source backups

The earlier full-pool run exposed the central-entry exit deadlock; its narrower side-exit attempt also failed. The final collision-checked wider aisle choices pass the original failing case. The existing whole service-loop test was updated to expect shared seats instead of forced player preemption; the unchanged full visit was not replayed for this batch. The existing isolated contact/graphics results are reused. No four-country or 108-shape matrix was run.

This is the shared facility foundation. Production still has the existing authored four-role service visit. Two/three concurrent NPC customers in this focused test are an explicit fixture checkpoint, not a claim that the next visitor/check-in/token/medicinal-bath/food-order systems are already live. Full stepping-over-the-rim animation remains separate work.
