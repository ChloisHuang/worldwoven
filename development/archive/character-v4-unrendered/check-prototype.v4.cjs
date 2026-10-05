const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=process.env.WORLDWOVEN_BASELINE_SOURCE||'/workspace/scratch/1eb6172ab681/fourfang-public-alien/source';
const modules=new Map();
function moduleAt(file){if(modules.has(file))return modules.get(file);const m=new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{identifier:file});modules.set(file,m);return m;}
const link=(name,m)=>moduleAt(name==='three'?root+'/vendor/three/build/three.module.js':path.resolve(path.dirname(m.identifier),name));
async function load(file){const m=moduleAt(file);if(m.status==='unlinked')await m.link(link);if(m.status==='linked')await m.evaluate();return m.namespace;}
function dimensions(mesh){mesh.geometry.computeBoundingBox();const b=mesh.geometry.boundingBox;return {width:b.max.x-b.min.x,height:b.max.y-b.min.y,depth:b.max.z-b.min.z};}
function body(root){const out=new Map();root.traverse(m=>{if(m.isMesh&&m.parent.name!=='sculpted-head')out.set(m.name,Array.from(m.geometry.attributes.position.array));});return out;}
function triangles(root){let n=0;root.traverse(m=>{if(m.isMesh)n+=m.geometry.index.count/3;});return n;}
(async()=>{
 const A=await load(root+'/game/approved-surfaces.js'),P=await load(path.join(__dirname,'original-head-hair.v4.mjs'));
 const results=[];
 for(const masc of[false,true])for(const style of P.PROTOTYPE_HAIR_STYLES){
  const options={masc,bodyPreset:masc?'masculine-lean':'feminine-balanced',hairStyle:masc?'side-part':'chin-bob'};
  const source=A.createApprovedSurfaces(options),beforeBody=body(source),before=dimensions(source.getObjectByName('continuous-head-jaw-cheeks-nose')),beforeTriangles=triangles(source);
  P.applyOriginalHeadHair(source,{hairStyle:style});
  assert.deepEqual(body(source),beforeBody,'Body or neck changed');
  source.traverse(m=>{if(!m.isMesh)return;for(const v of m.geometry.attributes.position.array)assert(Number.isFinite(v),'Nonfinite geometry');if(m.userData.originalHeadStudy)assert(m.name.startsWith('hair-'),'New mesh lost head-bone name contract');});
  const after=dimensions(source.getObjectByName('continuous-head-jaw-cheeks-nose'));
  assert(after.depth>before.depth+.028,'Insufficient actual skull depth');assert(after.width<before.width+.006,'Head widened excessively');
  assert.deepEqual(Array.from(P.sculptHeadPoint(0,1.455,.003)),[0,1.455,.003],'Neck seam moved');
  assert.throws(()=>P.applyOriginalHeadHair(source),/exactly once/);
  results.push({masc,style,before,after,beforeTriangles,afterTriangles:triangles(source)});
  source.traverse(m=>{if(m.isMesh)m.geometry.dispose();});
 }
 console.log(JSON.stringify({status:'PASS',scope:'Lightweight geometry checks only; visual and gameplay acceptance pending',results},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
