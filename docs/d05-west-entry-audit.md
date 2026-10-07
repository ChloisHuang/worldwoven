# D05 · Egypt and France room-entry audit

- Date: 2026-10-07
- Baseline: `f46142e`
- Mother item: `docs/PROJECT_CHECKLIST.md` D05. Complete room-entry inventory, choosing door/full curtain/half curtain/open according to sleeping privacy, bathing screens, public circulation and commercial openness; do not add doors without a functional reason; preserve A01/A02.
- Scope: source geometry and current runtime classification audit. Parent runtime inspection confirms France has 9 registered interior rooms / 20 registered entries and current Egypt has 12 registered entries. This document expands the inventory beyond those registries.
- Result: no source-proven missing bedroom or bathroom entrance closure in current Egypt or France. Actual gaps are inventory coverage of rooms, niches and open circulation. These do not justify extra doors.
- Current Egypt is imported from `egypt-temple.js` at `main.js:142`. The old `buildEgypt` in `regions-west.js:239` is not current and is excluded.
- All source paths below are relative to `source/game/`. Source line references refer to the baseline; later edits may shift them.
- D = door; F = full curtain; H = half curtain; O = open; — = no registered doorway. Keep means preserve current entry treatment. Subordinate niches and furnishings are explicitly distinguished from independent rooms.

## Egypt complete inventory

Policies: `room-closures.js:103–116`. Registered entries: `egypt-temple.js:651–665`.

| Floor | Room / functional space | Entry IDs and current closure | Decision / actual geometry source |
|---|---|---|---|
| Ground y=0 | Desert approach, sphinx/obelisk viewing ground | —, O; reaches `pyramid-main-entry` O | Keep public landscape open. `egypt-temple.js:165–176` |
| Ground | Thick-stone entrance vestibule | `pyramid-main-entry` O; unregistered inner mouth at z=11.8, O | Keep both open; genuine passage, not private accommodation. `egypt-temple.js:273–297` |
| Ground | Internal forecourt / royal reception / exchange area / circulation around separate suites | Inner vestibule mouth — O; `internal-painted-gateway` O; connections to judgment/private/service entries below | Keep O. Reception and exchange are furnishings in the common court, not separate rooms. `egypt-temple.js:178–184,605–610` |
| Ground | Painted column hall | `internal-painted-gateway` O; `descending-passage-mouth` O | Keep ritual/exploration axis open. `egypt-temple.js:178–204` |
| Ground, subordinate to column hall | West/east column aisles; papyrus scribal niche; feather balance and guardian positions | —, O within hall | Keep O; stations do not imply additional rooms or doors. `egypt-temple.js:186–206,612–617,635–636` |
| Ground | Anubis judgment / Horus-eye hall | `judgment-hall-entry` O | Keep public ritual entry open; actual room has full enclosure and one south aperture. `egypt-temple.js:475–487` |
| Ground | Royal private reception / sitting room | `private-suite-entry` D; `private-bedroom` F | Keep both. Separate enclosed reception and sleeping spaces. `egypt-temple.js:488–518` |
| Ground | Royal bedroom | `private-bedroom` F; `private-bath-entry` F | Keep opaque privacy. No further side entrance appears in exterior walls. `egypt-temple.js:490–505,595–604` |
| Ground | Private bathing / changing room | `private-bath-entry` F | Keep F; west part of private suite partitioned at x=16.4. `egypt-temple.js:595–604` |
| Ground, subordinate to private bath | North toilet / wash-vessel niche | —, internally O; protected by bath's F entry | Keep within private bath. Not an independently enclosed cubicle; linen panel is behind fixture near north wall. No invented doorway needed. `egypt-temple.js:107–138,604,648` |
| Ground | Royal dining room | `dining-entry` H; `kitchen-entry` H | Keep service textile. `egypt-temple.js:559–574` |
| Ground | Kitchen | `kitchen-entry` H; `storage-entry` D | Keep distinction between work area and enclosed store. `egypt-temple.js:575–593` |
| Ground | Ceramic/grain store | `storage-entry` D | Keep D. Genuine smaller enclosure with storage-wall portal and east return. `egypt-temple.js:583–587` |
| y=0→−3 | First descending stair / tunnel | `descending-passage-mouth` O; lower mouth — O | Keep route open. `egypt-temple.js:329–359` |
| y=−3 | Turning landing / underground corridor, including raised blind-wall display niche | —, O at both stair mouths; display niche has solid back | Keep O. Display niche is not a passage or extra room. `egypt-temple.js:369–382` |
| y=−3→−6 | Second descending stair / tunnel | Both mouths — O | Keep O. `egypt-temple.js:383–386` |
| y=−6 | Tomb antechamber | Second stair mouth — O; `burial-chamber-portal` O; west offering portal — O | Keep exploration room open. Real room missing from facilities/doorway completeness. `egypt-temple.js:387–405` |
| y=−6 | West offering stone room | —, O through x≈−8.5, z≈−26 aperture | Keep O. Floor, walls, roof and vessels establish independent room; no privacy/storage-service rationale for new closure. `egypt-temple.js:406–414` |
| y=−6 | Main burial / star-ceiling chamber and side aisles | `burial-chamber-portal` O; east canopic portal — O | Keep O. Raised overhead stone element at portal remains clear; far-wall sealed-door decoration is backed by solid wall, not traversable. `egypt-temple.js:401–403,415–448` |
| y=−6 | East canopic vessel room | —, O through x≈8.5, z≈−29.3 aperture | Keep O. Independent room absent from facilities and doorway list. `egypt-temple.js:449–455` |
| y=0→4 | Ascending throne stair | Both mouths — O | Keep O; stairs and side protection explicit. `egypt-temple.js:521–528` |
| y=4 | Upper connecting platform / throne approach | Stair mouth — O; `upper-throne-entry` O | Keep public circulation open; rail openings intentional. `egypt-temple.js:529–540` |
| y=4 | Throne hall and side aisles | `upper-throne-entry` O | Keep ceremonial entry open. `egypt-temple.js:541–558` |

Egypt registry omissions explicitly covered here: inner vestibule mouth; both underground stair/landing interfaces; antechamber; offering-room aperture; canopic-room aperture; toilet niche; ascending stair/platform mouths. These are inventory omissions, not demonstrated closure defects.

## France complete inventory

All rooms are ground level on y≈0.23; bath finish y≈0.264. No upper occupied floor is constructed. Policies: `room-closures.js:117–140`. Actual room boundaries: `regions-west.js:1070–1098,1250–1274`. Nine interior-room records: `regions-west.js:1246,1366`.

| Floor | Room / functional space | Entry IDs and current closure | Decision / source |
|---|---|---|---|
| Ground .23 | Central white/gold mirror gallery | `front-entry` D; `rear-entry` D; `gallery-west-rear` H; `gallery-west-front` O; `gallery-east-rear` O; `gallery-east-front` D | Keep mixed envelope/public/private treatment. `regions-west.js:1070–1098,1159–1161,1243–1246` |
| Ground .23 | Royal pastry kitchen | `gallery-west-rear` H; `enfilade-west` H; `core-wing--1--9.5` H | Keep all service textiles. Cabinets are storage furniture, not extra rooms. `regions-west.js:1177–1185,1246,1273` |
| Ground .23 | Emerald salon / library-console area | `gallery-west-front` O; `enfilade-west` H; `core-wing--1--5` O | Keep public salon open; library console is not separate library room. `regions-west.js:1162–1176,1246,1273` |
| Ground .23 | Royal art / study room | `gallery-east-rear` O; `enfilade-east` D; `core-wing-1--9.5` O | Keep public gallery entrances O; bedroom boundary D. `regions-west.js:1246,1273` |
| Ground .23 | Royal bedroom | `gallery-east-front` D; `enfilade-east` D; `core-wing-1--5` D | Keep all three privacy closures. No unclassified wall opening found; windows have raised sills and window construction. `regions-west.js:1074–1098,1246,1273` |
| Ground .264 | Royal private bath / washbasin / linen-storage room | `wing-entry--1--9.5` D; `wing-enfilade--1` D | Keep both opaque closures. `regions-west.js:1252–1259,1286–1312` |
| Ground, subordinate to bath | Screened WC niche | —, internally O; enclosed bath has two D entries | Keep niche treatment. East approach deliberately clear; screen behind cistern. Not a separate enclosed cubicle with missing door. `regions-west.js:1295–1309` |
| Ground .23 | Winter orangery | `wing-entry--1--5` O; `wing-enfilade--1` D; `wing-garden--1` O | Keep public garden circulation O, bath boundary D. `regions-west.js:1252–1274,1313–1317` |
| Ground .23 | Formal porcelain dining room | `wing-entry-1--9.5` F; `wing-enfilade-1` F | Keep gathered drapery; sideboard is furniture, not separate storeroom. `regions-west.js:1252–1274,1318–1323` |
| Ground .23 | Music reception / exchange counter | `wing-entry-1--5` O; `wing-enfilade-1` F; `wing-garden-1` O | Keep public reception O and dining drapery. `regions-west.js:1252–1274,1324–1332` |
| Ground .23 | West rear service connector arcade, z=−9.5 | `core-wing--1--9.5` H; `wing-entry--1--9.5` D; lateral sides — O | Keep; kitchen-to-bath connector is open-sided roofed slab. `regions-west.js:1261–1274` |
| Ground .23 | West front service connector arcade, z=−5 | `core-wing--1--5` O; `wing-entry--1--5` O; lateral sides — O | Keep O. Physically separate slab from rear connector, not one enclosed gallery. `regions-west.js:1261–1274` |
| Ground .23 | East rear state connector arcade, z=−9.5 | `core-wing-1--9.5` O; `wing-entry-1--9.5` F; lateral sides — O | Keep. `regions-west.js:1261–1274` |
| Ground .23 | East front state connector arcade, z=−5 | `core-wing-1--5` D; `wing-entry-1--5` O; lateral sides — O | Keep bedroom boundary D, public arcade O. `regions-west.js:1261–1274` |
| Ground .13 | Front Corinthian portico | `front-entry` D at palace; exterior sides — O | Keep exterior shelter open. `regions-west.js:1072,1151–1158,1244` |
| Ground .16 | Afternoon-tea loggia | —, all sides O between columns | Keep public dining shelter open; no room doorway exists. `regions-west.js:1213–1228` |
| Ground | Rear terrace | `rear-entry` D at palace; terrace sides — O | Keep O outdoors. `regions-west.js:1073,1242` |
| Ground | Front forecourt / fountain walk / west and east allees | —, O | Keep landscape circulation open. `regions-west.js:1213–1219,1242` |
| Ground | South entrance promenade; west/east rose-garden paths; north reflecting-pool axis; perimeter walks | —, O | Keep O. Garden beds/hedge parterres are planting compartments, not private rooms. `regions-west.js:1336–1360,1365` |
| Ground | South and north estate gateways | —, O between ornamental piers | Keep open arrival/exit axes; no functional reason for gate leaves. `regions-west.js:1361–1364` |

## Completeness and acceptance boundaries

- France has four separate roofed connector slabs, although existing `OPEN_CIRCULATION_AUDIT` (`room-closures.js:278–283`) collapses these into east/west gallery labels.
- Neither country has an additional enclosed WC room. Existing entrance privacy is supplied by the containing bath closure. Niches remain identified rather than silently omitted.
- Egypt's offering/canopic rooms are genuine missing room-inventory rows. Their ritual/exploration function is not equivalent to a private stockroom.
- All 12 Egypt and 20 France registered entries have existing policy classifications. Half curtains are fixed overhead service textiles; full curtains are gathered operable closures (`room-closures.js:244–276`).
- No product geometry, closure policy or interaction code changes were required by this audit. Existing unchanged-geometry evidence is reused; this document does not claim new physical, visual, controller or iPhone acceptance.
- Source reasoning is not a fresh visual test. No new tests or screenshots were run for this document. Any previously open visual/device limitation remains open.
