// Bounded CPU clipping gate against actual posed garment triangles. No scenes.
// Relevant unresolved horizontal sections stop with REVIEW, never a silent pass.
const assert=require('node:assert/strict'),fs=require('node:fs');
const {createBrowserModuleLoader}=require('./fixtures/browser-module-loader.cjs');
const {createGarmentProbe,classifyGarmentUnion}=require('./fixtures/garment-section-probe.cjs');
const TOLERANCE=.004;
const bodyNames=/^(continuous-yukata-body|haori-jacket-body|scholar-upper-robe|scholar-long-robe-body|scholar-split-tunic-body|ruqun-pleated-skirt|ruqun-crossed-bodice|ruqun-short-overjacket|linen-fitted-tunic|linen-wrapped-kilt|linen-ankle-dress-body|fitted-court-bodice|court-full-gown-skirt|royal-frock-bodice|miko-white-kosode-body|miko-vermillion-hakama-skirt)$/;
function save(name,result){fs.mkdirSync('qa',{recursive:true});fs.writeFileSync(`qa/${name}.json`,JSON.stringify(result,null,2));}
(async()=>{
 const load=createBrowserModuleLoader(process.env.SOURCE_ROOT||'source'),C=await load('game/characters.js'),A=await load('game/appearance.js'),S=await load('game/character-traits.js'),T=await load('vendor/three/build/three.module.js');
 function posedProbes(cloth){
  const point=new T.Vector3(),positions=new Float32Array(cloth.geometry.attributes.position.count*3);for(let i=0;i<positions.length/3;i++){cloth.getVertexPosition(i,point);point.toArray(positions,i*3);}
  return cloth.geometry.userData.sourceRanges.filter(r=>bodyNames.test(r.name)).map(r=>createGarmentProbe(T,positions,Array.from(cloth.geometry.index.array.slice(r.indexStart,r.indexStart+r.indexCount)),r));
 }
 if(process.argv.includes('--controls')){
  const rows=[];
  function box(name,x){const g=new T.BoxGeometry(2,2,2);g.translate(x,0,0);const p=createGarmentProbe(T,g.attributes.position.array,Array.from(g.index.array),{name});g.dispose();return p;}
  const main=box('box',0),inside=main.classify(new T.Vector3(0,0,0)),outside=main.classify(new T.Vector3(2,0,0));
  assert.equal(inside.status,'INSIDE');assert(Math.abs(inside.nearest.distance-1)<1e-10);assert.equal(outside.status,'OUTSIDE');rows.push({control:'known-positive',result:inside},{control:'known-outside',result:outside});
  const near=main.classify(new T.Vector3(.997,0,0)),deep=main.classify(new T.Vector3(.995,0,0));assert.equal(near.status,'INSIDE');assert(near.nearest.distance<TOLERANCE);assert.equal(deep.status,'INSIDE');assert(deep.nearest.distance>TOLERANCE);rows.push({control:'actual-triangle-4mm-tolerance',near,deep});
  const union=classifyGarmentUnion([box('left',-.25),box('right',.25)],new T.Vector3(0,0,0));assert(union.inside&&!union.review);assert.equal(union.results.filter(r=>r.status==='INSIDE').length,2);rows.push({control:'overlapping-garment-union',result:union});
  const sheetGeometry=new T.PlaneGeometry(2,2),sheet=createGarmentProbe(T,sheetGeometry.attributes.position.array,Array.from(sheetGeometry.index.array),{name:'deliberately-open-sheet'}),open=sheet.classify(new T.Vector3(0,0,0));sheetGeometry.dispose();assert.equal(open.status,'REVIEW');rows.push({control:'open-sheet-requires-review',result:open});
  const archived=JSON.parse(fs.readFileSync(require('node:path').join(__dirname,'fixtures/r16-clipping-witnesses.json'),'utf8'));
  for(const f of archived.fixtures.filter(f=>f.sourceVersion==='A')){
   assert.equal(f.sourceSha256['game/characters.js'],'a0d975937178b14e24cd5ec24cfa3858c9df921395244be2b06fc61a19f55b03','original A source provenance');
   const pb=Buffer.from(f.positionsBase64,'base64'),ib=Buffer.from(f.indicesBase64,'base64'),positions=new Float32Array((Math.max(...f.originalVertexIndices)+1)*3),indices=[];
   for(let i=0;i<f.originalVertexIndices.length;i++)for(let k=0;k<3;k++)positions[f.originalVertexIndices[i]*3+k]=pb.readFloatLE((i*3+k)*4);for(let i=0;i<ib.length;i+=2)indices.push(f.originalVertexIndices[ib.readUInt16LE(i)]);
   const point=new T.Vector3(...f.query.point),probe=createGarmentProbe(T,positions,indices,f.garmentRange),result=probe.classify(point);assert.equal(result.status,'OUTSIDE');
   if(f.oldClassification==='REVIEW'){assert.equal(result.reason,'actual-vertex-support-halfspace');assert.equal(probe.sectionAt(point.y).status,'REVIEW','original open section remains unresolved without proof');}
   rows.push({control:f.id,frame:f.frame,query:f.query,garment:f.garmentRange.name,sourceSha256:f.sourceSha256,result});
  }
  assert.equal(C.characterResourceStats().activeReferences,0);const result={status:'PASS',scope:'Focused containment controls; not the Japan matrix',rows};save('r16-gait-clipping-controls',result);console.log(JSON.stringify(result,null,2));return;
 }
 const traits=[null,...['min','max'].map(bound=>Object.fromEntries(Object.entries(S.SHAPE_RANGES).map(([key,range])=>[key,range[bound]])))],japanOnly=process.argv.includes('--japan'),looks=[];
 // The shared bath robe is authored before cultural branches: cover it once.
 for(const culture of japanOnly?['japan']:Object.keys(A.WARDROBE_PRESETS))for(const bodyPreset of A.BODY_PRESETS)for(const shapeTraits of traits){const sex=bodyPreset.startsWith('masculine')?'masculine':'feminine';for(const wardrobePreset of [...A.WARDROBE_PRESETS[culture][sex],...(culture==='japan'?['miko-hakama','bath-robe']:[])])looks.push({culture,bodyPreset,wardrobePreset,shapeTraits,...(wardrobePreset==='miko-hakama'?{locomotionWardrobePreset:'haori-trouser'}:{})});}
 const rows=[],insideSamples=[],failures=[],point=new T.Vector3();let testedVertices=0,containmentSamples=0,poses=0;
 actors:for(const opts of looks){
  const actor=C.createCharacter(opts),cloth=actor.root.getObjectByName('continuous-tailored-cloth'),skin=actor.root.getObjectByName('approved-face-skin'),row={culture:opts.culture,bodyPreset:opts.bodyPreset,wardrobePreset:opts.wardrobePreset,legLength:opts.shapeTraits?.legLength??1,minFloor:Infinity,handsInside:0,lowSleevesInside:0,poses:0};
  try{
   phases:for(let frame=1;frame<=32;frame++){
    actor.root.position.z+=actor.locomotion.strideLength/32;actor.animate(frame/60,true,null,{groundHeightAt:()=>0,footprintHeightAt:()=>0});if(frame%4)continue;row.poses++;poses++;actor.root.updateMatrixWorld(true);cloth.skeleton.update();const probes=posedProbes(cloth);assert(probes.length,'wardrobe must have selected garment bodies');
    for(const mesh of [cloth,skin])for(const range of mesh.geometry.userData.sourceRanges){
     const hand=/^(relaxed-palm|relaxed-finger|thumb-)/.test(range.name),sleeve=/sleeve/.test(range.name),position=mesh.geometry.attributes.position,sourceY=mesh.geometry.attributes.sourceY;
     for(let i=range.start;i<range.start+range.count;i+=hand?4:8){
      mesh.getVertexPosition(i,point);testedVertices++;assert(point.toArray().every(Number.isFinite),'finite CPU-skinned position');const floor=point.y*actor.root.scale.y;row.minFloor=Math.min(row.minFloor,floor);
      const witness=()=>({culture:opts.culture,bodyPreset:opts.bodyPreset,wardrobePreset:opts.wardrobePreset,shapeTraits:opts.shapeTraits,legLength:row.legLength,frame,timeSeconds:frame/60,gaitPhase:actor.getPoseMetrics().gaitPhase,rootPosition:actor.root.position.toArray(),mesh:mesh.name,part:range.name,vertexIndex:i,vertexIndexInSourcePart:i-range.start,point:point.toArray()});
      if(floor<-.003){failures.push({...witness(),kind:'below-floor',floor});break phases;}
      if(!hand&&(!sleeve||(sourceY?.getX(i)??position.getY(i))>1.065))continue;
      containmentSamples++;const union=classifyGarmentUnion(probes,point);
      for(const result of union.results){
       if(result.status==='REVIEW'){failures.push({...witness(),kind:'unresolved-topology',garment:result.garment,section:result.section});break phases;}
       if(result.status==='INSIDE'){
        const item={...witness(),garment:result.garment,nearest:result.nearest,section:result.section,tolerance:TOLERANCE};insideSamples.push(item);
        if(result.nearest.distance>TOLERANCE){row[hand?'handsInside':'lowSleevesInside']++;failures.push({...item,kind:'inside-garment'});break phases;}
       }
      }
     }
    }
   }
  }finally{actor.dispose();}
  rows.push(row);if(failures.length)break actors;
 }
 assert.equal(C.characterResourceStats().activeReferences,0);
 const status=failures.some(f=>f.kind==='unresolved-topology')?'REVIEW':failures.length?'FAIL':'PASS',report={status,scope:'Sampled CPU points against actual per-garment indexed bounds and validated horizontal sections; inside clearance uses the nearest actual triangle. Not exhaustive triangle collision or visual acceptance.',tolerance:TOLERANCE,plannedActors:looks.length,plannedPoses:looks.length*8,actors:rows.length,poses,testedVertices,containmentSamples,insideSamples,failures,rows};
 save('r16-gait-clipping',report);console.log(JSON.stringify({status,plannedActors:report.plannedActors,actors:rows.length,poses,testedVertices,containmentSamples,insideSamples:insideSamples.length,failures},null,2));assert.equal(status,'PASS','garment containment or relevant topology needs review');
})().catch(error=>{console.error(error);process.exit(1);});
