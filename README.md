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

## R10 palace, character and construction batch

China is a genuine enclosed compound: four 4.8 m walls, nine detached roofed buildings, eleven explicit rooms, a 12 m formal axis and a 30×25 m ceremonial court. Main ceremonial, rear study, residential/bath and dining/kitchen halls have separate room programs and wide tested apertures. The obsolete shared-core navigation hashes are superseded only by the reviewed `r10-scene-contracts.json` entries; all 60×80 bounds are retained.

Egypt's two flights now generate their 56 real 125 mm risers and walking surfaces together. Supported undersides, sealed wall/landing connections, protective landing returns and refined carved stone assemblies replace the former thin ramp sheets. Existing Egyptian stations and work anchors are unchanged. France has joined fauteuils, a curved grand piano, a recessed hearth, arched mirrors, connected chandeliers and hollow porcelain. Its royal tea service adds pots, sugar/milk vessels, trays and a tiered macaron stand; the café NPC's nearby service position and wording have a separate reviewed station override. The existing animation lifts a held cup; there is no new table pickup or pouring animation.

The approved original human foundation now supports four body presets, six actual hairstyles and distinct cultural garment cuts. Version-2 appearance migration retains prior saved colors and silhouette identity. Garment/personal gait presets use traveled distance, world-planted feet, real footprint support and bounded stair adjustments rather than time-only leg swings. The two-section body batch and 24-template cache remain; complete visible actors stay below 33k triangles. Node-only animation timing is not a claim about GPU or phone frame rate.

Five selected culturally appropriate doors open for nearby players and residents; other arcades remain open. Their fully-open leaf space is reserved in a separate route graph, actual moving leaves constrain bodies and cameras, and swept-volume checks prevent opening or closing into nearby people. A monotonic escape rule handles restored overlaps. Idle and moving approach ranges differ, and door state/geometry is released on region exit. Real high-refresh movement now uses a 0.1 mm success threshold instead of incorrectly discarding small NPC movements.

R9's deterministic shadow filter and six local night-light slots are preserved. Added release tests cover structural room/door aperture checks, actual stair geometry and CPU-skinned feet/garments, palette migration, multiple hair/cut/role combinations, furniture joins and porcelain support, tea service contact, variable-frame-rate door safety and repeated controller cleanup. These are source/CPU/offline checks, not live WebGL, iOS rendering, motion-comfort or network-cache transfer verification.

## R11 responsive travel and lived-in furniture

Default walking and hurry speeds are 1.65× R10, retaining garment-specific step lengths and personality variation. Touchdown is reconstructed at the actual distance-phase boundary so faster travel does not shorten the landing and slide a planted foot. The targeted CPU matrix covers 30/60/144 Hz, walking/hurry, all garment/body/gait presets, both directions and edge lanes of every Japanese/Egyptian stair flight, and all five automatic doors.

China retains its spacious compound and exact R10 physical/navigation metadata. Vermillion wainscot, turquoise/indigo painted friezes, original cloud/lotus relief, ribbed lanterns, bronze vessels and a paired-dragon throne composition add architectural detail. France retains its existing room and tea program while adding variable-section cabriole legs, shaped aprons, physically tufted/piped upholstery, connected gilt piano mouldings, rocaille relief and attached crystal drops. Both scenes retain their prior packed-mesh counts; their geometry budgets are explicitly tested. All designs remain original, with reference images used for proportions and assembly ideas rather than reused assets.

The bounded furniture interaction program has one usable seat, one operable gauze-canopy bed and one cultural changing facility per region. These are separate from the existing resident/activity stations. Seat mounting exempts only its own furniture collider, and standing requires a clear landing. Clothing selection is a preview transaction: eight choices retain the saved identity, confirm persists the outfit, and cancel/close/region exit restores the original selection. Curtain state is device-local; thin single-sheet panels use deterministic ordering, depth testing and no depth writing or shadow casting.

This release preserves the existing local-save key, appearance migration, close third-person camera, mobile landscape layout, stable shadow filter and six-light night budget. Offline scene renders and CPU/controller tests are evidence for source geometry and logic only. They do not establish mobile GPU performance, actual iOS rendering, motion comfort or observed HTTP cache transfer savings.

R11 release validation: all 40 aggregate suites passed on the final production source, including 78 activity visits across eight region enter/leave cycles. The module graph/cache build and preserved read-only Worker endpoint also passed. Phone rotation cancels unconfirmed wardrobe selection, and the preview regression checks the full skinned body after rotation, overview, sitting and outfit changes.
