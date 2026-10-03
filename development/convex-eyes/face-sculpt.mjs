/** Original adult face study: connected socket, cheek, nose and mouth volume.
 * The reference is the form hierarchy, never a copied likeness or texture.
 */
import * as THREE from 'three';
const mix=(a,b,t)=>a+(b-a)*t,clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const G=(x,y,cx,cy,sx,sy)=>Math.exp(-(((x-cx)/sx)**2)-((y-cy)/sy)**2);
function spline(a,t){const j=Math.min(a.length-2,Math.floor(t)),u=t-j;const p0=a[Math.max(0,j-1)],p1=a[j],p2=a[j+1],p3=a[Math.min(a.length-1,j+2)];return p1.map((v,k)=>.5*((2*v)+(-p0[k]+p2[k])*u+(2*p0[k]-5*v+4*p2[k]-p3[k])*u*u+(-p0[k]+3*p1[k]-3*p2[k]+p3[k])*u*u*u));}
export function faceRings(masc,traits){
 const rs=[[1.455,.012,.022,0,.004],[1.463,.028,.039,0,.015],[1.479,masc?.043:.039,.056,0,.008],[1.500,masc?.061:.056,.067,0,-.003],[1.526,.075,.071,0,-.004],[1.552,.084,.075,0,-.004],[1.577,.086,.076,0,-.005],[1.610,.084,.076,0,-.005],[1.643,.080,.071,0,-.006],[1.671,.063,.060,0,-.007],[1.695,.037,.037,0,-.008],[1.707,.001,.001,0,-.008]];
 const width=traits?.jawWidth??1;for(const r of rs){const t=r[0]<1.49?clamp((r[0]-1.455)/.035):clamp((1.55-r[0])/.06);r[1]*=1+(width-1)*t;}return rs;
}
export function coherentFaceDepth(x,y,traits){
 const n=traits?.noseSize??1,w=traits?.noseWidth??1,s=traits?.socketDepth??1;
 return .0045*(G(x,y,-.048,1.554,.027,.023)+G(x,y,.048,1.554,.027,.023))
  +.0048*(G(x,y,-.038,1.611,.026,.010)+G(x,y,.038,1.611,.026,.010))
  -.0075*s*(G(x,y,-.040,1.591,.022,.012)+G(x,y,.040,1.591,.022,.012))
  +.0028*(G(x,y,-.037,1.575,.025,.009)+G(x,y,.037,1.575,.025,.009))
  +.009*n*G(x,y,0,1.577,.0075*w,.029)
  +.0165*n*G(x,y,0,1.550,.012*w,.012*n)
  +.006*n*(G(x,y,-.011*w,1.546,.006*w,.006)+G(x,y,.011*w,1.546,.006*w,.006))
  -.0020*(G(x,y,-.014*w,1.541,.005*w,.005)+G(x,y,.014*w,1.541,.005*w,.005))
  +.0070*G(x,y,0,1.527,.026,.018)
  +.0019*(G(x,y,-.004,1.529,.0033,.009)+G(x,y,.004,1.529,.0033,.009))
  -.0010*G(x,y,0,1.528,.0028,.010)
  +.0035*G(x,y,0,1.483,.021,.013)-.0008*G(x,y,0,1.502,.019,.005);
}
export function coherentFaceSurface(x,y,masc=false,traits=null){
 const rs=faceRings(masc,traits);let lo=0,hi=rs.length-1;for(let i=0;i<24;i++){const t=(lo+hi)/2;if(spline(rs,t)[0]<y)lo=t;else hi=t;}
 const r=spline(rs,(lo+hi)/2),c=Math.sqrt(Math.max(0,1-(x/r[1])**2));return r[4]+r[2]*c+coherentFaceDepth(x,y,traits)*c**3;
}
function grid(g,name,nu,nv,fn,color){const p=[],ix=[];for(let j=0;j<=nv;j++)for(let i=0;i<=nu;i++)p.push(...fn(i/nu,j/nv));for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const a=j*(nu+1)+i,b=a+1,c=a+nu+1,d=c+1;ix.push(a,b,c,b,d,c);}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setIndex(ix);geo.computeVertexNormals();const m=new THREE.Mesh(geo,{color:new THREE.Color(color),isMaterial:false});m.name=name;g.add(m);return m;}
export function buildCoherentMouth(h,{masc,facialSurface,colors:C}){
 const hw=masc?.0260:.0255;
 const seam=u=>1.516-.0014*Math.sin(Math.PI*u)+.0005*Math.cos(4*Math.PI*u);
 for(const up of[true,false]){
  grid(h,up?'upper-lip':'lower-lip',32,8,(u,v)=>{const x=(u*2-1)*hw,taper=Math.sin(Math.PI*u),bow=1-.25*Math.exp(-((x/.0035)**2)),height=up?.0062*bow:.0075,y=seam(u)+(up?1:-1)*height*taper*v,z=facialSurface(x,y)+.0004+taper*(.0026*(1-v)+(up?.0017:.0028)*Math.sin(Math.PI*v));return[x,y,z];},new THREE.Color(C.skin).lerp(new THREE.Color(0x925e5b),up?.46:.36).getHex());

 }
 grid(h,'closed-soft-mouth',32,2,(u,v)=>{const x=(u*2-1)*hw,taper=Math.sin(Math.PI*u),y=seam(u)+(v-.5)*.00065*taper;return[x,y,facialSurface(x,y)+.00065+.0027*taper];},new THREE.Color(C.skin).multiplyScalar(.54).getHex());
}
export function shadeFaceSurface(h,skin){
 const m=h.getObjectByName('continuous-head-jaw-cheeks-nose'),p=m.geometry.attributes.position,colors=[];
 const base=new THREE.Color(skin),warm=new THREE.Color(skin).lerp(new THREE.Color(0xb76c68),.16),socket=new THREE.Color(skin).multiplyScalar(.86);
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i),front=clamp((z-.01)/.055);
  const cheeks=(G(x,y,-.050,1.561,.024,.019)+G(x,y,.050,1.561,.024,.019))*front;
  const under=(G(x,y,-.037,1.584,.021,.009)+G(x,y,.037,1.584,.021,.009))*front;
  const brow=(G(x,y,-.037,1.602,.024,.006)+G(x,y,.037,1.602,.024,.006))*front;
  const highlight=G(x,y,0,1.573,.007,.032)*front;
  const c=base.clone().lerp(warm,cheeks*.46+under*.18).lerp(socket,brow*.4).multiplyScalar(1+highlight*.045);colors.push(c.r,c.g,c.b);
 }
 m.geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
}
