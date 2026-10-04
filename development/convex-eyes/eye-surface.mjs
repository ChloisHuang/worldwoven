/** Original, texture-free eye study. Local anatomical metres; face +Z.
 * A single convex globe supports the sclera, iris and pupil. The two skin lids
 * turn from that globe into the existing socket. No other facial shape changes.
 */
import * as THREE from 'three';
const mix=(a,b,t)=>a+(b-a)*t;
function grid(parent,name,nu,nv,fn,color){
 const p=[],ix=[];
 for(let j=0;j<=nv;j++)for(let i=0;i<=nu;i++){const point=fn(i/nu,j/nv);if(!point.every(Number.isFinite))throw new Error(name+': non-finite eye vertex');p.push(...point);}
 for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const a=j*(nu+1)+i,b=a+1,c=a+nu+1,d=c+1;ix.push(a,b,c,b,d,c);}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geometry.setIndex(ix);geometry.computeVertexNormals();
 const mesh=new THREE.Mesh(geometry,{color:new THREE.Color(color),isMaterial:false});mesh.name=name;parent.add(mesh);return mesh;
}
export function eyeLayout({side,masc=false,traits=null,coherent=false}){
 const eye=traits?.eyeSize??1,cx=side*(coherent?(masc?.044:.043):(masc?.040:.038)),cy=coherent?1.601:1.59;
 const hw=(coherent?(masc?.0245:.024):(masc?.022:.0215))*eye,upper=(coherent?(masc?.0059:.0064):(masc?.0072:.009))*eye,lower=(coherent?.0068:(masc?.0055:.0062))*eye;
 return{eye,cx,cy,hw,upper,lower,side,coherent};
}
export function eyeLidBoundary(layout,u,up,outer=false){
 const {eye,cx,cy,hw,upper,lower,side,coherent}=layout,x=cx+(u*2-1)*hw;
 let y=cy+(Math.sin(u*Math.PI)**(coherent?(up?.88:.72):1))*(up?upper:-lower)+side*(x-cx)*(coherent?.10:.08);
 const outward=side>0?u:1-u;
 if(coherent&&!outer&&outward>.58){const t=Math.min(1,(outward-.58)/.42),cover=t*t*(3-2*t),arc=Math.sin(Math.PI*u)**(up?.88:.72);y+=(up?-upper*.65:lower*.55)*arc*cover;}
 const width=(up?(coherent?.0075:.0045):(coherent?.0045:.0030))*eye;
 return[x+(outer&&coherent?(u*2-1)*.0023*eye:0),y+(outer?(up?1:-1)*width*Math.sin(Math.PI*u)**.7:0)];
}
export function buildConvexEye(parent,{side,masc=false,traits=null,facialSurface,colors:C,coherent=false}){
 const layout=eyeLayout({side,masc,traits,coherent}),{eye,cx,cy,hw,upper,lower}=layout;
 const wrapped=coherent;
 // Both eyes fit one convex surface to their actual canthi.
 // A centre tangent cannot represent the strong lateral turn of this face.
 // Sample the original socket: socketDepth still changes globe/lid placement,
 // while eyeSize scales the same opening around its unchanged centre.
 const e=.0001,base=facialSurface(cx,cy),dx=(facialSurface(cx+e,cy)-facialSurface(cx-e,cy))/(2*e),dy=(facialSurface(cx,cy+e)-facialSurface(cx,cy-e))/(2*e);
 const rx=hw*1.25,ry=(coherent?.024:.020)*eye,rz=(coherent?.025:.008)*eye;
 const legacyGlobe=(x,y)=>{const xx=x-cx,yy=y-cy-side*xx*(coherent?.10:.08),t=Math.max(0,Math.min(1,(Math.abs(xx)-.0085*eye)/(hw-.0085*eye))),corner=coherent?t*t*t*(t*(t*6-15)+10):1;return base+(dx*xx+dy*(y-cy))*corner+(coherent?-.0032:.0008)+rz*(Math.sqrt(Math.max(.001,1-(xx/rx)**2-(yy/ry)**2))-.6);};
 let globe=legacyGlobe;
 if(wrapped){
  const axy=eyeLidBoundary(layout,0,true),cxy=eyeLidBoundary(layout,1,true);
  const a=[axy[0],facialSurface(...axy)-.0005],b=[cx,base+.0068],c=[cxy[0],facialSurface(...cxy)-.0005];
  const A=2*(b[0]-a[0]),B=2*(b[1]-a[1]),C=b[0]**2+b[1]**2-a[0]**2-a[1]**2,D=2*(c[0]-a[0]),E=2*(c[1]-a[1]),F=c[0]**2+c[1]**2-a[0]**2-a[1]**2,det=A*E-B*D;
  const gx=(C*E-B*F)/det,gz=(A*F-C*D)/det,r=Math.hypot(a[0]-gx,a[1]-gz);
  globe=(x,y)=>{const yy=y-cy-side*(x-cx)*.10;return gz+Math.sqrt(Math.max(.000001,r*r-(x-gx)**2-r*r*(yy/(.027*eye))**2));};
 }
 const edge=(u,up)=>{const [x,y]=eyeLidBoundary(layout,u,up);return[x,y,globe(x,y)];};
 const eyeWhite=coherent?new THREE.Color(0xe7eaeb).getHex():C.eye;
 const white=grid(parent,'inset-eye-white-'+side,24,8,(u,v)=>{const a=edge(u,false),b=edge(u,true),y=mix(a[1],b[1],v);return[a[0],y,globe(a[0],y)];},eyeWhite);
 if(coherent){const colors=[];for(let j=0;j<=8;j++)for(let i=0;i<=24;i++){const u=i/24,v=j/8,c=new THREE.Color(eyeWhite).multiplyScalar(1-.16*Math.abs(u*2-1)**3-.24*v**3);colors.push(c.r,c.g,c.b);}white.geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));}
 const disk=(name,radius,centerX,centerY,offset,color,nu=24,nv=5)=>grid(parent,name+'-'+side,nu,nv,(u,v)=>{const a=u*Math.PI*2,r=v*radius,x=centerX+Math.cos(a)*r,arc=Math.sin(Math.PI*((x-cx)/hw+1)/2),tilt=side*(x-cx)*(coherent?.10:.08),y=Math.max(cy-lower*arc+tilt,Math.min(cy+upper*arc+tilt,centerY+Math.sin(a)*r));return[x,y,globe(x,y)+offset];},color);
 // The upper lid overlaps the iris, avoiding a fully exposed round bead. The
 // opening itself retains its original size, separation and trait range.
 const iris=disk('iris',(coherent?.0090:.0070)*eye,cx+.0012*eye,cy+.0020*eye,.00025,C.iris),irisColors=[];
 for(let j=0;j<=5;j++)for(let i=0;i<=24;i++){
  const a=i/24*Math.PI*2,r=j/5,c=new THREE.Color(C.iris).multiplyScalar((1-.30*Math.max(0,(r-.72)/.28))*(1+.22*Math.max(0,-Math.sin(a))*r-.18*Math.max(0,Math.sin(a))*r));irisColors.push(c.r,c.g,c.b);
 }
 iris.geometry.setAttribute('color',new THREE.Float32BufferAttribute(irisColors,3));
 disk('pupil',.0028*eye,cx+.0012*eye,cy+.0020*eye,.00045,C.pupil,16,3);
 if(!coherent)disk('eye-catchlight',.0012*eye,cx-.0016*eye,cy+.0031*eye,.00065,0xfff7e5,12,2);
 for(const up of[true,false]){
  const width=(up?(coherent?.0075:.0045):(coherent?.0045:.0030))*eye;
  const lid=grid(parent,'eyelid-'+(up?'upper':'lower')+'-'+side,24,5,(u,v)=>{
   const p=edge(u,up),outer=eyeLidBoundary(layout,u,up,true),taper=Math.pow(Math.sin(Math.PI*u),.7),margin=wrapped?(up?.0018:.0007)*taper:0,x=mix(p[0],outer[0],v),y=mix(p[1]-(wrapped&&up?.0005*taper:0),outer[1],v);
   // The outer edge overlaps the socket skin by a submillimetre; the curved
   // intermediate rows give the lid thickness without a separate round tube.
   const roll=wrapped?(up?.0017:.0011):(coherent&&!up?.0015:.0006);
   let z=mix(p[2]+.00045+margin,facialSurface(x,y)+.0002,v)+roll*Math.sin(Math.PI*v)*taper-(coherent&&up?.0012*Math.exp(-(((v-.72)/.17)**2))*taper:0);
   if(wrapped)z=Math.max(z,globe(x,y)+(.00075+.0007*Math.sin(Math.PI*v))*Math.sin(Math.PI*u)**.5*(1-v));
   return[x,y,z];
  },C.skin);
  if(wrapped){const n=lid.geometry.attributes.normal;for(let i=0;i<=24;i++){const [x,y]=eyeLidBoundary(layout,i/24,up,true),h=.00008,nx=(facialSurface(x+h,y)-facialSurface(x-h,y))/(2*h),ny=(facialSurface(x,y+h)-facialSurface(x,y-h))/(2*h),normal=new THREE.Vector3(-nx,-ny,1).normalize();n.setXYZ(5*25+i,normal.x,normal.y,normal.z);}}
  if(coherent){const colors=[];for(let j=0;j<=5;j++)for(let i=0;i<=24;i++){const u=i/24,v=j/5,fold=Math.exp(-(((v-(up?.78:.82))/.16)**2))*Math.sin(Math.PI*u),c=new THREE.Color(C.skin).multiplyScalar(1-(up?.25:.18)*fold);colors.push(c.r,c.g,c.b);}lid.geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));}
  if(wrapped)grid(parent,'eyelid-margin-'+(up?'upper':'lower')+'-'+side,24,3,(u,v)=>{
   const p=edge(u,up),taper=Math.sin(Math.PI*u)**.7,depth=(up?.0018:.0007)*taper;
   return[p[0],p[1]-(up?.0005*taper*v:0),p[2]+.0003+depth*v];
  },new THREE.Color(C.skin).multiplyScalar(up?.77:.93).getHex());
  const color=up?C.brow:new THREE.Color(C.skin).multiplyScalar(.9).getHex();
  grid(parent,'eyelid-'+(up?'lash':'waterline')+'-'+side,24,2,(u,v)=>{
   const p=edge(u,up),taper=Math.sin(Math.PI*u),w=(up?(coherent?.00165:.0012):.00040)*eye*taper;
   const y=p[1]+(up?1:-1)*w*(v-.35)-(wrapped&&up?.0005*taper:0);
   return[p[0],y,globe(p[0],y)+.00055+(wrapped?(up?.0018:.0007)*taper:0)];
  },color);
 }
 if(wrapped){
  // Thin skin at both canthi closes the pointed white ends into the lid seam.
  // It follows the same globe instead of adding an outward cap or dark tube.
  for(const corner of[0,1])grid(parent,'eyelid-canthus-'+corner+'-'+side,4,6,(u,v)=>{
   const t=corner===0?u*(side>0?.052:.035):1-u*(side>0?.035:.052),a=edge(t,false),b=edge(t,true),y=mix(a[1],b[1],v);
   return[a[0],y,globe(a[0],y)+.0007];
  },new THREE.Color(C.skin).lerp(new THREE.Color(0x925e5b),.12).getHex());
 }

}
