// Focused full-scene regression: source-matched old casing positive and repaired
// pocket sweep. This does not certify the other doors or dynamic actor routes.
if(process.env.QA_RESOURCE_WINDOW!=='granted-by-owner')throw Error('Owner resource window required');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const ROOT='/workspace/shared/worldwoven-r17-repairs',BASE='/workspace/shared/worldwoven-r17-door-design',OUT=BASE+'/france-pocket-whole-scene-v2-result.json',EPS=1e-5,started=Date.now(),deadline=started+165000;
const guards={
 'source/game/automatic-doors.js':'fd788f9e229cc27052c12d0331d2b73e5b567d84664c361005f310fef4f01195',
 'source/game/inset-closures.js':'869a0c43bf27479d697ddb57d70b7b1fb1babaf18ea41e55067ca253af8f28fb',
 'source/game/room-closures.js':'e418cd6d9a10c63aa782a8122205083217b1c407a5d0d426fab2543555601aea',
 'source/game/regions-west.js':'b261a978e9fe16ccd7980436fa6cdc2f78626a241a45a0ae8ab119c48a583476',
 'source/game/furniture-interactions.js':'72a5856cb502fb8b0e9f1882a03ae0d7579a723fa9f8323052b1182322391ba4',
 'source/game/geometry.js':'accd26d9fe1820ba7829bc00f802c8916458813eefd0cfd08f5d38e11c207ca9',
 'source/vendor/three/build/three.core.js':'9edde002b066a9a05676a6127f67735b62baf399bdea529f2f7e31657da769e6',
 'tests/door-geometry/triangle-kernel-v3.mjs':'dcc13af03fb915407736f7c0654e17a10cd4900b587d7a0ea9e029548172b77b'
};
globalThis.__qaHashPositions=values=>sha(Buffer.from(values.buffer,values.byteOffset,values.byteLength));
const beforePath=BASE+'/checkpoints/16-before-france-pocket-casing/regions-west.js',beforeHash='ec75eade337b7b1d68f5dbf7a619991097d392d283e297b29bd261b54d34a207';
const sha=s=>crypto.createHash('sha256').update(s).digest('hex'),hash=f=>sha(fs.readFileSync(f));
const report={status:'RUNNING',scope:'One actual full France scene pocket core-wing-1--5, with production furnishings and all non-target moving closures parked closed. Original casing positive retained; actual target leaves swept against all static world rendered triangles. No collision exclusions or contact waivers. Other doors, actor routes and visual coverage remain separate.',eps:EPS,guards,beforeHash,stages:[]};
const dump=()=>fs.writeFileSync(OUT,JSON.stringify(report,null,2));
function budget(){if(Date.now()>deadline||process.memoryUsage().rss>1200*1048576)throw Error('Resource budget reached: REVIEW, never clearance');}
const union=(a,b)=>({min:a.min.map((v,i)=>Math.min(v,b.min[i])),max:a.max.map((v,i)=>Math.max(v,b.max[i]))});
const expand=(b,e)=>({min:b.min.map(v=>v-e),max:b.max.map(v=>v+e)});
(async()=>{
 for(const [file,expected]of Object.entries(guards))assert.equal(hash(ROOT+'/'+file),expected,'Source guard '+file);
 assert.equal(hash(beforePath),beforeHash,'Preserved original France source guard');
 const K=await import(ROOT+'/tests/door-geometry/triangle-kernel-v3.mjs');
 for(const stage of ['before','after']){
  budget();const row={stage,status:'RUNNING',loadedHashes:{}},cache=new Map();report.stages.push(row);dump();
  function mod(f){if(cache.has(f))return cache.get(f);const actual=stage==='before'&&f.endsWith('/regions-west.js')?beforePath:f;let source=fs.readFileSync(actual,'utf8');row.loadedHashes[path.relative(ROOT,f)]=sha(source);if(f.endsWith('/regions-west.js')){
    // Metadata only: exact original primitive ranges survive the existing pack.
    const replacements=[
     ['b={material,parts:[],size:0,mountRanges:[]}', 'b={material,parts:[],size:0,mountRanges:[],qaSourceRanges:[]}'],
     ['b.parts.push(geo);b.size+=count;', "b.qaSourceRanges.push({firstTriangle:b.size/3,triangleCount:count/3,name:m.name||m.geometry.type,positionSHA:globalThis.__qaHashPositions(geo.attributes.position.array)});b.parts.push(geo);b.size+=count;"],
     ['mesh.userData.hingeMountRanges=b.mountRanges;', 'mesh.userData.hingeMountRanges=b.mountRanges;mesh.userData.qaSourceRanges=b.qaSourceRanges;']
    ];for(const [from,to]of replacements){assert.equal(source.split(from).length,2,'Packing metadata anchor');source=source.replace(from,to);}row.instrumentedFranceHash=sha(source);
   }if(f.endsWith('/automatic-doors.js')){assert.equal(source.split('  return api;').length,2);source=source.replace('  return api;','  api._doors=allClosures;api._pose=(d,f)=>{d.fraction=f;poseDoor(d);};return api;');}const m=new vm.SourceTextModule(source,{identifier:f});cache.set(f,m);return m;}
  const link=(s,m)=>mod(s==='three'?ROOT+'/source/vendor/three/build/three.module.js':path.resolve(path.dirname(m.identifier),s.split('?')[0]));
  async function load(file){const m=mod(ROOT+'/source/game/'+file+'.js');if(m.status==='unlinked')await m.link(link);if(m.status==='linked')await m.evaluate();return m.namespace;}
  const west=await load('regions-west'),engine=await load('automatic-doors'),F=await load('furniture-interactions'),T=mod(ROOT+'/source/vendor/three/build/three.module.js').namespace;
  const lot=west.buildFrance();F.createFurnitureInteractions(lot,'france',{curtains:{france:false}});const api=engine.createAutomaticDoors(lot,'france'),d=api._doors.find(d=>d.id==='core-wing-1--5');
  assert(d&&d.motion==='slide'&&d.closureMount?.kind==='pocket'&&!d.surfaceTrack,'Actual selected door is inset pocket');lot.group.updateMatrixWorld(true);
  const transform=(p,e)=>[e[0]*p[0]+e[4]*p[1]+e[8]*p[2]+e[12],e[1]*p[0]+e[5]*p[1]+e[9]*p[2]+e[13],e[2]*p[0]+e[6]*p[1]+e[10]*p[2]+e[14]];
  function meshTriangles(o,matrix,visit,range=null){const g=o.geometry,p=g.attributes.position,idx=g.index,start=range?range.firstTriangle*3:Math.max(0,g.drawRange?.start||0),end=range?start+range.triangleCount*3:Math.min(idx?.count??p.count,Number.isFinite(g.drawRange?.count)?start+g.drawRange.count:Infinity);for(let k=start;k+2<end;k+=3){const t=[0,1,2].map(j=>{const n=idx?idx.getX(k+j):k+j;return transform([p.getX(n),p.getY(n),p.getZ(n)],matrix.elements);});if(K.len(K.cross(K.sub(t[1],t[0]),K.sub(t[2],t[0])))>EPS*EPS)visit(t,k/3);}}
  const leaves=()=>d.leaves.map(l=>{const ts=[];l.mesh.traverse(o=>{if(o.isMesh)meshTriangles(o,o.matrixWorld,t=>ts.push(t));});return ts;});
  api._pose(d,0);const initial=leaves();api._pose(d,1);const opened=leaves();let envelope=null,residual=0;
  for(const f of[0,.25,.5,.75,1]){api._pose(d,f);const actual=leaves();for(let side=0;side<2;side++){assert.equal(actual[side].length,initial[side].length);for(let i=0;i<actual[side].length;i++){const bb=K.bounds(actual[side][i]);envelope=envelope?union(envelope,bb):bb;for(let j=0;j<3;j++){const expected=initial[side][i][j].map((v,k)=>v+f*(opened[side][i][j][k]-v));residual=Math.max(residual,K.len(K.sub(actual[side][i][j],expected)));}}}}
  assert(residual<1e-10,'Every actual target vertex follows the reviewed source affine translation');api._pose(d,0);row.affineSweep={everyRenderedVertex:true,fractions:[0,.25,.5,.75,1],maxResidual:residual,envelope,sourceFormula:'poseDoor slide: fixed transforms, pivot lateral = side * (width/4 + overlap/2 + fraction * authoredTravel)'};
  const statics=[],meshes=[];function moving(o){for(let p=o;p;p=p.parent)if(d.leaves.some(l=>p===l.mesh))return true;return false;}
  lot.group.traverse(o=>{if(!o.isMesh||moving(o))return;assert(!o.isSkinnedMesh,'Unsupported static skin');const names=[];for(let p=o;p;p=p.parent)names.push(p.name||p.type);statics.push({object:o,path:names.reverse().join('/')});meshes.push(o);});
  row.staticMeshCount=statics.length;row.staticScope='Every lot mesh except the two target moving leaf subtrees; includes own fixed supports, other closed doors/curtains, full roof, actual room walls, floor, furniture and ornamental casing';
  const rayRows=[[],[],[]],near=[],inflated=expand(envelope,EPS),witnessPoints=[[10.8,1.3,-6.02],[10.8,1.3,-3.98]],centerProbe=envelope.min.map((v,i)=>(v+envelope.max[i])/2),probes=[...witnessPoints,centerProbe],probePrimitives=probes.map(()=>[]);let inspected=0,primitiveCount=0,verifiedPackedRanges=0;
  const projected=(a,b,axis)=>[0,1,2].every(i=>i===axis||a.min[i]<=b.max[i]+EPS&&a.max[i]>=b.min[i]-EPS);
  for(const sm of statics){budget();const o=sm.object,count=o.isInstancedMesh?o.count:1,ranges=o.userData.qaSourceRanges??[null];
   if(o.userData.qaSourceRanges){assert.equal(o.geometry.index,null);let next=0;for(const r of ranges){assert.equal(r.firstTriangle,next,'Original primitive ranges must partition all rendered triangles');next+=r.triangleCount;const a=o.geometry.attributes.position.array,part=a.subarray(r.firstTriangle*9,(r.firstTriangle+r.triangleCount)*9);assert.equal(globalThis.__qaHashPositions(part),r.positionSHA,'Actual packed positions must exactly match original transformed positions');verifiedPackedRanges++;}assert.equal(next*3,o.geometry.attributes.position.count);}
   for(let instance=0;instance<count;instance++){let matrix=o.matrixWorld;if(o.isInstancedMesh){matrix=new T.Matrix4();o.getMatrixAt(instance,matrix);matrix.premultiply(o.matrixWorld);}for(const range of ranges){const primitive=primitiveCount++,ts=[];let primitiveBounds=null;
    meshTriangles(o,matrix,(t,index)=>{if((++inspected%10000)===0)budget();ts.push(t);const b=K.bounds(t);primitiveBounds=primitiveBounds?union(primitiveBounds,b):b;const axes=[0,1,2].map(a=>projected(b,inflated,a));if(!axes.some(Boolean))return;const rec={t,b,path:sm.path,sourcePrimitive:range?.name??o.name,primitive,triangle:index,instance:o.isInstancedMesh?instance:null};axes.forEach((yes,a)=>{if(yes)rayRows[a].push(rec);});if(K.overlap(b,inflated,0))near.push(rec);},range);
    if(primitiveBounds)probes.forEach((p,i)=>{if(K.contains(primitiveBounds,p,EPS))probePrimitives[i].push({primitive,path:sm.path,name:range?.name??o.name,bounds:primitiveBounds,triangleCount:ts.length,firstTriangle:range?.firstTriangle??0,positionSHA:range?.positionSHA??null,containment:K.cardinalContainment(p,()=>ts,EPS)});});
   }}
  }
  row.sourcePrimitiveAudit={primitiveCount,verifiedPackedRanges,packedPositionBuffersIdentical:true,method:'Every packed triangle belongs to exactly one source primitive range; each range position SHA equals the original transformed source buffer. Other meshes retain their original separate identity. Containment is computed per original primitive and combined by union, never aggregated over overlapping solids.'};
  row.inspectedStaticTriangles=inspected;row.rayCandidateCounts=rayRows.map(a=>a.length);row.envelopeBoundaryCandidates=near.length;
  const containment=p=>K.cardinalContainment(p,(axis)=>rayRows[axis].map(s=>s.t),EPS);
  row.originalWitnesses=witnessPoints.map((p,i)=>({point:p,actualLeaf:K.cardinalContainment(p,()=>initial.flat(),EPS),aggregateStaticWorldDiagnostic:containment(p),actualSourcePrimitives:probePrimitives[i],actualPrimitiveUnionInside:probePrimitives[i].some(s=>s.containment.inside)}));
  if(stage==='before'){
   assert(row.originalWitnesses.every(w=>w.actualLeaf.inside&&w.actualPrimitiveUnionInside&&w.actualSourcePrimitives.some(p=>p.name==='White joined casing'&&p.triangleCount===12&&p.containment.inside)),'Both original actual-mesh wood/casing containment positives must remain detectable');
   row.positiveStaticTriangles=near.slice(0,12);row.status='PASS_ORIGINAL_COLLISION_DETECTED';
  }else{
   // A verified strict separating axis is a sound conservative certificate.
   // Triangle/AABB overlap never grants clearance and remains REVIEW.
   const center=envelope.min.map((v,i)=>(v+envelope.max[i])/2),half=envelope.min.map((v,i)=>(envelope.max[i]-v)/2),unit=[[1,0,0],[0,1,0],[0,0,1]];
   function separation(t){const edges=[K.sub(t[1],t[0]),K.sub(t[2],t[1]),K.sub(t[0],t[2])],axes=[...unit,K.cross(edges[0],edges[1])];for(const e of edges)for(const u of unit)axes.push(K.cross(e,u));let best=-Infinity;for(const axis of axes){const n=K.len(axis);if(n<1e-14)continue;const u=K.mul(axis,1/n),p=t.map(v=>K.dot(v,u)),c=K.dot(center,u),r=half.reduce((v,h,i)=>v+h*Math.abs(u[i]),0),gap=Math.max(Math.min(...p)-(c+r),(c-r)-Math.max(...p));best=Math.max(best,gap);}return best;}
   const unresolved=near.filter(s=>separation(s.t)<=EPS);row.fullSweepBoundary={candidateTriangles:near.length,separated:near.length-unresolved.length,unresolved:unresolved.length,witnesses:unresolved.slice(0,20)};
   row.freeVolumeProbe={point:center,aggregateDiagnostic:containment(center),actualSourcePrimitives:probePrimitives[2]};
   // Once no static boundary enters this connected full swept box, its
   // containment is constant. Six zero oriented winding sums at an interior
   // point for EACH original primitive certify the box is outside their union.
   // Primitives whose actual AABB excludes the point cannot contain it.
   const free=probePrimitives[2].every(p=>p.containment.rays.every(r=>r.sum===0));
   row.closedRays={count:0,leaks:[]};const opaque=[...meshes];for(const l of d.leaves)l.mesh.traverse(o=>{if(o.isMesh)opaque.push(o);});
   for(const y of[.35,1.3,d.apertureHeight-.18])for(const yaw of[-60,-30,0,30,60,120,150,180,210,240])for(const x of[-d.width/2+.003,-d.width/2+.012,-.015,0,.015,d.width/2-.012,d.width/2-.003]){budget();const angle=yaw*Math.PI/180,dir=new T.Vector3(Math.sin(angle),0,Math.cos(angle)).transformDirection(d.group.matrixWorld),target=new T.Vector3(x,y,0).applyMatrix4(d.group.matrixWorld),origin=target.clone().addScaledVector(dir,-.8),ray=new T.Raycaster(origin,dir,0,1.6);row.closedRays.count++;if(!ray.intersectObjects(opaque,false).length)row.closedRays.leaks.push({x,y,yaw});}
   row.originalImagePixelProbes=[];
   for(const view of [{image:'france-visual-0937/pocket-closed-back.png',position:[13.8,1.9,-5.7],target:[10.8,1.9,-5],pixels:[[380,300],[384,300],[388,300],[380,500],[384,500],[388,500],[380,750],[384,750],[388,750],[380,855],[384,855],[388,855]]},{image:'france-visual-0939/pocket-closed-oblique.png',position:[9.65,1.9,-2.9],target:[10.8,1.9,-5],pixels:[[489,200],[495,200],[502,200],[489,500],[495,500],[502,500],[489,750],[495,750],[502,750],[489,825],[495,825],[502,825]]}])for(const pixel of view.pixels){
    const camera=new T.PerspectiveCamera(62,4/3,.12,160);camera.position.set(...view.position);camera.lookAt(new T.Vector3(...view.target));camera.updateMatrixWorld(true);const ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((pixel[0]+.5)/1280*2-1,1-(pixel[1]+.5)/960*2),camera);
    const distances=[10.55,11.05].map(x=>(x-ray.ray.origin.x)/ray.ray.direction.x).sort((a,b)=>a-b),hits=ray.intersectObjects(opaque,false),record=h=>{const range=h.object.userData.qaSourceRanges?.find(r=>h.faceIndex>=r.firstTriangle&&h.faceIndex<r.firstTriangle+r.triangleCount);return {distance:h.distance,point:h.point.toArray(),mesh:h.object.name,sourcePrimitive:range?.name??h.object.name,triangle:h.faceIndex,primitiveRange:range?{firstTriangle:range.firstTriangle,triangleCount:range.triangleCount,positionSHA:range.positionSHA}:null};};
    row.originalImagePixelProbes.push({image:view.image,pixel,camera:view.position,target:view.target,fov:62,size:[1280,960],rayOrigin:ray.ray.origin.toArray(),rayDirection:ray.ray.direction.toArray(),wallCrossingDistance:distances,firstHit:hits.length?record(hits[0]):null,closureIntervalHits:hits.filter(h=>h.distance>=distances[0]-EPS&&h.distance<=distances[1]+EPS).slice(0,5).map(record)});
   }
   row.status=unresolved.length||!free?'REVIEW':row.closedRays.leaks.length?'FAIL_CLOSED_RAYS':'PASS_FULL_SCENE_AFFINE_POCKET';
  }
  row.elapsedSeconds=(Date.now()-started)/1000;dump();console.log({stage,status:row.status,triangles:inspected,boundaryCandidates:near.length,rssMiB:process.memoryUsage().rss/1048576});
  api.dispose();const disposed=new Set();lot.group.traverse(o=>{if(o.geometry&&!disposed.has(o.geometry)){disposed.add(o.geometry);o.geometry.dispose();}});cache.clear();
  if(row.status==='REVIEW'||row.status.startsWith('FAIL'))break;
 }
 report.status=report.stages.length===2&&report.stages[0].status==='PASS_ORIGINAL_COLLISION_DETECTED'&&report.stages[1].status==='PASS_FULL_SCENE_AFFINE_POCKET'?'PASS':report.stages.some(s=>s.status.startsWith('FAIL'))?'FAIL':'REVIEW';report.elapsedSeconds=(Date.now()-started)/1000;report.rssMiB=process.memoryUsage().rss/1048576;dump();console.log({status:report.status,output:OUT,elapsedSeconds:report.elapsedSeconds});if(report.status!=='PASS')process.exitCode=1;
})().catch(e=>{report.status='REVIEW';report.error=e.stack;report.elapsedSeconds=(Date.now()-started)/1000;dump();console.error(e);process.exitCode=1;});
