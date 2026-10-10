# R16.201 underground market: offline geometry review

Reviewed 2026-10-09 UTC. This is a real geometry render, not a concept image or an online browser screenshot.

## Method and scope

`export-offline.mjs` directly builds the production holding-cell/black-market modules and the same cropped surface ground aperture, keeps all walls, ceilings and stock, and evaluates current production live-entry character meshes and skeletons. The merchant is a representative seed-41 `cn-tavern-diner-east` role appearance at the authored merchant station; this is not the user's saved Zhou Tang appearance or evidence of a runtime invitation. The player is a representative current production rig. Camera positions use the production collision resolver, 50-degree field of view, .22 pitch and requested 4.6m distance.

`render-offline.py` reuses the existing teller real-mesh Blender pipeline, with CPU Cycles and approximate diffuse/emissive lighting at the original fixture locations. This does not reproduce the production Three toon/irradiance shader, UI, browser CSS, runtime goods ownership or mobile input. Other palace buildings are excluded. No wall or ceiling was removed to obtain a clearer image. Twelve samples introduce visible offline-render grain; this is not evidence of game pixel noise.

## Actual pixel review

All three generated PNGs were opened and inspected, not merely listed or tested for existence.

- Entry: the added underground-market side sign and shared public stair entrance are legible; player, opening and retaining edges are visible. No conspicuous body/ground intersection in this static pose.
- Branch: the lower landing and side opening are visible, with the player inside the clearance. The upper frame is heavily occupied by the actual wall/lintel, so this is a narrow circulation view rather than a market overview. No conspicuous character/wall intersection in this static pose.
- Counter: trading sign, shelf vessels, weighing scale, book, cloth/paper bundles and merchant's upper body are visible from the buyer's normal perspective. No conspicuous player/counter or merchant/counter intersection in the observed pose. The player naturally obscures some central merchandise; this does not establish visibility from every angle.

Verdict: these three static geometry views contain no observed severe blocking/penetration defect. This is bounded visual evidence, not full gameplay, animation, collision-route or UI acceptance. Online Chrome verification was separately blocked by WebGL context creation failure; iOS remains untested.

## Reproduce, serial and bounded

Run from the source root with the existing shared heavy-scene lock. Do not run concurrently with another heavy scene:

    mkdir -p qa/underground-market-offline
    flock -n /workspace/shared/worldwoven-heavy-scene.lock python scripts/guard-process-tree.py --seconds 180 --mib 1024 --samples qa/underground-market-offline/resources.jsonl -- bash -c 'set -e; for v in entry branch counter; do VIEW=$v node --max-old-space-size=384 development/underground-market/export-offline.mjs; OPENBLAS_NUM_THREADS=1 blender -b -t 2 --python development/underground-market/render-offline.py -- "$PWD/qa/underground-market-offline/$v"; done'

Observed run: PASS, 48.59s total process-tree time, 413.551MiB peak including supervisor, Blender 4.3.2 CPU. Each scene.json records production source hashes, actual camera position, fixtures and exported triangles. Generated binary mesh data and PNGs remain ignored under `qa/underground-market-offline/`; no build, product logic or deployment changed.

## R16.202 lighting response (2026-10-09)

The user judged the original counter image insufficiently dark. Two separate causes were identified: the offline renderer used a uniform .34 diffuse-emission approximation, and production's global hemisphere/sun lighting had no enclosed-market attenuation. The fix changes production as well as the offline approximation; it is not a screenshot exposure adjustment.

Production reuses the existing fixture field's alpha channel for a .18 base-light multiplier, applied to existing sun/hemi diffuse before adding local fixtures. An explicit fragment-world-space envelope feathers only its inner .25m, so trilinear field filtering and the existing .12m normal sample offset cannot dim points outside the envelope. The envelope includes actual market wall thickness and ceiling, while excluding the west public landing and all surface terrain. Three authored fixtures remain three: the shelf/counter/entry ranges are 3.4/4.5/3.6m with intensities 8/13/9 and daytime factor .72. No extra GPU lights, shadow maps, texture allocations or texture samples are added. Global hemisphere, sun, ground palette and other regions are unchanged.

Offline comparisons retain identical production geometry, characters and camera transforms. The exporter reads the same envelope; Blender's existing approximate ambient-emission contribution is scaled only for meshes inside it, and original emissive lamp surfaces are retained. Its point-light falloff is only an approximation of production's bounded irradiance field. The before image uses 12 samples and after uses 24 to reduce noise. These are real mesh renders, not proof of final Three shader pixels. Public browser shader/UI/mobile acceptance remains unverified.

The focused `tests/underground-market-lighting.mjs` exercises field alpha, unchanged fixture RGB, day/night and cleanup, shader insertion order, unchanged global light, inward-only boundaries, actual wall-envelope coordinates and the unchanged three-light count. Full-country behavior chains are unrelated and were not rerun. Build/version/deployment belongs to the integration task.

Final reviewed images are `qa/underground-market-dark-reviewed/{entry,branch,counter}/{view}.png`. All three were opened: surface entry remains bright/readable; the public stair landing remains readable with a visibly darker room beyond; counter wall corners, shelf interiors and counter base are substantially darker while warm fixtures, sign, merchandise, merchant silhouette/face and player path remain discernible. No new conspicuous geometry penetration was observed. Comparing every exported mesh binary and all camera descriptors to the first review gives exact parity for all 416 meshes in each view. The only visual change is the lighting interpretation; no geometry was hidden or altered.

Final render guard: PASS, 84.371s, 407.555MiB peak including supervisor, serial CPU rendering. The focused lighting test passed after the final wall-envelope change. A failed intermediate offline mapping treated black-emissive default materials as light sources; this was corrected before the final review. Only nonblack authored emissive materials retain lamp emission. Intermediate renders are not acceptance evidence.

Independent read-only shader/envelope review found no blocking issue after the wall-thickness envelope change: field encoding and uniform bounds agree; all interior wall/floor/ceiling faces have full mask; public landing x<-12.45 and surface y>=-.75 have zero mask; day/night mode and original fixture floor partition remain unchanged. This was source review, not GPU shader pixel execution.


## Civilian cellar separation (2026-10-10)

The earlier shared-stair entry/branch images above are historical and do not describe the corrected layout. The market is now below the Yunlai dining room, with a separate west-lane stair; the official holding room's former eastern branch is masonry-sealed. Production room/stock identities, the relative counter layout and the existing dark ambient treatment are retained.

All three current images were opened and inspected:

- `qa/black-market-civilian/entry/entry.png`: normal production TPS camera at the new street entry. The cellar sign and opening are beside the existing civilian tavern wall. The player has visible entry clearance. This angle establishes the exterior location; the descending treads are not clearly discernible from this standing viewpoint, so it is not a separate stair-descent visual acceptance.
- `qa/black-market-civilian/branch/branch.png`: normal TPS at the new inner doorway. The independent stair hall opens into the darker storeroom; the clear doorway, floor and timber frame have no obvious body intersection in this pose. It contains no holding-room gate or official evidence cupboard.
- `qa/black-market-civilian/counter/counter.png`: the original finite stock displays, counter, merchant and shelving remain in the relocated room. The three warm interior lamps and subdued room corners remain legible; no obvious player/counter intersection is visible. The representative player occludes some central counter goods as in normal TPS.

The entry builds the complete production China scene and uses the same ordinary object-frustum test as the live renderer before exporting meshes to Blender: 240 off-camera meshes culled, 35 camera-visible meshes retained, 461,435 triangles. No camera-visible wall or ceiling is removed. Branch/counter build the exact relocated market and matching cropped ground; surrounding buildings are not included in these two underground close views. Current production live-entry rigs are used, with representative saved-independent appearance. All camera positions use the production collision resolver, FOV50, pitch .22 and requested 4.6m distance (actual entry 4.60m, branch 3.34m, counter 4.19m).

These are true mesh renders with approximate Blender CPU lighting/materials, not production Three shader, browser, UI or iOS screenshots. Twenty-four-sample offline grain is visible and is not a game-pixel claim. Ordinary object-frustum culling does not reproduce off-camera shadow casters; this is another reason not to present these as exact production lighting.

Resource bounds were retained: each stage ran serially under the shared scene lock, heap at most 768MiB, process-tree limit 1152MiB and wall limit 180s. An initial full 1,208,416-triangle Blender import exceeded the RSS cap and was stopped before producing an accepted image. The corrected entry export passed at 4.928s/606.672MiB, entry render at 43.119s/600.773MiB, branch render at 31.504s/353.406MiB, and counter render at 29.699s/353.930MiB. No resource limit was raised.

Separate behavior evidence: `tests/china-holding-cell-navigation.cjs` walked civilian threshold to new merchant position and back, then the new counter through the surface courtyard into the original holding intake (109 waypoints), and retained the original gate/custody navigation checks. `tests/underground-market-main.cjs --phase=relocation` and `--phase=relocation-cold` loaded the original saved three-second work action, moved player/merchant with their exact relative offsets, preserved paid goods/ledger, and resumed the same work ID through two cold loads without a second spatial translation. These tests use simulated DOM/renderer and do not add browser acceptance.
