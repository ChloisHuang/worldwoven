// Actual Three and the original routine, with straight paths to isolate the
// second appointment's identity and safe handoff. Not a main/browser test.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const context=vm.createContext({console,structuredClone,Float32Array,Uint8Array}),cache=new Map(),root=path.resolve('source');
function mod(file){if(cache.has(file))return cache.get(file);const m=new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{context,identifier:file});cache.set(file,m);return m;}
const linker=(s,m)=>mod(s==='three'?path.join(root,'vendor/three/build/three.module.js'):path.resolve(path.dirname(m.identifier),s));
(async()=>{
 const module=mod(path.join(root,'game/china-archery-routine.js'));await module.link(linker);await module.evaluate();const T=cache.get(path.join(root,'vendor/three/build/three.module.js')).namespace;
 const row=(actor,warden=false,revision=0)=>({roleId:warden?'cn-range-warden-duty':'cn-palace-guard',slotId:warden?'cn-range-warden-duty-1':'cn-palace-guard-1',holderId:actor.station.id,actor,revision,status:'npc',alive:true,available:true});
 function fixture(){
  const actors=['cn-archery','cn-range-warden','cn-new-warden'].map((id,i)=>{const root=new T.Group();root.position.set(i===2?-15:-17.65,.13,i===0?18.45:i===1?19.8:23);const hands=[new T.Group(),new T.Group()];root.add(...hands);root.userData.hands=hands;root.userData.jinyiCostume={dispose(){}};return {station:{id,npcName:['沈砚','陆衡','新主管'][i]},root,route:[],locomotion:{walkSpeed:3},phase:0,animate(){}};});
  let guard=row(actors[0]),warden=row(actors[1],true),time=0;
  const options={npcs:actors,lot:{archery:{},group:new T.Group()},planPath:(from,to)=>[new T.Vector3(to.x,to.y,to.z)],moveActor:(n,x,z)=>{n.root.position.x+=x;n.root.position.z+=z;},poseContext:()=>({}),resolveGuardAssignment:()=>guard,resolveWardenAssignment:()=>warden,canControlGuard:n=>actors.includes(n)&&n.alive!==false};
  const routine=module.namespace.createChinaArcheryRoutine(options);
  return {actors,routine,get guard(){return guard;},set guard(v){guard=v;},get warden(){return warden;},set warden(v){warden=v;},
   tick(){for(const n of actors)if(n.route[0])n.root.position.y=n.route[0].y;routine.update(.1,time+=.1,{position:{x:0,y:0,z:30}});},
   reload(){routine.dispose();for(const n of actors)n.root.userData.jinyiCostume={dispose(){}};return module.namespace.createChinaArcheryRoutine({...options,lot:{archery:{},group:new T.Group()}});}};
 }
 {
  const f=fixture(),r=f.routine;assert.equal(r.reviewerContext().actorId,'cn-range-warden');assert.equal(r.reviewerContext().revision,0);r.requestPatrolPause();
  const old=f.actors[1].root.position.clone(),next=f.actors[2].root.position.clone();f.warden=row(f.actors[2],true,1);assert.equal(r.reviewerContext(),null,'old reviewer loses authority before new binding');
  assert(r.bindWardenAssignment().ok);assert.equal(r.reviewerContext().actorId,'cn-new-warden');assert.equal(r.reviewerContext().name,'新主管');assert.equal(r.reviewerContext().revision,1);assert.equal(r.guardBinding().actorId,'cn-archery');
  assert.equal(f.actors[1].root.position.distanceTo(old),0);assert.equal(f.actors[2].root.position.distanceTo(next),0);assert(!r.handoffBoundary().ok,'new reviewer must physically arrive');assert(!r.supervisorReady());
  f.tick();assert(f.actors[2].root.position.distanceTo(next)>0&&f.actors[2].root.position.distanceTo(next)<.3);assert(r.owns(f.actors[1]),'retired body remains safely controlled');
  for(let i=0;i<60&&!r.handoffBoundary().ok;i++)f.tick();assert(r.handoffBoundary().ok);
  f.warden={...f.warden,revision:2};assert.equal(r.reviewerContext(),null);assert(r.bindWardenAssignment().ok);assert.equal(r.reviewerContext().revision,2);
  const saved=r.snapshot(),reloaded=f.reload();assert(reloaded.restore(saved));assert.equal(reloaded.reviewerContext().actorId,'cn-new-warden');assert.equal(reloaded.reviewerContext().revision,2);assert.equal(reloaded.wardenPatrolCoverage().length,0,'reload cannot replay a work sample');assert.equal(reloaded.restore({...saved,wardenHolderRevision:3}),false);reloaded.dispose();
 }
 {
  const f=fixture(),r=f.routine;r.requestPatrolPause();f.warden={...f.warden,holderId:null,actor:null,status:'vacant',available:false,revision:1};assert.equal(r.reviewerContext(),null);assert(!r.supervisorReady());assert(r.releaseWardenAssignment().ok);f.tick();assert.equal(r.wardenPatrolCoverage().length,0);assert(r.snapshot().retiredIds.includes('cn-range-warden'));
  f.warden=row(f.actors[2],true,2);assert(r.bindWardenAssignment().ok,'vacated second handoff does not block replacement');assert.equal(r.reviewerContext().actorId,'cn-new-warden');
  f.actors[2].alive=false;assert.equal(r.reviewerContext(),null);assert(!r.supervisorReady());assert.equal(r.wardenPatrolCoverage().length,0);f.actors[2].alive=true;
  f.warden={...f.warden,status:'busy',available:false};assert.equal(r.reviewerContext(),null);f.warden=row(f.actors[0],true,3);assert.equal(r.bindWardenAssignment().ok,false,'same person cannot hold both bound positions');assert.equal(r.reviewerContext(),null);r.dispose();
 }
 {
  const f=fixture(),r=f.routine;r.requestPatrolPause();f.warden=row(f.actors[2],true,1);assert(r.bindWardenAssignment().ok);const saved=r.snapshot(),reloaded=f.reload();
  assert.equal(reloaded.restore({...saved,guardHolderId:saved.wardenHolderId}),false,'crossed holder IDs are rejected');assert.equal(reloaded.wardenBinding().actorId,'cn-range-warden','rejection cannot partially install a reviewer');
  assert.equal(reloaded.restore({...saved,guardHolderRevision:99}),false,'stale first slot rejects the whole dual-role restore');assert.equal(reloaded.wardenBinding().actorId,'cn-range-warden','invalid first slot cannot leave a new reviewer installed');
  for(const patch of [{version:99},{phase:'unknown'},{activeId:'cn-no-actor'}]){assert.equal(reloaded.restore({...saved,...patch}),false);assert.equal(reloaded.wardenBinding().actorId,'cn-range-warden','invalid final snapshot cannot partially install a reviewer');}
  assert(reloaded.restore(saved));reloaded.dispose();
 }
 {
  const f=fixture(),r=f.routine;let held=false;for(let i=0;i<500&&!held;i++){f.tick();held=r.handoffBoundary().blockers.some(b=>b.kind==='heldBow');}assert(held,'real bow becomes held');
  f.warden=row(f.actors[2],true,1);const result=r.bindWardenAssignment();assert.equal(result.ok,false);assert(result.blockers.some(b=>b.kind==='heldBow'));assert.equal(r.wardenBinding().actorId,'cn-range-warden');assert.equal(r.reviewerContext(),null);r.dispose();
  const g=fixture(),lesson=g.routine;lesson.startPlayer({root:new T.Group()});g.warden=row(g.actors[2],true,1);const blocked=lesson.bindWardenAssignment();assert.equal(blocked.ok,false);assert(blocked.blockers.some(b=>b.kind==='playerLesson'));assert.equal(lesson.wardenBinding().actorId,'cn-range-warden');lesson.stopPlayer();lesson.dispose();
 }
 console.log(JSON.stringify({status:'PASS',scope:'Actual Three straight-path fixture; second-slot binding, revision, vacancy, death, transactional restore and held-bow/lesson boundaries'}));
})().catch(e=>{console.error(e);process.exitCode=1;});
