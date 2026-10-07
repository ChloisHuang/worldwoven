#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
mkdir -p qa
exec 9>/workspace/shared/worldwoven-heavy-scene.lock
flock -n 9 || { echo 'Another Worldwoven heavy-scene probe is running' >&2; exit 75; }
export WORLDWOVEN_GUARDED=1
export PROBE_STAGE="${1:-unit}"
if [[ "$PROBE_STAGE" == init ]]; then unset SOCIAL_RESUME TELLER_RESUME; fi
case "$PROBE_STAGE" in
  salon-payroll) target=development/heavy-probes/materialize-salon-payroll.mjs ;;
  salon-load) target=development/heavy-probes/check-salon-load.cjs ;;
  unit) target=development/heavy-probes/check-dom.cjs ;;
  approach) target=development/heavy-probes/check-approach.cjs ;;
  init|load|segment) target=tests/natural-social-observe.cjs ;;
  *) echo 'Choose unit, init, load, segment, approach, salon-payroll, salon-load explicitly' >&2; exit 64 ;;
esac
export NATURAL_FRAMES="${NATURAL_FRAMES:-30}"
log="qa/natural-${PROBE_STAGE}-$(date -u +%Y%m%dT%H%M%SZ)-$$"
set +e
python scripts/guard-process-tree.py --seconds 180 --mib 1152 --samples "$log.memory.jsonl" -- \
  node --max-old-space-size=768 --experimental-vm-modules "$target" 2>&1 | tee "$log.log"
status=${PIPESTATUS[0]}
set -e
printf '{"stage":"%s","exit":%s}\n' "$PROBE_STAGE" "$status" | tee "$log.status.json"
exit "$status"
