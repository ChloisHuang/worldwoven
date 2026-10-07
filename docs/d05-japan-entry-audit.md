# D05 Japan room and entry audit

Date: 2026-10-07. Base: `f46142e`.

## Result and evidence boundary

No genuine missing privacy closure was found in the current Japan source. Keep all 28 classified entry IDs. The 11-entry `interiorRooms` registry alone is not a complete whole-lot inventory: public/open functions and separately modeled district rooms are included below.

This is a source/geometry classification review. The parent loaded all 28 runtime classifier entries. Existing shared-mechanism evidence is reused; there is no new real-device or visual acceptance. No geometry, product code, or tests changed for this audit.

A01 and A02 are preserved: half-curtains remain fixed overhead and non-operable; the original entrance and gender-marked bath noren are not duplicated. Men’s/women’s changing entries retain their original noren and offset privacy screens; no duplicate full closure is added there. Existing full curtains at the separate dry-to-wet thresholds remain.

Legend: **H** fixed overhead half-curtain; **F** operable full curtain; **D** opaque door; **O** intentionally open. “None” means no distinct architectural aperture, not an unclassified doorway. Every row is a keep decision; there are no genuine privacy gaps identified.

## Complete room and functional-space matrix

| Floor | Room or functional space | Entry IDs / current treatment | Expected |
|---|---|---|---|
| 1 | Arrival/reception | `jp-1-front-portal` H; internally open | Keep original 湯 noren |
| 1 | Conveyor-sushi dining | None; open foodhall | O |
| 1 | Ramen counter/dining | None; open foodhall | O |
| 1 | Exchange desk/customer and teller pocket | None; open southeast reception pocket | O; furniture is not a room |
| 1 | Grand foodhall/common hall | `jp-1-front-portal` H; continuous public circulation | Keep |
| 1 | Shared rear food-preparation room | `jp-food-prep-door` H | Keep |
| 2 | Bath foyer | `jp-2-front-portal` O; `jp-men-noren` H; `jp-women-noren` H | Keep public foyer open |
| 2 | Men’s changing | `jp-men-noren` H + fixed offset privacy screen; `jp-men-wet-threshold` F | Keep A02 |
| 2 | Women’s changing | `jp-women-noren` H + fixed offset privacy screen; `jp-women-wet-threshold` F | Keep A02 |
| 2 | Men’s wet room, washing and pool | `jp-men-wet-threshold` F; `jp-men-pool-entry` O interaction approach | Keep; pool rim is not a walk-through door |
| 2 | Women’s wet room, washing and pool | `jp-women-wet-threshold` F; `jp-women-pool-entry` O interaction approach | Keep |
| 3 | Kotatsu gathering hall | `jp-3-front-portal` O; continuous shared hall | O |
| 3 | Library reading room/nook | `jp-library-open-nook` O | Keep public reading access |
| 3 | Single guest sleeping suite | `jp-guest-suite-door` D, pocket shoji | Keep full privacy |
| 3 | Performance reception/drinks salon | None; existing east public hall | O |
| 3 | Small performance stage | None; open front with rear stage curtain and narrow wings | O; backdrop is not an entry closure |
| 4 | Operator office | `jp-operator-door` D, pocket | Keep |
| 4 | Apothecary preparation room | `jp-apothecary-room-door` H | Keep |
| 4 | Staff bunk sleeping room | `jp-staff-room-door` D, pocket | Keep |
| 4 | Linen/laundry room | `jp-laundry-door` H; `jp-laundry-stair-foyer-door` H | Keep both service entrances |
| 4 | Boiler/pipe-control gallery | None; open rear service gallery | O; no enclosed boiler-room aperture exists |
| 4 | Common service gallery | `jp-4-front-portal` O; individual rooms above | O |
| 1 | East stair gallery and landings | None; continuous stair/landing mouths | O |
| 2 | East stair gallery and landings | None; continuous stair/landing mouths | O |
| 3 | East stair gallery and landings | None; continuous stair/landing mouths | O |
| 4 | East stair gallery and landing | None; continuous incoming stair/landing mouth | O |
| 1 | Front balcony | `jp-1-front-portal` H | Keep |
| 2 | Front balcony | `jp-2-front-portal` O | Keep |
| 3 | Front balcony | `jp-3-front-portal` O | Keep |
| 4 | Front balcony | `jp-4-front-portal` O | Keep |
| District ground | Travel/luggage shop | `jp-market-door` H | Keep welcoming service noren |
| District ground | Covered travel-shop arcade | None; open columned shelter | O |
| District ground | Washhouse common sinks/linen hall | `jp-washhouse-entry` H | Keep; privacy belongs to WC stalls |
| District ground | WC stall 1 | `jp-washroom-cubicle-1` D, inward hinge | Keep |
| District ground | WC stall 2 | `jp-washroom-cubicle-2` D, inward hinge | Keep |
| District ground | WC stall 3 | `jp-washroom-cubicle-3` D, inward hinge | Keep |
| District ground | Supply receiving/store room | `jp-supplies-door` D, inward hinge | Keep; old “open on south” comment is stale |
| District ground | Quiet garden pavilion | None; open columned shelter | O |
| District ground | Koi reflection pond/overlook and garden path | None; outdoor | O; not an additional bath |
| District ground | Rear herb-growing/delivery yard, cistern/barrow work areas | None; outdoor | O; not duplicate laundry/apothecary rooms |
| District ground | Arrival lantern gateway | `jp-gateway` O | Keep |
| District ground | Canal bridge and arrival avenue | None; continuous outdoor route | O |
| District ground | Torii procession | `jp-torii` O | Keep symbolic gateway |
| District ground | Omamori display | `jp-courtyard-east-walk` O | Keep outdoor stall approach |
| District ground | Small Inari shrine | `jp-courtyard-west-walk` O | Keep outdoor shrine approach |
| District ground | East service path | None; outdoor circulation loop | O |
| District ground | West service path | None; outdoor circulation loop | O |
| District ground | Front/rear cross-court paths | None; outdoor circulation loop | O |

## Source pointers

Line references are to the reviewed base/source; all source paths below are under `source/game/`.

- `japan-bathhouse.js:242–280`: main exterior walls, windows, front portals, four balconies and stair geometry. Windows have collision bars and are not alternative traversable entries.
- `japan-bathhouse.js:360–383`: enclosed kitchen plus open reception/foodhall/sushi/ramen program.
- `japan-bathhouse.js:390–399`: complete men/women separation, dry/wet partitions, solid offset screens and original noren. The east return explicitly closes a former potential sightline slit.
- `japan-bathhouse.js:432–434`: pool entries explicitly `interactionOnly` and both wet-room programs.
- `japan-bathhouse.js:441–468`: library, enclosed guest suite, public gallery and kotatsu hall.
- `japan-bathhouse.js:473–519`: three west rooms, laundry’s two apertures, open boiler gallery.
- `japan-bathhouse.js:581–618`: bridge, gateway, circulation loop, pond and open garden pavilion.
- `japan-bathhouse.js:619–656`: travel shop, open arcade, washhouse and three individually enclosed WC stalls.
- `japan-bathhouse.js:657–676`: outdoor working yard and fully enclosed supply store; line 664 creates its south door aperture/mount.
- `japan-bathhouse.js:690–703`: district entry IDs and four front portals.
- `japan-bathhouse.js:729–762`: program/facility registry and limited `interiorRooms` list.
- `japan-exchange-counter.js:3–11,23–45`: exchange station and counter furniture, no independent room.
- `japan-performance-hall.js:6–41`: open east-hall salon/stage; rear curtain and side wings are stage furniture.
- `japan-furnishings.js:41,77,105,123,130,139`: sushi, ramen, kotatsu, wash, tub and locker factories create furniture, not additional enclosed rooms.
- `room-closures.js:6–35`: all 28 Japan policies.
- `room-closures.js:231–276`: three original banner exclusions; all half-curtains use `fixed-overhead`/non-operable behavior, so neither auto-gathering nor duplicate moving noren is appropriate.

## Scope conclusion

The source registry’s omissions do not justify new doors: private sleeping, operator-office and WC apertures already have opaque doors; wet thresholds have full curtains; bath arrivals have authored sightline screens; public halls, service galleries, stage, shelters and outdoor routes have positive functional reasons to remain open. No Japan geometry repair is proposed by this audit.
