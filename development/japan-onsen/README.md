# Japan onsen repair — R16.3

Checklist B01, B02, B03a (supported relaxed pose), B04 and B05 preserve the R16.3 result. The B03b candidate now shares a 4.8-second reversible rim crossing between the player and NPC bath mounts: turn, brace on the actual coping, swing the feet above it, then lower into the existing seat. Publication/version is recorded in the project checklist.

The closed basin has a real bottom, seat and low back support. Water is at 4.47m, the seat at 4.10m and the floor at 3.8805m. The temporary opaque bathing outfit and compact existing low bun preserve the saved braided-tail identity; leaving restores the original braid geometry and clothing. The actual dry poolside approach owns the label, which hides while occupied. Selected-foot and navigation rings are cleared during onsen use.

## Focused validation

From repository root, create qa/ and run only the checks affected by your change:

- `OUT_FILE=qa/onsen-shape.json node development/japan-onsen/check-onsen-temporary-hair.mjs`: four sex/leg endpoints plus one non-braid negative; real skinned contacts and temporary/restored geometry
- `OUT_FILE=qa/onsen-main.json node --experimental-vm-modules development/japan-onsen/check-onsen-braid-restore.cjs`: actual production main handlers with the existing DOM/renderer stub; entry/exit/cancel/region restoration, dry marker, hidden/restored halo and two common camera paths

The second check passed 15 restoration events and 240 default/near camera frames. It is not browser or iOS gameplay. Unrelated countries, decoration colors and the previous 192-angle grid were not rerun. Final exact-production Three/Mesa images use the same actual-main camera/appearance inputs; the images have no DOM layer. The optional renderer requires the separate existing Node WebGL/Mesa tool installation identified in its import path and the configured EGL/GLES library environment. It is not a runtime dependency of the game.

The rejected curved-braid experiments and original failure evidence remain on the private dev-bath-repair Git history. They are not shipped as active tests here. Generated pictures, caches, dependency installations and temporary files remain excluded.

## B03b crossing candidate

- `node development/japan-onsen/check-onsen-crossing-contact.mjs`: only the broad/long player and short/scaled NPC crossing endpoints; 48 moving samples each clear the actual wall, timber and lumbar ledge, and the final fitted contacts equal the prior seated pose
- `node tests/japan-player-service.mjs` and `node tests/shared-facilities.mjs`: crossings cannot manufacture soak time or finish a visit early; shared capacity and reservations remain intact
- `QA_RESOURCE_WINDOW=granted-by-owner node --experimental-vm-modules development/japan-onsen/check-onsen-transitions.cjs`: one actual main-module scene using the existing simulated DOM. Set `OUT_DIR` for production Three/Mesa TPS images within the process-tree resource limit. This is not real browser/iOS play

The completed player logic check covers entry, soak, exit, E/Escape cancellation, repeated E, two occupied neighbors, and original clothing/braid restoration. Normal-view before/intermediate/seated/exit images passed in production Three/Mesa (960×720, normal 4.6 m TPS camera). Movement cancellation also passed. One generated visitor’s single cancellation reached the bank in 51 frames, released its seat, cleared the old mount task and did not remount; the final focused scene passed in 35.9 s / 754 MiB peak process-tree RSS. Entry and exit each took 144 frames at 30 Hz. No face, garment, pool geometry, water or final seated-hand redesign; the R16.3 seated evidence is reused. Unrelated countries and complete employee/order lifecycles are not rerun. The existing extracted service-chain fixture has only its transition dependency and exit waits updated for future use.
