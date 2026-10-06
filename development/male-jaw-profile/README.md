# Male jaw endpoint correction

Separate increment after the nose/brow checkpoint `e0a02d22e759069b72d98e21f2255743122fc8ed`, following the user's feedback that the preferred male face is too pointed, some middle states look better, and the wide/low-preference chin is not wide enough.

The saved `jawWidth` values and preference scores are unchanged. Only the male mesh's lower-face response is remapped: the narrow endpoint approaches the existing middle contour, the middle is exact, and the wide endpoint opens the mandible and chin. The added correction excludes the existing oral surface. Female geometry, nose, eyes, mouth, head height/projection, hair, clothes and poses retain their existing behavior.

Representative bilateral landmark widths (millimetres in the existing game geometry):

- Preferred jawWidth .84: chin 34.48 → 39.40; jaw body 55.44 → 63.36; mandibular angle 75.48 → 86.20. The original middle is 41.04 / 66.00 / 89.77.
- Middle jawWidth 1: exact original geometry, including normals and source colors.
- Wide jawWidth 1.12: chin 45.97 → 53.35; jaw body 73.92 → 85.79; mandibular angle 100.49 → 116.57.

Passed `tests/actor-male-jaw-profile.mjs` (male endpoints, exact female/middle/non-skin geometry, 181 protected lip vertices, no triangle overturns, real actor genotype reload), existing nose-control independence and actor identity/pose checks, plus a clean 255-resource build. No unrelated country or profession regression.

Source-matched actual live-entry geometry views are in ignored `qa/male-jaw/{before,after}-{high,middle,low}/{front,threequarter}.png`. The same `development/nose-brow-profile/export.mjs` and offline Blender renderer were used with identical identity, light, palette and camera. Only jawWidth changes in these controlled comparisons; folder names refer to the jaw preference direction, not complete multi-trait scores. They do not claim recovery of the user's screenshot save, production shader rendering or browser/iOS proof. Final high/low images were refreshed after the lip-protection boundary fix; byte-identical middle meshes justify reusing the existing middle render.
