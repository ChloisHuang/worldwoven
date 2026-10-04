// Actual palace life controller, with route-arrival doubles. Reproduces a
// second consort borrowing Lin, interruption leakage and duplicate host owners.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve('source'),context=vm.createContext({console}),cache=new Map();
function mod(file){if(cache.has(file))return cache.get(file);const m=new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{identifier:file,context});cache.set(file,m);return m;}
const linker=(s,f)=>mod(s==='three'?path.join(root,'vendor/three/build/three.module.js'):path.resolve(path.dirname(f.identifier),s.split('?')[0]));
(async()=>{
 const lifeModule=mod(path.join(root,'game/china-palace-life.js'));await lifeModule.link(linker);await lifeModule.evaluate();const T=cache.get(path.join(root,'vendor/three/build/three.module.js')).namespace,residents=cache.get(path.join(root,'game/china-palace-residents.js')).namespace;
 function fixture(){
  const actors=[...lifeModule.namespace.CHINA_PALACE_ROLES,{id:'cn-tea',npcPosition:[2.9,.815,-29.68]}].map(station=>{const root=new T.Group(),head=new T.Group();root.add(head);root.userData.head=head;root.position.set(...station.npcPosition);return {station,root,home:root.position.clone(),route:[],phase:0,breakAt:10,locomotion:{walkSpeed:1.4},walking:false,animate(){this.animations=(this.animations||0)+1;}};});
  const saved=residents.palaceResidentSave({worldSeed:42,actorIds:actors.map(n=>n.station.id)});for(const p of Object.values(saved.people))p.current={id:'read',duration:1000,startedAt:0};saved.people['cn-consort-heng'].current={id:'visit',targetId:'cn-tea',duration:8,startedAt:0};
  const items=[{id:'china-furniture-throne',position:[0,1.4,-6]},...actors.slice(0,4).map((n,i)=>({id:i?n.station.privateBedId:'china-furniture-seat',kind:i?'bed':'seat',position:n.home.toArray(),anchor:n.home.toArray(),yaw:0}))];
  const controller=lifeModule.namespace.createChinaPalaceLife({npcs:actors,lot:{colliders:[],walkableSurfaces:[],bounds:{}},furniture:{items,canSit:()=>true,canUse:()=>true,releaseActor(){},standPoint:()=>new T.Vector3()},doors:{cameraColliders:[],routeStep:()=>({waiting:true})},planPath:(_,p)=>[p],moveActor(){},poseContext:()=>({visualFloorOffset:0}),worldSeed:42,saved});
  let time=0;const tick=(state={})=>{for(const n of actors)if(n.route.length)n.root.position.copy(n.route.at(-1));time+=.1;controller.update(.1,time,state);};
  const until=pred=>{for(let i=0;i<500&&!pred();i++)tick();assert(pred(),JSON.stringify(controller.state()));};return {actors,controller,tick,until,saved};
 }
 let f=fixture();f.until(()=>f.controller.state().hostActorId==='cn-consort-heng');assert(f.controller.owns(f.actors.at(-1)));const actor=()=>f.controller.state().actors.find(a=>a.id==='cn-consort-heng'),elapsed=actor().elapsed,lease=f.controller.state().claims.find(c=>c.actor==='cn-consort-heng').remaining;
 for(let i=0;i<30;i++)f.tick({conversationActorId:'cn-tea'});assert.equal(actor().elapsed,elapsed);assert.equal(f.controller.state().claims.find(c=>c.actor==='cn-consort-heng').remaining,lease,'host conversation pauses the actual visitor budget');
 for(let i=0;i<30;i++)f.tick({conversationActorId:'cn-consort-heng'});assert.equal(actor().elapsed,elapsed);
 for(let i=0;i<202;i++)f.tick({performing:'cn-tea'});assert.equal(f.controller.state().hostHeld,false);assert(!f.controller.owns(f.actors.at(-1)));assert.equal(f.controller.state().decisions.people['cn-consort-heng'].relations['cn-tea'],f.saved.people['cn-consort-heng'].relations['cn-tea'],'unfinished visit earns no relationship');assert(f.controller.state().history.some(e=>e.event.startsWith('leisure-deferred:')));f.controller.dispose();
 f=fixture();f.until(()=>f.controller.state().hostActorId==='cn-consort-heng');f.until(()=>f.controller.state().history.some(e=>e.event==='tea-conversation:completed'));assert.equal(f.controller.state().hostHeld,false);f.until(()=>actor().cycles>0);assert(Math.abs(f.controller.state().decisions.people['cn-consort-heng'].relations['cn-tea']-.20)<1e-9);assert.equal(f.controller.state().decisions.people['cn-consort-yue'].relations['cn-tea'],.40);assert.equal(f.controller.state().decisions.people['cn-consort-ling'].relations['cn-tea'],.24);f.controller.dispose();
 console.log('PASS: second consort owns one actual host visit; host/player conversation pauses; host work cancels without reward; completed exchange updates only the participating visitor');
})().catch(e=>{console.error(e);process.exitCode=1;});
