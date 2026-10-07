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
 const social=cache.get(path.join(root,'game/npc-social-ownership.js')).namespace;
 assert.equal(routine.enforcementCandidates().length,2);
 assert(social.holdSocialActors(['cn-archery'],'crime:china'));
 const prior=routine.snapshot();
 routine.update(.5,1,{position:new T.Vector3(0,0,0)});
 routine.requestSupervisor(true);
 assert.equal(routine.enforcementActive(),true);
 assert.equal(routine.startPlayer(guards[1]),false,'new practice cannot recall an active enforcement guard');
 assert.equal(routine.requestGuardWork('cn-guard-labor-1'),false,'new work cannot steal the enforcement lease');
 assert.equal(routine.handoffBoundary().ok,false,'appointment requires original physical safe handoff');
 assert.equal(routine.enforcementCandidates().length,2,'registration request does not cancel active officers');
 assert.equal(routine.snapshot().phase,prior.phase,'original range phase remains paused');
 social.releaseSocialActors('crime:china');routine.resumeAfterEnforcement();
 assert.equal(routine.enforcementActive(),false);assert.equal(routine.snapshot().phase,'handover');
 guards[0].alive=false;assert.equal(routine.enforcementCandidates().length,0,'dead assignment cannot continue enforcement');
 routine.dispose();console.log('PASS original guard safe enforcement pause, unchanged phase, no registration/practice takeover, true return handoff and death boundary');
})().catch(e=>{console.error(e);process.exit(1)});
