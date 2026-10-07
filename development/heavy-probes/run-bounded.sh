#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
mkdir -p qa
exec 9>/workspace/shared/worldwoven-heavy-scene.lock
flock -n 9 || { echo 'Another Worldwoven heavy-scene probe is running' >&2; exit 75; }
export WORLDWOVEN_GUARDED=1
export TELLER_PROFILE="${TELLER_PROFILE:-1}"
export PROBE_STAGE="${1:-unit}"
if [[ "$PROBE_STAGE" == init ]]; then unset SOCIAL_RESUME TELLER_RESUME; fi
if [[ "$PROBE_STAGE" == run ]]; then
  case "${TELLER_STOP_AFTER:-}" in
    registration) [[ -z "${TELLER_RESUME:-}" ]] || { echo 'Registration requires fresh input' >&2; exit 64; } ;;
    interview|handoff|issuance|checks|calculations|record|settlement|salary-attendance|salary-review-attendance|salary-duty-resume-attendance|salary-handoff-resume-attendance|salary-return) [[ -f "${TELLER_RESUME:-}" ]] || { echo 'This stage requires its real prior checkpoint' >&2; exit 64; } ;;
    *) echo 'Choose registration, interview, handoff, issuance, checks, calculations, record, settlement, salary-attendance or salary-return recovery stop explicitly' >&2; exit 64 ;;
  esac
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
