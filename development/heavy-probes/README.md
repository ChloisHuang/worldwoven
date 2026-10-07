# Resource-bounded recovery probes

Probe-local DOM adapter enumerates attached elements only, preserving static HTML IDs as roots. Detached elements are no longer retained by a global allocation registry. The teller textContent setter also detaches old children.

All stages use the exact shared /workspace/shared/worldwoven-heavy-scene.lock with flock -n, a 768 MiB Node old-space limit, 1,152 MiB process-tree RSS cap and 180-second external deadline including initialization. Logs, explicit exit status and per-second RSS samples are retained in ignored qa/. The cap is sampled, not a hard kernel allocation limit. No automatic stage advancement or retry.

Run one stage only after the preceding stage has been reviewed:
- bash development/heavy-probes/run-bounded.sh unit (DOM only, no game imports)
- bash development/heavy-probes/run-bounded.sh init (main imports, no region travel)
- NATURAL_COUNTRY=china bash development/heavy-probes/run-bounded.sh load (world creation/restoration, no simulation steps)
- NATURAL_COUNTRY=china NATURAL_FRAMES=30 bash development/heavy-probes/run-bounded.sh segment

Natural segments default to 30 steps and are capped at 300; SOCIAL_RESUME may name the existing checkpoint. A checkpoint is not proof of terminal completion or of seamless continuation through every controller state.

Current-environment results: DOM unit and main-import init passed; fresh China load and fresh 30-frame then four resumed 300-frame segments passed under the guard. Observation stopped at 184.5 simulated seconds after an autonomous shared-executor accepted conversation completed and persisted. See docs/NATURAL_SOCIAL_VERIFICATION.md for exact scope and outstanding terminal checks. Further stages require parent clearance and serial review. A guard stop is neither a product failure nor a passing check. Simulated DOM/renderer checks are not browser or phone acceptance.

One focused approach interruption gate is available as `bash development/heavy-probes/run-bounded.sh approach`: at most 300 steps, fresh seed42, existing shared hold API held nine seconds, then same approach resumes. It writes only qa/natural-approach-hold.json and preserves natural-observation terminal files. It passed 162 steps / 72.021 seconds / 684.238 MiB on 2026-10-07; it is not a UI-distance or browser acceptance test.

## ST03 staged financial prerequisite / zero-step load

This isolated diagnostic uses `bash development/heavy-probes/run-bounded.sh salon-payroll`, then, after inspecting that result, `bash development/heavy-probes/run-bounded.sh salon-load`. Both retain the same lock and resource limits. No simulation segment or automatic stage advancement is enabled. No business source is changed.

The first stage imports the existing financial test module and exports only its original four-day office-controller payroll: six balances of 96, 24 archive receipts, 576 government-paid. This is not four days of natural play: court completion is invoked directly and travel/pathfinding is doubled. Importing runs the existing full financial test module, including independent settlement boundary tests; those settlements are not the exported payroll or scene service evidence. Provenance hashes the source and exact generated payroll.

The load stages seed42, day4 13:00 and a completed-court marker explicitly. It does not override main actor positions, invitations, relationships, probabilities or daily needs. In particular, it omits the old script's artificially hungry artist needs. Outputs are isolated under `qa/st03-paid-load/`; the natural observation checkpoint is never reused or overwritten. The zero-step load captures ordinary scene initialization, including initial life choices; no simulation step is executed.

2026-10-07 result: financial prerequisite 0.505 seconds / 80.703 MiB; zero-step load 66.266 seconds / 683.531 MiB, both guard PASS and exit0. An earlier wrapper quoting error stopped before main import (0.203 seconds), was corrected without product changes, and is recorded. All six original officials retain96; reception and both rooms are available. Quotes110/40/80/45 expose only the latter three affordable offers to each official. There is no salon session or service receipt. The compact source-hashed evidence is `salon-load-evidence.json`.

Do not call this paid completion, all-four coverage, natural four-day play or browser/iOS acceptance. Before later resumed simulation, validate exact checkpoint restoration of actors, original life/controller state, salon session and money. An active-session continuation is not proved by this empty-session load. Any later bounded segment requires separate review and must preserve original selection and response probabilities.
