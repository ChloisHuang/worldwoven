# Isolated adult face study, not approved for production

The user rejected R16.11 face shape. Earlier eye-only and smoothed-face studies were also not accepted. This work is an experimental load hook over unmodified production source, not a release or NPC replacement.

Fixed visual target: the overall form relationships visible in the user's screenshots and [SGLY 171393](https://www.sglynp.com/t171393). The creator's rendered pixels were inspected privately; no mesh, texture, mod asset or exact likeness is copied. The new authored base coordinates pupil spacing, brow/socket relief, nose-root/base length, broad curved lips and the lip-to-chin profile.

Run `WHOLE_FACE=1 OUT_DIR=<fresh subdirectory> node render.mjs` with the existing `WORLDWOVEN_WEBGL_RUNTIME` and Mesa environment, through the established 175-second / 1.2-GiB supervisor. Normal front, three-quarter, side and 2.1m views are the focused review; `VIEWS` selects them. Original selected colors, two draw calls, rig and appearance identity are retained. Source outside the facial study is compared before/after.

Status: whole-face visual review pending. Parameter endpoints, broader character coverage, production integration and deployment are intentionally not acceptance claims. The current output is a representative single adult, not an approved complete character system.
