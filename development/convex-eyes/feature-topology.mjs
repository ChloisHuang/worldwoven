/** Original folded nose/lip strips within the existing skin topology.
 * The original x/y grid is a parameter domain, not the final face projection:
 * nose-base rows turn underneath the tip and lip rows roll into a real opening.
 */
import * as THREE from 'three';
import {coherentFaceSurface} from './face-sculpt.mjs';
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),mix=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
function curve(xs,vs,t){
 let i=0;while(i<xs.length-2&&t>xs[i+1])i++;
 const a=Math.max(0,i-1),b=Math.min(xs.length-1,i+2),h=xs[i+1]-xs[i],u=clamp((t-xs[i])/h),m0=(vs[i+1]-vs[a])/(xs[i+1]-xs[a]),m1=(vs[b]-vs[i])/(xs[b]-xs[i]);
 return (2*u**3-3*u*u+1)*vs[i]+(u**3-2*u*u+u)*h*m0+(-2*u**3+3*u*u)*vs[i+1]+(u**3-u*u)*h*m1;
}
const NX=[0,.004,.0085,.014,.020,.029];
const NOSE=[
 [1.534,[1.534,1.534,1.534,1.534,1.534,1.534],[.081,.081,.080,.078,.075,.071]],
 [1.539,[1.539,1.539,1.540,1.542,1.541,1.539],[.080,.081,.081,.082,.074,.071]],
 [1.544,[1.542,1.543,1.544,1.546,1.546,1.544],[.085,.086,.086,.089,.073,.074]],
 [1.548,[1.546,1.547,1.548,1.550,1.549,1.548],[.096,.097,.095,.092,.074,.074]],
 [1.551,[1.550,1.550,1.551,1.552,1.551,1.551],[.101,.1005,.0975,.090,.074,.074]],
 [1.554,[1.552,1.552,1.553,1.554,1.554,1.554],[.102,.101,.096,.086,.074,.073]],
 [1.558,[1.558,1.558,1.558,1.558,1.558,1.558],[.099,.097,.090,.080,.073,.072]],
 [1.565,[1.565,1.565,1.565,1.565,1.565,1.565],[.092,.090,.084,.074,.071,.071]],
 [1.582,[1.582,1.582,1.582,1.582,1.582,1.582],[.085,.083,.076,.070,.068,.069]],
 [1.601,[1.601,1.601,1.601,1.601,1.601,1.601],[.077,.077,.076,.073,.070,.064]]
];
const NY=NOSE.map(r=>r[0]);
const MOUTH_Y=[-.019,-.012,-.0085,-.0038,-.0005,.0005,.0037,.0066,.011,.016];
const MOUTH_Z=[.0745,.075,.081,.0855,.0820,.0825,.0858,.084,.084,.081];
function mappedSkin(x,y,masc,traits){
 const f=(xx,yy)=>coherentFaceSurface(xx,yy,masc,traits),base=f(x,y);let py=y,pz=base;
 const ns=traits?.noseSize??1,nw=traits?.noseWidth??1,nx=Math.abs(x/nw),ny=1.554+(y-1.554)/ns;
 if(nx<.029&&ny>1.534&&ny<1.601){
  const weight=(1-smooth(.021,.029,nx))*smooth(1.534,1.539,ny)*(1-smooth(1.592,1.601,ny));
  const ys=NOSE.map(r=>curve(NX,r[1],nx)),zs=NOSE.map(r=>curve(NX,r[2],nx));
  py+=(curve(NY,ys,ny)-ny)*weight*ns;
  pz=mix(base,base+(curve(NY,zs,ny)-f(x,ny))*ns,weight);
  // The shallow paired philtral columns belong to the nose-to-mouth skin.
 }
 const hw=masc?.030:.029,q=Math.abs(x)/hw,dy=y-1.518;
 if(q<1&&dy>-.019&&dy<.016){
  const side=(1-q*q)**1.15,join=smooth(-.019,-.013,dy)*(1-smooth(.010,.016,dy));
  const centreBase=f(0,y),lipScale=dy>0?1.30*(1-.20*Math.exp(-((x/.004)**2))):1.13,target=curve(MOUTH_Y,MOUTH_Z,dy/lipScale);
  pz+=(target-centreBase)*side*join;
  py+=(.0011*q*q-.0006*Math.exp(-((x/.004)**2))+.0005*Math.exp(-(((Math.abs(x)-.012)/.007)**2)))*side*join;
  if(dy>.006&&dy<.016){const columns=Math.exp(-(((Math.abs(x)-.0045)/.0026)**2)),groove=Math.exp(-((x/.0030)**2));pz+=(.0015*columns-.0008*groove)*Math.sin(Math.PI*clamp((dy-.006)/.010))*join;}
 }
 return[x,py,pz];
}
function skinNormal(x,y,masc,traits){
 const e=.00008,a=new THREE.Vector3(...mappedSkin(x+e,y,masc,traits)).sub(new THREE.Vector3(...mappedSkin(x-e,y,masc,traits))),b=new THREE.Vector3(...mappedSkin(x,y+e,masc,traits)).sub(new THREE.Vector3(...mappedSkin(x,y-e,masc,traits)));
 return a.cross(b).normalize();
}
export function applyFeatureTopology(head,{masc,traits,skin}){
 const base=new THREE.Color(skin),upper=base.clone().lerp(new THREE.Color(0x925e5b),.60),lower=base.clone().lerp(new THREE.Color(0x925e5b),.50);
 for(const m of head.children){
  if(!m.isMesh||!(/^(continuous-head|nostril-cavity|closed-soft-mouth)/.test(m.name)))continue;
  const p=m.geometry.attributes.position,colors=[],isSkin=m.name.startsWith('continuous-head');
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),y=p.getY(i),z=p.getZ(i);let point=[x,y,z];
   if(z>.005&&Math.abs(x)<.031&&y>1.499&&y<1.601){
    const f=coherentFaceSurface(x,y,masc,traits),offset=z-f;point=mappedSkin(x,y,masc,traits);
    if(Math.abs(offset)>.00001){const n=skinNormal(x,y,masc,traits);point[0]+=n.x*offset;point[1]+=n.y*offset;point[2]+=n.z*offset;}
   }
   if(!point.every(Number.isFinite))throw new Error('Non-finite folded feature vertex');p.setXYZ(i,...point);
   if(isSkin){
    const hw=masc?.030:.029,q=Math.abs(x)/hw,dy=y-1.518;let c=base;
    if(q<1&&z>.035){const taper=Math.sqrt(1-q*q),height=(dy>=0?.0090:.0095)*taper*(dy>=0?1-.35*Math.exp(-((x/.005)**2)):1),edge=1-smooth(.88,1,Math.abs(dy)/Math.max(height,.000001));c=base.clone().lerp(dy>=0?upper:lower,edge);}
    colors.push(c.r,c.g,c.b);
   }
  }
  if(isSkin)m.geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  m.geometry.computeVertexNormals();m.geometry.computeBoundingBox();m.geometry.computeBoundingSphere();
 }
}
export function mouthOpening(){
 const points=Array.from({length:48},(_,i)=>{const a=i/48*Math.PI*2;return[Math.cos(a)*.0295,1.518+Math.sin(a)*.00035];});
 return{points,minX:-.0295,maxX:.0295,minY:1.51765,maxY:1.51835};
}
export function buildMouthInterior(head,{facialSurface,colors:C}){
 const p=[],ix=[],nu=48,nv=4;
 for(let j=0;j<=nv;j++)for(let i=0;i<=nu;i++){const a=i/nu*Math.PI*2,r=j/nv,x=Math.cos(a)*.0295*r,y=1.518+Math.sin(a)*.00035*r;p.push(x,y,facialSurface(x,y)-.0025*(1-r*r));}
 for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const a=j*(nu+1)+i,b=a+1,c=a+nu+1,d=c+1;ix.push(a,b,c,b,d,c);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(ix);g.computeVertexNormals();const m=new THREE.Mesh(g,{color:new THREE.Color(C.skin).multiplyScalar(.46),isMaterial:false});m.name='closed-soft-mouth';head.add(m);
}
export function neckTransition(x,y,z){
 const t=smooth(1.407,1.480,y),back=smooth(.022,-.035,z),side=smooth(.017,.034,Math.abs(x));
 return[x*(1+.12*t),y+(.018+.052*back)*t,z-(.021+.016*back)*t+.0025*side*t+.006*Math.sin(Math.PI*t)*(1-back)];
}
