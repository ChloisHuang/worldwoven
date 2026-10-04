"""One guarded actual-main chain. Run serially; defaults to its two Mesa captures."""
import json
import importlib.util
import os
from pathlib import Path
import signal
import subprocess
import sys
import time

LIMIT_BYTES = int(1.2 * 1024 ** 3)
LIMIT_SECONDS = 175
ROOT = Path(__file__).resolve().parents[2]
OUT = Path(os.environ.get('OUT_DIR', 'qa/actor-preview/main-playable'))
if not OUT.is_absolute():
    OUT = ROOT / OUT
if OUT.exists():
    raise SystemExit('Use a fresh OUT_DIR to preserve existing evidence: ' + str(OUT))


MONITOR_PATH = Path('/workspace/scratch/1eb6172ab681/alphagpt-recovery-20261003/reentry_evidence/code/process_tree_monitor.py')
spec = importlib.util.spec_from_file_location('worldwoven_process_monitor', MONITOR_PATH)
monitor = importlib.util.module_from_spec(spec)
spec.loader.exec_module(monitor)


def own_tree_rss(child_pid):
    """The shared status/PPid scan works where task/children is not populated."""
    rows = monitor.own_tree(child_pid)
    guard_rss = next(row['rss_bytes'] for row in monitor.own_tree(os.getpid()) if row['pid'] == os.getpid())
    return guard_rss + sum(row['rss_bytes'] for row in rows)


def kill_group(pid):
    try:
        os.killpg(pid, signal.SIGKILL)
    except ProcessLookupError:
        pass


env = os.environ.copy()
env['OUT_DIR'] = str(OUT)
env.setdefault('ACTOR_PREVIEW_MESA', '1')
started = time.monotonic()
child = subprocess.Popen(['node', '--experimental-vm-modules', 'tests/actor-preview-main.cjs'], cwd=ROOT, env=env, start_new_session=True)
peak, reason = 0, None
try:
    while child.poll() is None:
        try:
            peak = max(peak, own_tree_rss(child.pid))
        except ProcessLookupError:
            if child.poll() is None:
                raise
            break
        elapsed = time.monotonic() - started
        if peak > LIMIT_BYTES:
            reason = 'whole_process_tree_memory_limit'
        elif elapsed >= LIMIT_SECONDS:
            reason = 'hard_wall_time_limit'
        if reason:
            kill_group(child.pid)
            break
        time.sleep(min(.10, max(.001, LIMIT_SECONDS - elapsed)))
    exit_code = child.wait(timeout=2)
except BaseException as error:
    reason = reason or type(error).__name__
    kill_group(child.pid)
    child.wait(timeout=2)
    raise
finally:
    # Clean any descendants remaining in the session after Node has exited.
    kill_group(child.pid)
    OUT.mkdir(parents=True, exist_ok=True)
    report = {'exit': child.poll(), 'seconds': time.monotonic()-started,
              'peak_tree_rss_bytes': peak, 'limit_tree_rss_bytes': LIMIT_BYTES,
              'limit_seconds': LIMIT_SECONDS, 'termination_reason': reason,
              'scope': 'This guard process and its launched Node descendants only',
              'mesa': env['ACTOR_PREVIEW_MESA'] == '1'}
    (OUT / 'guard.json').write_text(json.dumps(report, indent=2)+'\n')
    print(json.dumps(report), flush=True)
sys.exit(124 if reason else exit_code)
