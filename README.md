# 四方生活 · Worlds & Days

This repository is the public game at https://alien.doudouai.net. It is a continuation of the existing Site, not a new project or domain binding.

## Author and validate

- Edit `source/game/`. `source/vendor/three/` contains the locally vendored MIT renderer.
- Run `node tests/run.cjs` for navigation, every-room traversal, depth fixtures, camera sweeps, scene geometry and simulated controller checks.
- Run `node scripts/build.mjs` to produce the immutable module/CSS graph and the revalidated HTML entrypoints.
- Run `node --experimental-vm-modules tests/cache-build.cjs` for module linkage, content hashes, deterministic rebuilds, selective cache invalidation and prior graph retention.
- Run `node --test worker/worker.test.mjs` to validate the preserved read-only legacy endpoint.

The tests do not substitute for browser/WebGL, iOS performance or motion-comfort QA.

## Cache contract

Assets under `/assets/` are content-hashed and immutable for one year. The root, `/game/`, HTML and `build.json` revalidate. A CSS-only edit changes one URL and reuses the other fifteen asset URLs. The build retains the preceding complete immutable graph so an already-open page can finish importing it. Compression belongs to the hosting platform; the game does not fetch compressed chunks or manually decompress HTTP bodies. Actual response headers must be verified after deployment.

## Migration and rollback

The initial public release copies the released R7 game from commit `0fe52232a8632029081e99a3f4c323a7e528ac04`, with only public navigation and packaging changes. The independent human prototype and private asset workbench are excluded.

The preceding OUR ALIEN LIVES Site v15 remains in version history, with source commit `5570566a39d6e294052ac2d5f6caf27a80f985ea`. Its full game repository archive was verified at https://github.com/ChloisHuang/our-alien-lives/commit/9d27efaadaf39d3914afc97c86a7eced13b5b9b6 before this migration. No domain or audience settings were altered.
