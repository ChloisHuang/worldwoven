# Light skin and optional natural makeup

Dev-only display from `008b1a4`; latest continuous cheek head and candidate
skin/eye shader are unchanged. One neutral female uses the existing short
neck, long hair, slender body and court gown. Skin `#e6bfa3` is a display choice,
with the same head/neck/body color; it changes no race, scoring or NPC rules.

`createCharacter({ ...candidateOptions, previewMakeup: 'natural' })` enables
soft nasal contour, rose-taupe eyelid pigment/outer lash root and dusty rose
lips. The finish changes albedo on the existing feature coordinates. No mesh,
texture, lighting, exposure, normals or postprocessing changes. Omit the option
for the original candidate. Only one extra cached skin material is used;
clothing stays shared, and animation allocates no makeup materials.

Reproduce the four unretouched captures:

```sh
python scripts/guard-process-tree.py --seconds 60 --mib 650 -- \
  env LIBGL_ALWAYS_SOFTWARE=1 EGL_PLATFORM=surfaceless MESA_SHADER_CACHE_DISABLE=true \
  node development/candidate-light-makeup/render.mjs
```

Ignored output: `qa/candidate-light-makeup/light-{bare,natural}-threequarter-
{detail,game}.png`. These are actual createCharacter isolated renders, not
France world screenshots. Both versions use the previous renderer/light rig,
640px close orthographic framing and 1280×720 perspective at 4.6 m.

Verified: both versions 34,902 triangles / 2 draws / zero GL errors; identical
geometry, normals, colors, weights and feature channels. Against the base
checkout, ordinary and no-makeup candidate full fingerprints (including
material programs) and no-makeup metadata match. Repeated makeup actors reuse
the same skin material; all actor references return to zero. The four images
render in 1.8 s / 360 MiB tree peak. Fresh build: 235 assets, one extra small
JavaScript module, no new textures or models. Closeup pigment is readable;
its change at 4.6 m is modest. Overall character art remains unaccepted.

No main merge, published site update or default selection change is included.

Current front evidence uses `FRONT_ONLY=1 OUT_DIR=qa/candidate-light-makeup/front`
with the same command. Only camera yaw changes to zero; all appearance, light
and material fingerprints match the 8a8a35c comparison. Both 640px front images
are 34,902 triangles / 2 draws / zero GL errors (1.5 s / 280 MiB). The weak
under-eye-to-cheek transition remains an open art issue; this capture does not
change face geometry or increase contour pigment.
