"""One original, continuous malar-to-submandibular field on native topology.

The controls describe whole connected planes, in metres of authored geometry.
They are sculpt decisions, not millimetre measurements inferred from a photo.
The source coordinates, feature rings and render/material pipeline stay fixed.
"""
import numpy as np
from perioral_placement import CONTACT, VERMILION, SUPPORT


def redistribute_cheek(verts, raw, faces, specification):
 displacement=np.zeros((len(raw),3))
 if not specification:return displacement
 adjacency=[set() for _ in raw]
 for face in faces:
  for a,b in zip(face,face[1:]+face[:1]):
   adjacency[a].add(b);adjacency[b].add(a)
 lookup={}
 for i,(x,y,z) in enumerate(raw):
  lookup.setdefault((round(x,5),round(y,5),round(z,5)),[]).append(i)
 def mirrored(original):
  x,y,z=verts[original]
  return {i for sign in [-1,1] for i in lookup.get((round(sign*x,5),round(y,5),round(z,5)),[])}
 # A single joined domain reaches from the anterior zygoma through the cheek
 # and mandibular body into the throat. Two fixed border rings hold its value
 # and tangent; the collar, ears and scalp are outside the domain altogether.
 patch={i for i,(x,y,z) in enumerate(raw) if abs(x)<.68 and 6.04<y<7.20 and z>.55}
 boundary={i for i in patch if adjacency[i]-patch}
 fixed=boundary|{j for i in boundary for j in adjacency[i] if j in patch}
 for i,(x,y,z) in enumerate(raw):
  nose=abs(x)<.21 and y>6.78 and z>1.30
  mouth=abs(x)<.30 and 6.44<y<6.79 and z>1.33
  chin=abs(x)<.34 and y<6.44 and z>1.28
  eye=y>7.12
  if nose or mouth or chin or eye:fixed.add(i)
 for original in CONTACT+VERMILION+SUPPORT:fixed.update(mirrored(original))
 constraints={i:np.zeros(3) for i in fixed if i in patch}
 for control in specification['planes']:
  delta=np.asarray(control['delta'],dtype=float)
  for original in control['sourceVertices']:
   for i in mirrored(original):
    assert i in patch and i not in fixed,(control['name'],original,raw[i])
    constraints[i]=delta*np.array([-1 if raw[i][0]<0 else 1,1,1])
 domain=sorted(patch);index={i:j for j,i in enumerate(domain)}
 laplacian=np.zeros((len(domain),len(domain)))
 for i,row in index.items():
  laplacian[row,row]=1
  for j in adjacency[i]:
   if j in index:laplacian[row,index[j]]=-1/len(adjacency[i])
 # Minimise curvature of the displacement over the connected skin, rather
 # than adding isolated bumps or flattening the whole face transversely.
 energy=laplacian.T@laplacian
 free=[i for i in domain if i not in constraints]
 rows=[index[i] for i in free];held=[index[i] for i in constraints]
 values=np.asarray(list(constraints.values()))
 if free:
  displacement[free]=np.linalg.solve(energy[np.ix_(rows,rows)],-energy[np.ix_(rows,held)]@values)
 for i,d in constraints.items():displacement[i]=d
 assert np.isfinite(displacement).all()
 assert np.max(np.linalg.norm(displacement,axis=1))<.012
 assert np.max(np.abs(displacement[list(fixed)]))==0
 print('Cheek continuity:',len(patch),'source vertices;',len(free),'free vertices; peak',round(float(np.max(np.linalg.norm(displacement,axis=1)))*1000,3),'mm')
 return displacement
