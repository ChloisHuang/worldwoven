# Female nose projection follow-up

The user's R133 live-game feedback in `IMG_6293.png` rejected the flattened female profile and apparent downward tip rotation. This increment is based on head checkpoint `27b7a197a8e9afdd510b0470f30ee168236d8edb`; its character source is identical to the R135 production head. R133 is not aesthetic acceptance.

## Reference and diagnosis

The original five user-supplied images were recovered from the authenticated user's Slack message at https://home-he26404.slack.com/archives/D0C6JJR95SN/p1791126846267449 and actually viewed:

- IMG_6250 / F0C7F76NKQ8: clear side profile
- IMG_6251 / F0C6LM6AFD0: elf multi-view collage
- IMG_6249 / F0C6FGX1SLD, IMG_6248 / F0C6EK7SBEX, IMG_6247 / F0C6EK85J75: additional front/three-quarter references

Use filenames for unlabeled frames; do not infer which named person they show from facial recognition. Images remain outside the repository and are not used as textures or distributed with the game. The recovered set guides this local art correction; no exact likeness is claimed.

Two separate issues were verified before editing:

1. Ordinary gameplay randomization/scoring uses the saved original six traits. A score of 100 does not set extended noseBridgeHeight to 1.2; absent bridge/tip controls normalize to 1. This increment changes neither score definitions nor saved genotype values.
2. The actual R133 neutral female sculpt retracted the tip while advancing the root/bridge. Central tip-to-root projection fell 21.89 → 14.29 mm and tip-to-middle-bridge clearance 10.89 → 4.59 mm. Small noseSize/noseWidth do not shrink these central depths. Ordinary high/low v1 endpoints have identical central nose projection. The central tip's height did not move, but its direction relative to the columella became more vertical: a real relative-shape change, not merely lighting. The extended high-bridge/small-tip endpoint compressed tip-to-middle-bridge clearance to 0.33 mm.

## Bounded correction

Female-only continuous lower-bridge/dorsum/base support carries the tip forward. Relative to R133: middle bridge about +1.01 mm, dorsum +3.03 mm, tip +4.46 mm and columella +1.99 mm, with only a small basal blend. Root/brow, facial width/height, tip Y, mouth, chin and male geometry remain unchanged.

Ordinary 100-score projection now retains 18.75 mm tip-to-root, 8.05 mm tip-to-middle-bridge and 9.26 mm tip-to-columella clearance. Extended high bridge/small tip retains 3.54 mm tip-to-middle-bridge rather than 0.33 mm. Its lower contour still uses the established rounded topology; this is restoration of supported projection, not a pointed-tip or whole-face redesign.

## Evidence and limits

Verified paired actual live-entry geometry views in ignored `qa/female-nose-diagnosis/`:

- `high-v1` versus `candidate-high-v1`: ordinary six-trait 100-score profile/front/threequarter; `reference-profile.png` is the same mesh viewed from the opposite side to face the same direction as the supplied side reference.
- `neutral-v1` versus `candidate-neutral`: neutral profile/front/threequarter.
- `high-v2` versus `candidate-high-v2`: extended high bridge/small tip; candidate includes profile/front/threequarter.

All paired views hold identity, camera, light and palette fixed. The representative blonde fixture is not the user's recovered save. Existing installed Blender renders the real Three character geometry with approximate diffuse lighting, not the production cel shader or phone/browser execution. Refitting is judged against the actual tip/columella outline as well as measurements; user aesthetic acceptance remains open.

Passed updated `actor-nose-profile.mjs` (female projection regression plus existing endpoint contact/orientation/lip protection), nose-control independence, unchanged male-jaw behavior, actual model/identity/head-turn checks and clean 255-resource build. A direct comparison to 27b7a19 proves all 38 male mesh ranges and 38 female non-profile ranges retain exact positions/normals; all skin weights, colors and saved traits are unchanged. Ordinary-save fixture stays six-key, score 100, normal live-entry model applied, no save rewrite. No unrelated country/role tests or score migration.

Reproduce current metrics with `node development/female-nose-profile/measure.mjs`. Reuse `development/nose-brow-profile/export.mjs` and `render.py`; `FORM=female`, `TRAITS` and optional `LOOK` select the recorded fixture. Source hashes and exact options are in each export's `scene.json`.
