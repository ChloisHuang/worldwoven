# 四方生活 · Worlds & Days

This repository is the public game at https://alien.doudouai.net. It is a continuation of the existing Site, not a new project or domain binding.

## Author and validate

- Before a new release, refresh `cache-baseline.json` from the current confirmed published `build.json` and keep those immutable files in the checkout. This baseline is fixed throughout drafts, tests and packaging so repeated local builds cannot discard the actual live graph.
- Edit `source/game/`. `source/vendor/three/` contains the locally vendored MIT renderer.
- Run `node tests/run.cjs` for navigation, every-room traversal, depth fixtures, camera sweeps, scene geometry and simulated controller checks.
- Run `node scripts/build.mjs` to produce the immutable module/CSS graph and the revalidated HTML entrypoints.
- Run `node --experimental-vm-modules tests/cache-build.cjs` for module linkage, content hashes, deterministic rebuilds, selective cache invalidation and prior graph retention.
- Run `node --test worker/worker.test.mjs` to validate the preserved read-only legacy endpoint.

The tests do not substitute for browser/WebGL, iOS performance or motion-comfort QA.

## Cache contract

Assets under `/assets/` are content-hashed and immutable for one year. The root, `/game/`, HTML and `build.json` revalidate. A CSS-only edit changes one URL and reuses every other asset URL. The build retains the preceding complete immutable graph so an already-open page can finish importing it. Compression belongs to the hosting platform; the game does not fetch compressed chunks or manually decompress HTTP bodies. Actual response headers must be verified after deployment.

## Migration and rollback

The initial public release copies the released R7 game from commit `0fe52232a8632029081e99a3f4c323a7e528ac04`, with only public navigation and packaging changes. The independent human prototype and private asset workbench are excluded.

The preceding OUR ALIEN LIVES Site v15 remains in version history, with source commit `5570566a39d6e294052ac2d5f6caf27a80f985ea`. Its full game repository archive was verified at https://github.com/ChloisHuang/our-alien-lives/commit/9d27efaadaf39d3914afc97c86a7eced13b5b9b6 before this migration. No domain or audience settings were altered.

## R8 furniture repair batch

Rectangular Japanese futon with supported seams and folded cuff; library shelves no longer add books over prefilled containers; open Chinese scholar cabinet and seated textiles; corrected French mirror, piano, chandelier and seating assemblies; seated Egyptian ornament. Navigation metadata and collider arrays are locked to the preceding R7 fingerprints. Human character prototypes remain private pending review.

## R9 characters and lighting

The approved original adult sculpt replaces player and NPC models across all four cultures. Bodies use an 18-bone rig and two batched draw sections, with 24.8–32k triangles including role accessories. Scene ownership calls each actor's idempotent disposal before generic lot cleanup. The template cache is capped at 24; colors are independent seeded traits, with one persisted player identity and cultural clothing palettes. Egyptian linen preserves an individually chosen dye color rather than forcing all people to one color.

The former r186 PCFSoft request silently selected a screen-noise-rotated filter. `stable-shadows.js` installs a guarded deterministic four-texel receiver-plane comparison, retains normal depth tests and casting, and converts a small 2 mm world bias. Fine human meshes cast shadows but do not receive directional shadow maps in this mobile policy; their normal Toon lighting and local lamp illumination remain. This trades incoming roof shadows on people for a stable face/garment surface. Actual GPU compilation and iOS rendering remain unverified in the cloud browser, which has WebGL disabled.

Night mode now changes sky and cool sun/fill separately from warm lamp illumination. Six persistent shadowless point-light slots select nearby same-floor fixtures with hysteresis; emissive baselines are restored on detach to prevent cache drift. No stochastic flicker/bloom/postprocessing was added. Offline same-view proofs and analytical shader tests are not substitutes for phone rendering or frame-rate measurements.

Close-work interactions physically finish their final approach before posing. Supported paper/preparation boards and reachable CN/EG/FR actor positions match measured hand-tool paths. Two Japanese tatami bounds provide a visual-only support offset; navigation levels, colliders, stairs, doorways, 60×80 bounds and the close-TPS camera model are retained.

Validation now includes fourteen aggregate suites, explicit rendered-color-buffer variation, real CPU-skinned vertex/floor checks, material/resource lifetime checks, night-light budgeting and the exact r186 shadow-patch guard. Cache response headers and warm-load transfer savings are still unobserved: the shell client is rejected by Cloudflare 1010, and no alternate network/security workaround is used.
