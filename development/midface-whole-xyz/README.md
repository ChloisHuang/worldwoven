# Whole-midface XYZ prototype — failed art target

Development-only study based on the exact `e35b09e` runtime skin. The added volume is plainly visible, but the under-eye support reads as a horizontal ledge and the outer-cheek/nasal returns remain too abrupt, including in continuous grey light. It does **not** meet the requested broad, round, continuous midface. Stop here; do not merge into main or publish this prototype.

The current mesh is imported into Blender without remeshing. Geodesic exterior selection, anatomical section controls and a biharmonic **displacement** field move XYZ. Actual nasal/lid/lip edges, lower face, skull, ears and collar are hard-held. One initial boundary correction removed an over-wide fixed collar; no further coefficient sweep was performed. The final artifact changes 430 skin vertices (peak forward 9.69 mm), 596 normals and no recess values, retaining 5,835 vertices and 11,622 triangles. The derived asset review hash updates with the arrays.

The method's limit is concrete: smooth displacement between discrete section pins does not enforce smooth final-surface tangents; the stronger volume amplifies existing cheek turns into ledges. For a separate future attempt, author a continuous subdivided cheek control surface in Blender first, including the nasal/infraorbital joins and their tangents, then project the same-index runtime vertices onto that finished surface with the actual feature edges held. That different method is not implemented here.

## Reproduce the failed prototype

The default input revision `2d5503d7d416b51e171c7be9ea410ff35bd02542` is saved on `origin/dev-midface-support`; its complete asset bytes equal the e35 runtime (`f2d413fd7123049331dfd1814f47af5ed642ec5d10975513ccdd0829050de35a`). On a fresh private clone, fetch that branch first. It does not depend on an isolated local-only authoring SHA.

```sh
git fetch origin dev-midface-support
blender -b --factory-startup --python-exit-code 1 --python development/midface-whole-xyz/sculpt.py
ALL_ANGLES=1 node development/midface-whole-xyz/render.mjs
ALL_ANGLES=1 DIAGNOSTIC=lambert OUT_DIR=qa/midface-whole-xyz/after-gray node development/midface-whole-xyz/render.mjs
```

Blender 4.3.2 with NumPy/SciPy is the offline authoring environment. Rendering uses the existing Three/Mesa `node-webgl` fixture referenced by the script. `SOURCE_ROOT` selects an unchanged baseline checkout; camera, lighting, bare skin and hair stay fixed. QA images/native review file remain ignored, and reference photos are never included in assets or Git.

Only asset-integrity verification is required for this rejected prototype: other parts/metadata, nonedited attributes, indices and feature arrays match e35; explicit protected positions are byte-identical; the edited arrays are finite and the derived review hash is valid. No face inversions were found. Neutral front/three-quarter/4.6 m and grey/light/dark captures already existed at the stop; each used the unchanged 34,902 triangles and two draws. These are isolated actual-createCharacter views, not world or iOS validation. Extended QA was stopped once neutral art failed; no aggregate runtime, build or compressed-package pass is claimed.
