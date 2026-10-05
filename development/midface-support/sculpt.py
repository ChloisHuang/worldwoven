"""Incremental, offline exterior midface sculpt on the pinned runtime asset.

The reviewed runtime at BASE is the input. This intentionally does not rebuild
the older head generator, replace the rest of the face, or read photo pixels.
One connected bilateral cheek surface is faired in physical XY and projected
forward as a broad infraorbital/malar volume. Eye rims, nose, lips, chin and
neck are outside the field. No runtime vertices or triangles are added.
"""
import base64, hashlib, json, pathlib, subprocess
import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[2]
BASE = '49c744a00d6dc1a0681a0e1f290d5f4b0dcb154c'
ASSET = 'source/game/complete-adult/assets/adult-forms-data.js'
code = subprocess.check_output(['git', 'show', BASE + ':' + ASSET], cwd=ROOT).decode()
start = code.index('const packed=') + len('const packed=')
stop = code.index(';\nfunction decode', start)
packed = json.loads(code[start:stop])
part = packed['female']['parts'][0]

def decode(key):
    value = part[key]
    return np.frombuffer(base64.b64decode(value['data']), dtype='<u2' if value['type'] == 'u16' else '<f4').copy()

def smooth(a, b, value):
    t = np.clip((value-a)/(b-a), 0, 1)
    return t*t*(3-2*t)

position = decode('position').reshape(-1, 3)
raw = decode('featureCoord').reshape(-1, 3)
normal = decode('normal').reshape(-1, 3)
tri = decode('index').reshape(-1, 3)
before = position.copy()
ax, sy, sz = np.abs(raw[:, 0]), raw[:, 1], raw[:, 2]

# Front-ray visibility excludes the inward eye and oral returns, which also
# have semantic coordinates inside the same broad box. It is an offline test.
candidate = np.flatnonzero((ax > .16) & (ax < .70) & (sy > 6.60) & (sy < 7.245) & (sz > 1.04))
a, b, c = [position[tri[:, k]].astype(float) for k in range(3)]
v0, v1 = b-a, c-a
denom = v0[:, 0]*v1[:, 1]-v0[:, 1]*v1[:, 0]
valid = np.abs(denom) > 1e-12
exterior = []
for i in candidate:
    q = position[i]-a
    u = np.divide(q[:, 0]*v1[:, 1]-q[:, 1]*v1[:, 0], denom, out=np.zeros(len(tri)), where=valid)
    v = np.divide(v0[:, 0]*q[:, 1]-v0[:, 1]*q[:, 0], denom, out=np.zeros(len(tri)), where=valid)
    hit = valid & (u >= -1e-5) & (v >= -1e-5) & (u+v <= 1.00001)
    front = np.max((a[:, 2]+u*v0[:, 2]+v*v1[:, 2])[hit], initial=-1)
    if position[i, 2] >= front-2e-5:
        exterior.append(i)
exterior = np.array(exterior)
mask = smooth(.16, .265, ax)*(1-smooth(.53, .70, ax))
mask *= smooth(6.60, 6.84, sy)*(1-smooth(7.12, 7.245, sy))

# Locally fit one continuous cheek sheet, using a quadratic physical surface.
# This removes small alternating ridges in the old sculpt, without smoothing
# the nose or eye loops. Only Z changes: face width and all heights stay exact.
fair = np.zeros(len(position))
for i in exterior:
    same = exterior[np.sign(raw[exterior, 0]) == np.sign(raw[i, 0])]
    xy = (position[same, :2]-position[i, :2]).astype(float)/.018
    d2 = np.sum(xy*xy, axis=1)
    use = d2 < 4
    xy, d2, same = xy[use], d2[use], same[use]
    x, y = xy.T
    matrix = np.array([np.ones(len(x)), x, y, x*x, x*y, y*y]).T
    weights = np.exp(-d2*1.5)
    fit = np.linalg.lstsq(matrix*np.sqrt(weights[:, None]), position[same, 2]*np.sqrt(weights), rcond=None)[0]
    fair[i] = np.clip(fit[0]-position[i, 2], -.0025, .0025)

support = .0072*np.exp(-((ax-.405)/.235)**2-((sy-7.105)/.22)**2)
delta = np.zeros(len(position))
delta[exterior] = mask[exterior]*(.85*fair[exterior]+support[exterior])
position[:, 2] += delta

def area_normals(points):
    points = points.astype(float)
    cross = np.cross(points[tri[:, 1]]-points[tri[:, 0]], points[tri[:, 2]]-points[tri[:, 0]])
    output = np.zeros_like(points)
    for k in range(3):
        np.add.at(output, tri[:, k], cross)
    return output/np.maximum(np.linalg.norm(output, axis=1)[:, None], 1e-15)

# Rotate authored normals by the actual local surface change, as used by the
# ten runtime shape controls. Neighbour normals change only where faces moved.
old, new = area_normals(before), area_normals(position)
axis = np.cross(old, new)
cosine = np.clip(np.sum(old*new, axis=1), -1, 1)
changed = np.linalg.norm(old-new, axis=1) > 1e-10
n = normal.astype(float)
n += np.cross(axis, n)+np.cross(axis, np.cross(axis, n))/np.maximum(1+cosine[:, None], 1e-10)
n /= np.maximum(np.linalg.norm(n, axis=1)[:, None], 1e-15)
normal[changed] = n[changed]

# The shallow eight-ray legacy AO is stale after moving its cheek surface.
# Clear it only on modified exterior vertices; preserve cavities and lid edge.
recess = decode('recessWeight')
cleared = (delta > .0001) & (recess > 0)
recess[cleared] = 0

for key, values in [('position', position), ('normal', normal), ('recessWeight', recess)]:
    part[key]['data'] = base64.b64encode(values.astype('<f4').tobytes()).decode()
packed['female']['reviewedAssetSha256'] = hashlib.sha256(json.dumps(packed['female']['parts'], separators=(',', ':')).encode()).hexdigest()
(ROOT/ASSET).write_text(code[:start]+json.dumps(packed, separators=(',', ':'))+code[stop:])
assert np.array_equal(position[:, :2], before[:, :2])
assert np.max(delta) < .009
assert np.isfinite(position).all() and np.isfinite(normal).all()
report = {'base': BASE, 'exteriorVertices': len(exterior), 'movedVertices': int(np.count_nonzero(delta)), 'peakForwardMm': float(np.max(delta)*1000), 'fairingRangeMm': [float(np.min(fair)*1000), float(np.max(fair)*1000)], 'changedNormals': int(np.count_nonzero(changed)), 'clearedStaleCheekRecessVertices': int(np.count_nonzero(cleared)), 'vertices': len(position), 'triangles': len(tri), 'unchangedXY': True, 'runtimeTopologyUnchanged': True}
out = ROOT/'qa/midface-support'
out.mkdir(parents=True, exist_ok=True)
(out/'sculpt-report.json').write_text(json.dumps(report, indent=2)+'\n')
print(json.dumps(report, indent=2))
