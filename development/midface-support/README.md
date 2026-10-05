# Bounded midface support candidate

Development only, based on runtime commit `49c744a`. The user still finds the
midface insufficiently three dimensional. This candidate is not an accepted
likeness or a production publication.

## Diagnosis and change

The same cheek breaks remained after replacing facial vertex colour with grey.
A continuous Lambert diagnostic softened them but retained their positions.
The bottom geometry/normal turns are therefore the primary issue; the existing
skin cel ramp makes them more visible. A few stale, shallow baked recess values
contributed locally. The bridge already projects and is not raised here.

`sculpt.py` reads the exact runtime asset from Git, rather than rebuilding the
older generator. It selects the frontmost cheek skin by offline ray visibility,
fairs a physical quadratic sheet in one bilateral connected region, and adds
one broad anterior malar support. Only depth changes. The first candidate's
inner transition was too hard; a single correction widens that transition and
reduces its projection before stopping this sculpt pass.

Final asset changes 260 stored vertex depths (262 selected vertices, two
displacements round away in Float32), at most 6.41 mm. It rotates 386 authored
normals by the actual local geometric change and clears three stale recess
values on the moved exterior skin. The shader, ramp, palette, makeup masks,
topology, face width and heights are unchanged. Nose/eye/lip geometry, lower
chin, cranium, neck, male form and other parts remain intact. This is an original
geometric study; no reference photograph is stored in the repository or product.

## Reproduction

From the repository root, with Python/numpy and the existing renderer installed:

```sh
python development/midface-support/sculpt.py
ALL_ANGLES=1 OUT_DIR=qa/midface-support/after-final node development/midface-support/render.mjs
node tests/actor-shape-independence.mjs
npm run build
```

The renderer uses actual `createCharacter` and its candidate shader. The
baseline is the existing `qa/candidate-light-makeup` bare front and 3/4 images
on `49c744a`, with identical 640×640 cameras, lights, skin and hair. Natural
makeup still renders through its opt-in material. `DIAGNOSTIC=ramp` removes
facial pigment/AO; `DIAGNOSTIC=lambert` additionally replaces the cel response.
Those diagnostics are not the visual acceptance images.

## Verification and limits

- Bare and natural front/3/4 render: 34,902 triangles, two draws, no GL/shader
  errors; makeup and bare position/index/normal attributes are identical
- Existing nasal-control independence check passed, including 46 collar
  anchors, 181 lip vertices and independent bridge/wing/tip semantics
- One-off scoped verification preserved 416 lip-tinted, 835 nose-domain,
  518 chin/lower-domain and 2,434 upper-domain positions, every non-skin part
  and the entire male asset. All semantic/index arrays remain identical
- Neutral, two eye-size/socket-depth endpoint combinations and one ten-control
  combination produce finite geometry and zero active references after dispose
- All four poses retain 46 neck anchors with zero motion from head rotation
  during a walking pose. This is a joint/geometry check, not iOS observation
- Fresh build passed with 235 assets. No full legacy appearance matrix rerun

The resulting under-eye/cheek support is visibly stronger in the actual game
shader. The side cheek retains stylized plane transitions; this pass does not
claim complete smoothness, a 100% photo match, or the user's aesthetic approval.
No merge to main, site deployment or phone validation is included.
