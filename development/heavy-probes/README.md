# Resource-bounded recovery probes

Probe-local DOM adapter enumerates attached elements only, preserving static HTML IDs as roots. Detached elements are no longer retained by a global allocation registry. The teller textContent setter also detaches old children.

All stages use the exact shared /workspace/shared/worldwoven-heavy-scene.lock with flock -n, a 768 MiB Node old-space limit, 1,152 MiB process-tree RSS cap and 180-second external deadline including initialization. Logs, explicit exit status and per-second RSS samples are retained in ignored qa/. The cap is sampled, not a hard kernel allocation limit. No automatic stage advancement or retry.

Run one stage only after the preceding stage has been reviewed:
- bash development/heavy-probes/run-bounded.sh unit (DOM only, no game imports)
- bash development/heavy-probes/run-bounded.sh init (main imports, no region travel)
- TELLER_COUNTRY=china bash development/heavy-probes/run-bounded.sh load (world creation/restoration, no simulation steps)
- TELLER_COUNTRY=china bash development/heavy-probes/run-bounded.sh run

Teller run is one explicitly selected country and its existing directed sequence. Other countries must be separate serial invocations after reviewing the previous result. TELLER_RESUME remains optional, not manufactured state.

These changes have not been executed or syntax-tested yet. Heavy tests remain paused pending parent clearance. A guard stop is neither a product failure nor a passing check. Simulated DOM/renderer checks are not browser or phone acceptance.
