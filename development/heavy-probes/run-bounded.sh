#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
mkdir -p qa
exec 9>/workspace/shared/worldwoven-heavy-scene.lock
flock -n 9 || { echo 'Another Worldwoven heavy-scene probe is running' >&2; exit 75; }
export WORLDWOVEN_GUARDED=1
export PROBE_STAGE="${1:-unit}"
if [[ "$PROBE_STAGE" == init ]]; then unset SOCIAL_RESUME TELLER_RESUME; fi
if [[ "$PROBE_STAGE" == run && "${TELLER_STOP_AFTER:-}" != registration ]]; then
  echo 'Recovery simulation currently requires TELLER_STOP_AFTER=registration' >&2
  exit 64
fi
case "$PROBE_STAGE" in
  unit) target=development/heavy-probes/check-dom.cjs ;;
  init|load|run) target=tests/regional-teller-main.cjs ;;
  *) echo 'Choose unit, init, load, run explicitly' >&2; exit 64 ;;
esac
log="qa/teller-${PROBE_STAGE}-$(date -u +%Y%m%dT%H%M%SZ)-$$"
set +e
python scripts/guard-process-tree.py --seconds 180 --mib 1152 --samples "$log.memory.jsonl" -- \
  node --max-old-space-size=768 --experimental-vm-modules "$target" 2>&1 | tee "$log.log"
status=${PIPESTATUS[0]}
set -e
printf '{"stage":"%s","exit":%s}\n' "$PROBE_STAGE" "$status" | tee "$log.status.json"
exit "$status"
