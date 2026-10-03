> Historical regression tooling: select only the checks affected by current changes under [TESTING.md](../../docs/TESTING.md). This catalog is not a mandatory whole-scene or daily release gate. Reuse unchanged validated results.

# Optional door geometry QA

This is the preserved V7 rendered-leaf/static sweep and gathered-rod support gate, with repository-relative loaders. It does not change the game. It is deliberately outside `npm test`.

## Run it

Node.js 22+; no downloaded dependencies. Run from the repository root:

```sh
npm run test:door-geometry -- --list
npm run test:door-geometry -- --check
npm run test:door-geometry -- --tiny
```

`--list` prints the manifest without loading source. `--check` verifies all preserved file hashes, reverses the documented loader edits and separately declared post-port source-guard edit to confirm exact upstream hashes, checks syntax, and resolves all 64 policy IDs through a minimal policy-only input. It constructs no authored scene. `--tiny` runs five scene-free suites serially, with a hard 60-second timeout and 256-MiB V8 old-space setting per child. The ashlar suite evaluates the real `solid`, `ashlar` and `batchZone` factories on eight tiny jambs; it never calls `buildEgypt`.

Only after the owner grants a free serial resource window:

```sh
QA_RESOURCE_WINDOW=granted-by-owner npm run test:door-geometry
QA_RESOURCE_WINDOW=granted-by-owner npm run test:door-geometry -- --region egypt --door dining-entry
```

The environment variable records the granted window; setting it is not authorization by itself. Each door runs in a new Node process, one at a time, with a hard 300-second timeout. Any failure, uncertainty, launch error or timeout stops the batch. The 768-MiB V8 old-space setting is not a total RSS limit; allocate memory for the scene and native buffers separately. No parallel option exists.

Defaults are `<repo>/source` and a new timestamped `<repo>/qa/door-geometry/` directory, independent of the current working directory. Optional `SOURCE_ROOT` and `QA_OUT` overrides resolve absolute or relative filesystem paths. An existing `progress.json` is never overwritten. The generated reports and stdout/stderr logs stay under `qa/`, which the repository already ignores.

The runner uses furniture present, closed canopies, `GEOMETRY_EPS=0.00001` and `MAX_ARC_ERROR=0.0001`. Conflicting settings or selected-pose diagnostics are rejected. Direct adapter diagnostics remain available through the preserved V7 adapter, but cannot be accepted by this batch runner. Unexpected source formulas, source hashes, construction or packing fail closed. Do not update approved hashes merely to make a test pass: review and recalibrate the affected source first.

## Manifest and exact aliases

`doors.json` derives only the hinge, slide and gather groups from the preserved R15 geometry plan. It contains 64 operable closures: Japan 17, China 29, Egypt 6 and France 12. Fixed overhead banners and intentionally open thresholds are excluded. The source plan's SHA-256 is retained, but its old scene status and old absolute report paths are not copied.

Five opening IDs have different runtime closure IDs:

| Region | Opening ID | Runtime ID |
| --- | --- | --- |
| Japan | `jp-guest-suite-door` | `japan-guest-shoji` |
| Egypt | `private-suite-entry` | `egypt-private-suite-door` |
| France | `front-entry` | `france-palace-front` |
| France | `enfilade-east` | `france-bedroom-enfilade` |
| France | `wing-enfilade--1` | `france-private-bath` |

`--door` accepts either exact ID. The adapter's original substring selector is unchanged; the wrapper verifies each supplied runtime filter is unique within its region, then requires exactly one matching report row with the expected runtime ID, opening ID and motion. A gathered door also needs two accepted actual rod endcaps.

## What is preserved

`portability-provenance.json` contains original and portable SHA-256 hashes for every copied file, the exact loader/output edits, named function comparisons, and hashes of the complete protected V7 tails. Nine of eleven V7 files are byte-identical. In the adapter and ashlar fixture, the initial portable copy was byte-identical after the loader. A subsequent explicitly reviewed China source hash literal changes in the adapter; all predicates, instrumentation, mounting policy, budgets and report labels remain unchanged. The provenance separates `reviewedPostPortEdits` from loader edits, records both file hashes and reconstructs the original protected body for verification. Historical source path text in this comparison is audit data only; no runtime loader uses a workspace-specific path.

The adapter deliberately retains its historical `unvalidated` metadata strings. A successful wrapper run does not rewrite the legacy method label or represent a new mathematical validation. The output reports record the exact loaded source hashes, pose hash and detailed evidence. All instrumentation locks remain the accepted V7 values. The China palace source lock now names only the reviewed target-coordinate source hash in `reviewed-source-guards.json`. Reversing its one target string exactly restores the previous locked file; no geometry-generation statement changed.

The tiny suites retain:

- Continuous adaptive rotation/translation checks, forward and reverse containment, intermediate collisions, a thin obstacle between 101 sample poses, near-EPS contacts, clear controls, bounded-work exhaustion and no clearance from one allowed midpoint
- Exact archived two-triangle jamb/rug collision witnesses and fitted rigid orbits; these are historical regression fixtures, not reconstruction of the old scenes
- Actual support versus a stale collider-box negative
- Complete 12-triangle box certificates, partial ornament contamination, missing primitive/face and reversed-face negatives
- All four source-generated Egyptian support pairs, byte-identical original/instrumented buffers before and after batching, partial ornament contamination, missing primitive/triangle, reversed triangle and missing same-ID camera collider negatives

## Evidence and limits

The portability work ran the five tiny suites, syntax/hash checks and the policy-only loader. No authored scene, build, controller suite or render was run for the portable copy. Generated portability reports are retained separately under ignored QA output; they are not runtime fixtures.

Prior owner-run reports were inspected without rerunning scenes: V6 Japan 10, China 10 and France 5 gathered doors plus V7 Egypt 4 all reported `PASS_BOUNDED_SWEEP` and `PASS_ACTUAL_ROD_ENDCAP_SUPPORT`. All recorded loaded-module hashes matched the inspected R15 source. That is 29 gathered doors total. V7's Egyptian tiny calibration took 0.2646 seconds and its four authored support runs took 11.0879 seconds. Those are historical observations on the original stages, not a portability benchmark or a fresh 64-door run. The earlier stage README/manifest files predate those runs and still say unrun; their stale status is not carried forward as current evidence. Large scene reports and screenshots are intentionally excluded.

The clearance method uses actual rendered triangles and exact production poses, conservative adaptive envelopes, the unchanged sagitta bound and EPS. AABB separation may certify separation; overlap cannot establish clearance. Unresolved refinement or work-budget exhaustion remains `REVIEW` or `INCOMPLETE`, never acceptance. The six-cardinal containment oracle assumes the inherited closed, consistently oriented solid interpretation; it does not validate open, nonmanifold or arbitrary triangle-soup topology.

Japan/China support certificates require a complete existing 12-triangle outer box boundary with reviewed generation/packing hashes. Egypt requires exactly 44 actual owned triangles per reviewed ashlar jamb, original-to-batched triangle agreement, finite matching body/camera bounds and exact source locks. France retains semantic solid-range/camera-collider provenance. None adds a moving-leaf contact waiver. The only mounting allowance remains the existing bounded real hinge-strap/structural-jamb predicate.

This gate covers rendered moving leaves against static world and fixed gathered-rod endcap seating. Door-root meshes are excluded from its moving-leaf/static scope. It does not establish sliding-track fit, leaf-to-own-rail contact, actor/camera clearance, safe waiting routes, controller behavior, privacy through decorative windows, browser rendering or physical-device performance. Those remain separate gates.

## Reviewed post-port China guard update

`reviewed-source-guards.json` documents the exact cn-bath-basin target Z change from -29.2 to -29 against commit472009e and the matching whole-file lock update. A single current China scene capture verified that this is the only explorationTargets field difference from prior R15 and that colliders, cameraColliders, bounds, walkableSurfaces, doorways and stations are unchanged. The strict R15 fixture retains the historical prior hash and records the two exact historical-to-current target changes. This metadata review does not accept the changed inward bath-east sweep; current door/controller evidence must cover that motion separately. Historical report hashes in validation-summary.json describe the pre-correction source snapshot.

## Reviewed Japanese shoji privacy correction

`reviewed-shoji-source-guards.json` and its exact source patch record six joined timber returns, a 6mm inset preventing duplicate aperture-side faces, and 100mm outward leaf overlap for the guest, operator and staff sliders. The original aperture, center seam and travel distance remain unchanged. The pose guard changes only for a constant outward translation; every rendered vertex retains the exact affine sweep. Japan's existing box/packing factories are unchanged, and the new return helper is also source-locked.

One final Japan construction passed all three complete V7 sweeps with zero collisions or mounting allowances, proved twelve actual packed box boundaries for the six returns and their existing walls, and checked body/planner/camera passage. Exact scene additions are retained in `../fixtures/r15-shoji-field-deltas.json`; removing only those six boxes from each collision channel restores the prior full-array hashes. Guest-screen and staff-bunk overlapping endpoint probes remain explicit negatives. The three private sliders also have a scene-free production geometry fixture at `../shoji-side-privacy.cjs`. Same-camera rendered appearance remains a separate visual gate.
