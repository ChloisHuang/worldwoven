# Complete representative adult

The source/reference direction is one coherent original adult wearing the existing France outfit. The supplied Sims images were visually inspected but are never imported as geometry or texture. Skin/hair/iris colors remain the original selected values.

Authoring changes method: editable named anatomical handles in `cage.json` deform the pinned CC0 hm08 surface with one biharmonic cage solve. Direct topology loop edits then close the lips and seat the orbital rims. Blender retains an inspectable named cage object; no stack of Gaussian micro-displacements is used. The source attribution is retained under `../anatomical-head/assets/upstream/`.

This isolated branch does not replace production characters. Current valid native cage: 8,524 skin triangles; 11,628 including eyes and brows; 33,316 for the complete clothed actor with original layered hair and softened existing frock (2 merged draws). The failed vertex-group collapse modifier is removed entirely. Native feature loops are retained.

The cervical segment is compressed from the fixed y=1.353 collar boundary, shortening visible neck by 38mm while moving the intact head and hair together. Chin is approximately y=1.442 and crown y=1.687. Skin and hair inputs, culture appearance IDs, body/limb transforms and outfit identity remain unchanged.


## Complete comparison

Final views: `qa/complete-character/final-complete/cel-{front,threequarter,side}.png`; real 50° / 4.6m and closer 2.6m complete outfit views are `cel-clothed-game-{4.6,2.6}.png`. `cel-game-distance-crop.png` is the native 320px crop of the actual 1280×720 / 4.6m follow projection. The exact current production comparator, with the same actor inputs, camera and lights, is in `final-production-before`. All complete views were personally inspected. The new representative combines shaped relaxed orbital lids/brows, formed nasal/labial planes, the shortened cervical connection, original layered hair, rounded sleeves/shoulders and seated existing collar/frock. This delivers one complete candidate for whole-character review; it is not a claim that every face trait, outfit, body or NPC has already been replaced.

The final finish retains the existing production four cel values (140/186/229/255) and original selected colors; narrow antialiased boundaries avoid the previous five-band flattening. The skin retains its actual anatomical surface. Eye surface normals use the cage Jacobian and the zero-area pole triangles have been removed.

Scoped verification: finite vertex/normal attributes, valid indices and zero degenerate triangles; source syntax; original production source unchanged; no shader/GL errors; zero retained character references. The 0.38-radian head-turn image in `final-neck-turn` keeps all 46 collar-boundary vertices chest anchored (head weight 0), with 48 actual cervical blend vertices. Clothing integrity check passes. Final complete model is 33,316 triangles / 2 draws versus production 37,352 / 2, a reduction of 4,036 triangles with no added draws. The former study was 69,184 / 2. Final build: 2.62s / 246,943,744 bytes observed RSS; final complete render: 1.92s / 288,960,512 bytes; head turn: 1.91s / 305,557,504 bytes, all under 120s / 600MiB.

Run from the repository root:

```sh
OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 /usr/bin/blender -b --factory-startup --threads 1 --python-exit-code 1 --python development/complete-character/build_head.py
OUT_DIR=$PWD/qa/complete-character/new-review node development/complete-character/render.mjs
PRODUCTION_BEFORE=1 OUT_DIR=$PWD/qa/complete-character/new-before node development/complete-character/render.mjs
```

Remaining integration is deliberately bounded: preserve appearance IDs while adding facial trait deformation and body/hairstyle/outfit compatibility after the complete aesthetic direction is chosen. The one representative already uses production bone batching and cervical chest/head blending. No full-scene, all-body matrix, site publication or production replacement was performed here.


## Direct user revision: two compact adult forms

The user's latest feedback asked for deeper eyes, a taller nasal bridge, a smaller head and male/female differences. `forms.json` now defines a shared recessed socket and supported bridge, plus two actual mesh forms. The globe center and continuous orbital rims move inward together below the projecting brow plane; this is geometry, not darker paint. The male has a firmer jaw and fuller low brow; the female has different malar, cheek, rounded jaw/chin, nose, lip and arched brow targets with a narrower cervical base. Existing skin, hair and iris colors remain identical in comparisons.

Both forms are compacted around the fixed neck junction, blending to the unchanged y1.353 garment seam. Male head scale is (.92,.91,.92), skin crown y1.663; female is (.90,.89,.90), skin crown y1.658. Body presets remain `masculine-lean` and `feminine-slender`, with their existing France frock and court gown. The paired renderer creates both actors in the same scene/camera/light at their real root scales, male left and female right; portraits are never resized to match proportions. `PAIR_PREVIEW=1` produces that comparison. `CHARACTER_FORM=female` builds or renders the female individually. No random trait endpoint matrix is part of this representative comparison.


The corrected complete male/female comparison is `qa/complete-character/final-pair/` (same scene, same camera, same light), compared against `pair-production-before`. Both stand at the original ground/root height; evaluated heights are 1.737m and 1.671m. Male is 33,316 triangles / 2 draws; female 29,804 / 2. Final female roots/crown and sleeves are closed. These exact art assets remain fixed during review. See `RUNTIME_ADAPTER.md` for the separately prepared browser-safe, neutral-only opt-in boundary and pixel-identical adapter verification; unsupported/randomized traits remain unchanged legacy actors.


## Latest proportion revision requested from the front view

The newer user feedback asked for a smaller perceived male head, higher cranial tops, lower outer eye corners and a front view aligned with the supplied SGLY examples. The full-resolution male frontal, male side and Penny female reference pixels were re-viewed. `5529890` preserves the actual vault/face station authoring; `50ffe00` integrates the newly baked hair roots, and `ee0f4d9` preserves the final real upper-lid overlap. The reference's balanced visible forehead/brow/nose-base/chin spacing is an aesthetic direction for these fictional characters, not a universal human ranking or numerical beauty score.

Current complete images are `qa/complete-character/rebalanced-pair-final/cel-{front,threequarter,side}.png` (1920×1080 paired close views) and the 1280×720 `cel-clothed-game-{4.6,2.6}.png`. Both actors are in one scene at real scale. The male face/temple width is reduced a further approximately 6–7%, while the frontal/parietal vault and visible hairline are actually raised; the female upper third is lengthened and her cheek/chin transition softened. Both outer canthi are lowered, nose-base/lip/chin stations are rebalanced, and tapered direct upper-contact plus supporting-roll loop edits visibly cover the upper iris arc. No new covering mesh, paint mask, reference pixels or skin-color substitution was used.

Male skin crown is y1.687 and female y1.691; scalp-specific hair opens around y1.640 and y1.643–1.646 respectively. The old compact-hair transform was removed before the new scalp bake was used. Existing short cervical joins, garment contours and selected colors remain. Full actor heights including hair are approximately 1.762m and 1.705m, still 33,316 and 29,804 triangles / two draws each. These new exact images were reviewed as whole front/three-quarter/profile/gameplay views; native lid pixels were also checked to distinguish actual overlap from a merely projected brow.

Final close render: 2.92 seconds / 473,030,656 bytes observed RSS, no shader/GL errors and zero retained actor references. Both authored meshes pass finite/unit-normal/index/zero-degenerate checks; the refreshed packed browser assets pass the narrow neutral/fallback contract. Production `source/` is unchanged. Prior candidate folders are retained. Compatibility/morph expansion is paused while this requested art revision is reviewed; the existing adapter continues to preserve non-neutral saved requests through legacy fallback.


## Anterior forehead correction

The subsequent “额头太塌了” feedback is addressed by `04cc73a` and refined/fitted in `9acbb27`. The male side and Penny female reference pixels were viewed again. Only anterior forehead Z-depth is changed through three named frontal targets and a smooth local cage blend above the fixed brow; head X/Y, crown height, posterior skull and the eye/nose/lip/neck positions remain exact. The frontal bone is now convex between brow and hairline and rolls into the existing crown. Female upper projection was moderated and the lower transition widened after actual side review so fullness does not begin abruptly above the brow.

Both existing hair guides were rebaked locally for clearance, without new styling, width or height controls. Current images are `qa/complete-character/forehead-pair-final/cel-{front,threequarter,side}.png` and the corresponding two full-distance views. Same-frame before images remain in `rebalanced-pair-final`. The bob covers part of the lateral forehead; the three-quarter opening shows the anterior surface more clearly. No outline of a larger entire head was substituted for the local bone change.

Scoped verification: all X/Y and eye/lower-face/neck vertex positions are exact against `ee0f4d9`; attached brow rays differ only within 3 micrometres. Finite/unit-normal/index/no-degenerate and packed-neutral/fallback checks pass. Complete paired render: 2.93s / 427,646,976 bytes observed RSS, 63,120 triangles / 4 draws, no GL errors and zero retained references. Production remains unchanged; compatibility has a separate owner and is not part of this sculpt revision.


Visibility-only follow-up `a5c5b8c` adds the unchanged current pair's opposite profile in `forehead-opposite-profile/cel-other-side.png` and matched hair-hidden before/current anatomy profiles. `forehead-diagnostic/forehead-anatomy-before-after.png` is clearly labeled in Chinese and uses identical native-pixel crops without resizing or geometry/color changes. The before diagnostic loads the preserved `ee0f4d9` head assets from Git for that render only. Normal clothed appearance views remain alongside this diagnostic.

The separately authored existing-six-trait helper is integrated by `6e6c3af`/`90e417d`; only helper/adapter/test/documentation changed. Current neutral forehead/eyes/hair/clothes and camera framing are untouched. The pure contract passes on the latest assets (1.72s / 158,879,744 bytes RSS), including exact neutral arrays, saved request IDs/colors/original scores, shared eye seams and collar mapping. Two supported outfits now accept existing non-neutral values; unsupported other body/hair/outfit/region requests retain legacy geometry. No world run or production selection was activated.


## Current forehead replacement: continuous profile

The upper-patch result `9acbb27` was explicitly rejected after the hair-hidden view exposed a ledge and a hollow below it. It is preserved only as a rejected prior attempt. Current art is `99276bb` plus fitted hair/static data `777992c`. The vertical post-solve displacement window is removed. A direct, editable frontal profile now shares both value and tangent with the retained skull at its lower/upper joins, distributes the fullness through the lower/central frontal eminence, and blends laterally into the temples. Brow-adjacent support may move where needed for that continuous transition; eye globes, nasal/labial forms, overall head bounds, short neck and materials are retained.

The single actual side check is `qa/complete-character/continuous-forehead-anatomy/anatomy-side.png`; normal paired front/three-quarter views are in `continuous-forehead-normal/`. All three were personally inspected, and the upper ledge/hollow are no longer present in the profile. Same existing hair guides were rebaked for root clearance only. Final front/three-quarter render: 2.32s / 365,228,032 bytes observed RSS, 63,120 triangles / 4 draws, no GL errors and zero retained actor references. No unrelated regression or world run was added; adapter state remains saved and production remains unchanged.


## Whole lateral braincase revision, pending art review

The next user rejected `777992c` as too flat in side silhouette and requested actual lateral skull study. The primary educational reference actually viewed is [OpenStax Anatomy and Physiology 2e, 7.2 The Skull, Figure 7.5](https://openstax.org/books/anatomy-and-physiology-2e/pages/7-2-the-skull), alongside the supplied SGLY adult side. Its rounded parietal/occipital envelope and lower return behind the auditory region guide a soft-tissue head, not a literal bone surface or aesthetic score. The research image is retained only in ignored `qa/research-only/openstax-lateral-skull.webp`.

`73ae69d` adds connected posterior/base controls; its first image `cranial-side01/anatomy-side.png` has visible sparse-mesh corners. `c2af788` refines only the sparse cranial topology, but its `cranial-side-final` still returns inward too high and is explicitly rejected. `3d1e266` replaces the independently pinched posterior result with the original CC0 braincase curve, uniformly aligned in depth/height and smoothly joined behind the ear into the fixed collar. The lower occiput now continues below the ear before the cervical transition; crown height, anterior face and overall short-neck placement are retained. The actual same-side hair-hidden image is `qa/complete-character/native-occiput01/anatomy-side.png`, personally viewed, awaiting overall art judgment.

`e850c2b` fits the existing male hair and repacks the exact forms. Male normal front/three-quarter/side images are in `native-occiput-male-hair/`. Cranial refinement adds 3,098 skin triangles per head, with native facial loops untouched: each full head/eyes/brows is 14,726 triangles; the current complete male is 36,414 triangles and two draws. The paired hair-hidden render took 1.81 seconds / 354,742,272 bytes; male normal views took 1.31 seconds / 257,212,416 bytes, with no shader/GL errors or retained actors. New original female long/updo options are being fitted separately. C01 remains open and this does not activate production.
