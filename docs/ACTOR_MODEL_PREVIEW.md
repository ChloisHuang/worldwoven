# C01 opt-in actor integration

Development only. `createCharacter({...appearance, modelPreview:'complete-adult-head-v1'})` uses the current candidate head; omitted/unknown selection stays legacy. No production call site enables it, and nothing in this branch is an aesthetic approval. `root.userData.characterModel` reports applied/fallback and the asset version; saved appearance fields and scoring are unchanged.

This first runtime stage is **head-only**: it deliberately keeps every original body/clothing mesh. It does not reproduce the standalone French pair's soft-shoulder, folded-collar or gown refinements. Those remain in the art branch.

- Both existing masculine body presets support side-part; both feminine presets support chin-bob
- All four body presets also support the retained low bun through a shared candidate-derived attachment envelope
- Casual cultural wardrobes are retained. France male artist/beret also has the same envelope boundary; chef/gardener hats remain explicit fallback
- Braid, shoulder-wave, swept-short and cross-form side-part/bob combinations remain explicit fallback. No all-NPC rollout is claimed
- The existing official cap, emperor/consort ornaments and Jinyi cap attach to the same real head bone through one shared fit hook. Only actual Chinese official `cn-minister-works` and consort `cn-consort-yue` are visually checked in this stage
- Official moustache/goatee are retained, mapped between original/candidate lip/chin landmarks and fitted to the candidate front triangle surface during template creation. They are never removed as generic head meshes

Asset provenance is pinned to art/adapter commit `a0b2aa3`; neutral head/hair arrays were not resculpted. The six-trait pure morph implementation is retained. Runtime imports only browser `.js` modules, static baked geometry and shader helpers; no source OBJ, research image, Node file reader or scalp authoring/raycast function is shipped. CC0/upstream text and provenance are under `source/licenses/complete-adult` and copied into build output.

The two existing skinned draw buckets and skeleton remain. Preview skin uses a separate lazy shared material: importing/using it cannot patch the legacy material. Versioned template keys separate preview from legacy; unsupported requests reuse legacy templates. Body/clothing source ranges retain their positions, normals, colors and skin weights byte-for-byte. The new head has 46 fully chest-anchored collar vertices and 52 cervical blend vertices.

## Narrow verification

`node tests/actor-model-preview.mjs` passes actual createCharacter saved player/NPC JSON roundtrips, unchanged appearance/score, immutable garment arrays, preview/legacy material/cache separation, collar anchoring under a 0.38 rad head turn, and real official/consort attachment ownership. All actor references return to zero. Reuses the source branch's six-trait morphological contracts rather than adding another endpoint matrix.

`node development/actor-model-preview/render.mjs` renders actual runtime actors without loader replacement. `qa/actor-preview/roles-01` has front, three-quarter, head-turn and 50° / 4.6 m full-body images. Isolated Three/Mesa, 71,460 triangles / 12 draws including separate role ornaments; two skinned buckets per actor. No shader/GL errors, zero remaining references. Own-tree guard: 2.83 s / 332,206,080 B, under 120 s / 600 MiB. Front/three-quarter/full-body images were inspected for retained clothing, hat/bun/facial-hair attachment; aesthetic quality remains under user review. No browser, phone, world-controller or walking-route claim.
