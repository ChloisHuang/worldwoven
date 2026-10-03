# Original natural head study

Prototype only, based on R16.7. Not accepted or enabled in production.

The first target is one modest asymmetric short side sweep, on masculine and feminine neutral heads. It keeps the earlier useful posterior skull depth, and replaces the smooth cap silhouette with broad rounded locks that lift at an off-centre part and narrow toward unequal tips. The fitted underlayer stays behind those locks. Face features retain the earlier surface warp; separate eye/nose/lip modeling is deferred until this haircut is accepted.

The real reference pixels were inspected in the existing research images for [sims芮芮, 音](https://www.sglynp.com/t171393), [Penny / ppkkcmdj, 艾琳娜](https://www.sglynp.com/t142324), and [sophialeila, near-profile study](https://www.sglynp.com/t72891). Visual structure only: no reference image, creator mesh, texture or likeness is included or reused.

The isolated renderer imports production Three.js, body, rig and materials through an in-memory hook. Only the prototype head geometry changes. Source IDs, saved identities, appearance scoring, clothing, body and neck are outside this edit. Role hats are not fitted or accepted by this prototype.

Review criterion: actual front, true side, three-quarter and game-distance images, with one masculine and one feminine example. Neither an appearance score nor geometry counts establish visual acceptance.

## Current result, 2026-10-03

The first free-volume pass was rejected: side views showed hollow roots and separate crown arches. The current closed wedges put their undersides on the same scalp ellipsoid as the fitted bed. Their lower, broader crests form a continuous mass; the front bed is raised behind the fringe to remove its straight exposed edge. Wrapped vertex normals remove artificial seams along each rounded crest.

`evidence/final-male` and `evidence/final-female` contain the baseline/prototype comparison at front, true side, three-quarter, 2.1m nearest game zoom and 4.6m default distance. The perspective views use the actual 50-degree lot camera and .22 pitch. These are isolated character renders, not screenshots of an integrated lot.

Both serial runs completed in 1.75 seconds, using at most 245MiB, with no GL/shader errors. The renderer verified identical body/neck positions, normals, colors and skin weights; unchanged rig and original appearance identity; unchanged production files; released character references. Actual images were inspected. Parent visual acceptance remains pending. No production build or full unrelated suite was run because no production source changes.

Run with Node 22+ and the existing GLES/Mesa runtime, inside the owner's 180-second / 1200MiB process-tree monitor:

```sh
QA_RESOURCE_WINDOW=granted-by-owner \
WORLDWOVEN_WEBGL_RUNTIME=/absolute/path/to/node-webgl/dist/index.js \
OUT_DIR="$PWD/prototypes/natural-head/evidence/new-review" \
PRESENTATION=male VIEWS=front,threequarter,side,game-near,game-default \
node prototypes/natural-head/render.mjs
```

The resource-window variable asserts coordination, not enforcement. Runtime paths and generated images are not bundled. This is a neutral-height design prototype: fitting non-neutral body height traits, role hats, all costumes and movement transitions remains integration work after art acceptance. The existing appearance IDs, trait definitions and saved identity logic have not been edited.
