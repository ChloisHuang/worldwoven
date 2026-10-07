#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
mkdir -p qa
# One bounded production-scene probe; do not run other heavy scenes concurrently.
exec 9>qa/toilet-queue.lock
flock -n 9 || { echo 'Another toilet probe is running' >&2; exit 75; }
export QUEUE_GUARDED=1
export QUEUE_STEPS=300
# Heap alone excludes Three typed arrays; external guard caps the whole process tree.
python scripts/guard-process-tree.py --seconds 180 --mib 1152 -- \
  node --max-old-space-size=768 --experimental-vm-modules development/toilet-queue/check-main.cjs \
  2>&1 | tee "qa/toilet-queue-run-$(date -u +%Y%m%dT%H%M%SZ).log"
