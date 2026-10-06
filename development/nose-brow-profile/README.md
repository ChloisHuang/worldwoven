# Supported nose and brow profile

Local geometry correction for the user's R16.131 side-profile feedback. The exact supplied screenshot was inspected before editing. The packed `candidate-midface-support-r113-v1` asset is retained; a cached, editable, local Z-only sculpt is applied to its existing topology before independent facial traits. This avoids regenerating or replacing unrelated sculpt work.

- Neutral root +4.79 mm, middle bridge +3.49 mm, central tip −2.81 mm, orbital brow support +2.40 mm.
- Male columella/base support +2.52/+3.42 mm. The existing female base is already more open, so its corresponding correction is +0.88/+1.20 mm.
- `noseBridgeHeight` endpoints move root and bridge by approximately ±3.6 mm from the new neutral, with ±1.3 mm brow support and smaller base support. They never advance the central tip or move the lips.
- No head X/Y scaling, new surface, painted contour, shader adjustment, save/genotype/score change, or extra role support. Chin/jaw art is a separate request.
- Existing brow ribbons are fitted to the actual deformed triangles; nearest-vertex displacement alone was visibly swallowed at the high endpoint. Neutral scalp bounds remain the hair/hat fitting reference, while facial-hair mouth/chin landmarks keep their real morphed values.

## Focused verification

Passed `actor-nose-profile.mjs`, `actor-shape-independence.mjs`, `actor-model-preview.mjs`, `actor-retained-hair.mjs` and a clean 255-resource build. The profile test protects lips, head dimensions, posterior/neck and remote face regions, immutable source data, triangle orientation, finite normals and high/low brow surface contact. Existing model tests cover identity, saved traits, clothing, collar/head-turn anchors, fitted accessories and resource cleanup.

`compare.cjs` compared actual live-entry characters to baseline `9f2c0844e5ebb5ad50c9b82f592098b394500e81`: 35 male and 38 female non-profile mesh ranges remain byte-exact, including eyes, hair and clothes. All non-brow source heights, skin weights, colors and saved six-trait appearance values match. The follow-on contact repair interpolates brow anatomy continuously for eye-size morphs, replacing the old nearest-vertex weight steps; only that existing ribbon has a corrected eye-size transition. No full-country or unrelated career reruns.

## Reproduce geometry views

```sh
OUT=qa/nose-brow-profile/final-male node development/nose-brow-profile/export.mjs
OPENBLAS_NUM_THREADS=1 blender -b -t 4 --python development/nose-brow-profile/render.py -- "$PWD/qa/nose-brow-profile/final-male" profile front threequarter profile-game
# FORM=female; TRAITS='{"noseBridgeHeight":1.2}' select bounded variants.
# SOURCE_ROOT=/path/to/baseline makes the exact same exporter use baseline source.
BEFORE_ROOT=/path/to/baseline node --experimental-vm-modules development/nose-brow-profile/compare.cjs
```

The exporter uses the real production live-entry `createCharacter` path, evaluates the real skeleton, and preserves indexed triangles, smooth normals and source vertex colors. Blender 4.3.2 is the already-installed offline renderer. Lighting is an explicitly approximate diffuse treatment, not the actual Three cel shader, a browser screenshot, or iOS proof. All paired images use identical camera, light, palette and identity. The representative identity does not claim recovery of the user's screenshot save. `profile-game` uses a normal perspective body framing; closeups are diagnostic.

Evidence remains in ignored `qa/nose-brow-profile/`: `before-male` versus `final-male`, `before-female` versus `final-female`, plus isolated `bridge-low-male` / `bridge-high-male` and combined endpoint stress views. Each export records input appearance and source file hashes in `scene.json`. The cloud browser localhost block was respected; no browser workaround or dependency reinstall was used.

## Brow contact follow-on

The combined large-eye endpoint exposed skin crossing between eyebrow triangle vertices even though the vertices themselves cleared the skin. The follow-on interpolates anatomical coordinates on the actual face triangles and uses a 1.2 mm ribbon fitting envelope. Triangle centroids and edge midpoints now clear the skin at combined low/high bridge and eye endpoints for both forms. It preserves the original brow UVs, ribbon topology, nominal X/Y outline, eye geometry and all other body parts. Representative fixed-camera front/profile/three-quarter views verify no floating-brow artifact. Final contact-corrected paired views are `review-male` and `review-female`; isolated bridge extremes are `review-bridge-low` and `review-bridge-high`.
