// Reuse the existing production triangle/sweep runner for the two Egyptian hinges.
// The eight unchanged curtain-jamb provenance tuples stay instrumented, but no
// curtain is selected and there are no legacy mounting-contact exemptions.
if(process.env.QA_RESOURCE_WINDOW!=='granted-by-owner')throw Error('Owner resource window required');
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict'),Module=require('module');
const root=path.resolve(__dirname,'../..'),hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
process.env.SOURCE_ROOT=root+'/source';process.env.QA_OUT||=root+'/qa/egypt-inset-sweep';
const guards={
 'source/game/egypt-temple.js':'b3d3e3971b1b3946646971149b2f852ac3f17ce60f65bcc9b2dee9220f6cb868',
 'source/game/automatic-doors.js':'fd788f9e229cc27052c12d0331d2b73e5b567d84664c361005f310fef4f01195',
 'tests/door-geometry/leaf-static-adaptive-v7.cjs':'5ed0ceba84c79d16e720dc71d8f7b385906626f4b89f88f17ef251c0d256e212'
};for(const [f,h]of Object.entries(guards))assert.equal(hash(root+'/'+f),h,'Reviewed source '+f);
const ashlarFile=root+'/tests/door-geometry/egypt-ashlar-instrumentation-v1.cjs',ashlar=new Module(ashlarFile,module);ashlar.filename=ashlarFile;ashlar.paths=module.paths;
let ashlarSource=fs.readFileSync(ashlarFile,'utf8');assert(ashlarSource.includes("const SOURCE_SHA='89c08f1c87abbc5b2ff1c5856c3f810c9dfda111fa181e0839ef2aed23e447d7'"));ashlarSource=ashlarSource.replace("const SOURCE_SHA='89c08f1c87abbc5b2ff1c5856c3f810c9dfda111fa181e0839ef2aed23e447d7'","const SOURCE_SHA='"+guards['source/game/egypt-temple.js']+"'");ashlar._compile(ashlarSource,ashlarFile);require.cache[ashlarFile]=ashlar;
const file=root+'/tests/door-geometry/leaf-static-adaptive-v7.cjs';let source=fs.readFileSync(file,'utf8');const once=(from,to)=>{assert.equal(source.split(from).length,2,'Adapter anchor');source=source.replace(from,to);};
once("const approvedAffinePoseHash='1997f6cbb9131263ba5ec07c6209ece9b8ce2c2395689128c41be56345da7a2d'","const approvedAffinePoseHash='d79172e65b6a1224a755e6504058b7f1e7eb5937daa70160bdd0e9d28b54c719'");
source=source.replace('unchanged affine slide/gather; hinge pin normal=-swing*.18 and inverse mesh translation','live inset hinge pin plus inverse mesh translation; actual world pin read from the production matrix');
once(' function mountAllowed(d,leaf,event,staticRow,jambs){',' function mountAllowed(d,leaf,event,staticRow,jambs){\n  return null; // Inset hinges have no legacy mount collision waiver.');
once('const selectedDoors=doors._qaDoors().filter',"const selectedDoors=doors._qaDoors().filter(d=>d.kind==='door'&&d.motion==='hinge').filter");
once(' for(const d of selectedDoors){'," if(!process.env.DOOR_FILTER&&selectedDoors.length!==2)throw Error('Exactly two Egypt hinges required');report.sourceSubsetGuards="+JSON.stringify(guards)+";report.contactWaivers='NONE';\n for(const d of selectedDoors){");
once("row.gapLimit='A zero-intersection pass is bounded by the reported hinge chord sagitta and EPS; sub-bound near contacts require exact refinement, not a waived collision.';dump();","row.gapLimit='A zero-intersection pass is bounded by the reported hinge chord sagitta and EPS; sub-bound near contacts require exact refinement, not a waived collision.';dump();if(row.status!=='PASS_BOUNDED_SWEEP')break;");
process.argv=[process.argv[0],file,'egypt'];if(process.env.QA_ADAPTER_CHECK_ONLY==='1'){new(require('vm').Script)(source,{filename:file});console.log('PASS_ADAPTER_SOURCE_LOCK_AND_SYNTAX');}else{const adapted=new Module(file,module);adapted.filename=file;adapted.paths=module.paths;adapted._compile(source,file);}
