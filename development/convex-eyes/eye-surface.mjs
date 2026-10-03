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
export function buildConvexEye(parent,{side,masc=false,traits=null,facialSurface,colors:C}){
 const eye=traits?.eyeSize??1,cx=side*(masc?.040:.038),cy=1.59;
 const hw=(masc?.022:.0215)*eye,upper=(masc?.0072:.009)*eye,lower=(masc?.0055:.0062)*eye;
 // Sample the original socket: socketDepth still changes globe/lid placement,
 // while eyeSize scales the same opening around its unchanged centre.
 const e=.0001,base=facialSurface(cx,cy),dx=(facialSurface(cx+e,cy)-facialSurface(cx-e,cy))/(2*e),dy=(facialSurface(cx,cy+e)-facialSurface(cx,cy-e))/(2*e);
 const rx=hw*1.25,ry=.024*eye,rz=.013*eye;
 const globe=(x,y)=>{const xx=x-cx,yy=y-cy-side*xx*.08;return base+dx*xx+dy*(y-cy)+.0015+rz*(Math.sqrt(Math.max(.001,1-(xx/rx)**2-(yy/ry)**2))-.6);};
 const edge=(u,up)=>{const x=cx+(u*2-1)*hw,y=cy+Math.sin(u*Math.PI)*(up?upper:-lower)+side*(x-cx)*.08;return[x,y,globe(x,y)];};
 grid(parent,'inset-eye-white-'+side,24,8,(u,v)=>{const a=edge(u,false),b=edge(u,true),y=mix(a[1],b[1],v);return[a[0],y,globe(a[0],y)];},C.eye);
 const disk=(name,radius,centerX,centerY,offset,color,nu=24,nv=5)=>grid(parent,name+'-'+side,nu,nv,(u,v)=>{const a=u*Math.PI*2,r=v*radius,x=centerX+Math.cos(a)*r,y=centerY+Math.sin(a)*r;return[x,y,globe(x,y)+offset];},color);
 disk('iris',.0058*eye,cx,cy+.0008*eye,.00025,C.iris);
 disk('pupil',.0028*eye,cx,cy+.0008*eye,.00045,C.pupil,16,3);
 disk('eye-catchlight',.0010*eye,cx-.0016*eye,cy+.0031*eye,.00065,0xfff7e5,12,2);
 for(const up of[true,false]){
  const width=(up?.0052:.0037)*eye;
  grid(parent,'eyelid-'+(up?'upper':'lower')+'-'+side,24,5,(u,v)=>{
   const p=edge(u,up),taper=Math.pow(Math.sin(Math.PI*u),.7),y=p[1]+(up?1:-1)*width*taper*v;
   // The outer edge overlaps the socket skin by a submillimetre; the curved
   // intermediate rows give the lid thickness without a separate round tube.
   const z=mix(p[2]+.00025,facialSurface(p[0],y)+.0002,v)+.0006*Math.sin(Math.PI*v)*taper;
   return[p[0],y,z];
  },C.skin);
  const color=up?C.brow:new THREE.Color(C.skin).multiplyScalar(.9).getHex();
  grid(parent,'eyelid-'+(up?'lash':'waterline')+'-'+side,24,2,(u,v)=>{
   const p=edge(u,up),taper=Math.sin(Math.PI*u),w=(up?.00085:.00040)*eye*taper;
   const y=p[1]+(up?1:-1)*w*v;
   return[p[0],y,p[2]+.00035];
  },color);
 }
}
