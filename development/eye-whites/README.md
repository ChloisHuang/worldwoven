# C01 · Readable neutral eye whites

User feedback (IMG_6309, 2026-10-10): adult eye whites blend into the face and read as dot eyes. This is a local shared-renderer correction, not completion of C01 or approval of the full character design.

## Cause and change

The complete-adult sclera had a beige-gray `#d9d0c5` base, another warm/red fragment tint, up to 24.7% baked recess reduction, and a further 40% upper-lid mask before scene lighting. These stacked factors suppress the small visible white crescents, especially in warm rooms.

- Use neutral off-white `#f2f3f1`. The real environment continues to supply its lighting color.
- Reduce sclera-only baked recess strength from .38 to .22 and the extra upper-lid mask from .40 to .20. Retain soft contact/depth at the eyelid.
- Reduce the shader's additional yellow/red tint to a small limbal variation.
- Keep iris/pupil color, their shading, eye geometry, facial traits, skin/hair/body/clothes, four-level cel ramp, saved identity and rig unchanged. No emission, exposure lift, material split or extra draw call.
- Invalidate the composed material program key for the changed shader.

The anatomical iris spans about 40–44% of the complete eyeball width. The current evidence does not justify changing its geometry or redesigning the face.

## Coverage

The shared complete-adult attachment/finish is used by normal players and adult NPCs in China, Japan, Egypt and France, across both anatomical forms and saved hairstyles. Palette-independent logic covers all saved skin/iris colors. The targeted preservation comparison uses male/female actual live-entry characters in each country; offline views use both forms with light and dark complexions.

Separate legacy/family eye paths already use much lighter whites and do not contain this stacked shader/recess darkening. They are not changed. This batch does not remodel children, eyelids or face shapes.

## Evidence and limits

Before baseline: `29f5df6ea272d9bcfec467bcfca4fa4f40f33dc7`. No source snapshot or copied checkout was made. The comparison reader obtains only the two original modules directly from Git in memory.

Actual production `createCharacter` meshes and evaluated skeletons were exported into ignored `qa/eye-whites/before` and `after`, with hashes and exact appearance in `scene.json`. Sclera fragment albedo expressions are read from the corresponding source and sampled at the real feature-coordinate vertices. The original face cel ramp, hemisphere and directional light response are approximated offline with Blender CPU shader nodes. Day light uses the source global colors/direction and typical .65 hemisphere / 1.6 sun. The warm-room fixture uses the authored `#ffc27b` color with representative, explicitly approximate direction/intensity.

Both exports passed the shared 768 MiB Node / 1,152 MiB process-tree / 180-second guard in 2.11s (247.7 / 183.3 MiB). The two six-view CPU batches passed in 9.65s / 500.5 MiB and 10.75s / 497.4 MiB. All heavy stages held `/workspace/shared/worldwoven-heavy-scene.lock` independently.

Reviewed same-camera front, three-quarter and normal gameplay framing (FOV 50°, 4.6 m, pitch .22) under day and warm representative light, for both genders/complexions. The white crescents become clearer; iris/pupil remain dark and bounded by the original lids. At normal distance the change stays small instead of making bright discs. Paired enlarged crops are diagnostic aids, not substitute gameplay cameras. Representative identities are not a reconstruction of the user's save.

This is **offline evidence**, not a production GPU render. The CPU review omits real room occlusion, the local irradiance volume, corneal glints, procedural skin/hair detail and derivative-based antialiasing. On the supported dot cloud Chrome, the live R16.219 page failed to create a WebGL context (`GL_VENDOR` and `GL_RENDERER` reported `Disabled`); the game's fallback was visible. Source loopback was also not reachable. No browser flags, security settings or user-local computer were used. Actual Three/GPU and iOS aesthetic acceptance remain open.

The final focused checks passed under one shared guard in 8.35s / 323.2 MiB, exit 0:

- `verify.mjs`: eight actual country/form characters; 316 non-sclera ranges remain byte-identical. All 16 sclera ranges preserve positions, normals, indices, feature coordinates and skinning, with only their albedo changed. Saved appearance remains equal and both runs end with zero active references. The composed shader retains the original face cel ramp and iris shadow, has the new isolated sclera mask/key, and all real merged materials retain black emission.
- Existing `actor-model-preview.mjs`: actual cache/skeleton/save, role costume, retained garment and collar/head-turn contracts pass; zero active references.
- JavaScript syntax and scoped Git whitespace checks pass. No new global test gate or unrelated world/economic run.

No build/version/deployment is owned by this batch.

## Reproduction

```sh
# Before changing the two source modules:
OUT=qa/eye-whites/before node --max-old-space-size=768 development/eye-whites/export.mjs
# After the local edit:
OUT=qa/eye-whites/after node --max-old-space-size=768 development/eye-whites/export.mjs
OPENBLAS_NUM_THREADS=1 blender -b -t 3 --python development/eye-whites/render.py -- "$PWD/qa/eye-whites/after"
node --max-old-space-size=768 development/eye-whites/verify.mjs
node --max-old-space-size=768 tests/actor-model-preview.mjs
```

Wrap each necessary heavy invocation in the existing shared lock and `scripts/guard-process-tree.py --seconds 180 --mib 1152` as described in `docs/TESTING.md`. This is focused visual/preservation tooling, not a new global color-snapshot release gate.
