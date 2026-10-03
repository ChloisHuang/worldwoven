# China inset-door candidate after R16.2

This candidate starts from the published R16.2/v29 frozen source (Site version `84a54df`). The local baseline commit is `0bd86f7`. Only `source/game/china-palace.js` and the China portions of `source/game/room-closures.js` change. The deployed automatic-door engine and inset-section helper are reused. France, Japan, Egypt, bath work, and the separate archery/chair candidate are excluded.

The scope is 25 rigid openings: 21 hinged sets and four pocket sliders. The six perimeter sets are south central, south west/east bays, north, west and east. The original south 10 m arrival is articulated into 4.4 m + 2.2 m + 2.2 m usable gate bays with real intermediate wall piers; the north opening stays 6 m and both side gates stay 4 m. Every gate uses its actual 0.65 m wall reveal. The 19 existing room-door IDs and intended functions remain. All 40 Chinese policy entries are listed in `source-inventory.json`: 25 doors, six full curtains, four fixed half curtains, and five open passages.

The source removes real rough openings before mounting frames. Pocket side walls use the actual 0.50 m cassette section; archive/guest west windows are repositioned and resized only where their former span would intersect the cavity. Column exclusion uses the rough opening. No blanket outward door-plane offset remains for the Chinese pocket doors, and a missing Chinese rigid source mount now fails explicitly. The other countries' policy blocks and fixed banners remain literal matches to R16.2.

## D01–D06 China subitems

| Item | Source state | Required acceptance still pending |
| --- | --- | --- |
| D01 · Frames inside walls | All 25 source-owned mounts and actual rough wall cuts are integrated | Actual neighboring walls, jambs, heads and base joins; front/back oblique views per entrance |
| D02 · Seams, hinges and storage | Published rebated-leaf engine reused; four real pocket cavities and 21 authored hinge directions | Continuous full-world travel including two leaves, pocket mouths, floors, platforms, ornaments and adjacent furnishings |
| D03 · Two-sided regional detail | Existing two-sided palace wood/lattice and hardware retained | Inspect both sides; ordinary recessed lining is distinguished from an actual through-opening |
| D04 · Trigger, collision and passage | Existing automatic engine and planner reused; functional endpoints retained | Bidirectional player/NPC staged routes at all 25 affected entrances, natural waiting/hold/close and camera checks; no body shrink or relaxed tolerance |
| D05 · Door/curtain/open choices | Complete 40-entry Chinese classification retained except the six required outer gate sets | Confirm selected doors serve their rooms; six full curtains retain their purpose and support; four half curtains remain fixed; five open links remain usable |
| D06 · Perimeter and gatehouse | Four physical 0.65 m wall segments and six gate sets; south three-bay division | Actual wall continuity, piers, lintels, side columns, floor/platform interfaces, inward sweeps and central/side approach images |

No China subitem is marked complete or published yet. This file supplements the main project checklist and does not replace or reset its French release records.

## Focused verification plan

Reuse the existing 25 exact-parameter local pair/frame/floor checks and 5,250 closed rays. The China source file matches the prior actual inventory exactly; the deployed helper's palace branch and engine geometry are unchanged. This reuse is limited to local construction and does not certify current scene neighbors.

Build only China in short serial groups: six perimeter gates, four room pockets, then the remaining 15 room hinges split into bounded batches. Reuse the existing actual-triangle and authored staged-route runners. Stop a group at its first FAIL/REVIEW, retain exact source/mesh/point or route evidence, diagnose a bad probe before expanding tests, and check only the affected construction after a repair. The six gates and their ground/platform interfaces get priority actual views. No unrelated-country pose loop, color regression, full-game loop, or repeat of the 41-door local matrix is part of this gate.

Generated screenshots stay in QA and are not tracked in source Git. Source/config checkpoints and small receipts are committed locally for the owner to push as explicit minimum file deltas. Nothing in this candidate is published by this worker.
