// Directed production-controller hold/resume gate for the recovered approach seam.
// Fresh seed42; no actor placement, invitation, relationship, money or RNG edits.
// Shared hold API is controlled directly: this does not claim menu/UI acceptance.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
if(process.env.SOCIAL_RESUME)throw Error('Use a fresh natural run; preserve existing terminal checkpoints');
let source=fs.readFileSync('tests/natural-social-observe.cjs','utf8');
const start=source.indexOf('const body=String.raw`'),end=source.indexOf('\n`;\nharness=harness.slice',start);
if(start<0||end<0)throw Error('Natural observation harness seam changed');
const body=String.raw`
all.find(e=>e.dataset.region==='china').onclick();ids.travel.onclick();
const r=main.namespace.socialReview(),ownership=mod(path.join(root,'game/npc-social-ownership.js')).namespace;
let frames=0;const step=()=>{assert(frames<300,'bounded 300-step directed gate');frames++;now+=150;main.namespace.socialStep(.15);};
while(r.npcPublicInteractions.status()?.stage!=='approaching')step();
const before=structuredClone(r.npcPublicInteractions.snapshot()),status=structuredClone(r.npcPublicInteractions.status()),pair=status.participants.map(id=>r.npcs.find(n=>(n.actorId||n.station.id)===id));
const positions=pair.map(n=>n.root.position.toArray()),routes=pair.map(n=>JSON.stringify(n.route));
assert(pair.every(Boolean));ownership.setPlayerConversationHold(status.participants[0]);
for(let i=0;i<60;i++)step();
assert.deepEqual(r.npcPublicInteractions.status(),status,'same approach event and phase while held');
assert.equal(r.npcPublicInteractions.snapshot().time,before.time,'held time is not social work or approach timeout');
assert.deepEqual(pair.map(n=>n.root.position.toArray()),positions,'both bodies remain fixed');
assert.deepEqual(pair.map(n=>JSON.stringify(n.route)),routes,'original owner routes retained exactly');
assert.deepEqual(r.npcPublicInteractions.snapshot().brain,before.brain,'no invitation, completion, reward or social elapsed progress while held');
ownership.setPlayerConversationHold(null);
let moved=false;
while(r.npcPublicInteractions.status()?.stage==='approaching'){step();moved ||=pair.some((n,i)=>n.root.position.toArray().some((v,j)=>Math.abs(v-positions[i][j])>.00001));}
const resumed=r.npcPublicInteractions.status();assert(resumed,'same approach must not be lost on release');assert.equal(resumed.eventId,status.eventId);assert.equal(resumed.stage,'greeting');assert(moved,'same pair resumes actual approach movement');
assert.deepEqual(pair.map(n=>JSON.stringify(n.route)),routes,'owner routes unchanged after approach');
const report={status:'PASS',scope:'Directed production main approach hold API / resume; simulated DOM and renderer, not UI-distance/browser/iOS acceptance',frames,heldSteps:60,heldSeconds:9,eventId:status.eventId,participants:status.participants,beforePositions:positions,afterPositions:pair.map(n=>n.root.position.toArray()),socialTimeBefore:before.time,socialTimeAfter:r.npcPublicInteractions.snapshot().time,worldClock:r.simulationClock.state(),sameOwnerRoutes:true,sameEvent:true,resumedStage:resumed.stage};
fs.writeFileSync('qa/natural-approach-hold.json',JSON.stringify(report,null,2));console.log('PASS directed natural approaching hold/resume',JSON.stringify(report));return;
`;
source=source.slice(0,start)+'const body='+JSON.stringify(body)+source.slice(end+3);
new vm.Script(source,{filename:'tests/natural-approach-hold-inherited.cjs'}).runInNewContext({structuredClone,URL,require:require('node:module').createRequire(path.resolve('tests/natural-social-observe.cjs')),console,process,Buffer,__dirname:path.resolve('tests'),__filename:path.resolve('tests/natural-social-observe.cjs')});
