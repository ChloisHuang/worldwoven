/** Original adult face study: connected socket, cheek, nose and mouth volume.
 * The reference is the form hierarchy, never a copied likeness or texture.
 */
import * as THREE from 'three';
const mix=(a,b,t)=>a+(b-a)*t,clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const G=(x,y,cx,cy,sx,sy)=>Math.exp(-(((x-cx)/sx)**2)-((y-cy)/sy)**2);
function spline(a,t){const j=Math.min(a.length-2,Math.floor(t)),u=t-j;const p0=a[Math.max(0,j-1)],p1=a[j],p2=a[j+1],p3=a[Math.min(a.length-1,j+2)];return p1.map((v,k)=>.5*((2*v)+(-p0[k]+p2[k])*u+(2*p0[k]-5*v+4*p2[k]-p3[k])*u*u+(-p0[k]+3*p1[k]-3*p2[k]+p3[k])*u*u*u));}
export function faceRings(masc,traits){
 const rs=[[1.455,.010,.024,0,.010],[1.461,.022,.035,0,.016],[1.474,.034,.050,0,.017],[1.487,masc?.047:.044,.060,0,.010],[1.502,masc?.063:.058,.067,0,.001],[1.526,.075,.071,0,-.004],[1.552,.084,.075,0,-.004],[1.577,.086,.076,0,-.005],[1.610,.084,.076,0,-.005],[1.643,.080,.071,0,-.006],[1.671,.063,.060,0,-.007],[1.695,.037,.037,0,-.008],[1.707,.001,.001,0,-.008]];
 const width=traits?.jawWidth??1;for(const r of rs){const t=r[0]<1.49?clamp((r[0]-1.455)/.035):clamp((1.55-r[0])/.06);r[1]*=1+(width-1)*t;}return rs;
}
// Fixed adult study after inspecting SGLY 171393: wider pupil separation,
// longer eye-to-nose segment, broad full lips, and a short lip/chin profile arc.
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
// One shared bicubic front surface. Adjacent rows carry the orbital rim into
// the nose root, upper cheek, muzzle and chin rather than summing local bumps.
const FACE_X=[0,.008,.018,.030,.0435,.057,.070,.083];
const X_PLAN=c2Plan(FACE_X,0);
const FACE_ROWS=[
 [1.474,[.077,.076,.072,.060,.044,.026,.012,0]],
 [1.487,[.0765,.076,.075,.070,.057,.040,.020,0]],
 [1.500,[.0788,.0785,.0775,.0745,.064,.048,.026,0]],
 [1.514,[.0793,.0790,.078,.075,.066,.050,.030,.010]],
 [1.529,[.0790,.0785,.076,.073,.067,.054,.032,.012]],
 [1.536,[.0845,.0828,.077,.073,.067,.058,.041,.016]],
 [1.544,[.0910,.0868,.0775,.072,.069,.061,.047,.020]],
 [1.556,[.0870,.0828,.0765,.071,.069,.064,.052,.023]],
 [1.577,[.0825,.0798,.0735,.068,.069,.063,.047,.021]],
 [1.594,[.079,.076,.069,.062,.060,.056,.044,.017]],
 [1.614,[.077,.0765,.075,.072,.069,.063,.044,.021]],
 [1.640,[.075,.075,.074,.071,.066,.058,.043,.017]],
 [1.665,[.060,.060,.059,.055,.047,.036,.020,0]]
].map(([y,z])=>[y,X_PLAN.curve(z)]);
const Y_PLAN=c2Plan(FACE_ROWS.map(([y])=>y));
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*t*(t*(t*6-15)+10);};
const frontNet=(x,y)=>Y_PLAN.curve(FACE_ROWS.map(([,row])=>row(Math.abs(x))))(y);
export function coherentFaceSurface(x,y,masc=false,traits=null){
 const rs=faceRings(masc,traits);let lo=0,hi=rs.length-1;for(let i=0;i<24;i++){const t=(lo+hi)/2;if(spline(rs,t)[0]<y)lo=t;else hi=t;}
 const r=spline(rs,(lo+hi)/2),q=Math.abs(x/r[1]),c=Math.sqrt(Math.max(0,1-q*q)),base=r[4]+r[2]*c;
 const blend=(1-smooth(.83,.995,q))*smooth(1.455,1.474,y)*(1-smooth(1.665,1.696,y));
 let z=frontNet(x,y);const n=traits?.noseSize??1,w=traits?.noseWidth??1,s=traits?.socketDepth??1;
 if(n!==1||w!==1){const region=(1-smooth(.018,.030,Math.abs(x)))*smooth(1.518,1.531,y)*(1-smooth(1.599,1.616,y)),root=frontNet(.026,y),shaped=root+(frontNet(x/w,1.542+(y-1.542)/n)-root)*n;z=mix(z,shaped,region);}
 if(s!==1)z-=.006*(s-1)*(G(x,y,-.0435,1.594,.022,.012)+G(x,y,.0435,1.594,.022,.012));
 return mix(base,z,blend);
}
export function buildCoherentHead(head,{masc,traits,color}){
 const rings=faceRings(masc,traits),angles=[],heights=[];
 // Keep a bounded grid while concentrating samples where the nose openings,
 // lips and orbital boundaries require curvature. The back needs fewer rows.
 for(const[a,b,n]of[[-Math.PI,-.85,32],[-.85,-.30,16],[-.30,.30,32],[.30,.85,16],[.85,Math.PI,32]])for(let i=0;i<n;i++)angles.push(mix(a,b,i/n));angles.push(Math.PI);
 for(const[a,b,n]of[[1.455,1.480,10],[1.480,1.535,28],[1.535,1.555,20],[1.555,1.620,26],[1.620,1.707,18]])for(let i=0;i<n;i++)heights.push(mix(a,b,i/n));heights.push(1.707);
 const positions=[],indices=[];
 for(const y of heights){
  let lo=0,hi=rings.length-1;for(let i=0;i<24;i++){const t=(lo+hi)/2;if(spline(rings,t)[0]<y)lo=t;else hi=t;}const r=spline(rings,(lo+hi)/2);
  for(const a of angles){const x=r[1]*Math.sin(a),z=Math.cos(a)>0?coherentFaceSurface(x,y,masc,traits):r[4]+r[2]*Math.cos(a);positions.push(x,y,z);}
 }
 const stride=angles.length;for(let j=0;j<heights.length-1;j++)for(let i=0;i<stride-1;i++){const a=j*stride+i,b=a+1,c=a+stride,d=c+1;indices.push(a,b,c,b,d,c);}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
 const mesh=new THREE.Mesh(geometry,{color:new THREE.Color(color),isMaterial:false});mesh.name='continuous-head-jaw-cheeks-nose';head.add(mesh);
}
function grid(g,name,nu,nv,fn,color){const p=[],ix=[];for(let j=0;j<=nv;j++)for(let i=0;i<=nu;i++)p.push(...fn(i/nu,j/nv));for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const a=j*(nu+1)+i,b=a+1,c=a+nu+1,d=c+1;ix.push(a,b,c,b,d,c);}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setIndex(ix);geo.computeVertexNormals();const m=new THREE.Mesh(geo,{color:new THREE.Color(color),isMaterial:false});m.name=name;g.add(m);return m;}
export function buildCoherentMouth(h,{masc,facialSurface,colors:C}){
 const hw=masc?.0315:.0305;
 const seam=u=>1.504-.0014*Math.sin(Math.PI*u)+.0005*Math.cos(4*Math.PI*u);
 for(const up of[true,false]){
  grid(h,up?'upper-lip':'lower-lip',32,8,(u,v)=>{const x=(u*2-1)*hw,taper=Math.sin(Math.PI*u)**.82,bow=1-.25*Math.exp(-((x/.0035)**2)),height=up?.0085*bow:.0110,y=seam(u)+(up?1:-1)*height*taper*v,z=facialSurface(x,y)+.00045;return[x,y,z];},new THREE.Color(C.skin).lerp(new THREE.Color(0x925e5b),up?.46:.36).getHex());

 }
 grid(h,'closed-soft-mouth',32,2,(u,v)=>{const x=(u*2-1)*hw,taper=Math.sin(Math.PI*u),y=seam(u)+(v-.5)*.00065*taper;return[x,y,facialSurface(x,y)+.00070];},new THREE.Color(C.skin).multiplyScalar(.54).getHex());
}
