# China inset-door candidate after R16.2

This candidate starts from the published R16.2/v29 frozen source (Site version `84a54df`). The local baseline commit is `0bd86f7`. Only `source/game/china-palace.js` and the China portions of `source/game/room-closures.js` change. The deployed automatic-door engine and inset-section helper are reused. France, Japan, Egypt, bath work, and the separate archery/chair candidate are excluded.

The scope is 27 rigid openings: 23 hinged sets and four pocket sliders. Eight perimeter sets comprise three south bays, three north bays, and the west/east gates. The south 10m arrival uses 4.4m + 2.2m + 2.2m clear bays; the north 6m opening uses 1.6m + 2.2m + 1.6m bays with two real 0.30m piers, all opening outward. Side gates remain 4m. Each gate sits in its actual 0.65m wall reveal. The 19 room-door IDs and the axial gate IDs remain. The 42 China policy entries are 27 doors, six full curtains, four fixed half curtains, and five open passages.

The source removes real rough openings before mounting frames. Pocket side walls use the actual 0.50 m cassette section; archive/guest west windows are repositioned and resized only where their former span would intersect the cavity. Column exclusion uses the rough opening. No blanket outward door-plane offset remains for the Chinese pocket doors, and a missing Chinese rigid source mount now fails explicitly. The other countries' policy blocks and fixed banners remain literal matches to R16.2.

## D01–D06 China subitems

| Item | Source state | Required acceptance still pending |
| --- | --- | --- |
| D01 · Frames inside walls | All 27 source-owned mounts and actual rough wall cuts are integrated | Actual neighboring walls, jambs, heads and base joins; front/back oblique views per entrance |
| D02 · Seams, hinges and storage | Published rebated-leaf engine reused; four real pocket cavities and 23 authored hinge directions | Continuous full-world travel including two leaves, pocket mouths, floors, platforms, ornaments and adjacent furnishings |
| D03 · Two-sided regional detail | Existing two-sided palace wood/lattice and hardware retained | Inspect both sides; ordinary recessed lining is distinguished from an actual through-opening |
| D04 · Trigger, collision and passage | Existing automatic engine and planner reused; functional endpoints retained | Bidirectional player/NPC staged routes at all 27 affected entrances, natural waiting/hold/close and camera checks; no body shrink or relaxed tolerance |
| D05 · Door/curtain/open choices | Complete 42-entry Chinese classification retained except the eight outer gate sets | Confirm selected doors serve their rooms; six full curtains retain their purpose and support; four half curtains remain fixed; five open links remain usable |
| D06 · Perimeter and gatehouse | Four physical 0.65 m wall segments and eight gate sets; south and north three-bay divisions | Actual wall continuity, piers, lintels, side columns, floor/platform interfaces, authored inward/outward sweeps and central/side approach images |

No China subitem is marked complete or published yet. This file supplements the main project checklist and does not replace or reset its French release records.

## Focused verification plan

Reuse the 24 unchanged local configurations from the prior 25-door batch. The two new north sizes and hinge offsets passed a focused continuous pair/frame/floor run with 420 closed rays; the east 1.6m side bay is a translated copy of the checked west configuration. This reuse is limited to local construction.

Build only China in short serial groups: eight perimeter gates, four room pockets, then the remaining 15 room hinges split into bounded batches. Reuse the existing actual-triangle and authored staged-route runners. Stop a group at its first FAIL/REVIEW, retain exact source/mesh/point or route evidence, diagnose a bad probe before expanding tests, and check only the affected construction after a repair. The eight gates and their ground/platform interfaces get priority actual views. No unrelated-country pose loop, color regression, full-game loop, or repeat of the 41-door local matrix is part of this gate.

Generated screenshots stay in QA and are not tracked in source Git. Source/config checkpoints and small receipts are committed locally for the owner to push as explicit minimum file deltas. Nothing in this candidate is published by this worker.

## North-gate correction checkpoint

The first world segment proved the three south gates clear. The old six-metre north pair intersected the unchanged archive platform and rear stair. Reversing the full pair was rejected: its actual leaf reaches z=-41.194 outside the fixed boundary, and the production sweep leaves no player-safe exterior waiting area within the aperture strip. The source now divides only that north opening into a 2.2m axial bay and two 1.6m side bays with 0.3m real piers, all opening outward. The central ID is retained; two side IDs bring the affected inventory to 27 rigid openings and eight perimeter sets. Side hinge pins use a source-authored 0.13m offset within the unchanged 0.65m reveal, preserving hardware clearance and usable passage; the central bay retains 0.18m. The archive building, platform, stairs and southern gates are unchanged. The focused local construction, all three actual-world sweeps, and 24 bidirectional staged routes passed. Actual images exposed a coplanar red sill/courtyard overlap. The north-only sill now occupies the exterior half, joins the existing courtyard, and has matching walkable support; its 24 routes and exact same-camera check passed; the visible red/grey striping is gone. See the small north receipt in tests/china-north-subset-results.json. East/west and room groups remain pending.
