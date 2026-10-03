// Portable geometric controls and exact preserved A/C failure inputs.
// No historical source checkout or live old character is needed.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {createBrowserModuleLoader}=require('./fixtures/browser-module-loader.cjs');
const {createGarmentProbe,classifyGarmentUnion}=require('./fixtures/garment-section-probe.cjs');
(async()=>{
 const fixturePath=path.join(__dirname,'fixtures/r16-clipping-witnesses.json'),data=JSON.parse(fs.readFileSync(fixturePath,'utf8')),load=createBrowserModuleLoader(process.env.SOURCE_ROOT||'source'),T=await load('vendor/three/build/three.module.js'),controls=[],rows=[];
 assert.equal(data.schema,1);assert.equal(data.fixtures.length,10);assert.equal(data.fixtures.filter(f=>f.oldClassification==='INSIDE_OVER_TOLERANCE').length,1);
 function box(name,x){const g=new T.BoxGeometry(2,2,2);g.translate(x,0,0);const probe=createGarmentProbe(T,g.attributes.position.array,Array.from(g.index.array),{name});g.dispose();return probe;}
 const cube=box('cube',0),inside=cube.classify(new T.Vector3(0,0,0)),outside=cube.classify(new T.Vector3(2,0,0));assert.equal(inside.status,'INSIDE');assert(Math.abs(inside.nearest.distance-1)<1e-10);assert.equal(outside.status,'OUTSIDE');controls.push({name:'known-inside',result:inside},{name:'known-outside',result:outside});
 const near=cube.classify(new T.Vector3(.997,0,0)),deep=cube.classify(new T.Vector3(.995,0,0));assert.equal(near.status,'INSIDE');assert(near.nearest.distance<.004);assert.equal(deep.status,'INSIDE');assert(deep.nearest.distance>.004);controls.push({name:'unchanged-4mm-actual-triangle-distance',near,deep});
 const union=classifyGarmentUnion([box('left',-.25),box('right',.25)],new T.Vector3(0,0,0));assert(union.inside&&!union.review);assert.equal(union.results.filter(r=>r.status==='INSIDE').length,2);controls.push({name:'overlapping-shell-union',result:union});
 const plane=new T.PlaneGeometry(2,2),sheet=createGarmentProbe(T,plane.attributes.position.array,Array.from(plane.index.array),{name:'deliberately-open-sheet'}),unresolved=sheet.classify(new T.Vector3(0,0,0));plane.dispose();assert.equal(unresolved.status,'REVIEW','relevant open sheet must not become outside or pass');controls.push({name:'unresolved-open-sheet',result:unresolved});
 // World rotation, translation and scale do not justify closing a tilted rim.
 const transform=new T.Matrix4().compose(new T.Vector3(1.2,-.7,2.3),new T.Quaternion().setFromEuler(new T.Euler(0,.71,.35)),new T.Vector3(1.085,1.035,1.065)),tube=new T.CylinderGeometry(1,1,2,16,1,true);tube.applyMatrix4(transform);
 const tilted=createGarmentProbe(T,tube.attributes.position.array,Array.from(tube.index.array),{name:'tilted-real-open-rim'}),below=tilted.classify(new T.Vector3(0,.99,0).applyMatrix4(transform)),above=tilted.classify(new T.Vector3(0,1.05,0).applyMatrix4(transform));tube.dispose();assert.equal(below.status,'REVIEW','within support bounds, an open section stays unresolved');assert.equal(above.status,'OUTSIDE');assert.equal(above.reason,'actual-vertex-support-halfspace');controls.push({name:'tilted-rim-inside-support-retains-review',result:below},{name:'tilted-rim-world-transform-outside-proof',result:above});
 for(const f of data.fixtures){
  assert.equal(f.encoding.positions,'base64-float32-le');assert.equal(f.encoding.indices,'base64-uint16-le');
  const pb=Buffer.from(f.positionsBase64,'base64'),ib=Buffer.from(f.indicesBase64,'base64'),positions=new Float32Array((Math.max(...f.originalVertexIndices)+1)*3),indices=[];assert.equal(pb.length,f.originalVertexIndices.length*12);
  for(let i=0;i<f.originalVertexIndices.length;i++)for(let k=0;k<3;k++)positions[f.originalVertexIndices[i]*3+k]=pb.readFloatLE((i*3+k)*4);
  for(let i=0;i<ib.length;i+=2)indices.push(f.originalVertexIndices[ib.readUInt16LE(i)]);assert.equal(indices.length,f.garmentRange.indexCount);
  const point=new T.Vector3(...f.query.point),probe=createGarmentProbe(T,positions,indices,f.garmentRange),section=probe.sectionAt(point.y),result=probe.classify(point);
  if(f.oldClassification==='REVIEW'){
   assert.equal(section.status,'REVIEW','original unresolved section remains present');
   if(result.status==='OUTSIDE'){
    assert.equal(result.reason,'actual-vertex-support-halfspace');const proof=result.support,origin=new T.Vector3(...proof.origin),normal=new T.Vector3(...proof.normal);assert(Math.abs(normal.length()-1)<1e-10);
    let min=Infinity,max=-Infinity;for(const i of new Set(indices)){const projection=new T.Vector3().fromArray(positions,i*3).sub(origin).dot(normal);min=Math.min(min,projection);max=Math.max(max,projection);}const projection=point.clone().sub(origin).dot(normal),gap=Math.max(projection-max,min-projection);assert(gap>proof.numericalGuard);assert.equal(proof.verticesChecked,new Set(indices).size);assert(Math.abs(min-proof.minimumProjection)<1e-12&&Math.abs(max-proof.maximumProjection)<1e-12&&Math.abs(gap-proof.separation)<1e-12,'independent all-vertex certificate verification');
   }else assert.equal(result.status,'REVIEW','unproved old inputs must retain REVIEW');
  }else if(f.oldClassification==='INSIDE_OVER_TOLERANCE'){
   assert.equal(result.status,'INSIDE','fixed original real collision must remain a positive');assert.equal(section.status,'CLOSED');assert.equal(section.segments,52);assert(result.nearest.distance>.004);assert.equal(f.expected.tolerance,.004);assert(Math.abs(result.nearest.distance-f.expected.distance)<1e-12,'preserved exact positive distance');assert.equal(result.nearest.triangleInSourcePart,f.expected.triangleInSourcePart);assert.equal(result.nearest.triangleInMergedCloth,f.expected.triangleInMergedCloth);assert.deepEqual(result.nearest.clothVertexIndices,f.expected.clothVertexIndices);
  }else{assert.equal(f.oldClassification,'ODD_RAY_FALSE_POSITIVE');assert.equal(result.status,'OUTSIDE');}
  rows.push({id:f.id,sourceVersion:f.sourceVersion,sourceSha256:f.sourceSha256,expectedStatus:f.oldClassification==='INSIDE_OVER_TOLERANCE'?'INSIDE':'OUTSIDE',frame:f.frame,query:f.query,garment:f.garmentRange.name,section,result});
 }
 const status=rows.every(r=>r.result.status===r.expectedStatus)?'PASS':'REVIEW',report={status,scope:'Synthetic controls and ten fixed actual garment inputs, including one required positive; not current-source matrix or visual acceptance',fixtureSha256:crypto.createHash('sha256').update(fs.readFileSync(fixturePath)).digest('hex'),controls,rows};fs.mkdirSync('qa',{recursive:true});fs.writeFileSync('qa/r16-garment-probe-regressions.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify({status,controls:controls.length,fixtures:rows.length,rows:rows.map(r=>({id:r.id,frame:r.frame,vertexIndex:r.query.vertexIndex,garment:r.garment,expectedStatus:r.expectedStatus,status:r.result.status,reason:r.result.reason,separation:r.result.support?.separation,insideDistance:r.result.nearest?.distance}))},null,2));if(status!=='PASS')process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1);});
