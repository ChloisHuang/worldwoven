// Focused controller + real Three book/rig test. Coordinates are explicitly
// positioned by this fixture; this is not a navigation or main UI acceptance.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const base=path.resolve('source'),cache=new Map();
function mod(f){f=f.split('?')[0];if(cache.has(f))return cache.get(f);const m=new vm.SourceTextModule(fs.readFileSync(f,'utf8'),{identifier:f});cache.set(f,m);return m;}
const link=(s,r)=>mod(s==='three'?base+'/vendor/three/build/three.module.js':path.resolve(path.dirname(r.identifier),s));
async function load(f){const m=mod(base+'/'+f);if(m.status==='unlinked')await m.link(link);if(m.status==='linked')await m.evaluate();return m.namespace;}
(async()=>{
 const G=await load('game/geometry.js'),T=G.THREE,{createArchiveBooks}=await load('game/china-archive-books.js'),{ARCHIVE_HOME,ARCHIVE_BOOKS,archiveContract,archivePlayerContract,archiveProof,validateArchiveProof,validateArchivePlayerProof}=await load('game/china-archive-catalogue.js'),{createCharacter}=await load('game/characters.js'),{createArchiveInspection}=await load('game/china-archive-inspection.js'),{createArchiveAccount}=await load('game/china-archive-account.js');
 for(const variant of [0,1]){
  const group=new T.Group(),books=createArchiveBooks(G,{group}),player=createCharacter({culture:'china',variant,scale:1}),npc=createCharacter({culture:'china',variant:0,scale:.96});
  player.actorId='player';player.alive=true;player.walking=false;player.root.position.fromArray(ARCHIVE_HOME);group.add(player.root);
  npc.station={id:'cn-rest'};npc.alive=true;npc.root.position.fromArray(ARCHIVE_HOME);group.add(npc.root);
  const originals=[...books.nodes.values()];let assignment={status:'player',holderId:'player',actor:player,alive:true,available:true,revision:1},day=0,busy=false,mounted=false,saveOK=true,saved=null,bank=0,payments=[],travelCalls=0,playerPoseCalls=0,t=0,c;
  const options={resolveAssignment:()=>assignment,getDay:()=>day,getPlayer:()=>player,getActor:()=>npc,getBusy:()=>busy,getMounted:()=>mounted,canControl:()=>true,books,
   economy:{settle(proof,patch){assert(validateArchivePlayerProof(proof));assert(!validateArchiveProof(proof));if(!saveOK)return {ok:false,code:'save-failed'};if(payments.some(p=>p.orderId===proof.orderId))return {ok:true,replayed:true};saved=structuredClone(patch.chinaArchiveInspection);payments.push(structuredClone(proof));bank+=proof.amount;return {ok:true};}},
   saveState:s=>{if(!saveOK)return false;saved=structuredClone(s);return true;},travel(){travelCalls++;throw Error('player must never auto-travel');},pose(n){if(n===player)playerPoseCalls++;throw Error('inspection must never directly animate player');}};
  c=createArchiveInspection(options);
  const render=()=>{const pose=c.playerWorkPose();if(pose)player.animate(t,false,pose.action,pose);else player.animate(t,false,null);};
  const tick=(context={})=>{t+=.05;render();c.update(.05,t,context);};
  for(let i=0;i<30;i++)tick();assert.equal(c.state().order,null,'owning the slot does not start work');
  player.root.position.x+=1;assert.equal(c.playerStart().code,'archive-player-not-at-home');player.root.position.fromArray(ARCHIVE_HOME);
  saveOK=false;assert.equal(c.playerStart().code,'save-failed');assert.equal(c.state().lastIssuedDay,-1);saveOK=true;assert(c.playerStart().ok);
  assert.equal(c.state().order.contract.kind,'player-archive-inspection');assert(!c.studyAvailable());assert(!c.handoffBoundary().ok);assert(!c.playerHandoffBoundary().ok);
  const initial=c.snapshot();for(let i=0;i<20;i++)tick();assert.deepEqual(c.snapshot(),initial,'unselected work never progresses');
  assert.equal(c.playerAction(c.playerOptions()[0].id).code,'archive-player-not-at-book');
  let interrupted=false,restored=false,moved=false,checkedStages=0;
  while(c.state().order&&c.state().order.index<6){
   const opt=c.playerOptions()[0];player.root.position.fromArray(opt.target);player.walking=false;
   assert.equal(c.playerAction(opt.id+'-stale').code,'archive-stale-player-action');assert(c.playerAction(opt.id).ok);assert(c.playerBusy());
   const stage=c.state().order.stage;
   // A selected but unanimated gesture earns no elapsed credit.
   if(stage==='check'){player.animate(t,false,null);const before=c.snapshot();c.update(.05,t);assert.deepEqual(c.snapshot(),before);}
   let frames=0;
   while(c.playerBusy()&&frames++<100){
    tick();const order=c.state().order;
    if(!interrupted&&order.stage==='check'&&order.seconds>=.4){
     const before=c.snapshot();busy=true;for(let i=0;i<20;i++)tick({conversationActorId:'cn-painter'});assert.deepEqual(c.snapshot(),before);assert.equal(bank,0);busy=false;tick();
     saveOK=false;const checkpoint=c.snapshot();for(let i=0;i<3;i++)tick();assert.deepEqual(c.snapshot(),checkpoint);saveOK=true;interrupted=true;
    }
    if(!restored&&order.index===1&&order.stage==='tidy'&&order.seconds>=.3){
     const before=c.snapshot(),node=books.nodes.get(order.contract.bookIds[1]);c.dispose();c=createArchiveInspection({...options,saved:before});assert.deepEqual(c.snapshot(),before);assert.equal(books.nodes.get(order.contract.bookIds[1]),node);assert(!c.playerBusy());
     for(let i=0;i<10;i++)tick();assert.deepEqual(c.snapshot(),before);assert(c.playerStart().resumed);assert(c.playerAction(c.playerOptions()[0].id).ok);restored=true;
    }
    if(!moved&&order.index===2&&order.stage==='replace'&&order.seconds>=.2){
     const before=c.snapshot();player.root.position.x+=.5;tick();assert(!c.playerBusy());assert.deepEqual(c.snapshot(),before);player.root.position.fromArray(opt.target);assert(c.playerAction(c.playerOptions()[0].id).ok);
     mounted=true;tick();assert(!c.playerBusy());assert.deepEqual(c.snapshot(),before);mounted=false;assert(c.playerAction(c.playerOptions()[0].id).ok);moved=true;
    }
   }
   assert(frames<100,JSON.stringify(c.state()));checkedStages++;assert.equal(bank,0);
   const held=c.snapshot();for(let i=0;i<3;i++)tick();assert.deepEqual(c.snapshot(),held,'one selected gesture cannot automatically run the next');
   assert.deepEqual([...books.nodes.values()],originals);assert.equal(books.root.children.length,6);
  }
  assert.equal(checkedStages,18);assert(interrupted&&restored&&moved);assert(books.allReturned());assert.equal(c.state().order.stage,'return');assert.equal(bank,0);
  const finish=c.playerOptions()[0];assert.equal(c.playerAction(finish.id).code,'archive-player-not-at-home');player.root.position.fromArray(ARCHIVE_HOME);assert(c.playerAction(finish.id).ok);
  saveOK=false;tick();assert.equal(c.state().order.stage,'settle');assert.equal(bank,0);saveOK=true;tick();assert.equal(bank,8);assert.equal(payments.length,1);assert.equal(saved.order,null);assert(c.studyAvailable());assert(c.playerHandoffBoundary().ok);assert.equal(c.playerStart().code,'archive-day-already-issued');
  assert.equal(createArchiveAccount({saveState:()=>true}).settle(payments[0]).ok,false,'NPC bank rejects a valid player proof');
  assignment={status:'npc',holderId:'cn-rest',actor:npc,alive:true,available:true,revision:2};for(let i=0;i<20;i++)tick();assert.equal(c.state().order,null,'same original day cannot also pay NPC');assert.equal(travelCalls,0);assert.equal(playerPoseCalls,0);
  const proof=archiveProof(archivePlayerContract(0,1));assert(validateArchivePlayerProof(proof));assert(!validateArchivePlayerProof(archiveProof(archiveContract(0,'player',1))));
  for(const mutate of[p=>p.steps.pop(),p=>p.steps[0].checkedSeconds=1,p=>p.actorId='cn-rest',p=>p.kind='npc-archive-inspection',p=>p.bookIds.reverse(),p=>p.returnedHome=false]){const forged=structuredClone(proof);mutate(forged);assert(!validateArchivePlayerProof(forged));}
  c.dispose();books.dispose();player.dispose();npc.dispose();
 }
 console.log('PASS actual player rigs and same six book nodes: 18 explicitly selected gestures, observed contact, no auto travel/animation/work, conversation/save/move/mount/reload preservation, physical return and unique 8 bank proof, NPC-bank rejection and shared-day exclusivity. Fixture positioning only; no main navigation/UI claim.');
})().catch(e=>{console.error(e);process.exit(1);});
