// Small exact-query contract for the foot-support broad phase. No scene build.
// The R16.48 implementation is the oracle, read from Git rather than copied.
const fs=require('node:fs'),cp=require('node:child_process'),assert=require('node:assert/strict');
const {performance}=require('node:perf_hooks');
const load=source=>import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const oldSource=cp.execFileSync('git',['show','9796e039f3489d5d5b8aa155bab09b9d6d3e8b49:source/game/floor-support.js'],{encoding:'utf8'});
async function checkLot(lot,label='fixture',current){
 const before=await load(oldSource),after=current||await load(fs.readFileSync('source/game/floor-support.js','utf8'));
 const surfaces=[...(lot.walkableSurfaces||[]),...(lot.group?.userData?.rugSurfaces||[]),...(lot.characterFootSurfaces||[])],queries=[];
 let seed=681;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
 for(const s of surfaces){
  const cx=(s.minX+s.maxX)/2,cz=(s.minZ+s.maxZ)/2,cy=s.axis&&Number.isFinite(s.endY)?(s.y+s.endY)/2:s.y;
  for(const [x,z]of[[cx,cz],[s.minX,s.minZ],[s.maxX,s.maxZ],[s.minX-5e-7,cz],[s.maxX+5e-7,cz],[cx,s.minZ-5e-7],[cx,s.maxZ+5e-7],[Math.round(cx/2)*2,cz]])queries.push([x,z,cy]);
  queries.push([cx,cz,cy+.48],[cx,cz,cy+.480001],[cx,cz,cy-.48],[cx,cz,cy-.480001]);
 }
 for(let i=0;i<1200;i++)queries.push([random()*80-40,random()*100-50,(i%5)*3.8]);
 let checks=0;
 for(const [x,z,y]of queries)for(const multi of[true,false]){
  assert.equal(after.visualSupportHeight(lot,x,z,y,multi),before.visualSupportHeight(lot,x,z,y,multi),label+' point '+[x,y,z,multi]);
  assert.equal(after.footprintSupportHeight(lot,x-.07,x+.19,z-.08,z+.13,y,multi),before.footprintSupportHeight(lot,x-.07,x+.19,z-.08,z+.13,y,multi),label+' footprint '+[x,y,z,multi]);
  assert.equal(after.characterFloorOffsetAt(lot,x,y,z),before.characterFloorOffsetAt(lot,x,y,z),label+' offset');checks+=3;
 }
 // Interleave versions after warmup; timing is evidence, never a flaky gate.
 const time=mod=>{let checksum=0;const start=performance.now();for(const [x,z,y]of queries){checksum+=mod.visualSupportHeight(lot,x,z,y,true)||0;checksum+=mod.footprintSupportHeight(lot,x-.07,x+.19,z-.08,z+.13,y,true)||0;}return {ms:performance.now()-start,checksum};};
 time(before);time(after);const times={before:[],after:[]};
 for(let round=0;round<3;round++){const versions=round%2?['after','before']:['before','after'];for(const v of versions)times[v].push(time(v==='before'?before:after));}
 assert(times.before.every(t=>t.checksum===times.after[0].checksum));
 const mean=rows=>rows.reduce((s,r)=>s+r.ms,0)/rows.length,report={status:'PASS',label,surfaces:surfaces.length,checks,queriesPerTimingRound:queries.length*2,beforeMs:mean(times.before),afterMs:mean(times.after),scope:'Exact CPU support-query parity/timing; excludes rendering and device frame rate'};
 console.log(JSON.stringify(report));return report;
}
exports.checkLot=checkLot;
if(require.main===module)(async()=>{
 const after=await load(fs.readFileSync('source/game/floor-support.js','utf8'));
 const lot={walkableSurfaces:[],characterFootSurfaces:[],characterFloorSurfaces:[],group:{userData:{rugSurfaces:[]}}};
 for(let x=-7;x<=7;x++)for(let z=-7;z<=7;z++)for(let floor=0;floor<3;floor++){
  const y=floor*3.8,minX=x*4,minZ=z*4;lot.walkableSurfaces.push({minX,maxX:minX+4,minZ,maxZ:minZ+4,y});
  if((x+z)%3===0){lot.walkableSurfaces.push({minX,maxX:minX+1,minZ,maxZ:minZ+4,y,axis:(x%2?'x':'z'),endY:y+.4});lot.characterFootSurfaces.push({minX,maxX:minX+1,minZ:minZ+1.98,maxZ:minZ+2.02,y:y+.0205});}
  if(x===z)lot.characterFloorSurfaces.push({minX:minX+.2,maxX:minX+2,minZ:minZ+.2,maxZ:minZ+2,baseY:y,offset:.075});
  if(x===-z)lot.group.userData.rugSurfaces.push({minX:minX+.5,maxX:minX+2.5,minZ:minZ+.5,maxZ:minZ+2.5,y:y+.09});
 }
 await checkLot(lot,'stacked floors, ramps, tread nosings, mats, grid edges',after);
 const mutation={walkableSurfaces:[{minX:0,maxX:1,minZ:0,maxZ:1,y:0}]};assert.equal(after.visualSupportHeight(mutation,.5,.5,0,true),0);
 mutation.characterFootSurfaces=[{minX:0,maxX:1,minZ:0,maxZ:1,y:.02}];assert.equal(after.visualSupportHeight(mutation,.5,.5,0,true),.02);
 mutation.characterFootSurfaces.push({minX:0,maxX:1,minZ:0,maxZ:1,y:.03});assert.equal(after.visualSupportHeight(mutation,.5,.5,0,true),.03);
 mutation.characterFootSurfaces.length=0;assert.equal(after.visualSupportHeight(mutation,.5,.5,0,true),0);
 mutation.walkableSurfaces=[{minX:0,maxX:1,minZ:0,maxZ:1,y:.08}];assert.equal(after.visualSupportHeight(mutation,.5,.5,0,true),.08);
 mutation.walkableSurfaces[0].minX=4;mutation.walkableSurfaces[0].maxX=5;after.clearFloorSupportCache(mutation);assert.equal(after.visualSupportHeight(mutation,4.5,.5,0,true),.08);assert.equal(after.visualSupportHeight(mutation,.5,.5,0,true),null);
 console.log('PASS array replacement, append/removal, explicit in-place geometry invalidation');
})().catch(error=>{console.error(error);process.exit(1);});
