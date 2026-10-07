import argparse, json, os, signal, subprocess, time
from pathlib import Path

def own_tree(root):
    rows = {}
    for item in Path('/proc').iterdir():
        if not item.name.isdigit(): continue
        try:
            values = dict(line.split(':', 1) for line in (item/'status').read_text().splitlines() if ':' in line)
            rows[int(item.name)] = (int(values['PPid']), int(values.get('VmRSS', '0 kB').split()[0]) * 1024)
        except (OSError, ValueError, KeyError): continue
    selected = {root}
    while True:
        more = {pid for pid, (parent, rss) in rows.items() if parent in selected}
        if more <= selected: break
        selected |= more
    return {pid: rows[pid][1] for pid in selected if pid in rows}

parser = argparse.ArgumentParser()
parser.add_argument('--seconds', type=float, default=300)
parser.add_argument('--mib', type=float, default=1228.8)
parser.add_argument('--samples', help='Optional durable JSONL process-tree RSS sample file')
parser.add_argument('command', nargs=argparse.REMAINDER)
args = parser.parse_args()
command = args.command[1:] if args.command[:1] == ['--'] else args.command
if not command: parser.error('a command is required')
start = time.monotonic()
child = subprocess.Popen(command, start_new_session=True)
peak = 0
peak_members = {}
stopped = None
last_sample = -1
samples = open(args.samples, "a", buffering=1) if args.samples else None
try:
    while child.poll() is None:
        members = own_tree(os.getpid())
        rss = sum(members.values())
        second = int(time.monotonic()-start)
        if samples and second != last_sample:
            samples.write(json.dumps({"seconds": second, "treeRSSMiB": round(rss/1024/1024, 3), "members": members})+"\n")
            last_sample = second
        if rss > peak: peak, peak_members = rss, members
        if rss > args.mib*1024*1024: stopped = 'tree-rss-cap'
        elif time.monotonic()-start > args.seconds: stopped = 'time-cap'
        if stopped:
            os.killpg(child.pid, signal.SIGKILL)
            break
        time.sleep(.1)
    result = child.wait()
finally:
    if samples: samples.close()
    try: os.killpg(child.pid, signal.SIGKILL)
    except ProcessLookupError: pass
print(json.dumps({'guard': 'STOP' if stopped else 'PASS' if result == 0 else 'FAILED',
    'reason': stopped, 'exit': result, 'seconds': round(time.monotonic()-start, 3),
    'treePeakMiB': round(peak/1024/1024, 3), 'peakMembersBytes': peak_members,
    'includesSupervisor': True, 'hostname': os.uname().nodename,
    'bootId': Path('/proc/sys/kernel/random/boot_id').read_text().strip()}), flush=True)
raise SystemExit(124 if stopped else result)
