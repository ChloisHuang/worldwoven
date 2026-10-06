// Original routine and actual Three geometry; straight-path fixture isolates
// observed work and range objects. This is not a main/navigation/browser test.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const context=vm.createContext({console,structuredClone,Float32Array,Uint8Array}),cache=new Map(),root=path.resolve('source');
function mod(file){if(cache.has(file))return cache.get(file);const m=new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{context,identifier:file});cache.set(file,m);return m;}
const linker=(s,m)=>mod(s==='three'?path.join(root,'vendor/three/build/three.module.js'):path.resolve(path.dirname(m.identifier),s));
(async()=>{
 const module=mod(path.join(root,'game/china-archery-routine.js'));await module.link(linker);await module.evaluate();const T=cache.get(path.join(root,'vendor/three/build/three.module.js')).namespace;
 const guards=['cn-archery','cn-range-warden'].map((id,i)=>{const root=new T.Group();root.position.set(-17.65,.13,18.45+i*1.35);const hands=[new T.Group(),new T.Group()];root.add(...hands);root.userData.hands=hands;root.userData.jinyiCostume={dispose(){}};return {station:{id},root,route:[],locomotion:{walkSpeed:3},phase:0,animate(){}};});
 const routine=module.namespace.createChinaArcheryRoutine({npcs:guards,lot:{archery:{},group:new T.Group()},planPath:(from,to)=>[new T.Vector3(to.x,to.y,to.z)],moveActor:(actor,x,z)=>{actor.root.position.x+=x;actor.root.position.z+=z;},poseContext:()=>({})});
 // Straight movement needs authored stair elevation for this isolated fixture.
 let paid=0,practice=0,observed=0,blockedBow=false,blockedArrow=false,talkChecked=false;
 const assignment={roleId:'cn-palace-guard',slotId:'cn-palace-guard-1',holderId:'cn-archery',revision:0,status:'npc',alive:true,available:true,actor:guards[0]};
 for(let i=0;i<8000&&!(paid>20&&practice>20&&observed>0&&talkChecked);i++){
  for(const n of guards)if(n.route[0])n.root.position.y=n.route[0].y;
  const before=routine.state();routine.update(.1,i*.1,{position:{x:0,y:0,z:30}});const s=routine.state(),coverage=routine.patrolCoverage(()=>assignment),boundary=routine.handoffBoundary();
  if(s.active==='cn-archery'){practice++;assert.equal(coverage.length,0,'range practice is unpaid');}
  if(coverage.length){paid++;assert.equal(s.active,'cn-range-warden');assert.equal(coverage[0].actorId,'cn-archery');if(!guards[0].walking)observed++;if(!talkChecked){routine.update(.1,i*.1+.1,{conversationActorId:'cn-archery'});assert.equal(routine.patrolCoverage(()=>assignment).length,0);talkChecked=true;}}
  blockedBow ||= boundary.blockers.some(b=>b.kind==='heldBow');blockedArrow ||= boundary.blockers.some(b=>b.kind==='flyingArrow'||b.kind==='targetArrows');
 }
 assert(paid>20&&practice>20&&observed>0&&talkChecked,JSON.stringify({paid,practice,observed,talkChecked,state:routine.state()}));assert(blockedBow&&blockedArrow);
 assert.equal(routine.patrolCoverage(()=>({...assignment,holderId:'cn-new-guard'})).length,0,'unbound replacement is not original body');
 routine.requestGuardWork('cn-guard-labor-1');assert.equal(routine.patrolCoverage(()=>assignment).length,0,'requested player duty closes NPC coverage');assert(routine.handoffBoundary().blockers.some(b=>b.kind==='playerDuty'));
 routine.dispose();
 // Explicit assignment replacement waits on real range objects and hands over
 // without moving identities or transferring the reviewer's role.
 for(const [i,n]of guards.entries()){n.root.position.set(-17.65,.13,18.45+i*1.35);n.route=[];}
 const replacement={...guards[0],station:{id:'cn-new-guard',npcName:'新巡卫'},root:guards[0].root.clone(),route:[]};replacement.root.userData.hands=[new T.Group(),new T.Group()];replacement.root.add(...replacement.root.userData.hands);replacement.root.userData.jinyiCostume={dispose(){}};replacement.root.position.set(-15,.13,23);
 let current={...assignment};const controlled=new Set([guards[0],replacement]);
 const rebound=module.namespace.createChinaArcheryRoutine({npcs:[...guards,replacement],lot:{archery:{},group:new T.Group()},planPath:(from,to)=>[new T.Vector3(to.x,to.y,to.z)],moveActor:(n,x,z)=>{n.root.position.x+=x;n.root.position.z+=z;},poseContext:()=>({}),resolveGuardAssignment:()=>current,canControlGuard:n=>controlled.has(n)});
 rebound.requestPatrolPause();assert(rebound.handoffBoundary().ok);const oldPosition=guards[0].root.position.clone(),nextPosition=replacement.root.position.clone();current={...assignment,actor:replacement,holderId:'cn-new-guard',revision:1};assert(rebound.bindGuardAssignment().ok);assert.equal(rebound.guardBinding().actorId,'cn-new-guard');assert.equal(rebound.reviewerContext().actorId,'cn-range-warden');assert.equal(guards[0].root.position.distanceTo(oldPosition),0);assert.equal(replacement.root.position.distanceTo(nextPosition),0);assert.equal(rebound.handoffBoundary().ok,false,'new body must really arrive');
 rebound.update(.1,0);assert(replacement.root.position.distanceTo(nextPosition)>0&&replacement.root.position.distanceTo(nextPosition)<.3);assert(guards[0].root.position.distanceTo(oldPosition)>0&&guards[0].root.position.distanceTo(oldPosition)<.3);assert(rebound.owns(guards[0]),'retired original is not driven by generic original station');
 const frozen=replacement.root.position.clone();current={...current,holderId:null,status:'vacant',actor:null};rebound.update(.1,.1);assert.equal(replacement.root.position.distanceTo(frozen),0);assert.equal(rebound.patrolCoverage(()=>assignment).length,0);assert.equal(rebound.guardBinding().available,false);
 current={...assignment,actor:replacement,holderId:'cn-new-guard',revision:1};replacement.alive=false;rebound.update(.1,.2);assert.equal(replacement.root.position.distanceTo(frozen),0);replacement.alive=true;guards[1].alive=false;assert.equal(rebound.reviewerContext(),null);assert.equal(rebound.supervisorReady(),false);guards[1].alive=true;
 const saved=rebound.snapshot();rebound.dispose();for(const n of [...guards,replacement])n.root.userData.jinyiCostume={dispose(){}};
 const reloaded=module.namespace.createChinaArcheryRoutine({npcs:[...guards,replacement],lot:{archery:{},group:new T.Group()},planPath:(from,to)=>[new T.Vector3(to.x,to.y,to.z)],moveActor:(n,x,z)=>{n.root.position.x+=x;n.root.position.z+=z;},poseContext:()=>({}),resolveGuardAssignment:()=>current,canControlGuard:n=>controlled.has(n)});
 assert(reloaded.restore(saved));assert.equal(reloaded.guardBinding().actorId,'cn-new-guard');assert.equal(reloaded.guardBinding().holderRevision,1);assert(reloaded.owns(guards[0]));assert.equal(reloaded.patrolCoverage(()=>current).length,0,'reload never reuses earlier work sample');assert.equal(reloaded.reviewerContext().actorId,'cn-range-warden');assert.equal(reloaded.restore({...saved,guardHolderRevision:2}),false,'wrong saved tenure cannot claim body');reloaded.dispose();
 console.log(JSON.stringify({status:'PASS',scope:'Actual Three and original routine; straight-path fixture, not main or browser',paid,practice,observed,blockedBow,blockedArrow,talkChecked}));
})().catch(e=>{console.error(e);process.exitCode=1;});
