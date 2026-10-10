# NPC manual recovery (candidate)

Request: add a red 重置 control at the bottom-right of the currently selected NPC conversation. The reference is the user's 周惟正 screenshot in 云来楼二层客栈, showing his return-to-bedroom intention and ongoing toilet discomfort.

## Behavior and preservation

- Only the selected current NPC is eligible. The actual dialogue closes on success; failures show a specific inline reason.
- China officials' ordinary personal routines and the original French bedroom worker's explicitly safe idle boundary can be interrupted; generic unmanaged NPCs can recover. Court ceremony/borrowed services, controller-managed duties without a safe interruption adapter, shared social/family work, and crime pursuit/escort/custody are refused. This is deliberately not a claim that every controller supports recovery.
- The country’s public arrival is searched for actual supported body clearance, live door clearance, no other body overlap, and at least two walkable exits. No cross-country relocation or guessed ground height.
- A synchronous world-save transaction clears the selected actor’s route, avoidance state, mount, personal intention and facility claims. The interrupted intention receives no completed activity reward or need relief. Identity, rank, duties, quests, economy, relationships, stock and health are untouched.
- Rejected saves roll the same actor, life intention, original occupied slot and queue position back. Ten simulation seconds of per-country/person-life cooldown is persisted. Stale dialogue callbacks cannot act on another or already closed selection.

## Checks

- 25 lightweight reset/UI/social tests passed, including exact production crime gate with temporarily missing guard, aliases, invalid records, and a 30-second pre-reset dialogue pause with rejected save and cold load. Seven existing life decision tests and the existing facility queue check passed.
- Actual production main reset moved the original justice from a deliberately staged supported inn pose `[22.5, 4.015, 17.8]` to a verified country public arrival `[0, 0.015, 39]`. Rejected save restored his original pose/bed claim; others' positions and his needs, relationships, funds and duties were unchanged. After recovery he autonomously chose the unchanged urgent need, traversed the public stairs and completed one real toilet use/receipt in 628 × 0.1-second steps. Guard: 59.645 seconds / 721.672 MiB.
- After the narrow dialogue transaction correction, final button/save boundary ran again (42.612 seconds / 682.070 MiB), then an independent cold country re-entry (43.329 seconds / 670.930 MiB). Old rest intention and claims did not reappear, cooldown survived, and real need-route movement resumed. The unchanged full movement chain is reused, not repeatedly rerun.
- Browser-only production dialogue layout fixture is pending. The user's original private save was unavailable; no exact deadlock reproduction, full gameplay-browser or iOS claim.
- See `evidence.json`. No version bump, build or publication was performed by this task.

The existing life routine preserves an outstanding personal intention until it finishes; the screenshot alone does not establish the geometric root cause. This reset clears that intention and its claims so the next normal life decision can serve unchanged urgent needs. The directed main check demonstrates subsequent real movement and one genuine toilet-service completion, without claiming the exact original deadlock cause was reproduced.
