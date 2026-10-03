# Worldwoven · 四方生活

An original cel-shaded cultural life and exploration game. The repository name supports more regions in future; the current public game includes Japan, China, Egypt and France.

Public game: https://alien.doudouai.net/

Archived release: R16-public, 2026-10-03
Verified published Sites source commit: 60ee26dab923e36925e4c1385d24d96c7f176662

## Requirements and local development

Node.js 22 or newer and npm. There are no downloaded runtime or build dependencies: Three.js r186 is vendored under source/vendor/three with its original MIT license. package-lock.json locks the dependency-free tool setup.

1. Run npm ci
2. Run npm run dev and open the printed local URL
3. Run npm run build for content-hashed production files
4. Run npm run preview to inspect the generated build locally

The local servers bind only to 127.0.0.1 and are not the public deployment service.

## Validation

- npm test: deterministic geometry, navigation, controller, furniture, character, lamp-field and shadow contracts. It can take several minutes because it physically traverses rooms and stairs and evaluates skinned vertices
- npm run build, then npm run test:cache: complete module graph, immutable content hashes, selective invalidation and prior published graph retention
- npm run test:worker: the preserved read-only legacy endpoint
- npm run test:door-geometry -- --check and --tiny: portable door geometry harness checks; see tests/door-geometry/README.md for the separate serialized authored sweep command and limits

CPU/DOM fixtures do not provide browser or iOS visual acceptance. This release also received separate production Three/Mesa WebGL2 image checks; those generated screenshots and reports are intentionally not committed. Real iOS performance, driver-specific appearance and observed HTTP warm-cache transfers remain unverified.

## Deploy with Sites

Keep .openai/hosting.json and its existing project ID. Use the connected Sites source/save/deploy workflow for that existing public Site, keeping its custom domain and audience unchanged. Run the validation and build commands above, package dist through the supported workflow, publish the corresponding source commit, and verify the terminal deployment result. This repository does not contain publication credentials or configure automatic GitHub deployments.

Before subsequent releases, cache-baseline.json must describe the confirmed live graph. Build the archived release once before editing so its immutable outputs are available for retention. The builder keeps the previous complete graph for already-open pages. On a fresh clone, the first build produces the current graph; historical build outputs are deliberately not in Git. HTML and build.json revalidate; hashed assets cache immutably for one year. Do not add blanket asset cache-busting or manual gzip decompression.

## Source map

- source/game: original scenes, globe, controls, characters and interactions
- source/vendor/three: vendored renderer and its MIT license
- scripts: dependency-free development, build and clean archival helpers
- tests: portable source-level regression suites and necessary baseline fixtures
- worker: preserved legacy read-only handler
- .openai/hosting.json: necessary existing deployment identity

## Current play and scope

All four lots use human-scale 60 × 80 grids, close third-person exploration, ceilings, cultural facilities, residents, stairs where authored, day/night lighting and selected automatic doors. Mobile play is landscape-first. China includes raised palace platforms, broad exterior steps, an accessible main-hall upper gallery and a rear viewing loft with a continuous interior stair. Room thresholds are classified by use and privacy into doors, full curtains, half curtains and open circulation. Furniture includes usable chairs and benches, four lying beds, five bathing facilities, three operable gauze canopies and four changing props. Japan has no bed canopy; China's is red. Some decorative furniture and staff bunks are not interactive. The game is an original exploration/life slice, not a complete commercial life simulator or a recreation of EA assets.

The changing-prop and wardrobe preview includes a one-click player randomizer for presentation, hair/clothing/color and six bounded facial/body traits. Confirm saves the draft; Cancel restores it. Residents use the same six-trait preference score and a stable versioned generator tied to the saved world seed and original NPC ID. Existing job clothing and role constraints remain. The score is a fictional game preference independent of culture, skin color or presentation. Saves are local to the browser, not a cloud account.

Character shoulder proportions, relaxed arm rest positions and walking elbow motion are fitted to the garment cut; Japanese wide sleeves retain more room than fitted shirts. The wardrobe retains randomization and the fictional preference score but no longer explains individual scoring criteria. Saved identities, existing travel speed, physical collision radii and interaction anchors remain constrained by regression checks. Later environmental and NPC workflow refinements are separate batches.

Door sensing follows the usable aperture and approach direction. Near activation can cause a brief safe wait outside the actual opening sweep; continued input resumes when the leaf is open. Wide leaves swinging toward an actor require more clearance than the opposite side or sliding panels. Player and NPC rules, voluntary retreat, anti-trap protection and delayed closing are shared.

Fine moving pleated curtains retain opaque depth, toon/lamp lighting and cast shadows, while disabling shadow-map reception on those cloth meshes to avoid self-shadow striping; beams do not project onto that cloth. World, building and globe shadow precision remain unchanged. Closed doors do not guarantee privacy through decorative windows.

Art is authored in procedural geometry. Creator/reference images informed proportions and design; EA/mod assets were not imported. The current region catalog can be expanded without changing the repository name. Source changes should preserve traversal, shape, shader, input and resource-lifetime tests before publication.

## Repository hygiene

Build output, generated QA reports/screenshots, temporary experiments, node_modules, caches, archives and credentials are excluded. Original code/assets, licenses, required test fixtures, lockfile and deployment configuration are retained. This directory is independent of the Sites checkout; creating its GitHub remote must not change the Sites source workflow or force-push earlier history.
