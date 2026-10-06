# Sleep and authored berths

Based on R16.136 source `7cd28d243b860ba05214af7294f207ecb6bcfff5`.

- Cranial contact excludes the complete model's cervical extension. The measured head is placed on its own authored pillow, with a slight foot-edge inset for neck clearance.
- The sleep solver keeps head–chest joint distance equal to neutral; bedding height and quilt shoulder reach are adjusted instead of stretching the neck.
- Six paired-pillow beds provide two reservations. Eleven single-pillow or narrow beds remain one. Bed IDs and existing access/ownership checks stay stable; transient berth IDs are additive save fields.
- Player and NPC release only their own berth. Exact-slot restoration refuses an already occupied slot rather than stealing it.

Focused checks:

    node tests/bed-berths.mjs
    node tests/npc-bed-occupancy.mjs
    node tests/world-continuity.mjs
    node --experimental-vm-modules tests/bed-berths-main.cjs
    node scripts/build.mjs

`bed-berths-main` uses production main/Three/navigation with a simulated DOM. Its initial input-key path hit a missing DOM getClientRects stub; the test now calls the same production furniture action directly for get-up. The old rest-bath-contact test's China transfer assertion fails unchanged baseline too (outdated single-level navigation options). No full suite was run.

Actual live-model + official-bed triangles and evaluated skeleton can be reproduced offline:

    OUT=/tmp/worldwoven-bed-review node development/bed-berths/export.mjs
    blender -b -t 4 --python development/nose-brow-profile/render.py -- /tmp/worldwoven-bed-review

The two PNGs under evidence are diffuse offline renders, not screenshots or production cel-shader/browser/iOS verification. They show independent lying adults with visible heads, supported shoulders, and neutral neck length. Original user identity/save is not claimed. No browser fallback around the environment restriction was attempted.
