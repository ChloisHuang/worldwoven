// Current-main original NPC choice and bodies. Financial origin is explicitly staged.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
if(process.env.WORLDWOVEN_GUARDED!=='1'||!['segment','cleaning'].includes(process.env.PROBE_STAGE))throw Error('Use run-salon-bounded.sh segment');
if(process.env.SOCIAL_RESUME||process.env.SALON_RESUME)throw Error('Use SALON_INPUT only');
const input=process.env.SALON_INPUT,out=process.env.SALON_OUTPUT;
if(!input||!out)throw Error('Exact checkpoint and isolated output required');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const provenance=JSON.parse(fs.readFileSync('development/heavy-probes/salon-load-evidence.json','utf8'));
for(const [file,expected]of Object.entries(provenance.provenance.sources))if(hash(fs.readFileSync(file))!==expected)throw Error('Financial source changed: '+file);
const bytes=fs.readFileSync(input),initial=JSON.parse(bytes),origin=provenance.provenance.loadSetup.clock.seconds;
if(input.endsWith('origin-checkpoint.json')&&hash(bytes)!==provenance.restoreGate.outputSha256)throw Error('Original checkpoint provenance mismatch');
if(initial.worldContinuity?.regions?.china?.controllers?.chinaSalon?.session)throw Error('Active-session restoration gate required before continuation');
if(initial.simulationClock.seconds>=origin+240&&!Object.values(initial.worldContinuity.regions.china.controllers.chinaAudience.life.decisions.people).some(p=>p.current?.id==='paid-salon'))throw Error('Initial 240-second observation window ended; report not observed rather than extending');
process.env.SOCIAL_RESUME=input;
process.env.QA_START_MS=String(Date.now());
console.log('PHASE',JSON.stringify({name:'start',wallMs:Date.now(),cpu:process.cpuUsage(),input,inputSha256:hash(bytes)}));
let source=fs.readFileSync('tests/natural-social-observe.cjs','utf8');
if(!source.includes('chinaSalon,chinaOfficialEconomy,chinaAudience'))throw Error('Review seam changed');
source=source.replace('chinaSalon,chinaOfficialEconomy,chinaAudience','chinaSalon,chinaSalonEconomy,chinaOfficialEconomy,chinaAudience');
const start=source.indexOf('const body=String.raw`'),end=source.indexOf('\n`;\nharness=harness.slice',start);
if(start<0||end<0)throw Error('Natural harness body seam changed');
const body=String.raw`
const input=JSON.parse(fs.readFileSync(process.env.SALON_INPUT,'utf8')),before=input.worldContinuity.regions.china;
const r=main.namespace.socialReview(),loaded=main.namespace.socialCheckpoint(),world=loaded.worldContinuity.regions.china;
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
assert(eq(Object.keys(world.actors),Object.keys(before.actors)),'original actors');
for(const id of Object.keys(before.actors))assert(eq(world.actors[id].position,before.actors[id].position),'no relocation '+id);
assert(eq(loaded.simulationClock,input.simulationClock),'clock unchanged on load');
assert(eq(loaded.chinaOfficialEconomy,input.chinaOfficialEconomy),'payroll unchanged on load');
assert(eq(world.controllers.chinaSalon,before.controllers.chinaSalon),'salon state and artist RNG unchanged on load');
assert(eq(world.controllers.chinaAudience.life.decisions,before.controllers.chinaAudience.life.decisions),'official decisions and RNG unchanged on load');
if(process.env.PROBE_STAGE==='cleaning'){assert(eq(world.controllers.chinaTavern.phases,before.controllers.chinaTavern.phases),'original cleaning timer restored exactly');assert(input.chinaServiceWorld.rooms.find(r=>r.id==='lan').dirty,'original room starts dirty');}
assert.equal(state().continuity.skipped.length,0);assert.equal(state().continuity.relocated.length,0);
console.log('PHASE',JSON.stringify({name:'loaded',wallMs:Date.now(),cpu:process.cpuUsage(),clock:r.simulationClock.state(),continuity:state().continuity}));
const origin=8485.714285714286,maxEnd=origin+240,initialSeconds=r.simulationClock.state().seconds;
let frames=0,stop='segment-boundary',previous='',session=null;const events=[];
let tracked=Object.entries(before.controllers.chinaAudience.life.decisions.people).find(([id,p])=>p.current?.id==='paid-salon');tracked=tracked?{actorId:tracked[0],...tracked[1].current}:null;
for(;frames<300&&(tracked||r.simulationClock.state().seconds<maxEnd-.001);){
 now+=150;main.namespace.socialStep(.15);frames++;
 const life=r.chinaAudience.state().life,paid=life.actors.filter(a=>a.activity==='paid-salon'||a.borrowedSalon),s=r.chinaSalon.snapshot();
 const signature=JSON.stringify({paid:paid.map(a=>[a.id,a.activity,a.stage,a.borrowedSalon]),session:s.session&&[s.session.id,s.session.stage,s.session.payment]});
 if(signature!==previous){const event={frame:frames,clock:r.simulationClock.state(),paid,session:s.session};events.push(event);console.log('SERVICE',JSON.stringify(event));previous=signature;}
 if(s.session){session=s.session;stop='first-original-session';break;}
 if(process.env.PROBE_STAGE==='cleaning'&&!r.chinaTavern.staffScene.lodgingState().rooms.find(r=>r.id==='lan').dirty){stop='original-lan-cleaning-completed';break;}
 if(!tracked){const chosen=Object.entries(life.decisions.people).find(([id,p])=>p.current?.id==='paid-salon');if(chosen)tracked={actorId:chosen[0],...chosen[1].current};}
 if(tracked){const current=life.decisions.people[tracked.actorId]?.current;if(current?.id!=='paid-salon'||current.targetId!==tracked.targetId||current.startedAt!==tracked.startedAt){stop='original-choice-ended';break;}}
 if(r.chinaAudience.state().failures.length||s.failures?.length){stop='controller-failure';break;}
}
if(r.simulationClock.state().seconds>=maxEnd-.001&&!session&&!tracked)stop='observation-window-ended-without-session';
const checkpoint=main.namespace.socialCheckpoint();
fs.writeFileSync(process.env.SALON_OUTPUT+'.checkpoint.json',JSON.stringify(checkpoint,null,2));
const report={status:'OBSERVED',scope:'R190 original production scheduling/navigation from source-hashed staged four-day payroll; not four natural days or browser/iOS',input:process.env.SALON_INPUT,frames,initialSeconds,clock:r.simulationClock.state(),stop,tracked,events,session,cleaningPhases:checkpoint.worldContinuity.regions.china.controllers.chinaTavern.phases,lodgingRooms:checkpoint.chinaServiceWorld.rooms,offers:r.npcs.filter(n=>r.chinaOfficialEconomy.account(n.station.id)).map(n=>({actorId:n.station.id,choices:r.chinaSalon.npcChoices(n.station.id)})),rooms:r.chinaSalon.view().rooms,officialEconomy:r.chinaOfficialEconomy.snapshot(),artistEconomy:r.chinaSalonEconomy.snapshot(),salonHistory:r.chinaSalon.snapshot().history,officialLife:r.chinaAudience.state().life,actorPositions:Object.fromEntries(r.npcs.map(n=>[n.station.id,n.root.position.toArray()])),failures:r.chinaSalon.state().failures,officialFailures:r.chinaAudience.state().failures,checkpoint:process.env.SALON_OUTPUT+'.checkpoint.json'};
fs.writeFileSync(process.env.SALON_OUTPUT+'.result.json',JSON.stringify(report,null,2));
console.log('PHASE',JSON.stringify({name:'checkpoint',wallMs:Date.now(),cpu:process.cpuUsage(),frames,stop,clock:report.clock,session,failures:report.failures,output:report.checkpoint}));
assert.equal(report.failures.length,0,'salon navigation failure requires diagnosis');assert.equal(report.officialFailures.length,0,'original official navigation failure requires diagnosis');return;
`;
source=source.slice(0,start)+'const body='+JSON.stringify(body)+source.slice(end+3);
new vm.Script(source,{filename:'tests/st03-production-inherited.cjs'}).runInNewContext({structuredClone,URL,require:require('node:module').createRequire(path.resolve('tests/natural-social-observe.cjs')),console,process,Buffer,__dirname:path.resolve('tests'),__filename:path.resolve('tests/natural-social-observe.cjs')});
