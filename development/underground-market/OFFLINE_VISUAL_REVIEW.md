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
