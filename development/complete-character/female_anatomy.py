"""Complete native-topology female reconstruction in one anatomical frame.

The previous female cage crowded the front planes: malar +74 mm, lip +89 mm,
chin +81 mm versus a +70 mm nasal root. Here the source's continuous planes
are retained at a uniform human scale, then whole named anatomical volumes
are authored. Reference photographs remain private and are not sampled.
"""
import math
import numpy as np

def clamp(v):return max(0.,min(1.,v))
def smooth(a,b,v):
 t=clamp((v-a)/(b-a));return t*t*(3-2*t)
def bell(v,c,w):return math.exp(-((v-c)/w)**2)
def curve(keys,v):
 if v<=keys[0][0]:return keys[0][1]
 if v>=keys[-1][0]:return keys[-1][1]
 for j,(a,b) in enumerate(zip(keys,keys[1:])):
  if v<=b[0]:
   p=keys[max(0,j-1)];n=keys[min(len(keys)-1,j+2)];t=(v-a[0])/(b[0]-a[0]);d=b[0]-a[0]
   ma=(b[1]-p[1])/(b[0]-p[0]);mb=(n[1]-a[1])/(n[0]-a[0])
   return (2*t**3-3*t*t+1)*a[1]+(t**3-2*t*t+t)*d*ma+(-2*t**3+3*t*t)*b[1]+(t**3-t*t)*d*mb

def native_point(source,config):
 return np.array(source,dtype=float)*np.array(config['scale'])+np.array(config['offset'])

def skin_point(source,config,neck=None):
 sx,sy,sz=source;x,y,z=native_point(source,config);ax=abs(sx)
 # A single continuous centerline defines nasion, bony dorsum, supratip,
 # rounded lobule and columella. Lateral support retains the real alar folds.
 nose=config['nasalProfile'];source_z=curve(nose['sourceCenter'],sy)
 target_z=curve(nose['targetCenterZ'],sy)
 region=smooth(6.76,6.84,sy)*(1-smooth(7.40,7.47,sy))
 lateral=1-smooth(.045,.165,ax)
 anterior=smooth(1.43,1.575,sz)
 z+=(target_z-(source_z*config['scale'][2]+config['offset'][2]))*region*lateral*anterior
 # The upper orbital rim is a volume over a recessed fold. The eyelid edge
 # and its exact spherical globe remain in their native common frame.
 orbit=bell(ax,.32,.185)*smooth(1.25,1.385,sz)
 z+=config['orbitalRimProjection']*bell(sy,7.43,.068)*orbit
 z-=config['orbitalFoldRecess']*bell(sy,7.375,.022)*orbit
 # Preserve a full vermilion lower roll without projecting the whole muzzle.
 z+=config['lowerLipProjection']*bell(sy,6.55,.048)*bell(sx,0,.17)*smooth(1.50,1.565,sz)
 # Ear contact remains ordinary human anatomy; the outer helix is modestly
 # tucked in, without changing the cheek or inventing separate ear geometry.
 ear=smooth(.67,.81,ax)*(1-smooth(.74,1.02,sz))*smooth(6.69,6.83,sy)*(1-smooth(7.30,7.44,sy))
 x*=1-config['earTuck']*ear
 p=np.array([x,y,z])
 if neck is not None:
  w=smooth(*config['neckJoinSourceY'],sy)
  posterior=(1-smooth(.20,.64,sz))*(1-smooth(6.45,7.13,sy))
  w*=1-posterior
  p=np.array(neck)*(1-w)+p*w
 return p
