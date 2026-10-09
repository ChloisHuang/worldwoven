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
