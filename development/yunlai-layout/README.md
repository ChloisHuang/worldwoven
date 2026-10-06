# Yunlai furniture spacing and floor-correct signs

The existing four dining-seat IDs now belong to two staggered dining islands at (18.55,13.65) and (23.45,17.65). The straight entrance/service spine remains clear. Two new rear-window waiting seats have separate IDs and do not advertise unsupported meal-table capacity. Existing chair models, bowls and tea sets are reused. The two guest beds occupy the middle bays; rugs and rear-window consoles give the enlarged suites usable zones. Wardrobe, bed, room and lease identities remain stable.

Two duplicated ground-floor WC plaques are removed. The existing public-stair sign remains; the actual WC doorway plaque remains on the second floor. No floor-two business is visually labelled as a floor-one business.

Table mesh/colliders, chairs, service points, meal positions, dirt marks and labor targets move together. Layout revision 2 preserves prepaid/held orders and original IDs, rebinds placed plates to their existing table, leaves the already-moved R132 kitchen pass alone and requires physical return to a displaced player's seat. Only moved furniture mounts/routes are invalidated for R132+ saves; unrelated royal work is retained.

## Focused verification

- PASS `tests/china-yunlai-furniture-layout.cjs`: actual navigation/doors/collision to all six chairs, both bed/wardrobe approaches, registration, public WC and both stair levels.
- PASS `tests/china-yunlai-layout-restore.mjs`: R132/R145 layout migration, paid meal and plate identity, unchanged kitchen pass, lease and unrelated duty continuity, idempotency.
- PASS `tests/china-tavern-service-logic.mjs`: real service controller, held/prepaid meal and restore, dirty tables/leases and wrong-table correction.
- PASS existing China layout continuity/UI and footprint routes; final source-only build passed.
- PASS `tests/china-tavern-continuity-main.cjs`: actual main, one original paid dish, partial-phase save/re-entry, physical preparation/delivery/consumption/collection/wash, one reserve and one settlement. 169.8 seconds.
- The older counter-layout main test is not used as a pass: its fixture assumes staff can never sit, but current host personal-meal behavior legitimately mounts a chair. Counter approach is covered by actual geometry routes; ordering and delivery by the current main continuity test.
- Actual merged production geometry was exported by `export.cjs` and rendered offline with Blender from representative gameplay orbit cameras. Material/lighting approximation, not browser/iOS evidence. Review includes north/south dining, second-floor WC sign and a human-eye-height guest-suite view.
- No full-world suite was run; unrelated places and systems were not modified.

The supplementary suite overview is an explicitly labelled overhead cutaway: only non-suite geometry and the ceiling are hidden, without moving or inventing room geometry. It shows the public corridor/door, original bed and wardrobe, tea console and free circulation.
