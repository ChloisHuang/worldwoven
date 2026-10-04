# Prepared runtime boundary, not a rollout

`runtime-adapter.mjs` is browser-safe and opt-in. It does not change production selection when imported. The shared parameter/save/UI contract is now prepared in `source/` on this development branch, while the new neutral model remains opt-in. No site has been published from this branch.

Supported reviewed representatives are deliberately exact:

- France, casual, `masculine-lean`, `side-part`, `court-frock-coat`
- France, casual, `feminine-slender`, `chin-bob`, `court-gown`
- All six existing normalized shape controls, preserving their source ranges, plus four independent semantic controls described below

All other body, hairstyle, garment or region/role requests return an unchanged legacy surface root. The two supported representatives now accept existing non-neutral player/NPC values without changing stable IDs, seed, colors or the original score. This is not a complete player/NPC rollout. The adapter performs no appearance migration, randomization or production selection change.

`shape-traits.mjs` applies bounded runtime deformation to immutable neutral arrays. The all-ones input returns the exact asset and preserves every attached position/normal. Jaw, nose and socket/lid transitions are selected by raw anatomical feature coordinates; actual eye centers and nasal support come from the current geometry, so a neutral art asset replacement does not require copied sculpt targets. The jaw fade ends above the fixed collar. Nose bridge/tip/ala scale through smooth neighboring transitions. The entire eye globe and both lid contact loops share one eye scale and socket translation; pupil/iris/sclera retain the original continuous globe normals rather than computing separate material-edge normals.

New neck, hair tips and garment vertices use the existing `shapeHeight` map and anatomical `sourceY`. Replacement sleeves also use the existing relaxed-arm solver's change in rest offset. Existing body/limbs are already shaped by production and are not mapped again. Original scores and numeric save values remain authoritative, including lower-scoring requests. These are pure cached-geometry preparation steps, with no runtime file reads, rays, new materials, extra draw buckets or per-frame morphing.

## Bounded parameter extension

The original six keys and bounds remain `jawWidth` .84–1.12, `legLength` .94–1.06, `eyeSize` .82–1.20, `noseSize` .80–1.18, `noseWidth` .80–1.18 and `socketDepth` .65–1.65. New keys are `chinLength` .88–1.12, `chinProjection` .85–1.15, `noseBridgeHeight` .80–1.20 and `noseTipSize` .80–1.20. Every default is exactly 1. Missing or invalid values normalize to that neutral; finite outside values clamp to the same bounds used by random generation and UI sliders.

Chin length/projection have a broad transition under the lower lip, fading before the neck and leaving the lips fixed. Nasal bridge height changes ridge projection without resizing the bulb; tip size changes the local bulb without changing the bridge. All four use semantic source coordinates and current sculpt pivots. They leave the upper forehead, eyes, neck anchors, materials and neutral arrays intact.

The score still uses the exact original six terms and weights. The four new geometry controls add no unconfirmed aesthetic weights, whether neutral or non-neutral. Player randomization samples each of the ten bounded inputs once; no score search is performed. Old appearance saves keep version 3 and retain all existing numeric values, ID, seed and palette, adding only missing neutral fields. Existing NPC generation version 1 returns its original six values byte-for-byte; new worlds save version 2, retaining the original six salts and adding four independent versioned salts. All actual resident calls use the saved version. The visitor path carries the same version through bathhouse operations and conservatively defaults to version 1 when it is not supplied; existing saved visitor appearances are reused.

The UI score visibility change can ship independently: internal NPC scores remain, while world labels/nearby interaction surfaces omit them. The player's score appears only for that dialog session's random result, and disappears on opening/reopening or manual shape editing. The new slider/model batch must remain on the development branch until the runtime model boundary is ready: legacy fallback geometry implements only the original six controls.

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

`node development/complete-character/check-runtime-adapter.mjs` checks exact neutral identity, packed geometry parity, immutable base/options, both saved representative requests, unchanged original scores (male NPC 62 / female player 24), unchanged legacy fallback, all six individual bounded controls, shared globe-edge normals, lid movement and collar/rest-height consistency. The two existing buckets and 46 chest-anchored collar vertices remain intact. This is a small pure integration contract, not a rendered endpoint, body or world matrix.

The extension adds four selected endpoint examples, one for each new control, rather than an endpoint/body render matrix. Their measured maximum displacement is 3.665 mm (short chin), 3.300 mm (projected chin), 4.560 mm (higher bridge), and 2.014 mm (smaller tip). `node tests/extended-shape-traits.cjs` passes 24 locked v1 NPC samples, 16 bounded player rolls, old player/default migration, immutable inputs, unchanged original scores and old/new visitor generation. The existing pure random-appearance checks also pass; no additional full-scene or art render is claimed for these new four fields.

One isolated non-neutral saved female request was rendered through the actual character cache, adapter, two-bucket merge and skeleton at `qa/complete-character/traits-saved-player-final/cel-front.png`. The front was visually inspected: upper/lower lid contact and iris/sclera boundaries remain continuous, with no eye gap. The existing camera, neutral authoring assets and renderer source were unchanged; a temporary loader selected the saved traits and only the front view. Result: 29,804 triangles / two draws, no shader/GL errors, zero retained references; guard 1.483 seconds / 239,206,400 bytes peak own-process-tree RSS, below 120 seconds / 600 MiB. No production source or site activation was performed.

`PAIR_PREVIEW=1 USE_RUNTIME_ADAPTER=1 OUT_DIR=$PWD/qa/complete-character/new-adapter-check node development/complete-character/render.mjs` exercises the actual adapter through the existing character cache, two-bucket merge and skeleton. Final `adapter-parity02` matches all five PNGs in `final-pair` exactly (0 differing pixels): front, three-quarter, profile, actual 50°/4.6m and 2.6m complete views. Pair totals are 63,120 triangles / 4 draws: male 33,316 and female 29,804. No shader/GL errors and zero remaining character references. Final parity render: 2.82 seconds / 311,742,464 bytes observed process RSS, under the 120s / 600MiB guard.
