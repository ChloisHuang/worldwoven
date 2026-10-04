# Candidate head parameter visibility

2026-10-04 user report: several random appearances look nearly identical, and a high-score face is too flat in profile. This branch audits the actual `createCharacter` merged mesh, not only the neutral asset.

## Confirmed causes and bounded change

- All ten controls reach the rendered candidate; no stale legacy value or normalization erased endpoints. Female head jaw min/max moves each side by up to 13.91 mm; whole nose and width have existing meaningful spans. Their overall ranges were not enlarged.
- Small whole-nose size used to retract the upper bridge landmark 4.34 mm, cancelling the independent high-bridge control. All three lower-nose size axes now taper out before the upper bridge; the same small-nose choice retracts it only 0.113 mm. Lower-nose length/width/projected size still change.
- Nose-tip scaling was centered very near its front surface and its mask covered only a small core. Its full-range maximum forward movement was 2.73 mm. The current nasal root/ridge now supplies the bulb base, with a softly widened region and 1.35 width/height response. Full-range forward span is 7.55 mm. Neutral value 1 is byte-identical, with upper ridge, eyes, lips, collar and rig anchors retained.
- Candidate cache tag bumped to traits10-v8. The neutral mesh, legacy head, palette, scores, saved ranges, identity and randomizer are unchanged. The 2026-10-04 clarification defines a small nose as narrow/small alae and tip with a high clear bony bridge; candidate noseSize therefore means lower nasal body/alar size rather than scaling the bony ridge. noseWidth remains transverse width, noseTipSize is local bulb size, and noseBridgeHeight controls independent ridge projection. The final XYZ separation is covered by an exact upper-region position check; the earlier endpoint renders remain applicable because they vary jaw/tip/bridge with noseSize=1.

## Focused verification

- `node tests/actor-model-preview.mjs`: PASS; existing real adapter/cache/save/rig contracts and four representative endpoint checks.
- `node tests/actor-shape-independence.mjs`: PASS; reproduces nose-size/bridge cancellation, bounded tip span, exact neutral, 46 collar anchors and 181 lip vertices unchanged.
- `OUT_FILE=qa/shape-visibility/revised.json node development/shape-visibility/audit.mjs`: all ten actual geometry endpoints; diagnostic, not aesthetic acceptance.
- `OUT_FILE=qa/shape-visibility/final-endpoints.png node development/shape-visibility/render.mjs`: same female balanced/updo/overgown through real `createCharacter`; three min/max pairs. Row 1 jaw .84/1.12 at 3/4, row 2 tip .8/1.2 and row 3 bridge .8/1.2 at near-profile. Fixed identity, lighting and camera within each pair. Inspected: endpoints distinguishable, no detached nose/lips/eyes. PNGs and lightweight run output are ignored under qa.

Visual scope is an isolated Three/Mesa candidate view, not an iOS gameplay claim. Random midrange appearances naturally differ less than endpoints; these changes fix two supported nasal issues, not a promise that every random draw must look maximally different. The parent task owns neutral head/neck silhouette and final integrated gameplay review.
