# Worldwoven R16.1: stair and landing guard audit

Design only, 2026-10-03. Baseline: immutable `/workspace/shared/worldwoven-source-r16-1`, verified published Sites source commit `eafb569e386904fe1bb9d012bbf9c2b90c3db9a9`. Do not merge this work into the pending door or bathing releases. Rebase the eventual implementation onto their accepted successor and check these source locations again.

The supplied `IMG_6229.png` was inspected at full image level. Its HUD identifies Japan, level 2, R16.1. The image shows red/gold stair-flight rails and unguarded adjoining horizontal deck/stairwell edges. Image perspective alone does not determine which world-coordinate edge faces the camera; the repeated source pattern establishes the affected levels.

This is a read-only source audit plus a repair design. No scene was constructed, no renderer/browser was run, no route test was executed, and no production source was changed. Dimensions below are source-derived world metres, not building-code claims. The machine-readable companion lists all 16 authored flights and their source references.

## Findings and bounded next repair

1. **Japan: confirmed missing flat guard continuity.** Floors 2 and 3 have only the sloped flight rails along a rectangular stair void; the flat edges need their own level-height guard. Floor 4 already has both long flat guards, but its south end is a blind drop, not a stair access mouth, and needs a cap.
2. **China: confirmed flat-edge gaps beside main-hall side stairs.** Each side stair has its own descending rail, but the neighboring main plinth remains level. The plinth edge alongside the flight lacks a level-height guard for 3.2 m on each side.
3. **China: rear-loft turning landing has only a north rail at its own height.** Its east/west edges need lower rail continuations. The higher loft rails can already overlap a standing avatar's head in collision checks, but that is not a visible guard for the intermediate landing. Close the tiny non-travel south-edge remnants without crossing either flight mouth.
4. **China: main-gallery perimeter has visually solid parapets but incomplete avatar collision.** Lower wall headers above doors/windows are deliberately camera-only in `palaceWall`. At the new upper-gallery height those same headers form parapets; add local avatar collision inside their existing masonry volumes. Do not change the lower doorway/header helper globally.
5. **Egypt: source has enclosed burial stairs, stone stair cheeks, and all upper landing returns.** Preserve these. **France: no playable upper storey or stair flight.** Its 0.13–0.264 m floors/thresholds are shallow ground transitions; do not fence them off.

## Coordinate and clearance contract

- North is decreasing Z; east is increasing X. A flight's `y` is its height at the minimum axis coordinate, not necessarily its bottom.
- Player radius is 0.34 m, body height 1.95 m; normal planned routes use radius 0.39 m and a 0.5 m grid. Widths are between collider inner faces unless marked slab/visual. A 0.78 m clear slot merely fits the planner's diameter; it does not prove that a grid path exists. Preserve the wider route widths below.
- Unsupported multilevel movement is already rejected and step changes are limited to 0.4 m. This audit does not claim that avatars currently free-fall. Missing rails still permit wrong visual reading and some unintended lateral transitions near flights.
- New guards must have explicit world-space height intervals in both avatar and camera collision lists. Never use legacy 2D colliders for these upper-level pieces. Never put a whole rectangular blocker over a stairwell, cap an actual travel mouth, add a support surface over a void, shrink the avatar, or change global route/camera parameters to make a guard fit.
- The camera sweeps a 0.18 m radius and uses the explicit `cameraColliders` list when present. Match local guard solids; do not use a floor-to-ceiling curtain across an open view. New parapet avatar-only fixes can reuse the existing camera boxes.
- Japan should retain thin timber guard envelopes: new long-edge guard maximum depth 0.12 m including caps, centered at X=7.4 and 10.8. Keep the 1.42 m west public gallery at X=5.92..7.34. Existing 4F guards are 0.16 m deep and need not be redesigned. New short cap may join their existing envelope.
- China rail helper adds 0.07 m on either side and 0.07 m past endpoints; account for this at all mouth corners. Stitch adjoining posts/top rails rather than stacking duplicate end finials.

## Japan: four-storey bathhouse

Active builder: `japan-bathhouse.js`, not the old builder in `regions-east.js`. Levels are Y=0, 3.8, 7.6, 11.4. Each floor is split around X=7.4..10.8, Z=-10..-2. The three flights overlap in plan, with their lower ends at Z=-2 and upper ends at Z=-10.

| Element | Extent and existing protection | Classification and repair |
|---|---|---|
| Flight 1F→2F | X=7.4..10.8, Z=-10..-2; Y=3.8→0; 24 treads; red/gold sloped rails both sides with 0.12 m wide stepped avatar/camera strips | Preserve both endpoint mouths and tread/support geometry |
| Flight 2F→3F | Same plan; Y=7.6→3.8; same rails | Preserve; add flat guards for adjoining 2F slab edges separately |
| Flight 3F→4F | Same plan; Y=11.4→7.6; same rails | Preserve; add flat guards for adjoining 3F slab edges separately |
| 1F stair zone | Ground support exists under the first flight; no upper drop from the Y=0 deck | No new flat upper guard |
| 2F west/east stairwell edges | At X=7.4 / 10.8, Z=-10..-2, deck Y=3.8; no flat rail calls | Add two 8 m red timber balustrades at Y=3.8; sloped flight rails remain |
| 3F west/east stairwell edges | Same edges, deck Y=7.6; no flat rail calls | Add two 8 m balustrades at Y=7.6 |
| 4F west/east stairwell edges | Same edges, deck Y=11.4; two flat rail calls exist | Retain existing full-length guards; inspect end joins |
| North mouths, 2F/3F/4F | Z=-10, X=7.4..10.8; incoming flight ends exactly at this floor's Y; landing extends north to Z=-14.85 | **Keep all three open.** Do not rail across Z=-10 |
| South mouths, 1F/2F/3F | Z=-2, X=7.4..10.8; outgoing flight starts at this floor's Y | **Keep all three open.** Flat rails must turn/end at side posts |
| South edge, 4F | Z=-2, X=7.4..10.8, Y=11.4; no outgoing flight; incoming flight here is at Y=7.6 | **Blind 3.8 m drop: add one 3.4 m cross guard.** It sits above the 3F stair start and must not gain a down-to-ground collider |
| Front balconies | Y=0/3.8/7.6/11.4, X=-11.85..11.85, Z=9..11.65; long front rails and both end returns exist; upper floors have a central front rail | Retain. Upper front collider spans leave only ~0.025 m joints at X=±2.125..2.15, covered visually by end caps; not actor-sized openings. Ground central gap X=-2.15..2.15 is intentional entry |
| Rear and side facades | Rear Z=-15; X=±12 walls/window bands, floor to ceiling | Already bounded; do not duplicate guards against walls |
| Arrival bridge/canal | X=-2.525..2.525, Z=19.75..34.25, floor ~0; red rails at X=±2.56, Z=19.55..30.25; canal blocks span Z=21.4..29.6 | Rails cover the water span; open approach tails at either end are ground transitions, not missing elevated guards |

**Guard design.** Reuse the red timber palette, two horizontal rails, close slender posts, and small brass caps. Use a locally thin profile (maximum 0.12 m overall on the new 2F/3F long rails) rather than blindly calling the existing 0.16 m-deep balcony rail. Approximate height 1.0–1.08 m above the deck; match mesh and collision envelopes. Join the north end to the incoming-flight post and the south end to the outgoing-flight post on 2F/3F, avoiding doubled posts at the same coordinates. Keep 4F's cap only at its own floor height.

**Clearances to preserve.** Sloped flight collider inner width is 3.28 m; target no less after adding long rails. With 0.16 m upper guards, 4F north opening is 3.24 m. North landing is 3.4×4.85 m before side guard widths. Public west gallery stays at least 1.42 m between X=5.92 and 7.34 on 2F/3F. New 4F cap must leave at least 2.20 m south-landing depth before the laundry wall's north face Z=0.28, and the 2.4 m laundry doorway at X=9.1 stays open. East wall-side strip is narrow: about 0.96 m at facade posts after 0.12 m guards (4F existing 0.16 m gives about 0.94 m). Preserve it, but do not rely on it as the primary automatic route: the 0.5 m grid may lack a valid X column. The west gallery is the documented continuous route.

Sources: `japan-bathhouse.js:18,131–149,173–229,342–344,385–393,421–424,521–534,638–640,690`; `main.js:12,79–80,106`; `navigation.js:11–24,94–95,139–159,293–295`; `camera.js:2–9`.

## China: raised palace platforms

Active entry is `regions-east.js:313–314` → `china-palace.js`. All coordinates below are world coordinates after the main hall is raised by 1.2 m and the archive by 0.6 m. `attach` preserves world transforms; new geometry and already-world-space collision bounds must not be translated a second time.

| Element | Exact plan and floor heights | Existing guard / action |
|---|---|---|
| Main platform | X=-12..12, Z=-12..7, Y=1.415 | Front rails split around X=-5.4..5.4; rear rails split around X=4.2..7.8; most side perimeter guarded |
| Main front stair | X=-5.4..5.4, Z=7..10.2, Y=1.415→0.140; 8 risers | Both stone side rails; 10.66 m inner width; preserve both mouths |
| Main rear stair | X=4.2..7.8, Z=-14.8..-12, Y=0.115→1.415; 7 risers | Both stone side rails; 3.46 m inner width; preserve both mouths |
| West side landing | X=-13.85..-11, Z=-9.2..-5.8, Y=1.415 | Outer X=-13.85 rail and north return Z=-9.2; inner portion merges with main platform. South stair mouth X=-13.85..-12.05 must stay open |
| West side stair | X=-13.85..-12.05, Z=-5.8..-2.6, Y=1.415→0.115; 8 risers | Both sloped rails; 1.66 m inner width. **Add a level guard at X=-12, Z=-5.8..-2.6, Y=1.415** for the adjacent main-plinth edge |
| East side landing | X=11..13.85, Z=-4.7..-1.3, Y=1.415 | Outer X=13.85 rail and north return Z=-4.7; south mouth X=12.05..13.85 stays open |
| East side stair | X=12.05..13.85, Z=-1.3..1.9, Y=1.415→0.115; 8 risers | Both sloped rails; 1.66 m inner width. **Add a level guard at X=12, Z=-1.3..1.9, Y=1.415** |
| Archive platform | X=-12..12, Z=-35..-21.7, Y=0.815 | All four perimeter sides have rails split around the four stair mouths; retain |
| Archive front stair | X=-2.05..2.05, Z=-21.7..-20.5, Y=0.815→0.295; 4 risers | Both side rails; 3.96 m inner width |
| Archive bridge landing | X=-2.1..2.1, Z=-20.5..-20.25, Y=0.295 | Short 0.25 m connector between stair and bridge rails; both little side gaps have no continuous bar. Low 0.15 m step to court, not a high drop. Optional short rail joins at X=±2.05, Z=-20.5..-20.25; keep the entire axial passage open |
| Archive rear stair | X=-1.9..1.9, Z=-36.6..-35, Y=0.115→0.815; 4 risers | Both side rails; 3.66 m inner width |
| Archive west/east stairs | X=-13.85..-12 / 12..13.85, Z=-30.3..-26.7; west Y=0.115→0.815, east reverse; 4 risers each | Side rails at Z=-30.3/-26.7; 3.46 m inner width; keep inward/outward mouths open |
| Lotus bridge | X=-2.1..2.1, Z=-22..-14, Y=0.295; water-side rails X=±2.05, Z=-20.25..-15.75 | Core water span guarded; 3.97 m between rail faces, approximately 3.91 m at column bases. North end joins the archive stair; south tail is a low court approach, not a stair drop |
| Other palace thresholds | Court Y=0.115, axial paving 0.140, low building floors 0.215; ceremonial dais Y=1.575 (X=-4..4, Z=-9.55..-4.95) | Shallow walk-up transitions, not upper landing gaps; no new fence |

Use the existing pale stone/cream balusters and cap rail on external platforms. The two new 3.2 m guards must sit on the level main plinth, not follow the adjacent stair slope. The existing inner stair rails at X=±12.05 are closer to the flight center than a 0.14 m guard at X=±12, so preserving the helper's thickness will not reduce the current 1.66 m flight width. Join at the corner beside the upper mouth; never bridge across the 1.8 m stair footprint. Keep the side court lanes unchanged: 2.15 m is the nominal slab-to-building separation, not collider clearance. A 0.07 m rail envelope and 0.16 m wall inset reduce this to about 1.92 m; authored column bases can locally reduce it to about 1.80–1.83 m. These are source-derived envelope calculations; actual turning routes and other props still need scene checking. New guards belong on the inner plinth edge and must not move the existing outer rail into these lanes.

Sources: `china-palace.js:83–110,146,187–189,231–282,284–315,420`; `regions-east.js:269–277`.

## China: main hall upper gallery

Gallery Y=6.015, ceiling 9.215. Ceremonial void X=-6..7.8, Z=-11..2. Stair void X=-10.5..-7.8, Z=-8..1.2. The gallery's six slabs are explicitly listed in the JSON map.

- Indoor flight: X=-10.25..-8.05, Z=-8..1.2, Y=6.015→1.415, 26 risers. Both sloped red/gold rails exist; 2.06 m inner clear width.
- Stair hole west/east edges are already flat-guarded at X=-10.5/-7.8 over Z=-8..1.2. South blind edge at Z=1.2 is capped at gallery height. North edge Z=-8 is the **actual upper travel mouth** and stays open. The lower mouth at Z=1.2 remains open below the upper cap.
- The ceremonial void's west X=-6, east X=7.8, and front Z=2 edges all have red/gold rails. The north boundary meets the hall's rear wall; no unsupported gallery edge continues across the absent north-central floor.
- Existing lower exterior walls rise to Y=6.9 and visibly guard the gallery's perimeter. A gold top strip reaches about Y=7.03. **Do not add an extra decorative railing over this masonry.**
- Add avatar-only parapet boxes, clipped to the existing wall thickness and Y=6.015..6.9, on these source-derived camera-only header spans that touch upper floor:
  - Front Z=5: X=-9.85..-6.75, -5.7..-3.7, -3..3, 3.7..5.7, 6.75..9.85
  - East X=11: Z=-8.7..-6.7, -4.6..-1.4, 0.7..2.7
  - West X=-11: Z=-9.1..-5.9, 0.7..2.7
  - Do not fill the lower openings. Rear door X=4.5..7.5 at Z=-11 is under the central void, with no upper floor along that span, so it is excluded from this repair
- Thin wall depth is 0.32 m. Existing posts may cover parts of the above spans, but do not provide continuous collision. Reuse existing camera collision; adding giant camera boxes would duplicate solids and change framing unnecessarily.

**Clearances.** Preserve the 2.06 m indoor flight, 1.66 m west-inner gallery between two rails, about 2.97 m east gallery between rail and wall, 2.77 m front gallery, and north turning landing X=-10.5..-7.8, Z=-11..-8. The west-outer 0.5 m slab strip has only ~0.27 m between the wall face and rail; it is **not a usable promenade** for this avatar. Record it as a non-route strip; do not claim all six slabs are equally traversable or widen them as part of this guard repair.

Sources: `china-palace.js:100–111,231–241,256–267,319–357`; `regions-east.js:274–277` (the upper opening pieces use `block=false`).

## China: rear viewing loft and switchback landing

Upper floor Y=4.215, lower archive Y=0.815. Upper void X=-9.2..-4.05, Z=-32..-25.4. Intermediate landing Y=2.515 occupies X=-9.1..-4.05, Z=-32..-30.

| Element | Existing protection | Action / protected opening |
|---|---|---|
| West/lower flight | X=-8.95..-6.75, Z=-30..-25.4, Y=2.515→0.815, 10 risers; both sloped rails | Preserve 2.06 m inner width; lower mouth Z=-25.4 and upper mouth Z=-30 stay open |
| East/upper flight | X=-6.4..-4.2, same Z, Y=2.515→4.215, 10 risers; both sloped rails | Preserve 2.06 m inner width; lower mouth Z=-30 and upper mouth Z=-25.4 stay open |
| Intermediate north edge | Z=-32, X=-9.1..-4.05; red/gold rail at Y=2.515 | Retain |
| Intermediate west/east edges | X=-9.1/-4.05, Z=-32..-30; no own-height side rails | Add 2 m red/gold lower rails at Y=2.515, joined to north rail and flight-side posts |
| Intermediate south edge | Z=-30; flight mouths consume X=-8.95..-6.75 and -6.4..-4.2 | Close only non-travel remnants: X=-9.1..-8.95, -6.75..-6.4, -4.2..-4.05. Central gap is 0.35 m; others 0.15 m. Use short joined returns/caps; never add one full 5.05 m cross rail |
| Upper void west/east/north | Flat rails at X=-9.2/-4.05 and Z=-32, Y=4.215 | Retain |
| Upper void south | Rail from X=-9.2..-6.55 at Z=-25.4; remainder open | Retain blind portion; **keep X=-6.55..-4.05 open** for upper flight, with 2.06 m flight inner clearance |
| Upper exterior perimeter | X=±11 and Z=-34/-23; continuous 0.82 m red solid parapets, gold trim and posts; `solid3` gives avatar plus camera collision | Already protected; no additional fence |

**Clearances.** Intermediate landing should retain at least 1.86 m in Z after a 0.14 m north rail and short south-return envelopes, enough for a ~1.08 m planned center corridor at radius 0.39. Keep its overall inner width at least 4.91 m after new side rails. The west upper promenade remains approximately 1.61 m between X=-10.88 (parapet face) and -9.27 (void rail face). Both flights remain 2.06 m. The high upper-void rails currently start at Y=4.185, within a 1.95 m-tall avatar's head range from the 2.515 m landing; that can block lateral movement already, but is not proof that the intermediate edge has a correctly located visible guard. Check overhead framing and rail joins in the real scene before acceptance.

Sources: `china-palace.js:261–282,359–405`.

## Egypt: buried passage and upper throne platform

Active builder is `egypt-temple.js`, not the old Egypt in `regions-west.js`.

| Element | Exact extent / existing boundary | Disposition |
|---|---|---|
| Burial flight | X=-1.6..1.6, Z=-7→-13, Y=0→-3, 24 risers of 0.125 m; enclosed side walls at X=±1.78, thickness 0.36 | 3.2 m collider-clear width; wall/floor joins and both mouths preserved. No open stairwell perimeter needing a rail |
| Burial entry shoulders | Ground Z≈-7.02, outside the central portal; explicit blockers plus pyramid/temple enclosure | Do not fence central X=-1.6..1.6; visually check that shoulder blockers correspond to visible enclosure |
| Burial room landing | X=-7..7, Z=-19.4..-13, Y=-3; side/rear walls and split north entrance wall | Enclosed; no upper open edge |
| Throne ascent | X=-14.8..-11.2, Z=6→-10.5, Y=0→4, 32 risers of 0.125 m | Stone cheeks at X=-14.98/-11.02, with caps; body-clear width 3.6 m, cap visual width ~3.56 m. Preserve bottom and top mouths |
| Upper platform | X=-14.8..2, Z=-13.9..-10.5, Y=4 | Front guard X=-11.2..2 at Z=-10.47; rear guard X=-14.8..-1.8 at Z=-13.93; west return X=-14.98, Z=-13.9..-10.5; east return X=2.18, Z=-13.25..-10.5 |
| Upper stair mouth | At Z=-10.5, X=-14.8..-11.2 | Intentionally open into the west end of the platform; never cap |
| Throne entrance | Centered X=0, nominal X=-1.8..1.8, Z=-13.45, floor Y=4 | Intentionally open. Landing depth before rear-wall face is about 2.75 m on the east section; preserve turn |
| Throne hall | X=-11.2..11.2, Z=-30.5..-13.5, Y=4; full side/back walls and split front wall | Enclosed, with no open second edge to fence. Raised throne furniture is a blocked prop, not another walkable level |

Keep sandstone coursing and restrained darker cheeks/ochre capstones if a real scene check finds a join to mend. No source-based new rail is justified. Camera boxes follow the stair cheeks, but their cap tops exceed box tops slightly (flight cap by ~0.075 m; landing cap by ~0.10 m). The existing 0.18 m sweep may cover much of this; do not claim exact cap collision fidelity without an actual orbit check or change global camera behavior speculatively.

Sources: `egypt-temple.js:98–124,229–289,344–383,501–502`.

## France: ground terraces, no playable upper stairs

| Element | Extent and elevation | Classification |
|---|---|---|
| Main palace | X=-10.8..10.8, Z=-13.5..3.5, structural Y=0.23; finishes/selected sills up to 0.258 | Full walls except real doors. Low ground thresholds remain open |
| Front portico | X=-11.35..11.35, Z=3.5..6.5, Y=0.13 | Shallow step to garden; open front/ends intentional; front entry width 3.8 m preserved |
| Tea loggia | X=3.5..9.8, Z=7.4..13.9, Y=0.16 | Ground pavilion, no drop requiring balustrade; preserve all approach sides |
| West/east wings | X=-25..-17 / 17..25, Z=-13.5..3.5, structural Y=0.23, selected finish Y=0.264 | Enclosed, shallow garden door thresholds; 2.5 m garden entrances stay open |
| Four connecting galleries | West X=-17.1..-10.7, east X=10.7..17.1; Z=-9.5±1.43 and -5±1.43, Y=0.23 | Shallow side drops to ground. No new rail; preserve column clearances and minimum 2.0 m existing core-wing door |
| Rear terrace and paving | Broad garden paving only centimetres above ground | No stair or high landing |
| Fountain and twin pools | Blocked props; fountain near (-7.1,11.3); pools centered (±12.2,-25.3), 8.4×9.2 m, shallow raised rims | Not walkable platforms or open floor voids |
| Roof balustrades | Central roof around Y=6.3; wing roof around Y=6.0 | Decorative roof geometry only: no stair access, floor surface or playable upper level. Do not add navigation there |
| Estate perimeter | Low white/green walls with gold details | Already bounded; north/south gate openings intentional |

If later visual QA finds an actual elevated accessible area absent from this map, first identify its support surface; do not infer a playable rooftop from ornamental rails. New fencing in France would obstruct intended ground circulation and is not part of this repair.

Sources: `regions-west.js:562–597,1017–1030,1075–1085,1150–1158,1172–1213,1260,1278–1281`; `main.js:106` (France retains 2D navigation).

## Small acceptance pass for the eventual implementation

This audit does not introduce a test framework. When the separate guard repair is implemented, use the existing region/route harnesses and a brief real-scene review:

1. Japan: traverse each flight up and down through the existing north/south targets; enter both bath sequences, the 3F guest approach and the 4F laundry foyer. Approach new long rails from the flat deck and from the flight. Confirm the 4F south cap blocks only the blind edge and leaves the 3F stair start below it open. Capture the supplied screenshot's level-2 situation plus 3F and 4F end joins.
2. China platforms: walk all eight exterior flights in both directions, especially the narrow west/east main side turns. Do not accept merely a center-line path when a new post narrows a corner.
3. China upper floors: traverse main stair, west-inner/front/east gallery; probe the listed masonry parapet spans at Y=6.015 while ensuring lower doors/windows remain unchanged. Traverse the loft switchback both ways, stop and turn at Y=2.515, and reach the loft west/east/rear targets. The unusably thin west-outer main-gallery strip is not a required route.
4. Egypt: preserve burial descent/ascent and the west stair → upper platform → throne entrance turn. France: preserve front portico, loggia and wing connections. Inspect shallow edges without imposing upper-floor fencing.
5. Orbit the close camera around new rails from both sides and at each landing. Look for duplicate coplanar bars/posts, floating feet, gaps at flight/landing joins and camera pushes into the avatar. Check normal/day/night views and both roof modes. Source-only coverage cannot certify this.

**Stop condition:** required new guards are continuous on the listed exposed edges, all protected mouth intervals remain clear at their original levels, existing route widths are preserved, and the focused actual-scene check succeeds on the accepted post-door/post-bath baseline. No new region geometry, navigation algorithm, roof accessibility, or broad architectural redesign is included.

## Audit material validation

The companion JSON parses, all 16 flight entries and 101 edge IDs are unique, all 175 source references fall within the archived files, and SHA-256 hashes of the eight inspected production files are unchanged. These checks validate only the design material and immutable provenance. They do not constitute navigation, geometry, rendering, or release acceptance.
