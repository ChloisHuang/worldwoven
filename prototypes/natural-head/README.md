# Original natural head study

Prototype only, based on R16.7. Not accepted or enabled in production.

The first target is one modest asymmetric short side sweep, on masculine and feminine neutral heads. It keeps the earlier useful posterior skull depth, and replaces the smooth cap silhouette with broad rounded locks that lift at an off-centre part and narrow toward unequal tips. The fitted underlayer stays behind those locks. Face features retain the earlier surface warp; separate eye/nose/lip modeling is deferred until this haircut is accepted.

The real reference pixels were inspected in the existing research images for [sims芮芮, 音](https://www.sglynp.com/t171393), [Penny / ppkkcmdj, 艾琳娜](https://www.sglynp.com/t142324), and [sophialeila, near-profile study](https://www.sglynp.com/t72891). Visual structure only: no reference image, creator mesh, texture or likeness is included or reused.

The isolated renderer imports production Three.js, body, rig and materials through an in-memory hook. Only the prototype head and upper-neck geometry changes. Source IDs, saved identities, appearance scoring, clothing, the lower neck/collar contact and rig are outside this edit. Role hats are not fitted or accepted by this prototype.

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

The resource-window variable asserts coordination, not enforcement. Runtime paths and generated images are not bundled. This is a neutral-head design prototype: fitting role hats, all costumes, non-neutral trait limits and movement transitions remains integration work after art acceptance. Existing sourceY/height mapping is retained, and the appearance IDs, trait definitions and saved identity logic have not been edited.

## Head/jaw/neck follow-up

The parent visually reviewed the short side sweep and asked to keep this direction. The hair geometry is retained. The next narrow pass broadens cheek curvature into the sides, softens the low jaw width, and raises the mandibular underside gently toward the ear. The upper neck now widens and tilts back into the jaw, with its top buried inside the head. This is a real neck-surface edit; it is not described as unchanged. Geometry at and below 1.421m and the collar positions stay fixed, as do bone positions, body geometry and saved appearance identity. The total height is still established by the unchanged hair crown.

`evidence/face-review-male` and `evidence/face-review-female` show the requested neutral front/true-side samples. The intermediate neck notch was rejected and closed by extending the hidden upper neck into the jaw. Those images use the same ordinary lights and production toon materials. Final checks also retain the lower-neck position/weight signature and all bone transforms. No new eye, nose or lip modeling was included in this pass. Acceptance remains pending; no production integration or publication.

The parent accepted the feminine front cheek/jaw narrowing as a useful improvement, but rejected the `1f53899` side profile: the jaw angle had been smoothed into an overly long slope and the neck read as a bent column. The following correction keeps the accepted front treatment and haircut. It restores a nearly vertical neck body below 1.453m, reduces whole-jaw lift, keeps a small soft mandibular corner, and lifts only the central posterior skull over the cervical insertion. The hidden rear top of the neck extends into the skull so its visible join has no exposed tip.

`evidence/short-transition-male` and `evidence/short-transition-female` are the current normal front/side review images. These serial runs took 1 second each and at most 218MiB. They are visual review only; no additional pose matrix or automatic feature test was added. This side-profile correction remains unaccepted pending parent review.

Latest review: the shortened near-vertical neck and fitted short hair are accepted as an incremental visual improvement; production integration and preserved appearance parameters are still pending. The earlier long-sloped-neck version was rejected.
