# W03 / W04 / W09 — occupied toilet exit and court recovery

User report 1791363665.715959: someone remains in Yunlai's toilet, prevents others using it and misses court every day. This is a reproduction of the reported failure class, not identification of the user's unnamed occupant; no user save was supplied.

## Boundaries and root cause

- The shared daily-toilet service only tried its authored approach point when dismounting. A person standing there kept `leaving` and the sole reservation indefinitely, including across save recovery.
- Ordinary NPC bodies default to .25 in their real movement controllers, but this service incorrectly defaulted all bodies to the player's .34 radius.
- A candidate with body clearance alone can strand a person: the first attempted public-room landing was 0.382m from the fixture, while the retained portal planner uses .39m clearance. Actual main correctly failed to route out, so that candidate was rejected rather than calling a static-clearance result success.

The patch keeps the normal authored short seat dismount. When its usual landing is occupied, it checks nearby points in the same private room, the full-body segment out of the fixture, other real bodies, closed leaves, floor support and the existing .39m route clearance. It never places an actor in the corridor or courtroom. Exit searches are limited to 4Hz; cached candidates are checked live again before use. The public room's selected landing is also tested against the actual door/public-stair route.

The same source now supplies court's exit budget. `leaving` retries continue without a lost caller, failed release writes retain ownership, and recovery preserves the mounted actor until a legal exit is available. Death/abandonment remains motionless. Interrupted use never creates a receipt or physiological benefit; completed receipts remain idempotent.

## Coverage

| Region / fixture | Actual geometry result | Boundaries |
| --- | --- | --- |
| China palace | Same-room alternative dismount | Existing raised footrest, three closures, legacy anchor |
| China Yunlai public | Alternative dismount and actual automatic-door/stair connectivity | Same actor to required court, another original occupant, old blocked checkpoint |
| Japan private cubicle | Same-room alternative dismount | Existing private enclosure, staff/player shared core |
| France royal bath | Deliberate full-body blockage can genuinely leave no alternative; lock retained until the blocker leaves, then original dismount succeeds | Original player-only binding; no invented NPC needs |
| Egypt private bath | Same physical obstruction/clearance behavior | Original attendant and player binding retained |

A person deliberately sealing the only physically usable exit still must move. The fix does not remove collision, move that other person, fake privacy, or waive mandatory court attendance. No unrelated countries' business routines, menus, sleep rules, health effects or court success conditions are changed.

## Verification and reproduction

Focused checks:

- `node --experimental-vm-modules tests/daily-toilet.cjs`
- `node --experimental-vm-modules tests/egypt-daily-toilet.cjs`
- `node tests/daily-toilet-lifecycle.mjs`
- `node --experimental-vm-modules tests/china-official-toilet.cjs`
- `node --experimental-vm-modules tests/china-daily-toilet.cjs`
- `node --experimental-vm-modules tests/china-public-toilet.cjs`
- `node --experimental-vm-modules tests/daily-toilet-exit-geometry.cjs`

The old single-point blocker fixtures were expanded to cover all alternative exits where the test requires a genuinely physically blocked actor. New assertions cover an occupied single landing, full physical blockage, no relief, liveness, failed durable release and a lost caller.

Actual-main probe (simulated DOM/renderer, production Three, identity, movement, doors, needs and court):

1. `node --experimental-vm-modules tests/china-official-toilet-main.cjs` makes `qa/china-official-toilet-mounted.json` after the original official actually walks from the upper office, downstairs and up the public staircase into the toilet. The prior harness needed only current VM globals and the existing R166 coordinates corrected.
2. For a baseline comparison, extract only `daily-toilet.js`, `china-daily-toilets.js`, and `china-official-life.js` from c601ba6 into `/tmp/baseline-<filename>`. Run `OFFICIAL_TOILET_LOAD=qa/china-official-toilet-mounted.json TOILET_BASELINE_SOURCE=/tmp/baseline-daily-toilet.js node --experimental-vm-modules development/toilet-exit/check-main.cjs`. It uses the same original body and a player obstructing the landing, starts at the next morning and proves the baseline remains seated/locked after 25s. It writes the actual old stuck checkpoint `qa/china-toilet-real-blocked.json`.
3. `OFFICIAL_TOILET_LOAD=qa/china-toilet-real-blocked.json node --experimental-vm-modules development/toilet-exit/check-main.cjs` checks the repaired exit, no invented relief, original door/stairs, mandatory court and the next actual occupant. It stops when the requested chain completes and writes its result checkpoint.
4. If continuing an already saved intermediate checkpoint, use `TOILET_CONTINUE=1 OFFICIAL_TOILET_LOAD=qa/china-toilet-recovered-progress.json ...`. This mode does not reseed time, needs or actor positions.

These are bounded fault-reproduction probes, not a new broad daily or multi-country gameplay gate. No screenshot, browser/iPhone or new aesthetic acceptance is claimed.

Build: 359 assets / 9,494,732 bytes. Original tracked immutable build assets restored after the worktree build; no publication from this branch. Catalog: 581 entries. 
Actual-main results:
- Baseline persists the original seated reservation for the full 25s fault observation and rejects a second person.
- Final code recovers that same persisted seat without relief; the original official uses the actual curtain/public stairs and all mandatory officials complete court on day 1, receipt `cn-morning-audience:1`, exception null (completed by frame 1800).
- The first extended probe exposed a test obstruction: the test player stopped at z=7.9486, still in the curtain sensor, so the next official correctly timed out privacy. The probe now walks that player farther down the original hall, to z=9. This is a fixture correction; privacy behavior was not relaxed.
- Continuing the saved progress with no time/need/official-position reseeding took 752 steps of .1s. The other original `cn-official-records` completed public receipt 5 exactly once, delivered=true. Court still has its one completed day-1 receipt, exception null; all 31 identities remain. Continuation peak RSS 764.9MiB. No duplicate receipt or health credit was generated for the interrupted first use.
- Both first-person physical exit and next-person use are production main evidence. No browser/iOS or new appearance acceptance is asserted.

