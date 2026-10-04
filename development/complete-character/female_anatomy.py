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

def eye_transform(point,source,config):
 side=-1 if source[0]<0 else 1
 e=config.get('ocularFrame',{});center=native_point([side*.30775,7.281,1.24535],config)
 width=config.get('facialWidth',1.);center[0]*=width
 scale=np.array(e.get('scale',[1,1,1]));q=(np.array(point)-center)*scale
 angle=side*e.get('canthalTilt',0.);c,s=math.cos(angle),math.sin(angle)
 q=np.array([q[0]*c-q[1]*s,q[0]*s+q[1]*c,q[2]])
 return center+q+np.array([side*e.get('outward',0.),e.get('raise',0.),0.])

def eye_point(source,config):
 p=native_point(source,config);p[0]*=config.get('facialWidth',1.)
 return eye_transform(p,source,config)

def eye_normal(normal,source,config):
 side=-1 if source[0]<0 else 1;e=config.get('ocularFrame',{});n=np.array(normal)/np.array(config['scale'])
 n[0]/=config.get('facialWidth',1.);n/=np.array(e.get('scale',[1,1,1]))
 angle=side*e.get('canthalTilt',0.);c,s=math.cos(angle),math.sin(angle)
 return np.array([n[0]*c-n[1]*s,n[0]*s+n[1]*c,n[2]])

def shape_eyelid_band(point,source,config):
 specification=config.get('eyelidShape')
 if not specification:return point
 sx,sy,sz=source;ax=abs(sx);side=-1 if sx<0 else 1
 e=config['ocularFrame'];width=config.get('facialWidth',1.)
 center=native_point([side*.30775,7.281,1.24535],config);center[0]*=width
 center+=np.array([side*e.get('outward',0.),e.get('raise',0.),0.])
 axes=np.array(config['scale'])*np.array([width,1,1])*np.array(e.get('scale',[1,1,1]))
 angle=side*e.get('canthalTilt',0.);c,s=math.cos(angle),math.sin(angle)
 rotation=np.array([[c,-s,0],[s,c,0],[0,0,1]])
 local=(rotation.T@(np.array(point)-center))/axes;radius=np.linalg.norm(local)
 # Both actual canthal columns, across all thickness/return layers, remain
 # fixed. The source eyelid is a thickness band, not one mesh boundary loop.
 along=smooth(.205,.239,ax)*(1-smooth(.3995,.4335,ax))
 support=along*(1-smooth(.185,.270,radius))*smooth(1.20,1.30,sz)
 upper=smooth(7.265,7.315,sy)
 theta=(specification['lowerRotation']*(1-upper)+specification['upperRotation']*upper)*support
 ct,st=math.cos(theta),math.sin(theta);old_y,old_z=local[1:]
 local[1]=old_y*ct-old_z*st;local[2]=old_y*st+old_z*ct
 result=center+rotation@(local*axes)
 # Form the upper tarsal support outside the actual globe-intersection band.
 # This is a skin volume; no extra dark ring, eyelash card or white-eye mesh.
 above=sy-curve(specification['upperRimSource'],ax)
 tarsal=along*smooth(.176,.186,radius)*(1-smooth(.235,.285,radius))
 tarsal*=smooth(.007,.014,above)*bell(above,.027,.021)
 result[2]+=specification['tarsalProjection']*tarsal
 return result

def skin_point(source,config,neck=None):
 sx,sy,sz=source;x,y,z=native_point(source,config);ax=abs(sx)
 facial=smooth(6.12,6.30,sy)*(1-smooth(7.44,7.80,sy))*smooth(.45,1.02,sz)
 x*=1+(config.get('facialWidth',1.)-1)*facial
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
 z-=config.get('muzzleRetraction',0.)*bell(sy,6.63,.21)*bell(sx,0,.24)*smooth(1.39,1.54,sz)
 # Ear contact remains ordinary human anatomy; the outer helix is modestly
 # tucked in, without changing the cheek or inventing separate ear geometry.
 ear=smooth(.67,.81,ax)*(1-smooth(.74,1.02,sz))*smooth(6.69,6.83,sy)*(1-smooth(7.30,7.44,sy))
 x*=1-config['earTuck']*ear
 p=np.array([x,y,z])
 if config.get('ocularFrame'):
  w=smooth(.10,.165,ax)*(1-smooth(.475,.64,ax))*smooth(7.08,7.21,sy)*(1-smooth(7.40,7.55,sy))*smooth(1.15,1.30,sz)
  p=p*(1-w)+eye_transform(p,source,config)*w
 p=shape_eyelid_band(p,source,config)
 if neck is not None:
  w=smooth(*config['neckJoinSourceY'],sy)
  posterior=(1-smooth(.20,.64,sz))*(1-smooth(6.45,7.13,sy))
  w*=1-posterior
  p=np.array(neck)*(1-w)+p*w
 # Eye-distance-aligned contour study: local mid-cheek reduction transitions
 # into a retained lower jaw width. Length is authored by native target data.
 lower=config.get('lowerFaceContour')
 if lower:
  lip=smooth(6.45,6.48,sy)*(1-smooth(6.73,6.78,sy))*(1-smooth(.28,.34,ax))*smooth(1.34,1.40,sz)
  lateral=smooth(.16,.36,ax)*smooth(.55,.95,sz)*(1-lip)
  p[0]*=1+(curve(lower['widthBySourceY'],sy)-1)*lateral
  if lower.get('heightBySourceY'):
   p[1]+=curve(lower['heightBySourceY'],sy)*smooth(.65,.99,sz)*(1-lip)
 return p
