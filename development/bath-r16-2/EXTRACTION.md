# Isolated Japan soaking candidate on published R16.2

Status: hair03 three-view compact-bun rendering and the affected5-case mesh/contact check have passed on the R16.2-integrated candidate. Actual main identity/vertices/halo/pulse restoration and final default/near entry/exit camera paths are next. No full angle grid or four-country furniture rerun is planned; animated curb crossing is not part of this repair.

## Product hunks and dependencies

- source/game/japan-bathhouse.js: replace pool() only; replace timber coping and obsolete concentric water rings; give the two existing pendant lights their real component camera boxes; turn the two old pool-interior destinations and pool-entry markers into dry explicit bathing approaches while retaining IDs and previous coordinates. Closed basin water is at 4.47m, seat at 4.10m, floor at 3.8805m, low back support at 4.50m, stone at 4.52m and timber at 4.60m. This requires the matching furniture coordinates and support metadata.
- source/game/furniture-interactions.js: Japan's two bath descriptors, exact cameraParts, cameraTargetMinY4.85 and Japan-specific temporary wardrobe/status label. The generic furniture collider ownership logic is unchanged. China, Egypt, France and Japanese bedding descriptors are unchanged.
- source/game/characters.js: accept Japan-only onsen-swimwear; scoped onsen pose, real seat/sole/back contacts, hands02 with one supported forearm and the other palm aligned to the real thigh triangle. Other action paths remain as in R16.1. Depends on bathPose and the new swimwear mesh names.
- source/game/approved-surfaces.js: the opaque temporary onsen outfit; hair01 bends the same four braid meshes only when culture is Japan, wardrobe is onsen-swimwear and hairStyle is braided-tail. It preserves root attachment, cross sections and intended centerline length. Requires pending geometric and visual verification. Original hairstyle IDs and original-outfit branches remain unchanged.
- source/game/main.js: pass bathPose, select the descriptor's temporary wardrobe, clamp only the authored onsen focus target before ordinary camera interpolation, and use onsen-specific status text. Other bath strings retain their R16.1 wording. Original leave/cancel/region lifecycle code is unchanged and must be exercised with braided-tail.
- source/game/room-closures.js: only two pool-entry rationale strings and a metadata spread for interactionOnly markers. No door-mount metadata, door geometry or motion changes.

appearance.js and camera.js are byte-identical to R16.1. All source files other than the six above are byte-identical. The original half curtains and redundant bath-entry closure cleanup from R16.1 remain untouched.

## Explicit exclusions

No insetMounts map, addJapanInsetClosure import, wall/partition rebuild, seven Japanese inset closures, Chinese gates, French/Egyptian inset closures, closureMount enforcement, new general door engine, surface-track changes, or character-head prototype is included. Japan's original addShojiJambReturns paths and floor-trim coordinates remain exactly as published.

## Test updates and local QA

The two test updates correct Japanese bathing's old bath-robe assumption, pass bathPose to the actual actor and check independent supports and shape preservation. Prior failures are retained in the existing QA evidence, including the old waterless pose, occluded views, hand01 finger intrusion and four unbound-braid collision cases.

The development scripts run against SOURCE_ROOT, defaulting to source from repository-root cwd. The local unbound-braid fixture is the accepted pre-hair approved-surfaces.js (SHA256 49b3eb8c72a57de9fb3c0c0072a564d2d827f7851e96fc6677c8a31e942e7844), plus its unchanged character-traits.js dependency. The render compares the current production rig with that exact older surface factory through a separate module import. Runtime node-webgl remains an external existing workspace tool, not a shipped dependency.

Required serial checks, owner allocates each compute window:
1. check-onsen-braid-binding.mjs: original24 sex/leg/hair cases, real triangle-volume and vertex collisions, exact normal-outfit geometry, braid root/rings/topology/color, dense curve length preservation and the complete sampled-centerline values. Hard60s; requested512MiB, existing guardian limit1200MiB with actual peak reported.
2. render-onsen-braid-prototype.mjs and render-onsen-braid-config.json: six character-only rear/side pictures, original camera paired before/after. Hard60s. Art acceptance still requires viewing the images.
3. check-onsen-braid-restore.cjs: actual main UI exit, Escape, outfit-preview cancel, pending approach cancel, return/reenter and region change; original braid vertex signature, appearance and saved ID. Hard180s/1200MiB.
4. Existing original24 check-onsen-hands02.mjs and check-bath-main-camera.cjs 192+480 inputs on this integrated tree, plus the two updated rest-bath tests. Do not turn a failure into a pass by weakening an unchanged criterion.
5. Reuse accepted default-direction main close-view coordinates from the supplied render-hand02-main-config.json to confirm the final integrated pool/pose. These configurations now lock the six-file bath-only source, not the larger repair tree.

The completed mesh/contact and six-frame stages above do not substitute for the pending main lifecycle and integrated bath regressions. No package version or hosting config is changed. The owner can apply the local Git change after validation and publish this bath batch independently of the door project.

## Hair01 diagnostic outcomes (no art acceptance)

The first run stopped in an auxiliary normal-outfit equality check because repeated willow-leaf/willow-stem names were matched with getObjectByName. The corrected probe asserts equal counts, original child-index hierarchy paths, parent/name, every attribute shape and triangle indices before pairing by traversal occurrence. Product source stayed unchanged.

The second run passed five non-braid cases, then stopped at the short-leg braid's sampled-centerline check. Twenty-three ring means define twenty-two straight chords. Actual source surface vertices measured 358.258625mm before and 354.497579mm after, a 1.049813% chord deficit. The separately solved dense destination curve retained 358.258625mm. Default and long-leg chord deficits were 0.833248% and 0.697819%. These match the independent numerical curve/ring reconstruction. This is a sampling consequence of bending the same sparse topology; it does not establish collision clearance or visual quality, and the full24 collision matrix had not completed at that point; it subsequently passed with the physical criteria unchanged. The owner accepted recording this distinction instead of reshaping the braid to satisfy a self-imposed1% proxy. Both FAIL receipts and the prior four unbound-braid collision positives remain in evidence.

Production availability diagnosis briefly paused new heavy work. After it resumed, the owner authorized and the worker completed the24-case geometry and six-image stages. Real-main geometry restoration remains prepared only.

The owner removed the unsourced1% chord-loss hard gate after the actual23-ring/dense-curve comparison. The probe still reports every before/after sampled length and checks the unchanged root, every cross-section distance, all ordinary outfit vertices, topology/materials, dense destination arc length, and actual skinned triangles versus physical basin solids. No product geometry or contact criterion changed.

## Latest receipts

- Full24: evidence/hair-binding-01-full.json and hair-binding-01-full-resource-resource-result.json. No skinned vertex or triangle intrusions into the1mm-inset real lumbar stone, retaining wall or timber volumes. Cross-section maximum error and all before/after lengths are reported per case.
- Six production Three/Mesa frames: qa/hair-prototype-01/ (images intentionally outside Git); metadata in evidence/hair-prototype-01-report.json.
- Representative rear/side pairs: male-short-rear-bound.png, male-short-side-bound.png, female-long-rear-bound.png, female-long-side-bound.png.
- Earlier FAIL reports and old unbound braid positives remain unchanged.

## Hair02 lightweight candidate

Only approved-surfaces.js changes relative to the preceding product candidate. The temporary braid follows two48mm-separated runs with a24mm high small turn; a short smooth root connection preserves the exact authored attachment ring, and the retained tip/old tie return12mm to its side,4mm below it, at rest-spaceZ−.132. The route follows the rear hair-shell profile instead of forming a suspended circular loop. Each input braid’s measured source length solves the folded run height. The same four original mesh cross sections, topology, material and saved identity stay intact. Geometry and art acceptance are pending, not inferred from these parameters.

Next render configuration: render-onsen-braid02-config.json, using the unchanged renderer and exact six earlier cameras. After visual review, repeat physical contact and the prepared production-main vertex restoration chain as the owner authorizes. No heavy run was started for hair02.

Hair02 six-frame receipt: evidence/hair-prototype-02-report.json and hair-prototype-02-resource-resource-result.json. Images remain at qa/hair-prototype-02/ outside Git. All34 current source fingerprints are recorded in evidence/hair02-source-fingerprints.json. No contact or main stage followed this render.

## Hair03 current implementation

The only product change from hair02 is approved-surfaces.js: remove the rejected curve helper and select the existing low-bun tail branch only for Japan/onsen-swimwear/braided-tail. This preserves the incoming hairStyle through all head and hair-shell construction. No new hair geometry is designed. The original long braid remains the normal-outfit representation and the saved style identity. Next three-picture configuration is render-onsen-braid03-config.json. Old curve-specific probes are historical evidence, not acceptance criteria for this alternate temporary display.

Japan-only halo cleanup: buildPlayer makes the halo invisible when seated.bathPose is present, and successful onsen activation clears an old navigation feetPulse. Normal exit reconstruction restores the default visible halo. The actual-main probe must check entry=false, exit=true and no pulse residue; pending.

Current acceptance scripts: check-onsen-temporary-hair.mjs checks all24 old hair/body/leg cases, exact existing-low-bun display for braided-tail, untouched head/shell/body, all normal-outfit vertices, saved identity and real pool-solid triangles. check-onsen-braid-restore.cjs now asserts mounted low-bun mesh names, original long-braid vertices after exit/cancel/region changes, halo false→true and stale feetPulse cleanup. The older check-onsen-braid-binding.mjs remains historical for the rejected curve proposal and must not be run as the new display contract.

## Published R16.2 three-way integration

Base was the preserved R16.1 tree, ours the current bath branch, incoming the published R16.2 source84a54df402f66c6964414814773a1de931668717. The only common changed product file was room-closures.js: its shared return line now retains the full incoming France mount/reveal/pocket compatibility logic and the two Japan-only approach metadata fields. The two pool rationale changes were preserved separately. All other incoming changes, including France scene/engine, new inset module, index/version/build files, README, docs/checklist and archive rules, were copied exactly. Relative to published R16.2 only six own product files and two own tests differ; every other incoming file is byte-identical. See merge-r16-2.json for complete source fingerprints and incoming file list. No41-door work is imported.
