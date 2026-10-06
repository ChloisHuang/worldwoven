/** Preserve free hanging hair as one authored assembly. Scalp roots use the
 * common head envelope; shaft, weave and tie share a translation, not scale.
 * Rest-space garment clearance is evaluated once while preparing the template. */
import * as THREE from 'three';
export const FREE_BRAID=/^hair-(braided-tail|braid-weave-|braid-tie)/;
function rearClothTriangles(root,lowY,highY,anatomical=false){
 const triangles=[];
 root.traverse(mesh=>{
  if(!mesh.isMesh||mesh.parent?.name==='sculpted-head'||mesh.userData.softSkin||!/body|bodice|robe|tunic|jacket|gown|haori/.test(mesh.name)||/sleeve|collar|trim|fold|border|embroid/.test(mesh.name))return;
  const p=mesh.geometry.attributes.position,index=mesh.geometry.index;
  for(let j=0;j<(index?.count??p.count);j+=3){
   const points=[0,1,2].map(k=>{const i=index?index.getX(j+k):j+k;return[p.getX(i),anatomical?(mesh.geometry.attributes.sourceY?.getX(i)??p.getY(i)):p.getY(i),p.getZ(i)];});
   const minY=Math.min(...points.map(v=>v[1])),maxY=Math.max(...points.map(v=>v[1]));
   if(maxY<lowY||minY>highY||Math.min(...points.map(v=>v[2]))>=0)continue;
   triangles.push({points,minY,maxY,minX:Math.min(...points.map(v=>v[0])),maxX:Math.max(...points.map(v=>v[0]))});
  }
 });return triangles;
}
function rearSurface(triangles,x,y){
 let back=Infinity;
 for(const t of triangles){
  if(y<t.minY||y>t.maxY||x<t.minX||x>t.maxX)continue;
  const[a,b,c]=t.points,d=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(d)<1e-12)continue;
  const u=((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(y-c[1]))/d,v=((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(y-c[1]))/d;
  if(u<-.00001||v<-.00001||u+v>1.00001)continue;
  back=Math.min(back,u*a[2]+v*b[2]+(1-u-v)*c[2]);
 }return back;
}
export function planRetainedBraid(root,fit,options={}){
 const meshes=options.meshes??root.getObjectByName('sculpted-head').children.filter(m=>m.isMesh&&FREE_BRAID.test(m.name));
 if(!meshes.length)return{supported:false,reason:'retained-braid-variant-needs-fit'};
 let rootY=-Infinity,minY=Infinity;
 for(const mesh of meshes){mesh.geometry.computeBoundingBox();rootY=Math.max(rootY,mesh.geometry.boundingBox.max.y);minY=Math.min(minY,mesh.geometry.boundingBox.min.y);}
 const xs=[],zs=[];for(const mesh of meshes){const p=mesh.geometry.attributes.position;for(let i=0;i<p.count;i++)if(p.getY(i)>=rootY-.005){xs.push(p.getX(i));zs.push(p.getZ(i));}}
 const pivot=[(Math.min(...xs)+Math.max(...xs))/2,rootY,(Math.min(...zs)+Math.max(...zs))/2];
 const delta=pivot.map((v,k)=>v*fit.scale[k]+fit.offset[k]-v);
 // The inherited braid's open root ring ends below the rear hair shell. Use
 // that real surface edge as the common anchor rather than preserving its gap.
 const shell=(options.shellGeometry??root.getObjectByName('continuous-swept-hair-shell')?.geometry)?.attributes.position;
 let shellRoot=null,best=Infinity;if(shell)for(let i=0;i<shell.count;i++){
  const x=shell.getX(i),y=shell.getY(i),z=shell.getZ(i);if(z>=-.055||y<(options.minimumRootY??rootY)||Math.abs(x)>.035)continue;
  const anchorY=options.shellGeometry?Math.min(rootY,1.53):pivot[1],d=(x-pivot[0])**2+(y-anchorY)**2+(z-pivot[2])**2;if(d<best){best=d;shellRoot=[x,y,z];}
 }
 if(!shellRoot)return{supported:false,reason:'retained-braid-root-needs-fit'};
 // Four millimetres of overlap hides the open root ring inside the shell;
 // the entire shaft/weave/tie moves together, retaining its full length.
 const shellAnchor=options.shellGeometry?shellRoot:shellRoot.map((v,k)=>v*fit.scale[k]+fit.offset[k]);
 delta[1]=shellAnchor[1]+.004-rootY;
 if(options.shellGeometry){delta[0]=shellAnchor[0]-pivot[0];delta[2]=shellAnchor[2]-pivot[2]-.008;}
 const cloth=rearClothTriangles(root,minY+delta[1],rootY+delta[1],options.anatomical);let retreat=0,contactSamples=0;
 for(const mesh of meshes){const p=mesh.geometry.attributes.position;for(let i=0;i<p.count;i++){
  const back=rearSurface(cloth,p.getX(i)+delta[0],p.getY(i)+delta[1]);if(!Number.isFinite(back))continue;
  contactSamples++;retreat=Math.min(retreat,back-.004-(p.getZ(i)+delta[2]));
 }}
 // Thick legitimate garments can require more than 25 mm. Preserve the
 // complete authored shaft and weave, and join its translated open root to
 // the real crown with a short, tapered root bundle rather than rejecting
 // the whole adult head or silently leaving a disconnected braid.
 delta[2]+=retreat;
 return{supported:true,meshes,delta,pivot,rootY,shellRoot,shellAnchor,length:rootY-minY,retreat,contactSamples,needsBridge:!!options.shellGeometry||retreat<-.025};
}
export function applyRetainedBraid(plan){
 for(const mesh of plan.meshes){
  mesh.geometry.translate(...plan.delta);mesh.geometry.computeBoundingBox();mesh.geometry.computeBoundingSphere();mesh.userData.completeAdultPart='long-hair';
 }
 if(plan.needsBridge){
  const start=new THREE.Vector3(...plan.shellAnchor),end=new THREE.Vector3(...plan.pivot).add(new THREE.Vector3(...plan.delta));
  start.z+=.009;const mid=start.clone().lerp(end,.5);mid.y+=.003;
  const curve=new THREE.CatmullRomCurve3([start,mid,end]),g=new THREE.TubeGeometry(curve,12,.024,12,false),p=g.attributes.position;
  // Bundle tapers into the inherited root ring, overlapping both surfaces.
  for(let i=0;i<p.count;i++){const u=Math.floor(i/13)/12,c=curve.getPoint(u),radius=.70+.30*u;p.setXYZ(i,c.x+(p.getX(i)-c.x)*radius,c.y+(p.getY(i)-c.y)*radius,c.z+(p.getZ(i)-c.z)*radius);}
  g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();const mesh=new THREE.Mesh(g,plan.meshes[0].material);mesh.name='hair-braid-root-bridge';mesh.userData={softSkin:true,completeAdultPart:'long-hair'};plan.bridge=mesh;
  if(plan.meshes[0].parent)plan.meshes[0].parent.add(mesh);
 }
 return{rootY:plan.rootY,shellRoot:plan.shellRoot,length:plan.length,translation:[...plan.delta],garmentRetreat:plan.retreat,contactSamples:plan.contactSamples,rootBridge:!!plan.bridge};
}
