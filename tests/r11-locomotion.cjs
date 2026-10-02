// Portable CPU locomotion test. Run: node --experimental-vm-modules tests/r11-locomotion.cjs
// SOURCE_ROOT may point at any complete source graph. No renderer or GPU is used.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=path.resolve(process.env.SOURCE_ROOT||'source'),cache=new Map();
function mod(file){if(cache.has(file))return cache.get(file);const m=new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{identifier:file});cache.set(file,m);return m;}
const link=(s,m)=>mod(s==='three'?source+'/vendor/three/build/three.module.js':path.resolve(path.dirname(m.identifier),s.split('?')[0]));
async function load(file){const m=mod(source+'/game/'+file);if(m.status==='unlinked')await m.link(link);if(m.status==='linked')await m.evaluate();return m.namespace;}
(async()=>{
 const C=await load('characters.js'),A=await load('appearance.js'),N=await load('navigation.js'),T=mod(source+'/vendor/three/build/three.module.js').namespace;
 function travelTime(speed,hz){const p={x:0,y:0,z:0};let frames=0;while(p.z<10-1e-10){N.moveWithCollision(p,0,Math.min(speed/hz,10-p.z),[],.34,{multilevel:false});frames++;}return frames/hz;}
 const rows=[],clipRows=[],v=new T.Vector3(),lastFeet=[new T.Vector3(),new T.Vector3()],nowFeet=[new T.Vector3(),new T.Vector3()];
 for(const culture of Object.keys(A.WARDROBE_PRESETS))for(const bodyPreset of A.BODY_PRESETS)for(const wardrobePreset of A.WARDROBE_PRESETS[culture][bodyPreset.startsWith('masculine')?'masculine':'feminine'])for(let gaitPreset=0;gaitPreset<4;gaitPreset++){
  const actor=C.createCharacter({culture,bodyPreset,wardrobePreset,gaitPreset}),L=actor.locomotion;
  const base=(/yukata|kimono/.test(wardrobePreset)?.95:/trouser|waistcoat|frock|kilt/.test(wardrobePreset)?1.35:/gown|ruqun|long-robe/.test(wardrobePreset)?1.20:1.06)*[.90,1,1.08,.97][gaitPreset];
  assert(Math.abs(L.walkSpeed/base-1.65)<1e-12,'default increase must be 1.65x');
  for(const hz of [30,60,144])for(const mode of ['walk','hurry']){
   const dt=1/hz,speed=L[mode+'Speed'];actor.root.position.set(0,0,0);actor.animate(0,false,null,{groundHeightAt:()=>0});
   let frames=0,elapsed=0,travel=0,maxSlide=0,maxBackstep=0,minClearance=Infinity,contacts=0;let prevSupport=[true,true],lastContact=[null,null],maxStrideError=0;
   for(let s=0;s<2;s++)actor.root.userData.feet[s].getWorldPosition(lastFeet[s]);
   while(travel<10-1e-10){
    const d=Math.min(speed*dt,10-travel);travel+=d;N.moveWithCollision(actor.root.position,0,d,[],.34,{multilevel:false});assert(Math.abs(actor.root.position.z-travel)<1e-9);elapsed+=dt;actor.animate(elapsed,true,null,{groundHeightAt:()=>0});const metrics=actor.getPoseMetrics();
    for(let s=0;s<2;s++){actor.root.userData.feet[s].getWorldPosition(nowFeet[s]);
     if(metrics.support[s]&&prevSupport[s]&&frames>5)maxSlide=Math.max(maxSlide,nowFeet[s].distanceTo(lastFeet[s]));
     if(frames>5)maxBackstep=Math.max(maxBackstep,lastFeet[s].z-nowFeet[s].z);
     if(metrics.support[s]&&!prevSupport[s]){contacts++;if(lastContact[s]!==null)maxStrideError=Math.max(maxStrideError,Math.abs(nowFeet[s].z-lastContact[s]-L.strideLength));lastContact[s]=nowFeet[s].z;}lastFeet[s].copy(nowFeet[s]);prevSupport[s]=metrics.support[s];
    }
    if(gaitPreset===1&&hz===30&&frames%3===0){actor.root.updateMatrixWorld(true);actor.root.traverse(m=>{if(!m.isSkinnedMesh)return;m.skeleton.update();for(const range of m.geometry.userData.sourceRanges){if(!/sole-|footwear|loafer/.test(range.name))continue;for(let i=range.start;i<range.start+range.count;i++){m.getVertexPosition(i,v).applyMatrix4(m.matrixWorld);minClearance=Math.min(minClearance,v.y);}}});}
    frames++;
   }
   assert(Math.abs(actor.getPoseMetrics().gaitPhase-(Math.PI*.5+10/L.strideLength*Math.PI*2))<1e-8,'phase tracks actual travel');
   rows.push({culture,bodyPreset,wardrobePreset,gaitPreset,hz,mode,speed,beforeSpeed:base*(mode==='hurry'?1.38:1),before10mSeconds:10/(base*(mode==='hurry'?1.38:1)),beforeMeasured10mSeconds:travelTime(base*(mode==='hurry'?1.38:1),hz),after10mExactSeconds:10/speed,measured10mSeconds:elapsed,stepLength:L.stepLength,cadenceStepsPerSecond:speed/L.stepLength,contacts,maxStrideError,maxStanceSlide:maxSlide,maxBackstep,minClearance:Number.isFinite(minClearance)?minClearance:null});
  }
  actor.dispose();
 }
 fs.mkdirSync('qa',{recursive:true});fs.writeFileSync('qa/r11-locomotion.json',JSON.stringify(rows,null,2));
 const summary={status:'PASS',runs:rows.length,maxStanceSlide:Math.max(...rows.map(r=>r.maxStanceSlide)),maxBackstep:Math.max(...rows.map(r=>r.maxBackstep)),minimumSkinnedClearance:Math.min(...rows.filter(r=>r.minClearance!==null).map(r=>r.minClearance)),maximumStrideError:Math.max(...rows.map(r=>r.maxStrideError)),maxTimingError:Math.max(...rows.map(r=>r.measured10mSeconds-r.after10mExactSeconds)),failures:rows.filter(r=>r.maxStrideError>1e-6||r.maxStanceSlide>1e-6||r.maxBackstep>1e-6||r.minClearance!==null&&r.minClearance<-.001)};
 console.log(JSON.stringify(summary,null,2));assert.equal(summary.failures.length,0,'moving planted foot, backwards shoe, or floor clipping');
})().catch(e=>{console.error(e);process.exit(1)});
