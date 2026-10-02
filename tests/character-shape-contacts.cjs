/** Reuse the independent R12 geometry assertions with explicit R13 morphs.
 * Only actor construction and anatomical source-Y lookup are adapted; contact,
 * floor, skin intersection and stance-slip tolerances are unchanged.
 * Run: node tests/character-shape-contacts.cjs
 */
const {spawnSync}=require('node:child_process'),fs=require('node:fs'),path=require('node:path');
const output=path.resolve('qa/shape-contacts');fs.mkdirSync(output,{recursive:true});
const tests=['lie-support-contact','rest-bath-contact','furniture-seat-contact','miko-seat-contact','miko-role','characters','character-hand-clearance','character-transitions','character-stairs-japan','character-stairs-egypt'];
const extremes=[{jawWidth:.84,legLength:1.06,eyeSize:1.2,noseSize:.8,noseWidth:.8,socketDepth:1.65},{jawWidth:1.12,legLength:.94,eyeSize:.82,noseSize:1.18,noseWidth:1.18,socketDepth:.65}];
const jobs=extremes.flatMap((traits,i)=>tests.map(name=>({traits,name,id:'endpoint-'+i}))).concat([.95,.96,.97,.98,.99,1.01,1.02,1.03,1.04,1.05].flatMap(legLength=>['lie-support-contact','furniture-seat-contact'].map(name=>({traits:{legLength},name,id:'leg-'+legLength}))));
const report={status:'PASS',assertions:'Unchanged R12 independent contact, floor, intersection and gait limits',jobs:[]};
for(const {traits,name,id}of jobs){
 let source=fs.readFileSync(path.resolve('tests',name+'.cjs'),'utf8').replace(/\b([A-Z])\.createCharacter\(/g,'((opts)=>$1.createCharacter({...opts,shapeTraits:SHAPE_TRAITS}))(');
 // R12 seeded fixtures remain explicitly neutral, even in the role outfit test.
 if(name==='miko-role')source=source.replace('((opts)=>C.createCharacter({...opts,shapeTraits:SHAPE_TRAITS}))(opts)','C.createCharacter(opts)');
 if(name==='lie-support-contact')source=source.replace('sy=attr.getY(i);','sy=o.geometry.attributes.sourceY?.getX(i)??attr.getY(i);');
 source='const SHAPE_TRAITS='+JSON.stringify(traits)+';\n'+source.replace(/\b__dirname\b/g,JSON.stringify(path.resolve('tests')));
 const start=performance.now(),r=spawnSync(process.execPath,['--experimental-vm-modules','-e',source],{encoding:'utf8',maxBuffer:32*1024*1024});
 fs.writeFileSync(path.join(output,id+'-'+name+'.json'),r.stdout||'');fs.writeFileSync(path.join(output,id+'-'+name+'.log'),r.stderr||'');
 const row={id,name,passed:r.status===0,elapsedMs:Math.round(performance.now()-start)};report.jobs.push(row);console.log(row.passed?'PASS':'FAIL',id,name,row.elapsedMs+'ms');
 if(!row.passed){report.status='FAIL';console.error(r.stderr);}
}
fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));process.exit(report.status==='PASS'?0:1);
