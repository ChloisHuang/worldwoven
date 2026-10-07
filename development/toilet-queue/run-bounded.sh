#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
mkdir -p qa
exec 9>/workspace/shared/worldwoven-heavy-scene.lock
flock -n 9 || { echo 'Another Worldwoven heavy-scene probe is running' >&2; exit 75; }
export QUEUE_GUARDED=1
export QUEUE_STAGE="${1:-segment}"
export QUEUE_STEPS="${QUEUE_STEPS:-30}"
case "$QUEUE_STAGE" in
  unit) target=development/toilet-queue/check-dom.cjs ;;
  init) unset QUEUE_LOAD; target=development/toilet-queue/check-main.cjs ;;
  load|segment) : "${QUEUE_LOAD:?Specify the existing checkpoint with QUEUE_LOAD}"; target=development/toilet-queue/check-main.cjs ;;
  *) echo 'Use unit, init, load, or segment' >&2; exit 64 ;;
esac
log="qa/toilet-queue-${QUEUE_STAGE}-$(date -u +%Y%m%dT%H%M%SZ)"
# Heap excludes Three typed arrays; external guard caps the whole process tree.
set +e
python scripts/guard-process-tree.py --seconds 180 --mib 1152 --samples "$log.memory.jsonl" -- \
  node --max-old-space-size=768 --experimental-vm-modules "$target" 2>&1 | tee "$log.log"
status=${PIPESTATUS[0]}
set -e
printf '{"stage":"%s","exit":%s}\n' "$QUEUE_STAGE" "$status" | tee "$log.status.json"
exit "$status"
