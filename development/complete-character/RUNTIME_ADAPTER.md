# Prepared runtime boundary, not a rollout

`runtime-adapter.mjs` is browser-safe and opt-in. It does not change production selection when imported. No file under `source/` has been changed. No site has been published from this branch.

Supported reviewed representatives are deliberately exact:

- France, casual, `masculine-lean`, `side-part`, `court-frock-coat`
- France, casual, `feminine-slender`, `chin-bob`, `court-gown`
- Six normalized shape values all equal to 1

All other body, hairstyle, garment, region/role or non-neutral shape requests return an unchanged legacy surface root. In particular, existing randomized NPC traits are not implemented by the static mesh adapter: those residents fall back with their stable ID, seed, colors and all six saved values intact. This is not a complete player/NPC rollout. The adapter performs no appearance migration or randomization.

## Integration boundary

The intended call site is immediately after `createApprovedSurfaces(opts)` in `characters.js`, before `mergeSurfaces`. Call `applyCompleteAdultPreview(source,opts)` only when a future explicit opt-in selection requests this representation. Keep the original appearance options and output identity unchanged. Append `completeAdultCacheTag(opts)` to the in-memory template cache key so a future selection change cannot reuse an older representation; do not persist this tag as a saved appearance version.

During the existing two-bucket merge:

1. Create one `createCompleteAdultChannels()` object per existing bucket
2. Preserve source vertex colors with `readCompleteAdultColor`
3. Append the supplied surface channels with `appendCompleteAdultVertex`
4. Use `completeAdultWeights(mesh,sourceY) ?? existingWeights(...)`
5. Finish channels with `finishCompleteAdultChannels(geometry,channels)`
6. Prepare the shared skin material once with `prepareCompleteAdultSkinMaterial`

The 46 collar boundary vertices remain fully chest weighted; the evaluated compact head has 52 intermediate cervical vertices. Hair/eyes/brows and upper skin remain head weighted. Legacy surfaces receive zero feature channels and preserve their existing material ramp. The male hair intentionally remains in the existing cloth bucket, as it was in the exact pair under aesthetic review; the female bob uses the skin bucket. Both actors remain two draws each.

`compile-runtime-assets.mjs` creates a 997,158-byte static ESM module containing packed Float32/Uint16 arrays. Decoding uses standard browser `atob`/typed arrays, once per module; no runtime `fs`, fetch, scalp raycast or mesh compilation occurs. The exact reviewed source SHA-256 is retained per form and the CC0 provenance is preserved. `attach_head.mjs` is the shared pure attachment function; the old Node-only preview loader calls the same function.

The current production build emitter follows relative imports only in `.js` files. Before actual integration, its module-graph handling must explicitly support these ESM files or their source-placement extension; do not copy the development tree or assume imports will be emitted automatically. The current preparation does not modify the build, source selection or deployment.

## Narrow verification

`node development/complete-character/check-runtime-adapter.mjs` checks the two reviewed neutral actors, packed geometry parity, unchanged input objects, collar anchors and one representative saved NPC fallback. It intentionally does not run a world, body or random-endpoint matrix.

`PAIR_PREVIEW=1 USE_RUNTIME_ADAPTER=1 OUT_DIR=$PWD/qa/complete-character/new-adapter-check node development/complete-character/render.mjs` exercises the actual adapter through the existing character cache, two-bucket merge and skeleton. Final `adapter-parity02` matches all five PNGs in `final-pair` exactly (0 differing pixels): front, three-quarter, profile, actual 50°/4.6m and 2.6m complete views. Pair totals are 63,120 triangles / 4 draws: male 33,316 and female 29,804. No shader/GL errors and zero remaining character references. Final parity render: 2.82 seconds / 311,742,464 bytes observed process RSS, under the 120s / 600MiB guard.
