/** Saved hair identity on the complete adult head. The six cuts reuse the
 * reviewed original layered assets, never a gender-wide hairstyle override.
 * All fitting is template-time, against neutral scalp and real garment triangles.
 */
import * as THREE from 'three';
import {ADULT_FORMS} from './assets/adult-forms-data.js';
import {createLayeredHairGeometry} from './layered-hair.js';
import {createFemaleHairOption} from './female-hair-options.js';
import {RETAINED_HAIR} from './attachment-fit.js';
import {FREE_BRAID,planRetainedBraid,applyRetainedBraid} from './retained-hair-fit.js';
export const SAVED_HAIRSTYLES=Object.freeze(['swept-short','side-part','chin-bob','shoulder-wave','low-bun','braided-tail']);
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
const HEAD_CENTER_Z=-.025,SCALP_CLEARANCE=.002,CLOTH_CLEARANCE=.004;

/** Horizontal triangle rays, indexed by Y. Unlike a bounding ellipsoid this
 * evaluates the actual head/garment surface, including collar and shoulder. */
export function createHairSurfaceEnvelope(parts,{centerZ=HEAD_CENTER_Z,minimumY=1.15,maximumY=1.72}={}){
 const cells=new Map(),step=.006,sectors=48,tau=Math.PI*2,a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),hit=new THREE.Vector3();
 for(const part of parts){const p=part.position,ix=part.index;for(let j=0;j<(ix?.length??p.length/3);j+=3){const t=[0,1,2].map(k=>{const i=(ix?ix[j+k]:j+k)*3;return[p[i],p[i+1],p[i+2]];}),lo=Math.max(minimumY,Math.min(...t.map(v=>v[1]))),hi=Math.min(maximumY,Math.max(...t.map(v=>v[1])));if(lo>hi)continue;
   // A ray can hit only triangles in its Y slice and angular sector. Index
   // the exact projected angular interval, retaining all sectors for triangles
   // surrounding the ray origin; this is acceleration, not an approximation.
   const angles=t.map(v=>(Math.atan2(v[0],v[2]-centerZ)+tau)%tau).sort((a,b)=>a-b);let gap=-Infinity,gapAt=0;
   for(let k=0;k<3;k++){const d=(k===2?angles[0]+tau:angles[k+1])-angles[k];if(d>gap){gap=d;gapAt=k;}}
   const first=angles[(gapAt+1)%3],span=tau-gap,angular=[];
   if(span>=Math.PI)for(let k=0;k<sectors;k++)angular.push(k);
   else for(let k=Math.floor(first/tau*sectors);k<=Math.floor((first+span)/tau*sectors);k++)angular.push(k%sectors);
   for(let k=Math.floor(lo/step);k<=Math.floor(hi/step);k++)for(const sector of angular){const key=k*sectors+sector;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(t);}
  }}
 const ray=new THREE.Ray();
 return(x,y,z)=>{const dx=x,dz=z-centerZ,r=Math.hypot(dx,dz);if(r<1e-8)return null;ray.origin.set(0,y,centerZ);ray.direction.set(dx/r,0,dz/r);let radius=-Infinity;
  for(const t of cells.get(Math.floor(y/step)*sectors+Math.floor(((Math.atan2(dx,dz)+tau)%tau)/tau*sectors))??[]){a.fromArray(t[0]);b.fromArray(t[1]);c.fromArray(t[2]);if(ray.intersectTriangle(a,b,c,false,hit))radius=Math.max(radius,hit.distanceTo(ray.origin));}
  return Number.isFinite(radius)?{radius,distance:r-radius,direction:[dx/r,0,dz/r]}:null;
 };
}
export function hairGarmentParts(root){const parts=[];root.traverse(m=>{
 if(!m.isMesh||m.parent?.name==='sculpted-head'||m.userData.softSkin||!/body|bodice|robe|tunic|jacket|gown|haori|collar|yoke|shoulder|apron|obi/.test(m.name)||/sleeve|trim|fold|border|embroid/.test(m.name))return;
 const p=m.geometry.attributes.position,sy=m.geometry.attributes.sourceY,position=Array.from(p.array);if(sy)for(let i=0;i<p.count;i++)position[i*3+1]=sy.getX(i);parts.push({position,index:m.geometry.index?.array});
 });return parts;}
function scalpPart(form){return ADULT_FORMS[form].parts.find(p=>p.material==='skin');}
function convertScalp(g,from,to){
 if(from===to)return;
 const a=scalpPart(from),b=scalpPart(to),extent=(p,k,fn)=>fn(...p.position.filter((_,i)=>i%3===k)),ratio=extent(b,0,Math.max)/extent(a,0,Math.max),yRatio=(extent(b,1,Math.max)-1.455)/(extent(a,1,Math.max)-1.455),zRatio=(HEAD_CENTER_Z-extent(b,2,Math.min))/(HEAD_CENTER_Z-extent(a,2,Math.min));
 const p=g.attributes.position;for(let i=0;i<p.count;i++)p.setXYZ(i,p.getX(i)*ratio,1.455+(p.getY(i)-1.455)*yRatio,HEAD_CENTER_Z+(p.getZ(i)-HEAD_CENTER_Z)*zRatio);
}
/** Keep the seven crown/temple components. The final four connected low rear
 * components are the bun, removed only for the genuinely different braid cut. */
function removeUpdoBun(g){
 const p=g.attributes.position,ix=g.index.array,n=p.count,parent=Array.from({length:n},(_,i)=>i),find=i=>parent[i]===i?i:parent[i]=find(parent[i]);
 for(let i=0;i<ix.length;i+=3)for(let k=1;k<3;k++)parent[find(ix[i+k])]=find(ix[i]);
 const maxZ=new Map();for(let i=0;i<n;i++){const root=find(i);maxZ.set(root,Math.max(maxZ.get(root)??-Infinity,p.getZ(i)));}
 const kept=[];for(let i=0;i<ix.length;i+=3)if(maxZ.get(find(ix[i]))>-.10)kept.push(ix[i],ix[i+1],ix[i+2]);g.setIndex(kept);
 // Compact vertices as well, so removed bun vertices cannot affect crown fit,
 // accessory bounds, skinning, clearance measurements or GPU upload.
 const used=[...new Set(kept)],remap=new Map(used.map((v,i)=>[v,i]));for(const [name,attr]of Object.entries(g.attributes)){const array=[];for(const i of used)for(let k=0;k<attr.itemSize;k++)array.push(attr.array[i*attr.itemSize+k]);g.setAttribute(name,new THREE.BufferAttribute(new attr.array.constructor(array),attr.itemSize,attr.normalized));}g.setIndex(kept.map(i=>remap.get(i)));
}
function cutLength(g,style){
 const p=g.attributes.position;
 for(let i=0;i<p.count;i++){
  let x=p.getX(i),y=p.getY(i),z=p.getZ(i);
  if(style==='swept-short'){
   // Opposite sweep, with a close graduated nape instead of the loose long
   // side-part locks. Mirror triangle winding below to preserve the surface.
   x=-x;const low=1-smooth(1.54,1.61,y);y+=.020*low;z=HEAD_CENTER_Z+(z-HEAD_CENTER_Z)*(1-.075*low);x*=1-.055*low;
  }else if(style==='chin-bob'||style==='shoulder-wave'){
   const ratio=style==='chin-bob'?.25:.51,pivot=1.57,d=Math.max(0,pivot-y);
   // A C1-continuous root transition keeps the crown and temples untouched.
   const transition=.055,reduction=(1-ratio)*(d<=transition?d*d/(2*transition):d-transition/2);y+=reduction;
   if(style==='chin-bob'){const hem=1-smooth(1.445,1.585,y);x*=1-.30*hem;z=HEAD_CENTER_Z+(z-HEAD_CENTER_Z)*(1-.14*hem);}
  }
  p.setXYZ(i,x,y,z);
 }
 if(style==='swept-short'){const ix=g.index.array;for(let i=0;i<ix.length;i+=3){const b=ix[i+1];ix[i+1]=ix[i+2];ix[i+2]=b;}}
}
function resolveClearance(g,envelope,clearance,{minimumY=-Infinity,maximumY=Infinity}={}){
 const p=g.attributes.position;let moved=0,maximumPush=0;
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);if(y<minimumY||y>maximumY)continue;const contact=envelope(x,y,z);if(!contact||contact.distance>=clearance)continue;const push=clearance-contact.distance;p.setXYZ(i,x+contact.direction[0]*push,y,z+contact.direction[2]*push);moved++;maximumPush=Math.max(maximumPush,push);}
 // Vertex-only fitting misses a coarse triangle spanning an ear or collar.
 // Lift its incident vertices by the sampled interior deficit; these small
 // corrections keep the original connected topology and layer ordering.
 let interiorCorrections=0;const ix=g.index.array;
 for(let pass=0;pass<4;pass++){
  const pushes=new Float32Array(p.count);let worst=0;
  for(let j=0;j<ix.length;j+=3){const ids=[ix[j],ix[j+1],ix[j+2]];for(const w of [[.5,.5,0],[0,.5,.5],[.5,0,.5],[1/3,1/3,1/3]]){
   const q=[0,1,2].map(k=>ids.reduce((sum,id,h)=>sum+p.array[id*3+k]*w[h],0));if(q[1]<minimumY||q[1]>maximumY)continue;
   const contact=envelope(...q),push=contact?clearance-contact.distance:0;if(push<=.00001)continue;worst=Math.max(worst,push);
   for(const id of ids)pushes[id]=Math.max(pushes[id],push*1.08);
  }}
  if(worst<=.00001)break;
  for(let i=0;i<p.count;i++)if(pushes[i]){const x=p.getX(i),z=p.getZ(i),r=Math.hypot(x,z-HEAD_CENTER_Z);if(r<1e-8)continue;p.setXYZ(i,x+x/r*pushes[i],p.getY(i),z+(z-HEAD_CENTER_Z)/r*pushes[i]);interiorCorrections++;maximumPush=Math.max(maximumPush,pushes[i]);}
 }
 return{moved,maximumPush,interiorCorrections};
}
function seatBraidWeave(meshes){
 const shaft=meshes.find(m=>m.name==='hair-braided-tail');if(!shaft)return;
 const g=shaft.geometry,p=g.attributes.position,ix=g.index.array,triangles=[];
 for(let i=0;i<ix.length;i+=3){const q=[0,1,2].map(k=>new THREE.Vector3().fromBufferAttribute(p,ix[i+k]));triangles.push({q,minY:Math.min(...q.map(v=>v.y)),maxY:Math.max(...q.map(v=>v.y))});}
 const ray=new THREE.Ray(new THREE.Vector3(),new THREE.Vector3(0,0,1)),hit=new THREE.Vector3();
 const rear=(x,y)=>{ray.origin.set(x,y,-1);let z=Infinity;for(const t of triangles){if(y<t.minY||y>t.maxY)continue;if(ray.intersectTriangle(...t.q,false,hit))z=Math.min(z,hit.z);}return z;};
 for(const mesh of meshes)if(/^hair-braid-weave-/.test(mesh.name)){
  const side=mesh.name.endsWith('--1')?-1:1,points=[];
  for(let i=0;i<=48;i++){const u=i/48,y=1.283+u*.224,x=side*(.009+.007*u)*Math.cos(u*Math.PI*13),z=rear(x,y);if(Number.isFinite(z))points.push(new THREE.Vector3(x,y,z-.001));}
  const replacement=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),72,.0016,5,false),q=replacement.attributes.position;
  // The woven ridges sit on the actual shaft surface; the inherited marks
  // were authored on a separate constant-depth plane and floated at the nape.
  for(let i=0;i<q.count;i++){const z=rear(q.getX(i),q.getY(i));if(Number.isFinite(z))q.setZ(i,Math.min(q.getZ(i),z-.0004));}
  mesh.geometry.dispose();mesh.geometry=replacement;finish(replacement);
 }
}
function finish(g){g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();}
function hairMesh(g,name,color,long=false){const m=new THREE.Mesh(g,{color:new THREE.Color(color),isMaterial:false});m.name=name;m.userData={softSkin:true,completeAdultPart:long?'long-hair':'hair',savedHairstyle:true};return m;}

/** Plan without mutating the actor, so an unsupported or malformed input can
 * fall back atomically. Use before attachCompleteHead; apply inside the existing
 * fitCompleteAdultAttachments callback, before role-headgear fitting. */
export function planSavedHairstyle(root,options,attachmentFit,asset=null){
 const head=root.getObjectByName('sculpted-head'),style=options.hairStyle,form=options.bodyPreset?.startsWith('masculine')?'male':'female';
 if(!head||!SAVED_HAIRSTYLES.includes(style))return{supported:false,reason:'unknown-saved-hairstyle'};
 const short=style==='side-part'||style==='swept-short',tied=style==='low-bun'||style==='braided-tail',bound=style==='braided-tail'&&options.culture==='japan'&&options.wardrobePreset==='onsen-swimwear';
 const g=short?createLayeredHairGeometry({color:options.hair,flowFinish:!!options.previewHairFlow}):createFemaleHairOption({style:tied?'gathered-updo':'long-layered',color:options.hair,flowFinish:!!options.previewHairFlow});
 if(style==='braided-tail'&&!bound)removeUpdoBun(g);
 convertScalp(g,short?'male':'female',form);cutLength(g,style);
 const scalp=createHairSurfaceEnvelope([asset?.parts.find(p=>p.material==='skin')??scalpPart(form)],{minimumY:1.435}),cloth=createHairSurfaceEnvelope(hairGarmentParts(root));
 const scalpFit=resolveClearance(g,scalp,SCALP_CLEARANCE,{minimumY:1.44}),clothFit=resolveClearance(g,cloth,CLOTH_CLEARANCE,{maximumY:1.46});finish(g);
 const mesh=hairMesh(g,'hair-saved-'+style,options.hair,style==='shoulder-wave'),meshes=[mesh];let braid=null;
 if(style==='braided-tail'&&!bound){
  // The inherited free tail is copied in anatomical rest space. Its full
  // shaft, woven marks and tie share one rigid transform; only the root bridge
  // is newly authored to join the fitted crown after garment clearance.
  const detached=new THREE.Group(),h=new THREE.Group();h.name='sculpted-head';detached.add(h);
  for(const old of head.children)if(old.isMesh&&FREE_BRAID.test(old.name)){const copy=old.clone();copy.geometry=old.geometry.clone();const p=copy.geometry.attributes.position,sy=copy.geometry.attributes.sourceY;if(sy)for(let i=0;i<p.count;i++)p.setY(i,sy.getX(i));copy.geometry.deleteAttribute('sourceY');h.add(copy);}
  seatBraidWeave(h.children);
  // The planner reads the real garment triangles from the original root, and
  // the actual newly fitted crown as its attachment surface.
  braid=planRetainedBraid(root,attachmentFit,{meshes:h.children,shellGeometry:g,anatomical:true,minimumRootY:1.49});
  if(!braid.supported){g.dispose();for(const m of h.children)m.geometry.dispose();return braid;}
  applyRetainedBraid(braid);for(const m of [...h.children]){m.userData.softSkin=true;m.userData.savedHairstyle=true;meshes.push(m);}
 }
 return{supported:true,head,style,form,meshes,attachmentFit,scalpFit,clothFit,braid,bound,clearance:{scalp:SCALP_CLEARANCE,garment:CLOTH_CLEARANCE}};
}
export function applySavedHairstyle(plan){
 if(!plan.supported)throw new Error(plan.reason);
 for(const m of [...plan.head.children])if(m.isMesh&&RETAINED_HAIR.test(m.name)){m.removeFromParent();m.geometry.dispose();}
 for(const m of plan.meshes)plan.head.add(m);
 const top=Math.max(...plan.meshes.map(m=>m.geometry.boundingBox.max.y)),from=plan.attachmentFit.hairTopFrom*plan.attachmentFit.scale[1]+plan.attachmentFit.offset[1];
 plan.attachmentFit.hairOffsetY=Number.isFinite(from)?Math.max(-.025,Math.min(.025,top-from)):0;
 const summary={style:plan.style,form:plan.form,source:'original-layered-assets',boundForSoaking:plan.bound,scalpFit:plan.scalpFit,clothFit:plan.clothFit,clearance:plan.clearance};
 if(plan.braid){const b=plan.braid;summary.braid={length:b.length,translation:[...b.delta],garmentRetreat:b.retreat,contactSamples:b.contactSamples,rootBridge:!!b.bridge};plan.attachmentFit.retainedBraid=summary.braid;}
 plan.head.userData.savedHairstyle=summary;return summary;
}
