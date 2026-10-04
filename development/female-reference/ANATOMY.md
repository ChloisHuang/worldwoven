# Female anatomical reconstruction

The earlier `0ac344e` female trial is retained in Git but was rejected visually. The reconstruction replaces its frontal RBF constraint pile with one continuous native CC0 topology in a uniform anatomical frame. The original photos are private visual references; they are neither stored here nor sampled as textures. The following nominal dimensions are authored construction choices, not measurements recovered from a single photograph. They are not exact exported-vertex values: the local source-space blending can change a nominal centerline value. The sampled export values below are authoritative for that candidate.

Coordinates are metres, Y up, +Z forward. Native source scale is 0.105 and offset is `[0, 0.798, -0.085]`. The whole cranium, eye aperture, cheek, muzzle and jaw share this frame. Only the lower cervical transition uses the existing anchored neck solve.

| Surface | Approximate forward Z (mm) | Relationship |
| --- | ---: | --- |
| Globe center | 45.8 | One spherical eye frame per side |
| Corneal front | 63.0 | Spherical normal field, no flat eye insert |
| Upper orbital rim | 69.8 | Projects over the globe |
| Upper orbital fold | 61–62 | Recedes between rim and lid roll |
| Nasal root | 70.0 | Recessed below glabella |
| Bony bridge | 82.5 | Straight rising dorsum |
| Rounded tip | 94.0 | Native lobule and columella loops retained |
| Nasal wing | 75–77 | Behind the tip and distinct from its bulb |
| Upper vermilion | 79.7 | In front of cheek, behind the tip |
| Chin front | 72.0 | Below lips with a continuous labial turn |

The source lid contact and the exported globe use the same anatomical transform. The upper contact covers approximately 1.3 mm of the projected iris upper edge. The old form-specific orbital loop offsets are bypassed for this reconstruction. The nasal centerline is one continuous curve from glabella through nasion, ridge, supratip, tip and columella. The alar and nostril topology is not replaced by separate geometry.

`render-sculpt.mjs` is the strict geometry diagnostic: one opaque grey Standard material on skin and globes, no vertex color, no feature/toon shader, no brow ribbon, no hair, and broad white key/fill lighting. `render.mjs` separately renders the same asset through the real `createCharacter` path with its unchanged chosen palette, existing hair/clothing and production toon material. `CLAY=1` on the game renderer is only a palette comparison, not the strict geometry diagnostic.

This is an original work in progress, not an accepted likeness or a claim that the visual target has been reached.

The lip-contact correction follows actual connected source rim vertices and piecewise-linear upper rim edges. It avoids the old jump onto an adjacent lower vermilion roll and the high lateral upper-roll samples that produced saw teeth. Only contact-loop positions change; the rest of the reconstructed geometry is frozen for material review.

The combined candidate retains the new character cel response. A single ocular frame moves the globe and surrounding contact loops together, with a wider relaxed aperture and no added canthal tilt. The frontal cheek/jaw frame is 4% narrower while the cranium is not enlarged. The nasal curve and whole mouth barrel are balanced together. The cervical handoff now occurs above the throat; submental, throat-corner and front-neck targets form one downward curve rather than a long horizontal shelf and a V-shaped neck notch. Standard comparison frames retain the same palette, light and camera, including one v2=90 example.

## Actual exported center profile (6e07f64)

The nasion is the center-profile local depth minimum, not the lateral brow support point. Actual source-matched mesh coordinates (+Z forward, mm) are: glabella `(0, 1577.793, 74.631)`; nasion `(0, 1563.618, 71.478)`; upper bridge `(0, 1553.612, 76.466)`; bony bridge `(0, 1543.983, 82.478)`; dorsum `(0, 1536.570, 87.909)`; tip `(0, 1523.445, 93.367)`. The actual center nasion is recessed 3.153 mm behind the glabella.

The measured lateral brow support is `(31.330, 1577.460, 68.643)` and its upper orbital fold is `(32.814, 1573.813, 63.769)`. These are lateral points, so their depths should not be substituted for the central glabella when assessing the center nasal profile. The nominal 70 mm nasal target becomes 71.478 mm after the source-space influence mask; it was incorrect to describe that nominal number as an exact mesh coordinate. This audit did not change geometry.

## Final local oval pass

A private front-view comparison aligned the photo's two pupil centers to the actual rendered 111.23 px pupil span and removed about 3.8 degrees of image tilt. The visible contour supports a mid-cheek width reduction of roughly 6–10%, a 4–6 mm longer lower face, and a 5–8% longer horizontal opening; the partly occluded/photo-projected contour does not justify exact biometric dimensions. The local contour function narrows the mid-cheek, retains the lower mandibular arc, and extends the chin by up to 5.5 mm. It explicitly excludes the nasal root, vermilion, eye spacing and scalp. The upper lid covers more of the iris; the iris chart compensates for the shared convex eye frame so pupil/iris rings remain round in front projection. No canthal tilt was added. Standard candidate views remain on the same skin, lighting and toon response.

The elongated chin at `chinLength=1.12` reaches Y=1.434127 m. Its 93 sampled source-chin vertices remain fully assigned to the head: cervical blending now checks native source anatomy rather than treating any skin below 1.435 m as neck. The lower neck and 46 collar anchors retain their existing blend.
