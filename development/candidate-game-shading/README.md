# C01 candidate shader continuity

This independent development branch starts at R113 adapter `f9e7c96`. The head
asset is frozen to research commit `92770a6`; no geometry or parameter changes.
The normal entry, world lighting and scene shaders are unchanged. This is not
an art acceptance or authorization to publish the optional preview.

## Verified cause and bounded repair

Research `3bbaba6` already had a candidate-specific skin cel response that was
absent from the R113 adapter. Its skin/eye levels are .12/.32/.62/1.0, with wider
transitions at grazing-to-lit normals. Hair retains 140/186/229/255. R113 used
that hair ramp for the face too, while eyes bypassed the candidate ramp.
Research also had upper-lid contact attenuation on the globe, lower iris gain
and restrained corneal reflection. R113 omitted contact attenuation and applied
both the older face-tone reflection and the newer surface reflection.

The two existing research finish modules are restored byte-for-byte; the
runtime adapter includes the eyes in anatomicalTone, turns off the redundant
face-tone reflection, and changes the candidate cache version. These hooks
remain behind explicit model-preview registration and selection.

Both original detail captures used sRGB, NoToneMapping, the same three lights
(hemisphere 1.05, sun 1.55, fill .22), palette and ±.19 m orthographic framing.
Their close-up discrepancy was not studio light or exposure. The older research
game camera was 2.6 m; this comparison fixes both sides to R113's 4.6 m, FOV 50,
pitch .22 and yaw -π/4. No research lighting is copied into the world.

## Validation, 2026-10-05 UTC

- Actual createCharacter, one neutral female, close 3/4 plus 4.6 m game view
- Both sides: 34,510 triangles, 2 material batches, zero GL/shader errors
- Geometry/index, normals, vertex colors, skin weights and all feature channels
  except the intentional anatomicalTone eye mask are identical
- Palette, renderer, lights and cameras match; ordinary-character fingerprints
  match and ordinary model.applied stays false
- Bounded renders: before 1.409 s / 315.637 MiB tree peak; after 1.308 s /
  338.828 MiB tree peak, including supervisor; active actor references end at 0
- Fresh build: 234 assets; unchanged main hash `603b23c63d9f970c`
- Visual review: stronger lid-to-globe contact, nose base, ear, cheek and jaw
  depth at close distance. Only a small readability improvement at 4.6 m;
  whole-character aesthetic acceptance remains open

Reproduce with `python scripts/guard-process-tree.py --seconds 300 --mib 1228.8
-- env LIBGL_ALWAYS_SOFTWARE=1 EGL_PLATFORM=surfaceless MESA_SHADER_CACHE_DISABLE=true
node development/candidate-game-shading/render.mjs`. For before, also set
SOURCE_ROOT to a clean f9e7c96 checkout and OUT_DIR to a separate output folder.
Images/reports stay in ignored qa/candidate-game-shading/{before,after}; no
reference photography or QA image is committed.
