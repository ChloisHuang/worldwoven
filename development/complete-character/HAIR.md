# Original layered adult hairstyle

One original loose asymmetrical side-part, authored for the complete adult representative. The supplied Sims portraits were viewed only for silhouette and hair flow. No reference pixels, third-party hair meshes, textures, transparent cards or research images are included.

`layered-hair.mjs` exports `addLayeredHair(head, color, fit)` and `createLayeredHairGeometry(fit)`. The first replaces named hair children and returns one mesh using the character batcher's placeholder material convention. Preserve its vertex colors when batching; the selected hair color is multiplied by a small set of subtle lock values. The mesh is 3,417 vertices / 5,888 triangles, all opaque. It joins the existing skin batch and adds no independent runtime draw calls.

`assets/layered-hair-data.mjs` is the original evaluated mesh, not a source backup. It keeps runtime construction small and avoids repeating scalp raycasts for characters. The scalar color values allow the existing hair-color choice to remain effective.

`sculptLayeredHairGeometry` retains the editable original paths and offline root-volume construction. Each broad lock has a filled lower section joining the scalp; only the short frontal tips become free. The temple narrows above the ear, and rear layers settle into the nape rather than forming detached curved blades. The root fit excludes the ear surface itself.

To rebuild after an actual scalp change:

    node development/complete-character/build-hair-asset.mjs /path/to/evaluated/adult-head.json

`render-hair.mjs` reuses the established anatomical lighting and body renderer. It can use `COMPLETE_CHARACTER_ROOT=/path/to/complete-character-worktree` to preview this module against the exact complete adult without duplicating or editing that worktree's source. `OUT_DIR` must be a new directory under that renderer's `qa/`. Render artifacts remain outside Git.

Verification is scoped to finite geometry/index integrity, three full-head views, and the clothed native-distance views on the complete character. The head, clothing, skin shading and wider hairstyle collection are owned by the complete-character pass; these checks do not claim an all-body or gameplay matrix. Whole-character art acceptance remains with that review.

## Optional soft bundle finish (2026-10-04)

`5169017` adds the original `soft-bundles-v1` finish. The current female geometry baseline is exactly `c313967` (cherry-picked hair-only changes after complete-head `25b7826`); the fixed female scalp SHA starts `c355549d`. All three static assets retain identical position, normal, color-value, index and scalp-hash fields. No head, hairstyle silhouette or selected color changes.

Enable `flowFinish:true` in `createLayeredHairGeometry` / the third argument of `addLayeredHair`, or in `createFemaleHairOption` / the fourth argument of `addFemaleHairOption`. Also call `applySurfaceFinish(material,{hairFlow:true})` for the explicit preview material bucket containing that hair. Defaults do not enable the finish. The old 113/226-frequency hair shader is removed; the opt-in replacement uses broad longitudinal bundles, shaded roots and a soft same-hue reflection driven by the direct light. No PBR change, transparency, textures, runtime fitting or extra draws.

Attribute contract: `featureKind=6`; `featureCoord=(root-to-tip, unwrapped bundle phase/16, strength)`. Asset `flow` is base64 normalized Uint16 triples; loaders expose a normalized Uint16 featureCoord and Uint8 featureKind. Preserve decoded `getX/Y/Z` values through the existing complete-adult extra channels. That adapter already provides the merged GPU attributes, so this adds no merged vertex stride there. The former loss was in the male asset export/loader; female authoring never supplied flow coordinates. The production default merger is unchanged.

The exact long-hair comparison is `qa/hair-flow/before/` versus `qa/hair-flow/after-final/`: `threequarter.png` and native 1280×720 `game-idle.png` at 50°/4.6m. Same camera, light, skull, geometry and deep-brown `0x44342f` palette; all four actual images viewed. Bundle separation is visible close up and remains quiet at normal distance, but broad cap/lock construction remains visible and this is still an art candidate, not C01 acceptance. Both renders are 34,902 triangles / 2 draws; no GL/shader errors or retained actor references.

Cost: all three baked flow payloads add 83,294 source bytes / 16,430 gzip bytes; complete implementation including the optional render hook adds 87,617 bytes / 18,357 gzip bytes before documentation. Long hair uses 25,907 additional source-geometry attribute bytes, updo 23,030, male 23,919. No geometry or draw delta. Focused validation covers finite normalized coordinates, unchanged static geometry/palette and preservation through the existing adapter for all three assets; only long hair was visually rendered. No whole-character/world test suite was rerun; no production activation or publication.
