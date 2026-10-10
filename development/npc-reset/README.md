# NPC manual recovery (candidate)

Request: add a red 重置 control at the bottom-right of the currently selected NPC conversation. The reference is the user's 周惟正 screenshot in 云来楼二层客栈, showing his return-to-bedroom intention and ongoing toilet discomfort.

## Behavior and preservation

- Only the selected current NPC is eligible. The actual dialogue closes on success; failures show a specific inline reason.
- China officials' ordinary personal routines can be interrupted; generic unmanaged NPCs can recover. Court ceremony/borrowed services, controller-managed duties without a safe interruption adapter, shared social/family work, and crime pursuit/escort/custody are refused. This is deliberately not a claim that every controller supports recovery.
- The country’s public arrival is searched for actual supported body clearance, live door clearance, no other body overlap, and at least two walkable exits. No cross-country relocation or guessed ground height.
- A synchronous world-save transaction clears the selected actor’s route, avoidance state, mount, personal intention and facility claims. The interrupted intention receives no completed activity reward or need relief. Identity, rank, duties, quests, economy, relationships, stock and health are untouched.
- Rejected saves roll the same actor, life intention, original occupied slot and queue position back. Ten simulation seconds of per-country/person-life cooldown is persisted. Stale dialogue callbacks cannot act on another or already closed selection.

## Checks

Lightweight actor/claims/decision transaction tests, production UI button dispatch tests and existing life/facility checks passed. Real China main first recovery and refused-save rollback observed, but final test is still in progress. A deliberately staged stuck-like inn pose is used; the user's original private save was not available. Browser UI layout fixture is pending. No iOS or full gameplay-browser claim.

The existing life routine preserves an outstanding personal intention until it finishes; the screenshot alone does not establish the geometric root cause. This reset clears that intention and its claims so the next normal life decision can serve unchanged urgent needs. Main verification must demonstrate subsequent real movement and toilet service before calling that continuation passed.
