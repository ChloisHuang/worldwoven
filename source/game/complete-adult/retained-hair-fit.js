/** Preserve free hanging hair as one authored assembly. Scalp roots use the
 * common head envelope; shaft, weave and tie share a translation, not scale.
 * Rest-space garment clearance is evaluated once while preparing the template. */
export const FREE_BRAID=/^hair-(braided-tail|braid-weave-|braid-tie)/;
function rearClothTriangles(root,lowY,highY){
 const triangles=[];
 root.traverse(mesh=>{
  if(!mesh.isMesh||mesh.parent?.name==='sculpted-head'||mesh.userData.softSkin||!/body|bodice|robe|tunic|jacket|gown|haori/.test(mesh.name)||/sleeve|collar|trim|fold|border|embroid/.test(mesh.name))return;
  const p=mesh.geometry.attributes.position,index=mesh.geometry.index;
  for(let j=0;j<(index?.count??p.count);j+=3){
   const points=[0,1,2].map(k=>{const i=index?index.getX(j+k):j+k;return[p.getX(i),p.getY(i),p.getZ(i)];});
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
export function planRetainedBraid(root,fit){
 const meshes=root.getObjectByName('sculpted-head').children.filter(m=>m.isMesh&&FREE_BRAID.test(m.name));
 if(!meshes.length)return{supported:false,reason:'retained-braid-variant-needs-fit'};
 let rootY=-Infinity,minY=Infinity;
 for(const mesh of meshes){mesh.geometry.computeBoundingBox();rootY=Math.max(rootY,mesh.geometry.boundingBox.max.y);minY=Math.min(minY,mesh.geometry.boundingBox.min.y);}
 const xs=[],zs=[];for(const mesh of meshes){const p=mesh.geometry.attributes.position;for(let i=0;i<p.count;i++)if(p.getY(i)>=rootY-.005){xs.push(p.getX(i));zs.push(p.getZ(i));}}
 const pivot=[(Math.min(...xs)+Math.max(...xs))/2,rootY,(Math.min(...zs)+Math.max(...zs))/2];
 const delta=pivot.map((v,k)=>v*fit.scale[k]+fit.offset[k]-v);
 // The inherited braid's open root ring ends below the rear hair shell. Use
 // that real surface edge as the common anchor rather than preserving its gap.
 const shell=root.getObjectByName('continuous-swept-hair-shell')?.geometry.attributes.position;
 let shellRoot=null,best=Infinity;if(shell)for(let i=0;i<shell.count;i++){
  const x=shell.getX(i),y=shell.getY(i),z=shell.getZ(i);if(z>=0||y<rootY)continue;
  const d=(x-pivot[0])**2+(y-pivot[1])**2+(z-pivot[2])**2;if(d<best){best=d;shellRoot=[x,y,z];}
 }
 if(!shellRoot)return{supported:false,reason:'retained-braid-root-needs-fit'};
 // Four millimetres of overlap hides the open root ring inside the shell;
 // the entire shaft/weave/tie moves together, retaining its full length.
 delta[1]=shellRoot[1]*fit.scale[1]+fit.offset[1]+.004-rootY;
 const cloth=rearClothTriangles(root,minY+delta[1],rootY+delta[1]);let retreat=0,contactSamples=0;
 for(const mesh of meshes){const p=mesh.geometry.attributes.position;for(let i=0;i<p.count;i++){
  const back=rearSurface(cloth,p.getX(i)+delta[0],p.getY(i)+delta[1]);if(!Number.isFinite(back))continue;
  contactSamples++;retreat=Math.min(retreat,back-.004-(p.getZ(i)+delta[2]));
 }}
 // A large departure from the nape needs authored fitting, not a silent move.
 if(retreat<-.025)return{supported:false,reason:'retained-braid-cloth-fit-out-of-range',retreat};
 delta[2]+=retreat;return{supported:true,meshes,delta,rootY,shellRoot,length:rootY-minY,retreat,contactSamples};
}
export function applyRetainedBraid(plan){
 for(const mesh of plan.meshes){
  mesh.geometry.translate(...plan.delta);mesh.geometry.computeBoundingBox();mesh.geometry.computeBoundingSphere();mesh.userData.completeAdultPart='long-hair';
 }
 return{rootY:plan.rootY,shellRoot:plan.shellRoot,length:plan.length,translation:[...plan.delta],garmentRetreat:plan.retreat,contactSamples:plan.contactSamples};
}
