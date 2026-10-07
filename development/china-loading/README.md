# T04: unchanged-visual China cold-load optimization

Scope: shorten region construction without reducing geometry, actor count, texture resolution, light sources, shadow quality, save restoration or interaction behavior. The broader T04 device/resource-release acceptance remains open. This first independent batch changes only the shared static lighting-field occlusion routine.

## Change and coverage

- Replace each ray's temporary Set with a bounded Uint32 visit-stamp array on private collider copies. Reset on uint32 wrap.
- Replace each candidate box's nested axis arrays and swap array with scalar axis access, preserving calculation order, epsilon, ray endpoints, collision traversal order and compact-emitter exemption.
- China: actual existing saved scene, all 31 NPC identities, 67 fixtures, 193,473 field cells (63×37×83), all three field texture hashes and all source contribution counters compared.
- Japan/Egypt/France: the same pure ray/box routine is exercised with 12,000 deterministic rays, including vertical/parallel/short rays, negative coordinates, floors, walls, duplicated buckets, compact lamp proxies, missing vertical bounds, immutable source colliders and stamp wrap. Their full scenes were not rerun; there are no region-specific branches in the changed routine.
- Rendering is downstream of bit-identical day/night/direction textures. No geometry, shader, light constants, material or actor source changed. This establishes preservation of the affected rendering inputs, not a new browser/iOS visual review.

## Results

Same checkpoint, consecutive serial processes in the same current cloud runtime:

- Full main evaluation: 72.307s baseline → 61.398s candidate.
- Lighting attachment: 28.956s → 21.312s.
- Process-tree peak: 675.441 MiB → 677.555 MiB.
- All three SHA-256 texture hashes, 67 contribution counts, 245,022 occluded contributions, 31 actor IDs and saved simulation clock identical.
- 12,000-ray pure comparison: PASS, 0.828s / 59.656 MiB.
- Clean 365-asset build: PASS, 0.505s / 74.789 MiB. No previous deployment graph in this fresh output; production integration must retain its existing graph.

This is one cloud CPU pair, not a phone speed promise. Unchanged geometry and NPC phases also varied. The earlier 49.7s result belongs to a replaced runtime and is not the paired baseline. The current /proc RSS guard was preflighted on a tiny allocation before loading; cgroup whole-environment counters are unavailable. All checks ran serially under the shared heavy-scene lock, bounded process-tree memory/time and durable ignored qa logs. No full suite or additional heavy scene repetition.

Machine-readable phase/hash evidence: [result.json](result.json). Saved-game contents are not committed.

## Reproduce

Use the existing checkpoint path; do not manufacture or reset a save:

    QUEUE_PROFILE=1 QUEUE_LOAD=/path/to/existing/checkpoint.json bash development/toilet-queue/run-bounded.sh load

The opt-in probe reports lighting timing and texture fingerprints. The narrow comparison reads the pre-optimization routine from the preserved baseline Git commit:

    flock -n /workspace/shared/worldwoven-heavy-scene.lock python scripts/guard-process-tree.py --seconds 30 --mib 256 --samples qa/occlusion.memory.jsonl -- node --max-old-space-size=128 development/china-loading/check-occlusion.cjs

No deployment in this task. Parent integrates and publishes the verified batch using the existing site's authorized release route.
