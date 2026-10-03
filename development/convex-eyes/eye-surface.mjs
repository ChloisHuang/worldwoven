/** Original, texture-free eye study. Local anatomical metres; face +Z.
 * A single convex globe supports the sclera, iris and pupil. The two skin lids
 * turn from that globe into the existing socket. No other facial shape changes.
 */
import * as THREE from 'three';
const mix=(a,b,t)=>a+(b-a)*t;
function grid(parent,name,nu,nv,fn,color){
 const p=[],ix=[];
 for(let j=0;j<=nv;j++)for(let i=0;i<=nu;i++)p.push(...fn(i/nu,j/nv));
 for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const a=j*(nu+1)+i,b=a+1,c=a+nu+1,d=c+1;ix.push(a,b,c,b,d,c);}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geometry.setIndex(ix);geometry.computeVertexNormals();
 const mesh=new THREE.Mesh(geometry,{color:new THREE.Color(color),isMaterial:false});mesh.name=name;parent.add(mesh);return mesh;
}
export function eyeLayout({side,masc=false,traits=null,coherent=false}){
 const eye=traits?.eyeSize??1,cx=side*(coherent?(masc?.044:.043):(masc?.040:.038)),cy=coherent?1.601:1.59;
 const hw=(coherent?(masc?.0245:.024):(masc?.022:.0215))*eye,upper=(coherent?(masc?.0073:.0078):(masc?.0072:.009))*eye,lower=(coherent?.0068:(masc?.0055:.0062))*eye;
 return{eye,cx,cy,hw,upper,lower,side,coherent};
}
export function eyeLidBoundary(layout,u,up,outer=false){
 const {eye,cx,cy,hw,upper,lower,side,coherent}=layout,x=cx+(u*2-1)*hw;
 const y=cy+(Math.sin(u*Math.PI)**(coherent?(up?.88:.72):1))*(up?upper:-lower)+side*(x-cx)*(coherent?.10:.08);
 const width=(up?(coherent?.0068:.0045):.0030)*eye;
 return[x,y+(outer?(up?1:-1)*width*Math.sin(Math.PI*u)**.7:0)];
}
export function buildConvexEye(parent,{side,masc=false,traits=null,facialSurface,colors:C,coherent=false}){
 const layout=eyeLayout({side,masc,traits,coherent}),{eye,cx,cy,hw,upper,lower}=layout;
 // Sample the original socket: socketDepth still changes globe/lid placement,
 // while eyeSize scales the same opening around its unchanged centre.
 const e=.0001,base=facialSurface(cx,cy),dx=(facialSurface(cx+e,cy)-facialSurface(cx-e,cy))/(2*e),dy=(facialSurface(cx,cy+e)-facialSurface(cx,cy-e))/(2*e);
 const rx=hw*1.25,ry=.020*eye,rz=(coherent?.0155:.008)*eye;
 const globe=(x,y)=>{const xx=x-cx,yy=y-cy-side*xx*(coherent?.10:.08),t=Math.max(0,Math.min(1,(Math.abs(xx)-.0085*eye)/(hw-.0085*eye))),corner=coherent?t*t*t*(t*(t*6-15)+10):1;return base+(dx*xx+dy*(y-cy))*corner+.0008+rz*(Math.sqrt(Math.max(.001,1-(xx/rx)**2-(yy/ry)**2))-.6);};
 const edge=(u,up)=>{const [x,y]=eyeLidBoundary(layout,u,up);return[x,y,globe(x,y)];};
 const eyeWhite=coherent?new THREE.Color(0xe7eaeb).getHex():C.eye;
 const white=grid(parent,'inset-eye-white-'+side,24,8,(u,v)=>{const a=edge(u,false),b=edge(u,true),y=mix(a[1],b[1],v);return[a[0],y,globe(a[0],y)];},eyeWhite);
 if(coherent){const colors=[];for(let j=0;j<=8;j++)for(let i=0;i<=24;i++){const u=i/24,v=j/8,c=new THREE.Color(eyeWhite).multiplyScalar(1-.13*Math.abs(u*2-1)**3-.07*v**3);colors.push(c.r,c.g,c.b);}white.geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));}
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
  const width=(up?(coherent?.0068:.0045):.0030)*eye;
  const lid=grid(parent,'eyelid-'+(up?'upper':'lower')+'-'+side,24,5,(u,v)=>{
   const p=edge(u,up),taper=Math.pow(Math.sin(Math.PI*u),.7),y=p[1]+(up?1:-1)*width*taper*v;
   // The outer edge overlaps the socket skin by a submillimetre; the curved
   // intermediate rows give the lid thickness without a separate round tube.
   const roll=coherent&&!up?.0015:.0006;
   const z=mix(p[2]+.00025,facialSurface(p[0],y)+.0002,v)+roll*Math.sin(Math.PI*v)*taper-(coherent&&up?.0012*Math.exp(-(((v-.72)/.17)**2))*taper:0);
   return[p[0],y,z];
  },C.skin);
  if(coherent){const colors=[];for(let j=0;j<=5;j++)for(let i=0;i<=24;i++){const u=i/24,v=j/5,fold=Math.exp(-(((v-(up?.78:.82))/.16)**2))*Math.sin(Math.PI*u),c=new THREE.Color(C.skin).multiplyScalar(1-(up?.25:.18)*fold);colors.push(c.r,c.g,c.b);}lid.geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));}
  const color=up?C.brow:new THREE.Color(C.skin).multiplyScalar(.9).getHex();
  grid(parent,'eyelid-'+(up?'lash':'waterline')+'-'+side,24,2,(u,v)=>{
   const p=edge(u,up),taper=Math.sin(Math.PI*u),w=(up?(coherent?.00165:.0012):.00040)*eye*taper;
   const y=p[1]+(up?1:-1)*w*(v-.35);
   return[p[0],y,globe(p[0],y)+.00055];
  },color);
 }
}
