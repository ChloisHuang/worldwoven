# Midface continuity study

Development only. Neither `1230c7d` nor this follow-on study has the user's aesthetic approval; no main merge, publication or phone validation is included.

## Verified cause

The same cheek breaks remained with facial colour/AO replaced by neutral grey. A continuous-light diagnostic softened them but retained their locations. Geometry/normal turns are primary; the existing skin cel ramp amplifies them. No coincident split vertices with conflicting normals, flipped faces or degenerate triangles were found in the inspected midface.

The first `sculpt.py` method fitted local depth and then multiplied an offset by a region mask. It added support but introduced visible triangular slopes: representative cheek edge dihedrals rose from 10.6° to 34.0° and 12.6° to 31.5°. That version was rejected. Broadly freezing the whole nose neighbourhood also prevented its surrounding skin from making a continuous join.

## Current method and result

`solve_curvature.py` reads the runtime skin from `49c744a`, using the broad support of `1230c7d` only as a screened target. It solves final depth on the existing exterior sheet using its three-dimensional intrinsic metric. The surrounding fixed sheet carries the boundary; open-boundary Laplacian rows are excluded because their flux is not a curvature measurement. This avoids the invalid near-vertical-cheek projection involved in a plain XY height field.

Nasal transition skin can move. The bony ridge, lobule, actual eyelid contact, lip, head width/height, cranium and lower face remain fixed. This preserves real nasal/eyelid creases instead of minimizing every dihedral indiscriminately. Authored normals rotate with the actual geometric change. No shader, ramp, palette, makeup mask, feature coordinates or topology changes.

The current result changes 226 vertex depths, from −2.11 to +2.18 mm relative to `49c744a`, and 342 normals. Sixteen stale shallow recess values on changed skin are removed. The two introduced cheek folds above are now 8.1° and 7.6°, with no face inversion relative to the original. These figures diagnose continuity; they are not an aesthetic quality score.

Same-camera actual game-shader front and 3/4 images look cleaner than `1230c7d`, especially its isolated nasal-side triangle. Some of its stronger malar projection has also been lost. The face still has stylized side-plane transitions and may still lack the desired readable midface volume. This method result is saved with those limits; no further coefficient iterations are implied and no photo likeness or user acceptance is claimed.

## Reproduction and verification

The default input revisions are pinned to the saved private Git history: `c354b91b6221f53337e744db34316240d79373b1` (authoring `49c744a`) and `aa3a2ede9c3ba827ba1a54015e6bff2f145fe412` (authoring `1230c7d`). Their complete asset blobs were verified byte-identical. Both are ancestors of `dev-midface-support`; fetch that branch on a fresh clone. Optional `--base-revision` and `--support-revision` permit another explicitly verified history without editing the script. The older `sculpt.py` also accepts `--base-revision`. No render or geometry was changed by this reproducibility fix.

```sh
python development/midface-support/solve_curvature.py
ALL_ANGLES=1 OUT_DIR=qa/midface-support/curvature-solve node development/midface-support/render.mjs
```

Both bare and optional natural makeup render through actual `createCharacter` at 640×640, using the existing fixed light skin, hair, cameras and lights. The latest four frames use 34,902 triangles and two draws, have no GL/shader errors, and peak at 287 MiB. Bare/makeup geometric attributes are identical. This is an isolated character view, not a France-world screenshot or iOS observation.

The earlier nasal controls, two eye/socket endpoint combinations, ten-control combination, 46 neck anchors and 235-resource fresh build passed on `1230c7d`. They were not repeated for this geometry-only follow-on and are not represented as newly passed. Index, attachment and deformation code remain untouched. Reference photographs are private research and absent from assets and Git.
