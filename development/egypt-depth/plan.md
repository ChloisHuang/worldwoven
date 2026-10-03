# Egypt: mass, descent and tomb sequence

The R16.8 layout has a 0.16 m pyramid shell and a single 6 m stair ending in a 3.45 m-high tomb. Keep the silhouette and all 15 activity IDs; give the traversal actual stone mass and a second level of descent.

- Arrival: preserve `pyramid-main-entry`, place a 4.3 m-wide, roughly 8 m-deep stone passage inside it. Coursed walls are 2.5–3 m thick and the ceiling is 3.45 m above the floor. The far portal opens to reception and the existing side destinations.
- First descent: preserve `descending-passage-mouth`, `burial-stair` and `ramp-middle`; retain the exact 24 steps from y=0 to y=-3. Replace paper cheeks with thick masonry and a 2.95 m clear sloping ceiling.
- Turn and second descent: turn west at y=-3 behind a blind end wall, then descend at x=-6 from z=-16.2 to -22.2, reaching y=-6 with 24 steps. No direct entrance-to-coffin sightline.
- Antechamber: a 6 × 6.3 m low room at y=-6; a west offering room branches off, while an east portal leads to the burial hall.
- Main burial hall: x=-1.2…8, z=-35…-22.2; y=-6, 5.4 m clear height. The coffin, linen figure, lid, canopic vessels, boat and stars remain. Move existing activity anchors and their NPC routes together. An east canopic side room and a sealed rear stone door give the hall legible purposes.
- Walls/ceilings have matching body and camera solids. Maintain ≥2.6 m clear portals, 2.95 m tunnel ceiling, 0.125 m risers. Keep thick reveals, restricted warm fixtures and original cel materials; no downloaded assets.

| Existing ID/function | New placement / status |
| --- | --- |
| `egypt-burial`, `lower-burial` | Same activity in deep hall, y=-6 |
| `egypt-stars` | Same star/mural activity in deep hall, y=-6 |
| `burial-east`, `burial-west` | Same coffin-side exploration routes, y=-6 |
| `burial-chamber-portal` | East opening from antechamber into the deep hall |
| `ramp-middle` | Unchanged first descent midpoint |
| `pyramid-vestibule` | Inside thick arrival passage |
| `private-suite-entry`, `storage-entry` | Existing inset construction and mount data unchanged |
| Anubis / Eye of Horus / reception / throne / kitchen / dining / private suite / bath | IDs, targets, routes, floors and interaction construction retained |
| Lot bounds / spawn / upper level | 60 × 80 m / [0,0,35.5] / y=4 retained |

Verification: exercise this changed procession, both stair directions and side-room thresholds using the existing controller; raycast actual support/ceiling triangles; inspect standing close-TPS entrance, turning passage, antechamber and coffin views through production Three/Mesa. Do not re-run unrelated country suites. The old R10 straight-tomb snapshot assumptions become obsolete, not a reason to force the new layout back into one room.
