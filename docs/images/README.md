# Worldwoven gallery images

The repository gallery pairs one exterior and one interior view for each region, using the current game's architecture and character models.

## Source and presentation

- **Source revision:** `9cd44708be8adefdff069f8e9d547e6fd79a479f`.
- **Geometry:** Production region builders and the current complete character rigs. Original meshes, instance transforms, vertex colors, clothing, and evaluated walking poses are retained.
- **Residents:** Existing regional character identities use a fixed illustrative world seed. Their positions and staggered walking phases were chosen for these still images along existing paths and room circulation areas; these are not records of live autonomous gameplay or a player's save.
- **Rendering:** Blender 4.3.2, offline, with representative daylight and authored interior light locations. The browser game uses Three.js, so its real-time materials, lighting, and animated effects differ.
- **Format:** 1280 × 800 WebP. Click an image in the main README to inspect it at full size.

## Scene sources

| Region | Exterior | Interior | Production scene |
| --- | --- | --- | --- |
| China | [Palace avenue](china-exterior.webp) | [Ceremonial hall](china-interior.webp) | [regions-east.js](../../source/game/regions-east.js) → [china-palace.js](../../source/game/china-palace.js) |
| Japan | [Canal bridge](japan-exterior.webp) | [Lantern food hall](japan-interior.webp) | [japan-bathhouse.js](../../source/game/japan-bathhouse.js) |
| Egypt | [Desert approach](egypt-exterior.webp) | [Painted column hall](egypt-interior.webp) | [egypt-temple.js](../../source/game/egypt-temple.js) |
| France | [Garden promenade](france-exterior.webp) | [Emerald salon](france-interior.webp) | [regions-west.js](../../source/game/regions-west.js) |

These are source-based presentation renders, not browser screenshots or newly invented concept art. The architecture is not rearranged for the gallery. Camera-frustum culling limits the offline geometry export; walls and furnishings visible from each camera remain in place.

See [credits and licensing](../../README.md#credits-and-licensing) for the project and its third-party components.
