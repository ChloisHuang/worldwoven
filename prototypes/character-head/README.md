# Original head and short-hair study

This is an isolated source prototype. It is not enabled in the game and is not visually accepted for release.

The user's request was a less flattened head and richer, better-looking hairstyles, informed by creator character images on 三宫六院. The current experiment focuses on one short side sweep before expanding styles or facial detail. Body, neck, rig, six appearance controls, scoring and saved identity logic are preserved.

## Current comparison

- `original-head-hair.v4.mjs`: deeper original cranium and connected short-hair geometry, with uniform hair color
- `original-head-hair.v5-tone.mjs`: exactly the same mesh positions, normals and indices; adds three diffuse levels following the actual main-ridge and part fields
- `v4-silhouette-plan.svg`: authored schematic of the intended flow, not a game render
- `tone-ab.config.json`: pinned source hashes and the six-frame comparison configuration

V4's actual front/side/rear views were rejected because the cut still read as a smooth cap. This A/B experiment separates material readability from geometry. It has passed a CPU geometry-equality check but has not been rendered. No hairstyle count, polygon count or appearance score establishes visual quality.

The optional source color attribute is currently discarded by the production character merger. `render-tone-ab.mjs` includes an explicit, isolated in-memory adapter that preserves that attribute for both comparison arms. It does not edit production files. Any eventual integration would require review of the merger change and actual gameplay validation.

## Lightweight check

From the repository root:

```sh
node --experimental-vm-modules prototypes/character-head/check-tone-ab.cjs
```

The default baseline is this repository's `source` directory. Set `WORLDWOVEN_BASELINE_SOURCE` only when comparing against a different explicitly selected baseline.

## Controlled render

The renderer needs an installed `@onirenaud/node-webgl` runtime and GLES/Mesa. Set `WORLDWOVEN_WEBGL_RUNTIME` to its `dist/index.js`; no runtime dependency is bundled or installed automatically. Use a fresh output directory beneath this prototype directory. Run only inside an owner-granted serial window with the configured 180-second and 1200-MiB whole-process-tree limits.

```sh
QA_RESOURCE_WINDOW=granted-by-owner \
WORLDWOVEN_WEBGL_RUNTIME=/absolute/path/to/node-webgl/dist/index.js \
OUT_DIR="$PWD/prototypes/character-head/evidence/tone-ab-01" \
PRESENTATION=male VIEWS=front,side,rear-threequarter IMAGE_SIZE=640 \
node prototypes/character-head/render-tone-ab.mjs
```

This command must be wrapped in the environment's resource monitor; the grant variable is an assertion, not a memory limiter. The renderer records source/module hashes, exact merged geometry and rig equality, different color hashes, cameras, six pixel hashes, and GL/shader errors. Generated evidence is excluded from Git. The existing V3 bald diagnostic remains applicable because this material experiment changes no skull geometry.

## Reference provenance

Visual study only: [sims芮芮, 音](https://www.sglynp.com/t171393), [Penny / ppkkcmdj, 艾琳娜](https://www.sglynp.com/t142324), [yuya, EA-style couple](https://www.sglynp.com/t91021), and [sophialeila, near-profile character study](https://www.sglynp.com/t72891). The creators/platform restrict reuse and redistribution. No reference image, EA mesh, mod package, texture, likeness or costume is included. All prototype surfaces and the schematic are original code.

Facial volume work remains a separate design plan in `facial-volume-followup-plan.md`; it is not implemented in this comparison.
