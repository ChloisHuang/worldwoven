/** Original adult face study: connected socket, cheek, nose and mouth volume.
 * The reference is the form hierarchy, never a copied likeness or texture.
 */
import * as THREE from 'three';
const mix=(a,b,t)=>a+(b-a)*t,clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const G=(x,y,cx,cy,sx,sy)=>Math.exp(-(((x-cx)/sx)**2)-((y-cy)/sy)**2);
export function faceRings(masc,traits){
 const rs=[[1.472,.005,.012,0,.030],[1.480,.021,.032,0,.027],[1.491,.034,.044,0,.018],[1.507,masc?.050:.047,.061,0,.006],[1.528,masc?.066:.061,.074,0,-.006],[1.550,.080,.081,0,-.011],[1.576,.086,.085,0,-.014],[1.607,.084,.086,0,-.017],[1.638,.079,.080,0,-.018],[1.672,.062,.063,0,-.017],[1.698,.035,.035,0,-.012],[1.714,.001,.001,0,-.009]];
 const width=traits?.jawWidth??1;for(const r of rs){const t=r[0]<1.507?clamp((r[0]-1.472)/.035):clamp((1.560-r[0])/.053);r[1]*=1+(width-1)*t;}return rs;
}
// Fixed adult study after inspecting SGLY 171393: wider pupil separation,
// compact eye-to-nose segment, broad full lips, and a rounded lip/chin profile arc.
// Values are original anatomy, not extracted meshes or a likeness transfer.
function c2Plan(knots,firstSlope=null){
 const n=knots.length,a=new Float64Array(n),pivot=new Float64Array(n),upper=new Float64Array(n);pivot[0]=firstSlope===null?1:2*(knots[1]-knots[0]);upper[0]=firstSlope===null?0:(knots[1]-knots[0])/pivot[0];
 for(let i=1;i<n-1;i++){const left=knots[i]-knots[i-1],right=knots[i+1]-knots[i];a[i]=left;pivot[i]=2*(left+right)-left*upper[i-1];upper[i]=right/pivot[i];}pivot[n-1]=1;
 return{curve(values){
  const d=new Float64Array(n),second=new Float64Array(n);if(firstSlope!==null)d[0]=6*((values[1]-values[0])/(knots[1]-knots[0])-firstSlope)/pivot[0];
  for(let i=1;i<n-1;i++){const left=knots[i]-knots[i-1],right=knots[i+1]-knots[i],rhs=6*((values[i+1]-values[i])/right-(values[i]-values[i-1])/left);d[i]=(rhs-a[i]*d[i-1])/pivot[i];}
  for(let i=n-2;i>=0;i--)second[i]=d[i]-upper[i]*second[i+1];
  return t=>{let j=0;if(t<knots[0]){const h=knots[1]-knots[0],slope=(values[1]-values[0])/h-h*(2*second[0]+second[1])/6;return values[0]+slope*(t-knots[0]);}if(t>knots[n-1]){const h=knots[n-1]-knots[n-2],slope=(values[n-1]-values[n-2])/h+h*(second[n-2]+2*second[n-1])/6;return values[n-1]+slope*(t-knots[n-1]);}while(j<n-2&&t>knots[j+1])j++;const h=knots[j+1]-knots[j],u=(knots[j+1]-t)/h,v=(t-knots[j])/h;return u*values[j]+v*values[j+1]+((u*u*u-u)*second[j]+(v*v*v-v)*second[j+1])*h*h/6;};
 }};
}
const OUTLINE_PLAN=c2Plan(faceRings(false,null).map(r=>r[0])),outlineCache=new Map();
function outlineAt(y,masc,traits){
 const key=String(masc)+':'+String(traits?.jawWidth??1);let curves=outlineCache.get(key);
 if(!curves){const rows=faceRings(masc,traits);curves=[1,2,4].map(k=>OUTLINE_PLAN.curve(rows.map(r=>r[k])));if(outlineCache.size>=16)outlineCache.delete(outlineCache.keys().next().value);outlineCache.set(key,curves);}
 const yy=clamp(y,1.472,1.714);return[yy,curves[0](yy),curves[1](yy),0,curves[2](yy)];
}
// One shared bicubic front surface. Adjacent rows carry the orbital rim into
// the nose root, upper cheek, muzzle and chin rather than summing local bumps.
const FACE_X=[0,.008,.017,.029,.044,.059,.074,.086];
const X_PLAN=c2Plan(FACE_X,0);
const FACE_ROWS=[
 [1.480,[.066,.065,.061,.050,.034,.021,.007,0]],
 [1.491,[.074,.0735,.071,.066,.053,.032,.012,0]],
 [1.503,[.075,.075,.074,.070,.059,.039,.017,0]],
 [1.511,[.084,.083,.079,.074,.064,.047,.025,.004]],
 [1.519,[.081,.0805,.078,.075,.066,.050,.030,.007]],
 [1.527,[.085,.083,.079,.075,.067,.054,.034,.009]],
 [1.536,[.081,.080,.077,.071,.071,.059,.038,.011]],
 [1.544,[.082,.087,.085,.074,.073,.063,.041,.012]],
 [1.554,[.099,.092,.081,.073,.077,.067,.044,.014]],
 [1.569,[.088,.083,.074,.071,.078,.068,.044,.013]],
 [1.585,[.082,.079,.071,.069,.074,.063,.038,.011]],
 [1.601,[.077,.076,.072,.064,.064,.056,.036,.009]],
 [1.616,[.079,.079,.078,.077,.075,.063,.039,.011]],
 [1.637,[.079,.079,.078,.074,.068,.057,.039,.012]],
 [1.665,[.068,.068,.067,.064,.057,.044,.025,.004]]
].map(([y,z])=>[y,X_PLAN.curve(z)]);
const Y_PLAN=c2Plan(FACE_ROWS.map(([y])=>y));
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*t*(t*(t*6-15)+10);};
const frontNet=(x,y)=>Y_PLAN.curve(FACE_ROWS.map(([,row])=>row(Math.abs(x))))(y);
export function coherentFaceSurface(x,y,masc=false,traits=null){
 const r=outlineAt(y,masc,traits),q=Math.abs(x/r[1]),c=Math.sqrt(Math.max(0,1-q*q)),base=r[4]+r[2]*c;
 const blend=(1-smooth(.83,.995,q))*smooth(1.472,1.480,y)*(1-smooth(1.665,1.704,y));
 let z=frontNet(x,y);const n=traits?.noseSize??1,w=traits?.noseWidth??1,s=traits?.socketDepth??1;
 if(n!==1||w!==1){const region=(1-smooth(.018,.030,Math.abs(x)))*smooth(1.530,1.544,y)*(1-smooth(1.603,1.620,y)),root=frontNet(.026,y),shaped=root+(frontNet(x/w,1.554+(y-1.554)/n)-root)*n;z=mix(z,shaped,region);}
 if(s!==1)z-=.006*(s-1)*(G(x,y,.044*-1,1.601,.022,.012)+G(x,y,.044,1.601,.022,.012));
 return mix(base,z,blend);
}
export function buildCoherentHead(head,{masc,traits,color}){
 const angles=[],heights=[];
 // Keep a bounded grid while concentrating samples where the nose openings,
 // lips and orbital boundaries require curvature. The back needs fewer rows.
 for(const[a,b,n]of[[-Math.PI,-.85,32],[-.85,-.30,16],[-.30,.30,32],[.30,.85,16],[.85,Math.PI,32]])for(let i=0;i<n;i++)angles.push(mix(a,b,i/n));angles.push(Math.PI);
 for(const[a,b,n]of[[1.472,1.504,14],[1.504,1.532,28],[1.532,1.540,6],[1.540,1.565,24],[1.565,1.627,28],[1.627,1.714,18]])for(let i=0;i<n;i++)heights.push(mix(a,b,i/n));heights.push(1.714);
 const positions=[],indices=[];
 for(const y of heights){
  const r=outlineAt(y,masc,traits);
  for(const a of angles){const x=r[1]*Math.sin(a),z=Math.cos(a)>0?coherentFaceSurface(x,y,masc,traits):r[4]+r[2]*Math.cos(a);positions.push(x,y,z);}
 }
 const stride=angles.length;for(let j=0;j<heights.length-1;j++)for(let i=0;i<stride-1;i++){const a=j*stride+i,b=a+1,c=a+stride,d=c+1;indices.push(a,b,c,b,d,c);}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
 const mesh=new THREE.Mesh(geometry,{color:new THREE.Color(color),isMaterial:false});mesh.name='continuous-head-jaw-cheeks-nose';head.add(mesh);
}
function grid(g,name,nu,nv,fn,color){const p=[],ix=[];for(let j=0;j<=nv;j++)for(let i=0;i<=nu;i++)p.push(...fn(i/nu,j/nv));for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const a=j*(nu+1)+i,b=a+1,c=a+nu+1,d=c+1;ix.push(a,b,c,b,d,c);}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setIndex(ix);geo.computeVertexNormals();const m=new THREE.Mesh(geo,{color:new THREE.Color(color),isMaterial:false});m.name=name;g.add(m);return m;}
export function buildCoherentMouth(h,{masc,facialSurface,colors:C}){
 const hw=masc?.0300:.0290;
 const seam=u=>1.519-.0014*Math.sin(Math.PI*u)+.0005*Math.cos(4*Math.PI*u);
 for(const up of[true,false]){
  grid(h,up?'upper-lip':'lower-lip',32,8,(u,v)=>{const x=(u*2-1)*hw,taper=Math.sin(Math.PI*u)**.82,bow=1-.25*Math.exp(-((x/.0035)**2)),height=up?.0085*bow:.0110,y=seam(u)+(up?1:-1)*height*taper*v,z=facialSurface(x,y)+.00045;return[x,y,z];},new THREE.Color(C.skin).lerp(new THREE.Color(0x925e5b),up?.46:.36).getHex());

 }
 grid(h,'closed-soft-mouth',32,2,(u,v)=>{const x=(u*2-1)*hw,taper=Math.sin(Math.PI*u),y=seam(u)+(v-.5)*.00065*taper;return[x,y,facialSurface(x,y)+.00070];},new THREE.Color(C.skin).multiplyScalar(.54).getHex());
}
