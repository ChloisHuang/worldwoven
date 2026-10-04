# Editable candidate head source

Imported from the existing author branch at `25b78261d729692d7e18e2803acdf0d20561f0c6`; CC0 upstream source and provenance are retained in `../anatomical-head/assets/upstream`. Candidate art remains unaccepted.

Rebuild both forms in Blender, then compile the generated runtime asset:

```sh
CHARACTER_FORM=female blender -b --factory-startup --python development/complete-character/build_head.py
CHARACTER_FORM=male blender -b --factory-startup --python development/complete-character/build_head.py
node development/complete-character/compile-runtime-assets.mjs
```

`forms.json` is the editable named anatomical cage configuration. `posteriorNative.lowerBlendSourceY` ends the upper braincase reconstruction above the neck, so it cannot overwrite the short nape with a diagonal occiput-to-collar slope. The exported head size, front face, topology, neck seam, hair and palette remain anchored. Generated intermediate JSON is not committed; only the runtime asset is shipped.

`development/head-profile/render.mjs` renders the real `createCharacter` path using a fixed representative 90-score female, gathered updo and grey court overgown, plus neutral female and male side checks. It does not claim recovery of the user's screenshot save. `OUT_DIR` chooses before/after evidence; `CASES=high` limits an iteration.

The female reference-sculpt branch authors a complete new female craniofacial target set rather than changing the scoring/morph system. `development/female-reference/render.mjs` renders neutral front, side, three-quarter and a clothed full-body gameplay-distance view. Existing male asset hash and head triangle count are preserved. The female feature handles now include the orbital fold/upper lid roll and lateral nasal/maxillary turn. Its mouth contact uses two adjacent native skin loops without crossing them. The unchanged shader and selected skin palette remain in every standard QA view. `CASES=neutral,high` adds the v2=90 combination; `CLAY=1` is a diagnostic palette only. This is still an unapproved original candidate, not a claim of photographic likeness.
