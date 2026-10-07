> Test selection follows [docs/TESTING.md](docs/TESTING.md); the commands below are available checks, not a mandatory full-suite gate for every change.

# Worldwoven · 四方生活

An original cel-shaded cultural life and exploration game. The repository name supports more regions in future; the current public game includes Japan, China, Egypt and France.

Public game: https://alien.doudouai.net/

Optional isolated character preview: https://alien.doudouai.net/?character-preview=1&hair=long#france
R16.164 ordinary visits use the complete adult model with all six saved hairstyles and the existing work and court hats across four countries. Actual ordinary-main checks covered each local player and China’s 31 residents, Japan’s 18 fixed residents plus one dynamic visitor, Egypt’s 16 residents and France’s 7 residents. Original appearance, identity and saves remain intact. The optional art preview still uses its separate tab session save. Overall art acceptance and real browser/iOS appearance remain open.

[问题与需求验收清单](docs/PROJECT_CHECKLIST.md)

Published release: R16.165-public, 2026-10-07
Verified published Sites source commit: 51c8e6fdf86d6087271c4769a4dafbeb4d3727a2

Opt-in same-save performance panel: https://alien.doudouai.net/?perf=1#china
It reads runtime timing/render counts and the initial save length; it does not reset storage or send telemetry. CPU submission timing is not GPU timing. R16.128 removes repeated full-history copies from closed salon panels and China job/HUD reads. R16.129 extends current-career reads to the existing Japan/Egypt employment adapters and French tea/pastry/gardening controllers. Those controllers only run in their respective countries. The user reported R16.130 runs without lag; broader device performance remains unverified.

R16.130 fixes the original Chinese officials’ urgent-hunger idle gate repeatedly postponing its own decision deadline. The existing dining request can resume when its saved cooldown expires. This does not add toilets or establish complete NPC-needs coverage or phone-performance acceptance.

R16.132 expands the original tavern dining area, moves royal-kitchen preparation upstairs in a smaller footprint, and connects the public second-floor toilet. Complete food/toilet needs now cover 16 of the 31 original China NPCs, using real services and receipts. Existing orders, identities and R16.131 models are retained; other NPC coverage and browser/phone acceptance remain open.

R16.133 adjusts full nose/under-nose support, reduces tip projection, coordinates the brow and its fitted ribbon, and balances male jaw-width endpoints. Saved traits, identities, clothing and the R16.132 layout remain unchanged. Scoped geometry/identity checks and reviewed offline comparisons passed; overall art acceptance and real browser/phone verification remain open.

R16.134 connects the original tavern host’s paid meal and private toilet break, with new admissions paused until he physically returns to the counter. Existing accepted service and paid room reservations are preserved. Complete China NPC-needs coverage is now 17/31; the remaining 14 are still open.

R16.135 restores the salon panel at the moved third-floor reception by using the authoritative shifted hall boundary. Service consent, prices, payments and saves are unchanged.

R16.136 places hand icons on objects and conversation bubbles on NPCs, with grouped choices beside their actual target. Movement still stands up and chair highlights remain; standing is no longer a menu item. Scoped geometry, input and simulated-DOM checks passed; real browser/CSS/phone appearance remains unverified.

R16.137 corrects the landscape meal footer, table-local dining entry and cramped-HUD menu placement. Host work now resolves the current role holder while preserving each person’s funds and needs, with no invented aging or hiring UI. Reviewed female nose projection is restored without changing saved traits. Browser/CSS/phone acceptance remains open; sleep and double-bed changes are separate.

R16.138 fixes pillow/head contact while preserving neutral neck length and adds independent berths to authored double beds: 17 beds provide 23 places, including six doubles. Player/NPC occupancy, getting up and restoration remain independent without evicting the other sleeper; existing room and lodging access rules remain. Current-model contact checks passed; browser/iOS appearance is still unverified.

R16.139 connects the current NPC chef and assistant to their own paid meals, real kitchen service, public toilet visits and duty return. Role changes preserve each person’s funds, needs and held dish; players retain manual control. Default China needs coverage is 19/31, with 12 still open. No new wages, automatic aging or hiring UI is introduced.

R16.140 applies patient-rated pay to new marked player clinic shifts: physician/pharmacy bases remain 30/12 copper, scaled 80–120% by actual patient feedback and worked time; unrated shifts are neutral. Free patient care and government funding remain, wages enter only the player bank, and historical sealed pay is unchanged. NPC wages and needs coverage are not expanded.

R16.141 pays current clinic NPC holders from actually observed on-duty time into their own banks, using unique government wage receipts and existing patient feedback. Staff replacement preserves personal identity, funds and numbered items; review/handoff markers follow the current people. No offline wages, patient charges or treasury-arrears gate is added. NPC meal/toilet activation remains separate, so needs coverage stays 19/31.

R16.142 connects current clinic NPCs to meals paid from their own earned cash-plus-bank total, the original public toilet and physical duty return. Real receipts alone relieve needs; reservations, refunds and reloads preserve the same person and order. Fresh staff earn before their first meal without grants or bank trips. Default China needs coverage is now 21/31, with 10 still open.

R16.143 connects the royal cook’s existing 32-copper/12-hour employer contract to observed personal bank wages, a self-paid original tavern meal, public toilet and physical return. Needs begin only after real first income; no grants or bank trip are added. Recruitment and handoff UI follows the current live reviewer. Default China coverage is 22/31, with nine still open.

R16.144 connects Shen Yan’s existing 24-copper/12-hour patrol contract to actual patrol duty wages and safe personal breaks. After real first earnings, he pays for the original tavern meal, uses the public toilet and physically returns; practice and waiting earn no patrol pay. Current-holder handoff and the separate range reviewer keep their own identities. Default China needs coverage is 23/31, with eight still open.

R16.145 removes the six officials’ finite treasury funding gate. Their existing 24-copper pay still requires real court duty and personal filing, with one government payment per day; old personal balances, wage and meal receipts survive migration. Default needs coverage remains 23/31.

R16.146 fixes a floating-point retreat limit that could deadlock opposing traffic on the officials’ stairs. Six-person return, opposing traffic with save restoration and a player blocking the stair all passed actual-scene checks; live phone feedback remains open.

R16.147 refreshes promotion navigation to the moving official and lets ordinary homeward travel pause for reception. Yunlai furniture now fills the enlarged dining rooms and suites, with two separate waiting seats and floor-correct signs. Artist meal-funding hints clear after real settlement; autonomous NPC customer payments remain unfinished. Existing paid orders and identities survive layout restoration; live phone feedback remains open.

R16.148 expands male facial variation through the existing saved traits, including cheek and forehead response while retaining the reviewed chin and female geometry. Source-matched representative comparisons were reviewed; actual player feedback remains open. The range warden now earns from observed patrol work and pays for an original meal and public toilet trip after safe handover. Default China needs coverage is 24/31, with seven still open.

R16.149 lets officials choose and pay for an original artist service from their own earned money, with the existing artist share funding real meals. Free listening stays free, and visits depend on budget, interest and availability. Bo now earns eight copper for completing and returning from an original garden order, then pays for a meal and public toilet trip. Court summons account for the existing sequential entrance queues while keeping the 11:30 start. Default China needs coverage is 25/31, with six still open.

R16.150 pays Wen eight copper after physically drafting and handing over the original order, then enables self-paid meals and public toilet trips after safe return. Active unpaid and prepaid guest meals now restore for the range warden, garden worker and scribe with their original payment proof. Default China needs coverage is 26/31; combining one person’s earnings from multiple employers remains open.

R16.151 lets one person combine earned meal funds across the royal cook, guard, range warden, garden worker and scribe accounts. One saved transaction records each original source, and refunds return the exact split once. Safe departure checks use the same available total while unfinished work still takes priority. Clinic, artist, official and tavern-property accounts remain outside this aggregation; needs coverage stays 26/31.

R16.152 pays the current herald twelve copper only after the original document is physically collected, approved, sealed, read and handed over. Earned funds support an original meal, public toilet visit and return to the desk. Petition and charter handling retain the actual courier and tenure; a missing holder cannot fall back to the original person. Default China needs coverage is 27/31, with four still open; automatic appointments and cross-family wallets remain outside this release.

R16.153 includes earned clinic funds in the same person’s existing guest meal total. Original-source payments and refunds remain atomic, and the current controller must exclusively authorize a new meal request. Clinic wage calculation stays unchanged. Artist, official and tavern-property funds remain separate; this does not enable unrestricted job transfers. Needs coverage stays 27/31.

R16.154 gives Lin an eight-copper contract for completing an accepted physical tea service with the original cup and tray. Existing free conversations remain free. After real earnings and safe return, Lin can pay for an original meal, use the public toilet and return to the tea desk. The pale cup is clearer against green sleeves. Default China needs coverage is 28/31; the simplified demand model does not guarantee daily business in every world, and device feedback remains open.

R16.155 fixes restoration of Lin’s active unpaid or prepaid meal when its recorded source is the original tea account. Original payment and refund evidence remains mandatory. Coverage stays 28/31; this narrow correction adds no new work or income role.

R16.156 pays Lan eight copper for physically checking, handling and returning the original six books, then returning to the post. Earned funds support an original meal, public toilet visit and return upstairs. Interrupted work preserves the original book and gives no unpaid completion credit; ordinary reading resumes when the work clears. Default China needs coverage is 29/31, with 温晚 and 陆昭 still open.

R16.157 pays 温晚 eight copper from the original business share after completing the same paid session’s registration, room-card handling and closure. Artist and player-poet contracts stay unchanged. Real earnings and safe return enable an original meal, public toilet trip and return upstairs; active prepaid meals recover even if the old personal task is absent. Default China needs coverage is 30/31, leaving 陆昭. Demand-model and device-verification limits remain open.

R16.158 gives 陆昭 an eight-copper contract for physically reading the frozen original ledger, checking all four currencies on the abacus and recording the result. His own meal, public toilet trip and counter return preserve the player’s financial balances and banking rules. Food and private-toilet flows now cover all 31 original China NPCs. Broader lifecycle, long-run supply and browser/device acceptance remain open.

R16.159 includes officials’ earned personal cash and bank funds in meal aggregation. Unfinished salon reservations, government totals and business money remain excluded. Legacy prepaid meals keep their original payer and exact refunds; wages, salon spending and body ownership stay on their original rules. Artist and tavern-property funds remain separate. Original China food/toilet coverage stays 31/31.

R16.160 keeps salon service income, receptionist wages and the corresponding business expense locked through the original payer’s save and in-memory update. A reentrant meal payment can no longer leave live balances different from a reloaded save. Existing contracts and older currency participants remain compatible; artist meal aggregation is still inactive and China needs coverage stays 31/31.

R16.161 lets artists combine their earned personal share with other verified earnings belonging to the same person for an original meal. Active and older prepaid meals retain their original payment and exact refund sources. Salon pricing, income shares and actor control remain unchanged. Tavern-property funds and broader role migration remain open; China needs coverage stays 31/31.

R16.162 locks the original tavern-property participant while wages or an agreed property transaction are saved and adopted. Reentrant meal payments can no longer leave live property records different from the saved record. Existing consent, prices, finite personal funds and business capital remain unchanged; property meal aggregation is still pending.

R16.163 connects the tavern staff’s original personal funds to same-person meal aggregation. The host’s original 480, cook’s 240 and assistant’s 260 copper remain usable personal money without being labelled earned wages; business capital, takings and gross revenue stay excluded. Old and new meals preserve their exact payer, price and refund sources. All currently supported personal source families can now contribute to meals; career control migration, inheritance and transfers between people remain separate work. China needs coverage stays 31/31.

R16.164 completes current four-country character assembly: saved hairstyles have distinct geometry, and gardener, chef, artist and court headgear fit the actual adult hair without falling back to the old head. Current legal assembly combinations, actual country entry, wardrobe/save/movement and bounded cap-clearance checks passed. Reviewed offline images use actual geometry with approximate diffuse lighting; they do not establish production-shader or device acceptance. The broader C01 art request remains open.

R16.165 fixes shared panel styles overriding each panel’s footer and scrolling layout, places the remaining French/Egyptian meal and Japanese meal/bath-ticket menus on their actual objects, and clears stale input ownership after interruptions. Redundant ordinary-chair exits are removed while bath and performance exits remain. All 91 finite panel states rendered in the cloud browser, with additional safe-area and interaction checks. Real iPhone/WebGL gameplay acceptance remains open; the isolated QA page uses only mock in-memory records.

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

- `npm test`: list the module test catalog without running it. Use `npm run test:characters`, `test:navigation`, `test:ui`, `test:food-lodging`, `test:economy-careers`, or `test:world-life` for the selected module core; these are not full-module coverage. Targeted integration and explicit complete-module commands: [tests/README.md](tests/README.md).
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

R16.59 fixes shared displayed-canvas sizing and pointer/label coordinates, listens to orientation and dynamic viewport changes, and compacts the landscape HUD with label avoidance. Source/build and coordinate checks passed. Local browser access was blocked, so real CSS layout and iOS rotation remain unverified; this release is for phone confirmation. R16.58 / Site v85 remains the rollback baseline. No pending career or new character candidate is included.

R16.60 adds the fictional Chinese court-recording appointment: public study, skill eligibility, a real vacant slot, the shared court schedule, archive work, supervisor reviews and a daily bank wage. The physical money house supports withdrawals and displayed fixed game exchange rates. The folding wallet shows cash notes and a separate bank/account book; art loads only when opened (four WebP images total 389,948 bytes). Old copper jobs and service prices stay compatible. Passport and other countries' banks remain pending. Actual natural court and counter routes plus targeted persistence/UI-module checks passed; browser/iOS layout remains unverified. The optional face preview is unchanged.

R16.61 repairs unfinished summons restored before11:30, releases stale idle-conversation pauses when duties become busy, and marks pending imperial duty as busy. Help now exposes existing saved postponement records with named officials and imperial readiness. One natural legacy run reached all six officials and a kneeling ceremony; it did not reproduce the user's exact deadline absence, which remains open pending that saved record. New failures save one bounded arrival diagnostic. No late start, teleports, new job catalogue, new face or passport is included.

R16.62 extends the shared catalogue to three real permanent posts: court clerk, Chinese tavern service assistant and French garden assistant. Empty assistant slots preserve incumbents. Local employers verify actual work; skill gates, daily duty, reviews and 16–17 copper / 8–9 French-voucher bank wages are connected. New temporary12/6-copper settlements also enter bank, while already-paid legacy cash receipts stay untouched and cannot be paid again. Old clerk saves and pending work migrate. Targeted actual-service, storage and handbook checks passed; routes were reused, no unrelated scene rerun or iOS claim. Chinese court postponement investigation remains open.

R16.63 adds shared player/NPC body-only recovery after five seconds of sustained blocked movement, capped at1.25 seconds/1.4 metres and ending when clear. Static walls, leaves, furniture and floors remain enforced. Reading now offers ritual/writing/gardening/art books with real8-second completion, visible skill progress, cancellation and save migration; French reading/chair targets remain separately usable. Narrow navigation and actual four-station main checks passed; user-phone deadlock and iOS layout still require field confirmation. No passport or new character model included.

R16.64 adds the fictional read-only travel passport inside Help, before lengthy control instructions. It uses saved visits, activity stamps and the current character palette, with original cover and four regional seals; dates absent from old progress stay unknown. Returning from the passport refreshes the existing Chinese court-status panel. Wallet/passport browsing stops movement input without cancelling existing work or orders. No new save fields, face model or raster downloads; targeted modal/progress checks and build passed, real iOS layout unverified.

R16.65 puts the passport directly in the upper-right HUD with opening, page-turn and closing motions; controls and current court diagnostics remain in its notes page. Wallet notes rise in front of the pocket, blank ticket fields receive currency/value/series artwork, and cash totals are explicitly separate from bank deposits. Actual transaction animations use the corresponding optimized country ticket only after ledger commitment. Focused DOM and resource checks passed; real browser/iOS animation and the reported top blank strip remain unverified. No new careers or face model included.

R16.66 separates recruitment from the employed handbook. Unemployed HUD navigation goes to a physical local registry; employed pages describe only the actual current job. Registry cards compare each current skill and age with the requirements and show the real application result. Temporary-worker roster membership is explicitly distinct from formal tenure. Actual adapters did not reproduce ineligible tenure writes; the reproduced defect was misleading shared labels and showing employed sections without a formal post. Existing core guards are now also the read-only UI eligibility source. Targeted DOM, adapter, storage and bank checks passed; actual browser/iOS appearance remains unverified. Passport and wallet physical-design field feedback remains open.

R16.67 fixes continuous wallet extraction/insertion and decoded ticket artwork, uses an unframed career icon with one current-job page and local-only vacancies, and continues accepted tavern work to its first actual table. The tavern hiring sign is now a small desk placard and duplicate helper controls are removed. Wallet review uses actual product coordinates and WebP artwork; the natural tavern chain is simulated DOM plus Three/Mesa. The published passport is unchanged in this release: its separately developed book design, country-page structure and real-player portrait are still pending. Real iOS visual/animation and intermittent blank strip remain open.

R16.68 uses the passport book itself for cover, turning sheets and one visa page per country, with a cached photograph rendered from the actual current player. The career panel keeps one current action above compact shift, progress, evaluation, bank salary and progression data. Role-specific registration context, manual nearby access, shared 06:00–18:00 start gating and the unobstructed tavern desk placard are fixed. Integration checks reuse the affected module results; product SVG/DOM layouts and Three/Mesa views are not real iOS validation. The intermittent phone blank strip remains open.

R16.68 also restores the original rounded, tilted wallet proportions while preserving continuous paper movement and decoded artwork. The tavern now has a separate reception counter: the host stands inside and the visitor outside, with the existing kitchen and pass behind it. Chef/host player employment and assistant food-delivery/review work remain pending. Published source: `8320479a693b7a884514066dfec946a37fbee416` (Sites v96, 2026-10-05T04:37:30Z).

R16.69 removes the duplicate dark lip from the front-pocket pseudo-element. The independent back layer remains behind the notes; restored leather proportions, angle and extraction geometry are unchanged. CSS stacking root cause and the focused regression were checked; real iOS confirmation remains open.

R16.69 public source: `62dd0608b6f1ec372253d2329c30b5984a3c2436` (Sites v97, 2026-10-05T04:50:43Z).

R16.70 replaces bank deposit/withdraw forms with one cash/bank allocation slider and checked-delta confirmation, preserves separate exchange and unclipped currency receipt animations, and uses flat fill-state controls. Career applications now retain approval/rejection receipts and enforce one submission per role per simulation day; eligibility enables a single durable interview decision rather than guaranteeing admission. Missing relationship data stays neutral. Approval does not start work. Targeted banking, wallet, application and storage checks pass; rendered DOM reviews remain offline rather than iOS validation.

R16.70 public source: `389783e5beb3479397a847ae17589d41f6edb2e1` (Sites v98, 2026-10-05T05:30:00Z).

R16.71 integrates world actor/activity checkpoints, continuous tavern chef/assistant work with an NPC proprietor with actual meal and lodging events, persistent dirty tables/rooms, paid player meals, attributable customer feedback and safe shift handover. It also implements the selected airy B bank composition with A-style cut-corner actions, keeping the tested allocation and exchange logic. Existing hiring decisions and currency receipts are preserved. Two natural tavern routes and the merged reserved-order interruption check passed; the latter preserved actors, seats, wallet and partial phase in 84.749 seconds. Actual rendering checks used Three/Mesa and offline DOM, not real iOS. Old saves cannot recover positions never recorded; new checkpoints start after this update. Player-host NPC recruitment and remaining passport animation defects stay open.

Before R16.71 publication, the salaried proprietor application was removed: becoming proprietor requires a future ownership purchase and mutual offer acceptance. Chef/assistant employment remains available. This release also fixes the passport rigid-cover and page-occlusion animation using the same product SVG frames inspected offline.

R16.71 public source: `557513ef85d1e0ef49000422937dc2936593f8c7` (Sites v99, 2026-10-05T06:46:57Z).

R16.75 repairs shared NPC blocked-body recovery and coherent court checkpoints, separates each role’s application queue and ended appointment history, offers actual workplace choice before travel, and follows the marked bank contour with one live allocation row. Focused logic, one natural court save/resume ceremony, and offline DOM evidence were reused; exact user-save and real iOS verification remain open.

R16.76 adds one persistent player daily-needs clock, receipt-backed real food relief in China/Japan/France, two Chinese visitors fulfilling needs when free, and a private Chinese toilet. Incomplete/cancelled consumption grants no relief. Other NPCs, Egyptian food service and other countries’ toilets remain open. Japan dining/bath and performance menus now use compact selection/status cards with one fixed primary action. Focused source checks, one natural China main chain and offline UI/Mesa images passed; no real iOS claim.

R16.77 extends the shared needs source to Japan’s existing14 staff, retaining real handoffs and prepared staff meals, and reuses one enclosed washhouse cubicle for player/staff private relief. China’s original private facility uses the same service adapter. China dining and salon menus now use compact local selection, price/status cards and a fixed action. One natural Japan staff/player/meal main chain and targeted save/cancel checks passed; dynamic visitors, performers and remaining regions still need physiology adapters.

R16.78 refreshes the French garden’s local work panel with temporary/long-term selection, actual progress and one fixed primary action. Rules are expandable; hiring, service, bank wages and XP behavior are unchanged. Focused UI and existing garden/career checks plus offline landscape layout passed, without an iOS claim.

R16.79 opens the locally reviewed pharmacy assistant role: real symptomatic existing guests, controlled owner handoff, the same numbered paper and packet, continuous attendance, explicit shift handover and one bank wage settlement. One completed order does not end the shift. The legacy tavern work panel is now compact without changing its narrow temporary contract. Directed logic and a natural clinic chain passed; this remains simulated DOM/Three/Mesa evidence rather than iOS verification.

R16.80 opens the French music-reception bank/exchange desk with Claire. Local French wage withdrawals and exchanges use the same existing currency buckets, quotes, interest and transaction receipts. China defaults are preserved. One actual France route and transaction chain plus normal scene images passed; real browser/iOS verification remains open.

R16.81 adds Japan’s public reception exchange desk and stable adult teller, retaining the original14 staff, performers and bath/dining routes. It uses the shared bank accounts, original Japanese vouchers and unchanged quotes/interest. The entry/transaction/exit route passed with inspected normal views; French wage text now points to its local bank.

R16.82 opens the Egyptian public-court ticket exchange desk and adult teller, using the original local vouchers and shared bank accounts, quotes and interest. The desert-entry/counter/transaction/exit route and normal scene views passed. All four regions now have physical bank counters; full local economies and bank careers remain unfinished.

R16.83 connects paid player stays to Yunlai’s existing two guest rooms and Xu An’s physical check-in. Twelve copper covers 24 simulated hours; pre-check-in cancellation refunds, completed check-in settles once, and checkout leaves persistent dirt for the existing assistant to clean. NPC lodging and salon reservations share room exclusion. A complete actual route passed; browser/iOS remains unverified.

R16.84 makes the existing tavern property panel compact: asking price, bank funds, actual bid response, operating totals and selected buyer offer stay distinct, with one fixed primary action. Property and ledger behavior is unchanged; product DOM/CSS was inspected offline, not on iOS.

R16.85 opens France’s local tea-serving career with persistent interviews, exclusive tenure, explicit continuous shifts, original guest/tray/cup handling and French bank wages. The retained French bath WC now completes the shared player need behind closed doors and opaque inner curtains; active tray work blocks toilet use. Directed real-scene routes passed, with one normal WC contact view inspected in Mesa; real browser/iOS and full NPC needs remain open.

R16.86 adds local French tea/pastry preparation employment and a cooking book in the existing library. The original order and tray pass from the player to Manon, then to the original guest, with review only after the same cups return and are cleaned. Continuous shifts pay actual on-duty time to the French bank. Existing serving and player-needs paths are preserved; full baking inventory and individualized quality reviews remain open.

R16.87 keeps salon selection/scroll/focus stable through background updates, clears Lu Huaichuan’s invitation aisle with natural old-save continuation, fixes the inn footer under the full late CSS cascade, and removes the obsolete daily/furniture count HUD. Directed logic/route checks and offline product layouts passed; user-save and real iOS feedback remain open.

R16.88 gives the original relieved French tea staff stable personality-weighted reading, rest and walks with physical meeting/role recall; the active colleague keeps the original order. A clear visitor meeting point fixes the observed return obstruction without navigation exceptions. The money-house frame also gains only two locally rounded right-shoulder joins. Full NPC physiological supply remains unfinished.

R16.89 excludes unaffordable autonomous meals before reservation and again at execution, and durably cancels old unpaid impossible orders so the original guests can leave the waiting area for ordinary free activities. Identity, hunger, purses, paid food, room and clinic claims remain intact. No NPC bank, income system or free money is invented.
