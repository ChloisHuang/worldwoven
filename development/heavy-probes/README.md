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
