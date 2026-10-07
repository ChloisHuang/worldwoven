#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
mkdir -p qa/st03-r190
exec 9>/workspace/shared/worldwoven-heavy-scene.lock
flock -n 9 || { echo 'Another Worldwoven heavy-scene probe is running' >&2; exit 75; }
export WORLDWOVEN_GUARDED=1
export PROBE_STAGE="${1:-}"
case "$PROBE_STAGE" in segment|cleaning|active-restore|service) ;; *) echo 'Choose segment, cleaning, active-restore or service explicitly' >&2; exit 64 ;; esac
[[ -f "${SALON_INPUT:-}" ]] || { echo 'SALON_INPUT must name the exact prior checkpoint' >&2; exit 64; }
export SALON_OUTPUT="qa/st03-r190/${PROBE_STAGE}-$(date -u +%Y%m%dT%H%M%SZ)-$$"
set +e
python scripts/guard-process-tree.py --seconds 180 --mib 1152 --samples "$SALON_OUTPUT.memory.jsonl" -- \
 node --max-old-space-size=768 --experimental-vm-modules development/heavy-probes/check-salon-production.cjs 2>&1 | tee "$SALON_OUTPUT.log"
status=${PIPESTATUS[0]}
set -e
printf '{"stage":"%s","exit":%s}\n' "$PROBE_STAGE" "$status" | tee "$SALON_OUTPUT.status.json"
exit "$status"
