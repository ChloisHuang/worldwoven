# Complete representative adult

The source/reference direction is one coherent original adult wearing the existing France outfit. The supplied Sims images were visually inspected but are never imported as geometry or texture. Skin/hair/iris colors remain the original selected values.

Authoring changes method: editable named anatomical handles in `cage.json` deform the pinned CC0 hm08 surface with one thin-plate cage solve. Direct topology loop edits then close the lips and seat the orbital rims. Blender retains an inspectable named cage object; no stack of Gaussian micro-displacements is used. The source attribution is retained under `../anatomical-head/assets/upstream/`.

This isolated branch does not replace production characters. Current valid native cage: 8,524 skin triangles; 11,820 including eyes and brows; 31,932 for the complete clothed actor with original layered hair (2 merged draws). The failed vertex-group collapse modifier is removed entirely. Native feature loops are retained.

The cervical segment is compressed from the fixed y=1.353 collar boundary, shortening visible neck by 38mm while moving the intact head and hair together. Chin is approximately y=1.442 and crown y=1.687. Skin and hair inputs, culture appearance IDs, body/limb transforms and outfit identity remain unchanged.
