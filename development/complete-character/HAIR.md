# Original layered adult hairstyle

One original loose asymmetrical side-part, authored for the complete adult representative. The supplied Sims portraits were viewed only for silhouette and hair flow. No reference pixels, third-party hair meshes, textures, transparent cards or research images are included.

`layered-hair.mjs` exports `addLayeredHair(head, color, fit)` and `createLayeredHairGeometry(fit)`. The first replaces named hair children and returns one mesh using the character batcher's placeholder material convention. Preserve its vertex colors when batching; the selected hair color is multiplied by a small set of subtle lock values. The mesh is 3,417 vertices / 5,888 triangles, all opaque. It joins the existing skin batch and adds no independent runtime draw calls.

`assets/layered-hair-data.mjs` is the original evaluated mesh, not a source backup. It keeps runtime construction small and avoids repeating scalp raycasts for characters. The scalar color values allow the existing hair-color choice to remain effective.

`sculptLayeredHairGeometry` retains the editable original paths and offline root-volume construction. Each broad lock has a filled lower section joining the scalp; only the short frontal tips become free. The temple narrows above the ear, and rear layers settle into the nape rather than forming detached curved blades. The root fit excludes the ear surface itself.

To rebuild after an actual scalp change:

    node development/complete-character/build-hair-asset.mjs /path/to/evaluated/adult-head.json

`render-hair.mjs` reuses the established anatomical lighting and body renderer. It can use `COMPLETE_CHARACTER_ROOT=/path/to/complete-character-worktree` to preview this module against the exact complete adult without duplicating or editing that worktree's source. `OUT_DIR` must be a new directory under that renderer's `qa/`. Render artifacts remain outside Git.

Verification is scoped to finite geometry/index integrity, three full-head views, and the clothed native-distance views on the complete character. The head, clothing, skin shading and wider hairstyle collection are owned by the complete-character pass; these checks do not claim an all-body or gameplay matrix. Whole-character art acceptance remains with that review.

Final fitted placement: the complete head and every hair guide were lowered by 0.038 m together, with default center `[0, 1.562, -0.017]`. Do not add that translation a second time. The baked asset records its evaluated scalp SHA-256. The 2026-10-04 matching `hair-final` render set passed at 2.01 seconds / 289.64 MiB under the 120-second / 600-MiB process-tree guard, with zero GL/shader errors, two complete-character draw calls and zero retained character references. Front, three-quarter, profile, and clothed 2.6 m / 4.6 m views were visually reviewed. The earlier detached-lock `first` render remains local for comparison and is rejected.
