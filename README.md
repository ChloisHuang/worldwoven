> Test selection follows [docs/TESTING.md](docs/TESTING.md); the commands below are available checks, not a mandatory full-suite gate for every change.

# Worldwoven · 四方生活

An original cel-shaded cultural life and exploration game. The repository name supports more regions in future; the current public game includes Japan, China, Egypt and France.

Public game: https://alien.doudouai.net/

Optional character candidate: https://alien.doudouai.net/?character-preview=1&hair=long#france
The candidate uses a separate tab session save; ordinary visits keep the existing models and do not load candidate assets. This is a public test entry, not final art acceptance.

[问题与需求验收清单](docs/PROJECT_CHECKLIST.md)

Published release: R16.58-public, 2026-10-04
Verified published Sites source commit: 00ab703d79526bcafe0f8910c48c12ef49ad0f7c

## Working rules

Read [AGENTS.md](AGENTS.md). Git commit/push is the only source-backup mechanism; no repeated source snapshots or ZIP exports.

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

CPU/DOM fixtures do not provide browser or iOS visual acceptance. The R16 baseline received separate production Three/Mesa WebGL2 image checks. R16.1 added focused actual-scene controller and geometry checks for fixed half-curtains. R16.2 adds exact-source Three/Mesa French doorway images, continuous full-scene door sweeps, seven-door bidirectional controller checks and unchanged-region geometry/collision comparisons; no browser or iOS visual acceptance is claimed. Generated screenshots and reports are intentionally not committed. Real iOS performance, driver-specific appearance and observed HTTP warm-cache transfers remain unverified.

## Deploy with Sites

Keep .openai/hosting.json and its existing project ID. Use the connected Sites source/save/deploy workflow for that existing public Site, keeping its custom domain and audience unchanged. Choose only checks affected by the change under docs/TESTING.md, build the production output, then publish dist through the supported workflow and verify the terminal deployment result. Do not export or package source snapshots. This repository does not contain publication credentials or configure automatic GitHub deployments.

Before subsequent releases, cache-baseline.json must describe the confirmed live graph. Reuse the existing prior build outputs for cache retention; rebuild the published version only if those required outputs are actually missing. Do not reconstruct them for every small change. The builder keeps the previous complete graph for already-open pages. On a fresh clone, the first build produces the current graph; historical build outputs are deliberately not in Git. HTML and build.json revalidate; hashed assets cache immutably for one year. Do not add blanket asset cache-busting or manual gzip decompression.

## Source map

- source/game: original scenes, globe, controls, characters and interactions
- source/vendor/three: vendored renderer and its MIT license
- scripts: dependency-free development and build helpers
- tests: portable source-level regression suites and necessary baseline fixtures
- worker: preserved legacy read-only handler
- .openai/hosting.json: necessary existing deployment identity

R16.4 adds the missing Japanese 2F/3F stairwell landing guards and a 4F blind-end guard while keeping stair mouths and the west corridor open. This does not close the other regions’ guardrail checklist items.

## Current play and scope

All four lots use human-scale 60 × 80 grids, close third-person exploration, ceilings, cultural facilities, residents, stairs where authored, day/night lighting and selected automatic doors. Mobile play is landscape-first. China includes raised palace platforms, broad exterior steps, an accessible main-hall upper gallery and a rear viewing loft with a continuous interior stair. Room thresholds are classified by use and privacy into doors, full curtains, half curtains and open circulation. Furniture includes usable chairs and benches, four lying beds, five bathing facilities, three operable gauze canopies and four changing props. Japan has no bed canopy; China's is red. Some decorative furniture and staff bunks are not interactive. The game is an original exploration/life slice, not a complete commercial life simulator or a recreation of EA assets.

The changing-prop and wardrobe preview includes a one-click player randomizer for presentation, hair/clothing/color and six bounded facial/body traits. Confirm saves the draft; Cancel restores it. Residents use the same six-trait preference score and a stable versioned generator tied to the saved world seed and original NPC ID. Existing job clothing and role constraints remain. The score is a fictional game preference independent of culture, skin color or presentation. Saves are local to the browser, not a cloud account.

Character shoulder proportions, relaxed arm rest positions and walking elbow motion are fitted to the garment cut; Japanese wide sleeves retain more room than fitted shirts. The wardrobe retains randomization and the fictional preference score but no longer explains individual scoring criteria. Saved identities, existing travel speed, physical collision radii and interaction anchors remain constrained by regression checks. Later environmental and NPC workflow refinements are separate batches.

Half-curtains now stay naturally suspended in all four regions. They never enter the automatic opening or path-waiting system. The existing men’s and women’s bath-entry noren and offset screens in Japan are retained without an extra moving closure. Full privacy curtains and the existing R16 rigid doors are preserved. R16.2 migrates all seven French rigid doors into their actual wall openings, including the bedroom pocket door with a hollow joined wall, real lower bases and clear panel travel. The other three regions retain their R16.1 door geometry and behavior; their inset repairs remain separate candidates. Checklist D01–D04 applies to the French subset only, not completion of all four regions.

R16.3 repairs Japan’s two onsen with a closed retaining basin, visible water depth, a supported seat/back/feet pose and relaxed supported arms. Entering uses an opaque bathing outfit; a long braid temporarily displays the existing compact low bun without changing its saved hairstyle ID. Leaving or cancelling restores the original outfit and braid. The bathing label is at the dry poolside approach and hides while occupied; foot-selection and navigation rings clear during soaking. The normal and close follow cameras transition smoothly. A complete animated step over the coping is still a separate open task; the interaction currently mounts the seat directly. Focused contact and actual-main restoration checks passed; no claim of iOS gameplay acceptance is made.

Door sensing follows the usable aperture and approach direction. Near activation can cause a brief safe wait outside the actual opening sweep; continued input resumes when the leaf is open. Wide leaves swinging toward an actor require more clearance than the opposite side or sliding panels. Player and NPC rules, voluntary retreat, anti-trap protection and delayed closing are shared.

Fine moving pleated curtains retain opaque depth, toon/lamp lighting and cast shadows, while disabling shadow-map reception on those cloth meshes to avoid self-shadow striping; beams do not project onto that cloth. World, building and globe shadow precision remain unchanged. Closed doors do not guarantee privacy through decorative windows.

Art is authored in procedural geometry. Creator/reference images informed proportions and design; EA/mod assets were not imported. The current region catalog can be expanded without changing the repository name. Source changes should preserve traversal, shape, shader, input and resource-lifetime tests before publication.

## Repository hygiene

Build output, generated QA reports/screenshots, temporary experiments, node_modules, caches, archives and credentials are excluded. Original code/assets, licenses, required test fixtures, lockfile and deployment configuration are retained. This directory is independent of the Sites checkout; creating its GitHub remote must not change the Sites source workflow or force-push earlier history.

R16.20 links generated Japanese visitors to numbered bath tokens, real staff preparation/delivery, shared pool seating and ordered meals. This first batch covers the observable NPC business chain; direct player service menus and employee meals/sleep/shifts remain open. Existing nearby conversations and archery stay active.

R16.21 consolidates the Chinese royal residence into three connected floors with a separate public stair hall. Guest/reception, bathing/linen and dragon-bed/dressing rooms preserve their interactions and privacy entrances. Former bath and guest plots are freed for later localized facilities; this release does not implement those future businesses.

R16.22 refines the Egyptian judgment vignette: a sculpted jackal guardian, suspended heart-and-feather balance and shallow Eye relief. The existing room, routes and interactions remain; sarcophagi and other murals are separate open art work.

R16.23 adds the playable bathhouse service menu and fourteen existing residents’ shared staff-life rotation, physical relief, meal/tea/night rest and return. Shrine relief keeps the required temporary miko clothing. Targeted flow and Three/Mesa checks are complete; mobile browser layout and real iOS gameplay remain unverified. The new face study is not included.

R16.24 refines the existing Egyptian royal coffin with an anthropoid lid, nemes mask, regalia and nested casing detail, plus a non-graphic wrapped mummy. Existing collision bounds and interactions are preserved; this is one asset improvement, not completion of all Egyptian art.

R16.25 gives the two original Chinese guards a gate/courtyard/hall-step patrol, observation and physical relief, with safe nearby conversation and existing player archery. Their independent Ming-informed robe, cap, belt and sheathed saber replace the former generic costume; museum images informed original geometry. Patrol and handoff checks use the actual main controller and Three/Mesa, not mobile browser gameplay.

R16.26 extends the existing guards into complementary side and rear patrols: quiet palace lanes, the residence and kitchen backs, and opposite archive rear corners. They pause to observe and yield to nearby players, preserving range coverage and actual shift handoff. This adds patrol coverage, not a crime-detection system.

R16.27 adds shared player/NPC onsen entry and exit: brace on the coping, turn and swing the legs over, then lower into the existing supported seat. Cancellation returns safely to the bank before releasing the individual seat; crossing time does not count as soaking. Neighboring seats and original outfits remain intact. Focused main/controller and Three/Mesa checks are complete; real iOS/browser play remains unverified.

R16.28 adds one adult emperor and one adult consort with separate private rooms, real public-route activities, tea-host visits and meals. Their saved personality/needs/context decisions share one model with the fourteen Japanese residents’ personal break choices. Work coverage and handoffs remain ordered; breaks choose one suitable activity instead of always meal→tea→sleep. Royal outings still start and end at private rooms; further court roles, audience/edict workflows and other countries are not included. Targeted controller/Mesa evidence is reused across the two layers; real iOS play remains unverified.

R16.29 opens the three-floor Yunlai house: dining seats, two private guest rooms with usable beds and wardrobes, and an adult recital/banquet floor with public stairs and corridors. Booking/payment, food orders, actual music/dance choreography and relationship invitations remain pending. Scoped real-controller and Three/Mesa checks passed; iOS remains untested.

R16.30 opens the clinic and pharmacy: a seated consultation, a numbered card physically handed from the physician to the assistant, preparation in the stock room, and collection of the same-number parcel at the counter. Early departure releases the order. This is fictional in-game service with no real treatment advice, health effects or inventory system. Changed patrol access and the actual player flow passed focused controller/Mesa checks. The build manifest now reads the release from package.json.

R16.31 separates personal action selection from target selection and preserves independent worker deadlines and committed targets. Facility or actor counts no longer implicitly multiply action weight. Only actual informed conversation participants receive value-dependent signed opinions; merely sharing the Japanese tea area creates no fabricated social exchange. Focused scene-free invariance and life-controller fixtures passed; unchanged navigation and imagery were reused.

R16.32 connects Yunlai dining seats to its own kitchen: the host takes an order, the cook prepares it, the same tray passes between them and reaches the original table, the player eats, and the dishes are washed. Cancellation and reentry release the order. No charges, booking or adult salon reception are included yet.

R16.33 moves the clinic above the pharmacy with a real guarded public staircase and physical original-card collection across floors. The cleared northwest plot now contains Chengguang Money House, a teller/abacus/ledger and bounded integer copper deposits/withdrawals. New wallets/accounts start at zero; income, fees and multi-currency exchange remain pending. Both facility scopes passed focused controller and TPS checks.

R16.34 connects saved fictional health to actual actors: accumulated exertion, bounded recorded traveler exposure, local visible contact, symptoms, rest and gradual supportive care after the physical numbered clinic receipt. It preserves appearances, movement speed and work coverage. Absence relief, family care and fuller nutrition/hygiene behavior remain later work; browser/iOS health UI is not claimed verified.

R16.35 opens the top-floor reception: one known-adult artist personally responds according to her poetry/banquet preference, then an accepted invitation uses the real stairs and a claimed private room for a non-graphic fade and return. No fee or full relationship economy is included. The two existing royal roles also receive original richer Ming-informed layered court clothing and ornaments; faces are unchanged.

R16.58 adds French garden-helper registration, physical shared-can work on two rose beds, tool return and one six-copper wage receipt, with resign/reapply and separate regional employment. The actual main-controller route and normal Three/Mesa frames passed; real browser/iOS play remains unverified. New rejected face candidates are not included.
