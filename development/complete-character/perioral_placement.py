"""Original bounded perioral field on the pinned CC0 topology.

Raw feature coordinates stay immutable. The accepted lip contact is moved as
one closure core, with continuous graph-supported transitions into the philtrum,
cheeks and labial fold. This does not reuse plugin code or a reference texture.
"""
import numpy as np

# Original 0-based CC0 source chains, mirrored by exact native coordinates.
CONTACT=[474,473,472,471,470,5362,469,419,418,430,3733,500,
         493,487,481,475,437,444,3707,432,431,429,501]
VERMILION=[455,454,450,456,409,5354,410,411,408,407,3737,402,403,
           3702,404,405,406,480,486,492]
SUPPORT=[362,357,356,355,5334,5364,5340,375,363,368,5339,369,361,
         5338,373,371,370,5335,5336,5337]

def place_perioral(verts, raw, faces, specification):
 displacement=np.zeros((len(raw),3))
 if not specification:return displacement
 source=np.asarray(raw,dtype=float)
 adjacency=[set() for _ in raw]
 for face in faces:
  for a,b in zip(face,face[1:]+face[:1]):adjacency[a].add(b);adjacency[b].add(a)
 lookup={}
 for i,(x,y,z) in enumerate(raw):lookup.setdefault((round(x,5),round(y,5),round(z,5)),[]).append(i)
 patch={i for i,(x,y,z) in enumerate(raw) if abs(x)<.50 and 6.26<y<6.86 and z>.95}
 boundary={i for i in patch if adjacency[i]-patch}
 # A fixed tangent neighborhood prevents an abrupt seam at the patch border.
 fixed=boundary|{j for i in boundary for j in adjacency[i] if j in patch}
 constraints={i:0. for i in fixed}
 def mirrored_indices(original):
  x,y,z=verts[original];found=set()
  for side in [-1,1]:
   found.update(lookup.get((round(side*x,5),round(y,5),round(z,5)),[]))
  return found
 def upper_weight(y):
  t=max(0.,min(1.,(y-6.64)/.06));t=t*t*(3-2*t)
  return 1-(1-specification['upperLipShare'])*t
 for original in VERMILION+SUPPORT:
  for i in mirrored_indices(original):
   assert i in patch and i not in boundary
   constraints[i]=upper_weight(source[i,1])
 for original in CONTACT:
  for i in mirrored_indices(original):
   assert i in patch and i not in boundary
   constraints[i]=1.
 # Actual nasal return and anterior chin anchors, not a low upper-chin ring.
 for original in [312,317,5162]:
  for i in mirrored_indices(original):
   if i in patch:constraints[i]=0.
 unknown=sorted(patch-constraints.keys());index={i:j for j,i in enumerate(unknown)}
 A=np.zeros((len(unknown),len(unknown)));b=np.zeros(len(unknown))
 for i,row in index.items():
  A[row,row]=len(adjacency[i])
  for j in adjacency[i]:
   if j in index:A[row,index[j]]-=1
   else:b[row]+=constraints.get(j,0.)
 weights=np.zeros(len(raw))
 for i,w in constraints.items():weights[i]=w
 if unknown:weights[unknown]=np.linalg.solve(A,b)
 assert np.min(weights)>-1e-9 and np.max(weights)<1+1e-9
 for original in CONTACT:
  assert all(abs(weights[i]-1)<1e-9 for i in mirrored_indices(original))
 displacement[:,1]=weights*specification['raiseY']
 print('Perioral field:',len(patch),'source vertices;',len(unknown),'free weights; contact core moves together')
 return displacement
