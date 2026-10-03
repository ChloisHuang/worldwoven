// Pure custom Three fixture: evaluates source functions but NEVER calls buildEgypt.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const I=require('./egypt-ashlar-instrumentation-v1.cjs');
const root=path.resolve(process.env.SOURCE_ROOT||path.join(__dirname,'../../source')),out=path.resolve(process.env.QA_OUT||path.join(__dirname,'../../qa/door-geometry/tiny'));
fs.mkdirSync(out,{recursive:true});const report={status:'RUNNING',authoredSceneBuilt:false,productionEdited:false,sourceRoot:root,loadedSourceHashes:{},cases:[],bufferEquivalence:null};const save=()=>fs.writeFileSync(path.join(out,'ashlar-provenance-fixtures-v1.json'),JSON.stringify(report,null,2));
async function factory(instrumented){
 const cache=new Map(),hm=new vm.SyntheticModule(['hashMesh'],function(){this.setExport('hashMesh',I.hashMesh);});
 function mod(f){if(cache.has(f))return cache.get(f);let s=fs.readFileSync(f,'utf8');report.loadedSourceHashes[path.relative(root,f)]=I.digest(s);
  if(f.endsWith('/egypt-temple.js')){if(I.digest(s)!==I.SOURCE_SHA)throw Error('Unreviewed Egypt input');if(instrumented)s=I.instrument(s);s+='\nexport {solid as qaSolid,mesh as qaMesh,batchZone as qaBatch'+(instrumented?',__qaAshlarRegistry as qaRegistry,__qaAshlarBatchAudits as qaAudits':'')+'};\n';}
  const m=new vm.SourceTextModule(s,{identifier:f});cache.set(f,m);return m;
 }
 const link=(s,m)=>s==='qa:ashlar-hash'?hm:mod(s==='three'?root+'/vendor/three/build/three.module.js':path.resolve(path.dirname(m.identifier),s.split('?')[0]));const m=mod(root+'/game/egypt-temple.js');await m.link(link);await m.evaluate();
 if(I.digest(fs.readFileSync(root+'/vendor/three/build/three.core.js'))!==I.THREE_SHA)throw Error('Unreviewed Three source');
 return {api:m.namespace,T:mod(root+'/vendor/three/build/three.module.js').namespace};
}
const colliderNumeric=b=>Object.fromEntries(['minX','maxX','minY','maxY','minZ','maxZ'].map(k=>[k,b[k]]));
function snap(g,cs,cam){g.updateMatrixWorld(true);const meshes=[];g.traverse(o=>{if(o.isMesh)meshes.push({name:o.name,matrix:o.matrixWorld.toArray(),data:I.hashMesh(o)});});return {meshes,colliders:cs.map(colliderNumeric),camera:cam.map(colliderNumeric)};}
(async()=>{
 const K=await import('./triangle-kernel-v3.mjs'),{evaluateRailSupport}=await import('./gathered-rail-support-v1.mjs'),{selectActualAshlarSupport}=await import('./actual-ashlar-support-v1.mjs'),EPS=1e-5;
 const fixtures=[];
 for(const instrumented of [false,true]){
  const {api,T}=await factory(instrumented),g=new T.Group(),cs=[],cam=[];g.name='Tiny actual source ashlar supports';
  for(const s of I.specs)api.qaSolid(g,cs,cam,...s.args,0xcaa36c);
  // One real incomplete ornamental skin, within dining-left's bounds, facing +X.
  const x=13.0,y=3.345,z=-5.85,p=[x,y-.05,z-.05,x,y+.05,z-.05,x,y+.05,z+.05,x,y-.05,z-.05,x,y+.05,z+.05,x,y-.05,z+.05];
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(p,3));geo.computeVertexNormals();api.qaMesh(g,geo,0xcaa36c);
  const before=snap(g,cs,cam);api.qaBatch(g);const after=snap(g,cs,cam);fixtures.push({instrumented,api,T,g,cs,cam,before,after});
 }
 assert.deepEqual(fixtures[1].before,fixtures[0].before,'Original/instrumented prebatch numeric buffers, materials, transforms, colliders differ');
 assert.deepEqual(fixtures[1].after,fixtures[0].after,'Original/instrumented postbatch numeric buffers, materials, ordering, transforms, colliders differ');
 report.bufferEquivalence={sourceFunctions:'Exact source solid, ashlar, batchZone; no authored lot',beforeOriginalSha256:I.digest(JSON.stringify(fixtures[0].before)),beforeInstrumentedSha256:I.digest(JSON.stringify(fixtures[1].before)),afterOriginalSha256:I.digest(JSON.stringify(fixtures[0].after)),afterInstrumentedSha256:I.digest(JSON.stringify(fixtures[1].after)),identical:true,original:fixtures[0].after,instrumented:fixtures[1].after};
 const f=fixtures[1],rows=[];f.g.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position;for(let i=0;i<p.count;i+=3){const t=[0,1,2].map(j=>new f.T.Vector3(p.getX(i+j),p.getY(i+j),p.getZ(i+j)).applyMatrix4(o.matrixWorld).toArray()),n=K.cross(K.sub(t[1],t[0]),K.sub(t[2],t[0]));rows.push({t,b:K.bounds(t),normal:K.mul(n,1/K.len(n)),object:o,mesh:0,path:'source-generated batch',triangle:i/3,instance:null});}});
 const index=rs=>{const surface=new K.SpatialIndex(.5),rays=[0,1,2].map(a=>new K.SpatialIndex(.5,[0,1,2].filter(i=>i!==a)));rs.forEach((r,i)=>{surface.add(i,r.b);for(const q of rays)q.add(i,r.b);});return {tris:rs,surface,rays};};
 const jambs=id=>f.cs.map((b,i)=>({index:i,original:b,box:{min:[b.minX,b.minY,b.minZ],max:[b.maxX,b.maxY,b.maxZ]}})).filter(j=>f.api.qaRegistry.some(r=>r.id===j.original.qaAshlarSupportId&&r.openingId===id));
 const endpoints=(id,js)=>{const axis=id==='private-bath-entry'?2:0,normal=axis===0?2:0,y=id==='dining-entry'||id==='kitchen-entry'?3.345:3.385;return js.map((j,i)=>{const center=[0,y,0];center[axis]=i===0?j.box.max[axis]-.01:j.box.min[axis]+.01;center[normal]=(j.box.min[normal]+j.box.max[normal])/2;const rim=Array.from({length:8},(_,k)=>{const p=[...center];p[1]+=.006*Math.cos(k*Math.PI/4);p[normal]+=.006*Math.sin(k*Math.PI/4);return p;});return {side:i===0?-1:1,center,points:[...rim,center],triangles:rim.map((p,k)=>[center,p,rim[(k+1)%8]])};});};
 const check=(id,rs=rows,select=true,cam=f.cam)=>{const js=jambs(id);return evaluateRailSupport({endpoints:endpoints(id,js),jambs:js,index:index(rs),eps:EPS,selectSupportTriangles:select?(j,rs)=>selectActualAshlarSupport({jamb:j,rows:rs,registry:f.api.qaRegistry,cameraColliders:cam,openingId:id,eps:EPS}):null});};
 for(const id of [...new Set(I.specs.map(s=>s.openingId))]){const r=check(id);assert.equal(r.status,'PASS_ACTUAL_ROD_ENDCAP_SUPPORT',id);assert(r.ends.every(e=>e.attempts.some(a=>a.selectionProof?.selectedTriangles===44)));report.cases.push({name:'actual source support '+id,expected:'PASS',actual:r.status,proof:r});}
 const raw=check('dining-entry',rows,false);assert.equal(raw.status,'FAIL_UNPROVEN_RAIL_SUPPORT','Raw incomplete ornament must reproduce contamination');report.cases.push({name:'raw ornament contamination',expected:'FAIL',actual:raw.status,proof:raw});
 const solidId='egypt-dining-entry-0',owned=r=>r.object.userData.qaAshlarRanges.some(a=>a.primitiveId===solidId&&r.triangle>=a.firstTriangle&&r.triangle<a.firstTriangle+a.triangleCount),ownedRows=rows.filter(owned);assert.equal(ownedRows.length,44);
 for(const [name,rs]of [['missing actual primitive with unchanged bounds/identity',rows.filter(r=>!owned(r))],['missing one actual triangle',rows.filter(r=>r!==ownedRows[0])],['reversed actual triangle',rows.map(r=>r===ownedRows[0]?{...r,t:[r.t[0],r.t[2],r.t[1]]}:r)]]){const r=check('dining-entry',rs);assert.equal(r.status,'FAIL_UNPROVEN_RAIL_SUPPORT',name);assert.equal(r.ends[0].accepted,false);assert.equal(r.ends[1].accepted,true);report.cases.push({name,expected:'FAIL',actual:r.status,proof:r});}
 const wrongCam=check('dining-entry',rows,true,f.cam.filter(c=>c.qaAshlarSupportId!==solidId));assert.equal(wrongCam.status,'FAIL_UNPROVEN_RAIL_SUPPORT');report.cases.push({name:'missing same-id finite collider',expected:'FAIL',actual:wrongCam.status});
 report.metadataBufferAudits=f.api.qaAudits;report.status='PASS_TINY_ACTUAL_ASHLAR_PROVENANCE';report.summary={cases:report.cases.length,renderedBufferEquivalence:true,reviewedPrimitiveCount:f.api.qaRegistry.length,sourceGeometryUnchanged:true};save();console.log(JSON.stringify({status:report.status,summary:report.summary,output:path.join(out,'ashlar-provenance-fixtures-v1.json')},null,2));
 for(const q of fixtures)q.g.traverse(o=>o.geometry?.dispose());
})().catch(e=>{report.status='FAIL_OR_INCOMPLETE';report.error={message:e.message,stack:e.stack};save();console.error(e);process.exitCode=1;});
