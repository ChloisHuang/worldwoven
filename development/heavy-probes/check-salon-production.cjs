// Current-main original NPC choice and bodies. Financial origin is explicitly staged.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
if(process.env.WORLDWOVEN_GUARDED!=='1'||!['segment','cleaning','active-restore','service'].includes(process.env.PROBE_STAGE))throw Error('Use run-salon-bounded.sh segment');
if(process.env.SOCIAL_RESUME||process.env.SALON_RESUME)throw Error('Use SALON_INPUT only');
const input=process.env.SALON_INPUT,out=process.env.SALON_OUTPUT;
if(!input||!out)throw Error('Exact checkpoint and isolated output required');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const provenance=JSON.parse(fs.readFileSync('development/heavy-probes/salon-load-evidence.json','utf8'));
const currentOverrides=JSON.parse(fs.readFileSync('development/heavy-probes/salon-r190-evidence.json','utf8')).currentSourceOverrides||{};
for(const [file,expected]of Object.entries(provenance.provenance.sources))if(hash(fs.readFileSync(file))!==(currentOverrides[file]||expected))throw Error('Financial source changed: '+file);
const bytes=fs.readFileSync(input),initial=JSON.parse(bytes),origin=provenance.provenance.loadSetup.clock.seconds;
if(input.endsWith('origin-checkpoint.json')&&hash(bytes)!==provenance.restoreGate.outputSha256)throw Error('Original checkpoint provenance mismatch');
if(initial.worldContinuity?.regions?.china?.controllers?.chinaSalon?.session&&!['active-restore','service'].includes(process.env.PROBE_STAGE))throw Error('Active-session restoration gate required before continuation');
// Resumed user-authorized work follows actual checkpoints; process segments remain capped.
if(process.env.PROBE_STAGE==='service'){
 const certified=JSON.parse(fs.readFileSync('development/heavy-probes/salon-r190-evidence.json','utf8')),gates=[...(certified.activeRestores||[]),...(certified.serviceContinuations||[])];
 if(!gates.some(g=>g.status==='PASS'&&g.checkpointSha256===hash(bytes)))throw Error('Service requires exact verified active-restoration checkpoint');
 if(!['reserved','settled','released'].includes(process.env.SALON_STOP_AFTER||''))throw Error('Choose reserved, settled or released service boundary explicitly');
}
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
assert(eq(loaded.chinaSalonEconomy,input.chinaSalonEconomy),'artist ledger unchanged on load');assert(eq(loaded.chinaSalonReceptionAccount,input.chinaSalonReceptionAccount),'reception ledger unchanged on load');
assert(eq(world.controllers.chinaSalon,before.controllers.chinaSalon),'salon state and artist RNG unchanged on load');
assert(eq(world.controllers.chinaAudience.life.decisions,before.controllers.chinaAudience.life.decisions),'official decisions and RNG unchanged on load');
if(process.env.PROBE_STAGE==='cleaning'){assert(eq(world.controllers.chinaTavern.phases,before.controllers.chinaTavern.phases),'original cleaning timer restored exactly');assert(input.chinaServiceWorld.rooms.find(r=>r.id==='lan').dirty,'original room starts dirty');}
assert.equal(state().continuity.skipped.length,0);assert.equal(state().continuity.relocated.length,0);
console.log('PHASE',JSON.stringify({name:'loaded',wallMs:Date.now(),cpu:process.cpuUsage(),clock:r.simulationClock.state(),continuity:state().continuity}));
if(process.env.PROBE_STAGE==='active-restore'){
 const original=before.controllers.chinaSalon.session;assert(original,'real active session required');
 const rooms=r.chinaSalon.view().rooms,session=r.chinaSalon.snapshot().session,artist=r.chinaSalonEconomy.snapshot();
 const checks={sameSession:eq(session,original),sameOriginalSalon:eq(world.controllers.chinaSalon,before.controllers.chinaSalon),sameOfficialLedger:eq(r.chinaOfficialEconomy.snapshot(),input.chinaOfficialEconomy),sameArtistLedger:input.chinaSalonEconomy?eq(artist,input.chinaSalonEconomy):artist.receipts.length===0&&artist.mealTransfers.length===0&&artist.revision===0,originalCustomerOwned:r.chinaSalon.ownsNPCCustomer(original.customerId),originalRoom:original.roomId?rooms.find(q=>q.id===original.roomId)?.claim?.owner===original.id:rooms.every(q=>!q.claim),sameClock:eq(loaded.simulationClock,input.simulationClock),allActorsRestored:state().continuity.restored.length===32&&!state().continuity.relocated.length&&!state().continuity.skipped.length};
 const report={status:Object.values(checks).every(Boolean)?'PASS':'FAIL',scope:'Exact real active salon session reload; zero simulation and no forced reservation/payment/settlement',input:process.env.SALON_INPUT,steps:0,checks,session,rooms,officialEconomy:r.chinaOfficialEconomy.snapshot(),artistEconomy:artist,continuity:state().continuity,checkpoint:process.env.SALON_OUTPUT+'.checkpoint.json'};
 fs.writeFileSync(process.env.SALON_OUTPUT+'.result.json',JSON.stringify(report,null,2));console.log('ACTIVE_RESTORE',JSON.stringify(report));assert(Object.values(checks).every(Boolean),'Active session restoration changed original state');fs.writeFileSync(report.checkpoint,JSON.stringify(loaded,null,2));return;
}
const origin=8485.714285714286,maxEnd=origin+240,initialSeconds=r.simulationClock.state().seconds;
const frameCap=Math.min(900,Math.max(1,Number(process.env.SALON_FRAMES)||300));
let frames=0,stop='segment-boundary',previous='',session=null;const events=[];
let tracked=Object.entries(before.controllers.chinaAudience.life.decisions.people).find(([id,p])=>p.current?.id==='paid-salon'&&(process.env.PROBE_STAGE!=='service'||id===before.controllers.chinaSalon.session.customerId));tracked=tracked?{actorId:tracked[0],...tracked[1].current}:null;
for(;frames<frameCap;){
 now+=150;main.namespace.socialStep(.15);frames++;
 const life=r.chinaAudience.state().life,paid=life.actors.filter(a=>a.activity==='paid-salon'||a.borrowedSalon),s=r.chinaSalon.snapshot();
 const roomState=r.chinaSalon.view().rooms,offers=r.npcs.filter(n=>r.chinaOfficialEconomy.account(n.station.id)).map(n=>({actorId:n.station.id,choices:r.chinaSalon.npcChoices(n.station.id)}));
 const signature=JSON.stringify({rooms:roomState,offers,paid:paid.map(a=>[a.id,a.activity,a.stage,a.borrowedSalon]),session:s.session&&[s.session.id,s.session.stage,s.session.payment]});
 if(signature!==previous){const event={frame:frames,clock:r.simulationClock.state(),paid,rooms:roomState,offers,session:s.session};events.push(event);console.log('SERVICE',JSON.stringify(event));previous=signature;}
 if(process.env.PROBE_STAGE==='service'){
  const original=before.controllers.chinaSalon.session;
  if(s.session&&s.session.id!==original.id)throw Error('Original service replaced');
  const hold=r.chinaOfficialEconomy.salonHold(original.id);
  if(!s.session){stop=hold?.status==='settled'?'original-service-released':'original-service-cancelled';break;}
  if(s.session.payment===process.env.SALON_STOP_AFTER){session=s.session;stop='original-service-'+s.session.payment;break;}
 }else if(s.session){session=s.session;stop='first-original-session';break;}
 if(process.env.PROBE_STAGE==='cleaning'&&!r.chinaTavern.staffScene.lodgingState().rooms.find(r=>r.id==='lan').dirty){stop='original-lan-cleaning-completed';break;}
 if(!tracked){const chosen=Object.entries(life.decisions.people).find(([id,p])=>p.current?.id==='paid-salon');if(chosen)tracked={actorId:chosen[0],...chosen[1].current};}
 if(tracked){const current=life.decisions.people[tracked.actorId]?.current;if(current?.id!=='paid-salon'||current.targetId!==tracked.targetId||current.startedAt!==tracked.startedAt){stop='original-choice-ended';break;}}
 if(r.chinaAudience.state().failures.length||s.failures?.length){stop='controller-failure';break;}
 if(frames%300===0){const periodic=main.namespace.socialCheckpoint();fs.writeFileSync(process.env.SALON_OUTPUT+'.step-'+frames+'.checkpoint.json',JSON.stringify(periodic,null,2));console.log('PHASE',JSON.stringify({name:'periodic-checkpoint',frames,wallMs:Date.now(),cpu:process.cpuUsage(),clock:r.simulationClock.state()}));}
 if(Date.now()-Number(process.env.QA_START_MS)>150000){stop='safe-runtime-checkpoint';break;}
}
// A quiet segment is a checkpoint, not completion of the user's pending task.
session=r.chinaSalon.snapshot().session;const checkpoint=main.namespace.socialCheckpoint();
fs.writeFileSync(process.env.SALON_OUTPUT+'.checkpoint.json',JSON.stringify(checkpoint,null,2));
const report={status:'OBSERVED',scope:'R190 original production scheduling/navigation from source-hashed staged four-day payroll; not four natural days or browser/iOS',input:process.env.SALON_INPUT,frames,initialSeconds,clock:r.simulationClock.state(),stop,tracked,events,session,cleaningPhases:checkpoint.worldContinuity.regions.china.controllers.chinaTavern.phases,lodgingRooms:checkpoint.chinaServiceWorld.rooms,offers:r.npcs.filter(n=>r.chinaOfficialEconomy.account(n.station.id)).map(n=>({actorId:n.station.id,choices:r.chinaSalon.npcChoices(n.station.id)})),rooms:r.chinaSalon.view().rooms,officialEconomy:r.chinaOfficialEconomy.snapshot(),artistEconomy:r.chinaSalonEconomy.snapshot(),salonHistory:r.chinaSalon.snapshot().history,officialLife:r.chinaAudience.state().life,actorPositions:Object.fromEntries(r.npcs.map(n=>[n.station.id,n.root.position.toArray()])),failures:r.chinaSalon.state().failures,officialFailures:r.chinaAudience.state().failures,checkpoint:process.env.SALON_OUTPUT+'.checkpoint.json'};
fs.writeFileSync(process.env.SALON_OUTPUT+'.result.json',JSON.stringify(report,null,2));
console.log('PHASE',JSON.stringify({name:'checkpoint',wallMs:Date.now(),cpu:process.cpuUsage(),frames,stop,clock:report.clock,session,failures:report.failures,output:report.checkpoint}));
assert.equal(report.failures.length,0,'salon navigation failure requires diagnosis');assert.equal(report.officialFailures.length,0,'original official navigation failure requires diagnosis');return;
`;
source=source.slice(0,start)+'const body='+JSON.stringify(body)+source.slice(end+3);
new vm.Script(source,{filename:'tests/st03-production-inherited.cjs'}).runInNewContext({structuredClone,URL,require:require('node:module').createRequire(path.resolve('tests/natural-social-observe.cjs')),console,process,Buffer,__dirname:path.resolve('tests'),__filename:path.resolve('tests/natural-social-observe.cjs')});
