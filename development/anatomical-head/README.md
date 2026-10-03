# Isolated anatomical head study

Prototype only, based on verified CC0 MakeHuman hm08 static mesh data. No MPFB addon/code is downloaded or run. `assets/upstream/provenance.json` pins the upstream commit and SHA-256 of the exact base mesh and license texts. Upstream license sections C–D and the mesh's own September 2020 CC0 header agree. Original authoring script crops the body/helper geometry, fits an adult head/neck to Worldwoven's axes/scale, and adds original eye globes and tapered brows.

The visual direction comes only from the supplied sglynp references. Their identity, scars, textures, and images are not copied into the asset or committed. The same brown skin/hair, French outfit, adult masculine-lean body and original round06 side-part framing are retained in the cel comparison.

Run `blender -b --factory-startup --python development/anatomical-head/build_head.py`, then `CLAY_STUDY=1 OUT_DIR=$PWD/qa/anatomical-head/clay01 node development/anatomical-head/render.mjs` and `OUT_DIR=$PWD/qa/anatomical-head/cel01 node development/anatomical-head/render.mjs` under the agreed 175-second/1.2-GiB process-tree guard. Each output directory must be new. Gray clay hides hair/brows to expose anatomy; the cel run uses the unchanged production material ramp and lighting, without the legacy face-lighting-floor override.

Not production-integrated: the imported head/neck currently uses the head classification in the isolated renderer. Blended cervical skinning, existing randomized facial controls, body/hairstyle/pose validation and final neck/collar integration are still required. No all-parameter matrix is claimed. The visual result must be assessed against the reference before any integration proposal.
