# Door and bath acceptance repair — checkpoint 10

**Verified:** all 41 actual-parameter local door constructions pass continuous leaf/frame/floor checks. Bath camera UI/orbit/entry-exit checks pass; the supported hand pose passes 24 physical cases and its six rendered views have been reviewed.
**Still unfinished:** real whole-scene door neighbors/routes/inset visual acceptance and the final affected furniture regressions. One existing long-braid style collides with the bath ledge and needs a temporary bathing hair pose. Production remains R16; do not deploy this snapshot.

The passed 18mm internal meeting-joint clearance is now integrated. The France pocket opening's old solid casing is replaced by joined front/back face mouldings so its cavity remains hollow. Both source changes still need actual-world checks. Head/hair redesign prototypes remain independent and are not included. Camera freedom is retained; no pitch clamp or forced viewpoint was added. Default and default-direction close views show the bath support and waterline, while freely chosen low rear views have ordinary solid-rim occlusion.

## Historical checkpoints

Earlier entries below describe their own time and do not supersede the current status above.

### Earlier door and bath acceptance repair — current development state — checkpoint 09

**Verified:** checkpoint 06's actual-main bath UI and camera checks pass 192 orbit views and 480 continuous entry/exit frames; clothing, body traits and saved state restore correctly. The four China perimeter-wall samples pass 5,744 short rays.
**Still unfinished:** hand candidate 02 conforms the palm to the real thigh plane but is untested; candidate 01's eight long-leg penetration failures are preserved, the meeting-joint correction is isolated, and all 41 rigid entries still require completed per-door world clearance/path and representative multi-angle visual acceptance. Production is still R16; do not deploy this development snapshot.

All 41 rigid openings now have source-authored wall sections, including seven Japanese entries. Half-curtains are fixed hanging cloth, and the duplicate men/women bath-entry closures are removed. This describes implementation coverage, not complete scene acceptance. The controller/ray receipts and known failures are preserved for reproducible rechecks.

The next pose candidate must support one forearm on the real lumbar ledge and conform the other palm to the actual thigh surface. Exact main-camera images show readable default framing. A deliberately flat extreme rear view is physically occluded by the rim; normal near framing at the default pitch is the next visual check. No persistent pitch clamp has been added. Character head/hair art and the separate China multistory/furniture/archery work remain outside this repair source.

## Historical checkpoints — superseded implementation status

The entries below preserve what was true at each earlier checkpoint. Their pending statements do not override the current status above.

### Checkpoint01 history

Based on published R16 / Sites v27 / source60ee26dab923e36925e4c1385d24d96c7f176662. Public game remains R16. The separate China furniture/archery WIP is preserved on private dev-r17-china and is not included here.

This checkpoint makes half-curtains fixed hanging fabric instead of automatic gathered doors. Existing Japanese men/women entry noren and the original Yu banner get no duplicate closure. Full privacy curtains and rigid doors retain baseline behavior for now.

A focused exact-production fixture passed eight style/axis combinations with unchanged .34 body radius /1.95 height traversal, fixed transforms and three existing-banner duplicate checks. It is not whole-scene visual or interaction acceptance.

Pending: inset door reveals and genuine sliding-wall pockets across all countries; four proper Chinese perimeter gates and wall inspection; pool body/water/seat/wrap reconstruction; before/after production images and actual collision/input paths. New character head/hair design and earlier China/France/Egypt/NPC work remain independent. Do not publish this checkpoint as a completed repair.

Development protection: preserve an immutable source/config checkpoint remotely before long tests or substantial next edits; save a small result receipt at test completion; keep caches, generated images and dependencies out of source archives. Public main and production change only after acceptance.

### Checkpoint 02: unaccepted implementation candidate

Adds the original inset-reveal/pocket helper and partial France scene integration, together with the Japan bathing candidate. Half-curtain correction from checkpoint01 is retained. Candidate pool: real seat/back support, closed retaining rim, independent single water surface and modest temporary Japan-only swimwear; old interior walking IDs explicitly map to poolside bathing approaches. The original pool support, callbacks and body traits are preserved by design, but candidate contact/render regressions have not yet run. Door section prototypes passed small source-geometry samples; full four-country wall integration is not complete. China gate geometry, Japan/Egypt reveals, final scene collision/camera/motion and actual visual acceptance remain pending. This snapshot is intentionally WIP and must not be deployed.

### Checkpoint 03: source before next regressions

Bath candidate02 lowers water to4.47 and adds an8cm physical low backrest after candidate01 showed female rear-hair penetration and an excessive shoulder/neck waterline. The original24 contact combinations remain. New runs are pending. China source now cuts real rough openings for inset jambs/pockets, relocates the two archive-west and guest-west window bays around real cavities, removes only conflicting pocket columns, and divides the old10m south gateway into a4.4m central gate and2.2m flanking gates. Egypt suite/storage inset source is integrated; Japan door-wall edits remain isolated/unintegrated. None of these full-scene changes has completed motion/camera/visual acceptance. Do not deploy.

### Checkpoint 04: bath geometry/camera candidate03

Source is not released. Pool wood rim top is now4.60 with water4.47, stone4.52, unchanged support/body poses. Seven exact camera parts replace the incomplete proxy. Candidate03 contact and paired image gates are prepared and not yet run. Candidate02 images are not accepted because their rim occluded the body. Whole-China closed-ray gate found 150 central rays leaking at12mm meeting gaps, while300 jamb-side rays are blocked; source is intentionally retained as failing here. The centered rebated meeting-joint candidate remains isolated, not applied.

### Checkpoint05: Japan wall integration and bath candidate03 receipts

All seven Japanese rigid doorway source walls now contain inset sections (three true pockets, three cubicle hinges, one store hinge). Pool geometry from candidate03 is unchanged. Two old pool walk-through threshold IDs are explicitly poolside interaction approaches, with historical geometry recorded. Bath status text matches temporary swimwear. Candidate03 physical support/camera parts passed and six exact production before/after images show clear chest-level water; actual main TPS and entry/exit transition checks remain pending. The isolated new meeting-joint candidate is NOT applied: its88 controller fixtures passed but continuous proof returned REVIEW and a narrow gate contact FAIL. These failed inputs and output are preserved under development/repair05/isolated-rejected-joint. All whole-region frame visuals and paths remain pending. Do not deploy.

### Checkpoint06: camera repair before recheck

The exact main-controller bathing check on05 completed192 final angles and480 entry/exit frames. Clothing, traits and save restoration passed;76 final angles and22 entering frames hid the player because the camera focus entered the expanded coping. One high view also crossed a lamp without a camera proxy. Those failures remain in development/repair06. Candidate06 supplies a Japan-bath-only minimum targetY4.85 before the existing smooth target lerp, and adds component-bounded camera proxies for the two actual onsen pendants. Standing camera rules, global collision algorithm and wall geometry are unchanged. This change is untested at snapshot time. Door policy now requires actual source-authored inset mounts for all41 rigid doors. The new meeting joint is still isolated/unapplied. The forthcoming hand-pose candidate is deliberately excluded.

### Checkpoint07: bounded supported-hand pose candidate

The06 actual main bath check passed the same192angles/480continuous frames with no hiding or opaque geometry crossing. Minimum real camera distance1.75m; largest transition step0.115m. Clothing, body traits and save restoration retained. Source/test hashes and small receipt are included. Candidate07 changes only Japan onsen arm posing: one forearm on the actual8cm lumbar ledge, the opposite downward palm on the actual posed thigh. Original hip/sole/back fitting stays. This pose has only passed syntax, awaiting24case real surface and arm-length checks and actual images. Door rebated joint remains isolated, no release.

### Checkpoint08 history

This source replaces only the Japan onsen hand candidate: the right palm now follows the actual deformed thigh contact triangle and its normal at the same4mm surface gap. Left forearm, pelvis, feet, back and bath camera remain unchanged. The original24case probe and3mm penetration criterion remain; new normal/contact triangle assertions replace the old assumption that a palm resting on a sloped thigh must stay world-horizontal. Candidate02 awaits testing. Main06 camera images and the whole China perimeter receipt are retained without generated PNG files.

### Checkpoint09 history

No product source changed. This snapshot adds the correctly named check-onsen-hands02.mjs for hand candidate02. Checkpoint08 preserved the original01 probe under its original name; that file remains as failure-history evidence, not the candidate02 test. Use SOURCE_ROOT pointing to this snapshot/source and OUT_FILE for an explicit result when running the02 script. It retains the original24cases and3mm penetration limit.
