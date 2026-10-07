# C03/C04 shared hands

Reopened by the 2026-10-07 Yunlai first-/third-floor play screenshots. This is the existing four-country adult character scope, not a new character or animation system. Existing head/face/hair/hat, identity, scoring, economy and navigation are unchanged.

## Diagnosis and bounded repair

- The original palm taper reached almost to the fingertips and buried most of the four fingers. The thumb was an open-ended tube. The same hand appeared in every country/body/wardrobe. The distal wrist skin also protruded from the palm as a visible square step.
- The arm solver already produced a natural forearm orientation, but a final blanket action override forced the left hand to world −90° X and right hand to identity. In real tea/food/writing actions this bent the wrist back by as much as 168°. Wrist-coordinate tests could not catch this.
- Separate palm/finger contours, rounded tips and a locally buried wrist join retain the original hand envelope, rig, range names and weights. Rest and walking palms turn inward. Action wrists follow the forearm, with longitudinal palm roll for support/pronation.
- Existing generic tools keep their original rig-space trajectories. A bounded four-iteration hand solve puts a real thumb or palm vertex at the existing handle/underside. Reading uses both palms. Two shared finger-curl morphs, independently weighted by each character, apply only to grip tools and reset on exit. They do not add bones or finger IK.
- Explicit chair, onsen and court tablet surface fitting stays authoritative. Japan's seated tea hand targets are no longer overwritten by ordinary chair-lap fitting. Authored chopstick and watering-can inclinations are composed after inverse wrist rotation, rather than replacing Euler components.

## Finite coverage

- Shared body/cut coverage: China/Japan/Egypt/France × all four current body presets × two normalized ordinary wardrobe cuts. Idle/social attention, walking, chair/social attention and return to idle.
- Existing action branches: Japan tea/kotatsu/ramen/sushi-eat/sushi/herb-mix/bath-attendant/tidy/calligraphy/relax/read; China tea/read/calligraphy/cook/knead/herb-mix/tidy/relax; Egypt paint/knead/tea/tidy/garden/ritual/herb-mix/read/talk; France tea/cook/paint/read/tidy/relax/garden.
- Explicit service contexts: existing handoffs/carrying, seated meals, seated tea, archery phases, gardener/tool work, reception and fitting overrides. Actual external hand attachments are audited separately below; a wrist point is not a grip assertion.
- Geometry-fitted supports: 32 ordinary chair combinations, eight onsen body/leg extremes and four body presets with all court tablet phases.

## Evidence and limits

`node --experimental-vm-modules tests/shared-hand-poses.mjs` loads ordinary `character-live-entry` and verifies the final complete-adult renderer: 476 poses, 32 ordinary cases, 70 country/action combinations, 29 contexts, eight onsen and four court variants. Checks cover hand/forearm axis continuity, original limb lengths, actual support points, authored prop orientation, reset and shared-morph isolation. It is CPU geometry evidence, not browser or iOS acceptance.

Independent comparison against 411aef4 found all non-hand/wrist source surface attributes, indices and transforms identical across 32 body/cut cases. Four-country × two-body × nine generic-action × three-time prop-frame checks retain the original world trajectories. A live-entry run of the existing garment-section probe over the applicable country/action branches passes 496 poses with the original 4 mm penetration threshold. The old indiscriminate all-countries/all-actions harness also constructs a China scholar doing the Japan-only standing sushi-eat branch; its two fingertip/robe hits are outside current wiring and are not substituted for the applicable matrix.

`export.mjs` and `gallery.mjs` export actual final merged geometry, evaluated skeleton and morphs. Blender review uses original vertex colors with approximate diffuse lighting, not production Three shaders or real iOS. Normal-view country galleries and close wrist/book/cup/pen views accompany the candidate. Economic/path long tests and unchanged face/hat/identity evidence are reused, not rerun.

## Final existing attachment audit

Adapted the four direct wrist/local-frame owners: Egypt eating spoon; China held appointment document (same hand parent and application contract); Japan performance fan, carrying/serving tray and drinking cup; Japan carried weather-charm cord. Their original world trajectories remain unchanged while real skin contact is fitted. The reception short pen is the one additional post-animate generic-tool adjustment: its existing paper-tip refinement runs first, then its real shaft gets the grip fit without moving the pen.

World-position-only consumers were enumerated once: China archery bow/arrow; palace meal bowl; clinic packet; royal-kitchen bowl; palace tea tray/cup; France tea tray/cup and gardener can/shears; tavern tray/bowl; Japan service pestle/bowls; palace edict scroll/seal/broom; consort petition scroll; Egypt tray/bowl. Their explicit no-tool handoff/archery frames retain the original forearm orientation (no added resting palm roll), and applicable world-anchor comparisons are unchanged. Seated-meal external bowls follow the unchanged left hand; generic right chopsticks have their own compensated grip. Archive and teller objects are independently authored target objects, not wrist attachments. No economy or navigation changes.

Final-only checks: external spoon/document 48 cases, maximum real grip gap 3.15 mm; Japanese external props 54 cases, trajectory error <1e-15 m, thumb <0.98 mm and tray palm <0.24 mm, including release/stow/rebuild/reload/rehang. Existing reception contact script: 189 samples, maximum paper-tip gap 2.42 mm, actual thumb-to-shaft <=0.507 mm. Independent book-box test: both hands of both reviewed forms, 256 palm samples, zero inside the cover; actual triangle probe also has zero deep penetration. Book fits cache unchanged rig-space support configurations, avoiding per-frame point scans: a 1,000-frame CPU-only read-pose sample averaged 0.0331 ms/actor in this cloud environment, not a mobile FPS claim. External fitting reuses scratch vectors and stops at 1 mm convergence with a bounded 20-step cap.

Only these changed hand/attachment checks were rerun at closure. Earlier unaffected shared-pose, identity and non-hand geometry results are reused. A stale local retained-build manifest lacked a previous asset; the fresh source build is the applicable verification here, while release integration owns published asset retention. Final publication remains with release integration; C03/C04 parent scope and real-device/user art acceptance stay open.
