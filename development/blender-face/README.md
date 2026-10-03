# Original Blender adult control cage — unaccepted WIP

This is a new editable mesh, independent of the earlier height-field face. The source is `build_control_cage.py` and `assets/adult-control-cage.blend`; the .blend keeps a half-head cage with Mirror and two levels of Catmull–Clark Subdivision. Eyes, nose cavities and the mouth use explicit face boundaries and loops. `assets/adult-subdivided.json` is the original evaluated render mesh, not a source snapshot. No reference image or downloaded asset is embedded.

Current cage: 291 control vertices / 258 faces; evaluated study including eyes, ears and brows: 19,216 triangles. The first gray front/three-quarter/side views exposed a rear lower-jaw fold. Its first correction is included, but the jaw, mouth and whole shape remain unaccepted. This is not a production replacement or an approved character system.

Build with the installed Blender 4.3.2: `blender -b -t 2 --python development/blender-face/build_control_cage.py`. Use the existing bounded runner. The existing local renderer accepts `WHOLE_FACE=1 BLENDER_FACE=1 CLAY_STUDY=1` and `VIEWS=front,threequarter,side`. Omit `CLAY_STUDY` for the existing cel material. Generated review images stay outside Git.

Verification so far is limited to a successful bounded asset build and normal gray three-view render. Rig/appearance integration, shape-parameter mapping and artistic acceptance remain pending.
