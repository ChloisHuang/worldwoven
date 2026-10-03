# EG02: carved royal coffin vignette

Published as R16.24 / Sites v51 at 2026-10-04 06:15:13 UTC+8. Sites source:
`cc755c94cf42b6da835e9ac2fd55521f37b4d8d6`; integration commit `658094f`.
Development base: `9e609b3`; verified candidate: `0f037dc`. This bounded
underground-vignette art batch does not complete all EG02 assets.

The rectangular lid is replaced by a continuous anthropoid silhouette with a
gilded mask, fitted striped nemes, crown cobra, curved ceremonial collar, crossed
regalia and a winged-scarab relief. The open case has a shaped hollow wall,
continuous nested rims and curved-wall inlays. A fully covered linen mummy has
connected head/neck/shoulder/leg volumes and fitted wrapping folds.

All artwork is original procedural geometry using the existing cel material.
The judgment statue, scales and Eye, room structure, stations, routes, camera,
characters, lighting and shadows are unchanged.

## Targeted verification

- PASS: syntax for both changed modules and production build. The hashed new
  module is emitted and correctly referenced by the built temple module.
- PASS: actual production Three r186 scene, standing Egyptian character, normal
  close TPS camera (`fov=50`, `pitch=.22`, `distance=4.6`), production cel materials,
  lighting, stable shadows and camera collision. Three identical before/after
  cameras were reviewed: approach, three-quarter case and near royal lid.
- PASS: no shader or GL errors. Final run used surfaceless EGL / Mesa llvmpipe,
  4.09 seconds, 602.5 MiB peak observed process-tree RSS under the existing
  175-second / 1.2-GiB guard. One scene ran at a time.
- PASS: contact, camera-volume, walkable-surface and station JSON is byte-identical
  before/after (SHA-256 `10fbe6229826f7965e127cb9202721b08a52731119e2d54d41dcd5f772ecbafe`).
- PASS: vertex-accurate world bounds fit the previous contact envelopes, including
  bevels, linen folds and the rotated lid. Case bounds: x 1.755–4.245,
  y −5.995–−4.829, z −32.145–−28.055. Lid bounds: x 5.664–7.085,
  y −5.996–−3.284, z −31.423–−30.109. Floor contact and overhead clearance remain.

Evidence in the development worktree (ignored local QA output, not source backups):
`qa/egypt-coffin-before/`, `qa/egypt-coffin-final/`, corresponding resource-result
directories, and `qa/coffin-envelope.json`. The before/after image names are
`royal-approach.png`, `coffin-three-quarter.png`, and `royal-lid.png`.

No whole-game or door matrix was rerun because only static local geometry changed
and all contact/station data is identical. Browser and physical iOS checks were
not performed. Publication was separately confirmed by the Sites deployment
returning succeeded; that is not a browser or mobile gameplay check.
