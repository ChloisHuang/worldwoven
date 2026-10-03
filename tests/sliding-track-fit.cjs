// Tiny production leaf/guide fixture. World/architecture sweeps stay separate.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve('source'),cache=new Map();
function mod(f){if(cache.has(f))return cache.get(f);let s=fs.readFileSync(f,'utf8');if(f.endsWith('/automatic-doors.js'))s=s.replace('    get cameraColliders(){','    qaPose(f){for(const d of doors){d.fraction=f;poseDoor(d);}return doors;},\n    get cameraColliders(){');const m=new vm.SourceTextModule(s,{identifier:f});cache.set(f,m);return m;}
const link=(s,m)=>mod(s==='three'?root+'/vendor/three/build/three.module.js':path.resolve(path.dirname(m.identifier),s.split('?')[0]));
(async()=>{
 const m=mod(root+'/game/automatic-doors.js');await m.link(link);await m.evaluate();const T=mod(root+'/vendor/three/build/three.module.js').namespace,K=await import('./door-geometry/triangle-kernel-v3.mjs'),rows=[];
 function triangles(object){const result=[];object.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position,idx=o.geometry.index;for(let k=0;k<(idx?.count??p.count);k+=3)result.push([0,1,2].map(j=>new T.Vector3().fromBufferAttribute(p,idx?idx.getX(k+j):k+j).applyMatrix4(o.matrixWorld).toArray()));});return result;}
 const cases=[['shoji',2.6,2.735,.30,.10],['shoji',2.5,2.85,.30,.10],['shoji',2.4,2.85,.30,.10],['palace',3.2,4.2,-.46,0],['palace',3.2,3.285,.46,0],['palace',3.2,3.115,.46,0],['palace',3.2,3.285,-.46,0],['french',2.6,3.3,.42,0]];
 for(const [style,width,height,offset,sideOverlap]of cases){
  const lot={group:new T.Group(),bounds:{minX:-20,maxX:20,minZ:-20,maxZ:20},colliders:[],automaticDoorways:[{id:'guide-fit',center:[0,0,0],axis:'x',style,width,height,motion:'slide',surfaceTrack:true,trackMountOffset:offset,sideOverlap}]},api=m.namespace.createAutomaticDoors(lot),d=api.qaPose(0)[0],fixed=d.group.children.filter(o=>o.isMesh),bounds=fixed.map(o=>new T.Box3().setFromObject(o));assert.equal(fixed.length,3,'guide and joined mounting pair');
  for(const q of fixed.filter(o=>o.name==='Lintel-to-track joined bracket')){const b=new T.Box3().setFromObject(q);assert(b.min.z<=-offset&&b.max.z>=-offset,'bracket reaches actual wall plane');assert(b.min.y>1.95,'fixed mount stays above body envelope');}
  let minGap=Infinity;
  for(let k=0;k<=100;k++){api.qaPose(k/100);for(const l of d.leaves){const b=new T.Box3().setFromObject(l.mesh);for(const s of bounds){const gap=Math.max(s.min.z-b.max.z,b.min.z-s.max.z);assert(gap>1e-6,'positive normal-axis separation certifies no guide/leaf contact over affine travel');minGap=Math.min(minGap,gap);}}}
  const guide=fixed.find(o=>o.name==='Surface-mounted timber sliding guide'),guideBounds=new T.Box3().setFromObject(guide);api.qaPose(0);
  let pullHeightRange=null;
  if(style==='shoji'){
   assert(Math.abs(minGap-.0075)<1e-6,'record the measured conservative shoji guide gap');
   const deep=triangles(d.leaves[0].mesh).flat().filter(p=>Math.abs(p[2])>.10);pullHeightRange=[Math.min(...deep.map(p=>p[1])),Math.max(...deep.map(p=>p[1]))];
   assert(pullHeightRange[1]<guideBounds.min.y,'deepest pull is below the guide, so their combined AABB gap is conservative');
  }
  // Recreate the former buried-guide defect on actual production triangles.
  // AABB overlap alone is not enough: require a real triangle contact witness.
  const delta=(Math.sign(offset)||1)*(style==='shoji'?.13:.20);guide.geometry.translate(0,0,delta);d.group.updateMatrixWorld(true);
  const supports=triangles(guide).map(t=>({t,b:K.bounds(t)})),leaves=d.leaves.flatMap(l=>triangles(l.mesh));let buriedWitness=null;
  for(const t of leaves){const b=K.bounds(t);for(const s of supports){if(!K.overlap(b,s.b,1e-5))continue;const contact=K.triangleContact(t,s.t,1e-5);if(contact){buriedWitness={leaf:t,guide:s.t,contact};break;}}if(buriedWitness)break;}
  assert(buriedWitness,'old buried guide is rejected by actual triangle contact');guide.geometry.translate(0,0,-delta);
  rows.push({style,width,height,offset,sideOverlap,poses:101,minimumPanelToGuideGap:minGap,pullHeightRange,guideHeightRange:[guideBounds.min.y,guideBounds.max.y],buriedGuideNegative:buriedWitness});api.dispose();
 }
 console.log(JSON.stringify({status:'PASS',scope:'Actual production guide/leaf positive separation at101affine poses, real joined mounts, and retained buried-guide triangle-contact negatives; no authored scene or visual claim',rows},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
