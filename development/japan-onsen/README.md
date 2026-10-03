# Japan onsen repair — R16.3

Checklist B01, B02, B03a (supported relaxed pose), B04 and B05. B03b, a complete animated step over the coping, remains open: the interaction still mounts the seat directly while the camera follows smoothly.

The closed basin has a real bottom, seat and low back support. Water is at 4.47m, the seat at 4.10m and the floor at 3.8805m. The temporary opaque bathing outfit and compact existing low bun preserve the saved braided-tail identity; leaving restores the original braid geometry and clothing. The actual dry poolside approach owns the label, which hides while occupied. Selected-foot and navigation rings are cleared during onsen use.

## Focused validation

From repository root, create qa/ and run only the checks affected by your change:

- `OUT_FILE=qa/onsen-shape.json node development/japan-onsen/check-onsen-temporary-hair.mjs`: four sex/leg endpoints plus one non-braid negative; real skinned contacts and temporary/restored geometry
- `OUT_FILE=qa/onsen-main.json node --experimental-vm-modules development/japan-onsen/check-onsen-braid-restore.cjs`: actual production main handlers with the existing DOM/renderer stub; entry/exit/cancel/region restoration, dry marker, hidden/restored halo and two common camera paths

The second check passed 15 restoration events and 240 default/near camera frames. It is not browser or iOS gameplay. Unrelated countries, decoration colors and the previous 192-angle grid were not rerun. Final exact-production Three/Mesa images use the same actual-main camera/appearance inputs; the images have no DOM layer. The optional renderer requires the separate existing Node WebGL/Mesa tool installation identified in its import path and the configured EGL/GLES library environment. It is not a runtime dependency of the game.

The rejected curved-braid experiments and original failure evidence remain on the private dev-bath-repair Git history. They are not shipped as active tests here. Generated pictures, caches, dependency installations and temporary files remain excluded.
