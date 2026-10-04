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
