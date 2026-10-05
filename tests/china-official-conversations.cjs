// Controller ownership edges: one summons/storage failure must release exactly
// the accepted pair, without granting social rewards or evicting a third NPC.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve('source'),context=vm.createContext({console}),cache=new Map();
function mod(file){if(cache.has(file))return cache.get(file);const m=new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{identifier:file,context});cache.set(file,m);return m;}
const linker=(s,f)=>mod(s==='three'?path.join(root,'vendor/three/build/three.module.js'):path.resolve(path.dirname(f.identifier),s));
(async()=>{
 const lifeModule=mod(path.join(root,'game/china-official-life.js'));await lifeModule.link(linker);await lifeModule.evaluate();const facilitiesModule=mod(path.join(root,'game/npc-facilities.js'));await facilitiesModule.link(linker);await facilitiesModule.evaluate();
 const three=mod(path.join(root,'vendor/three/build/three.module.js'));if(three.status==='unlinked')await three.link(linker);if(three.status!=='evaluated')await three.evaluate();
 const T=three.namespace,brains=cache.get(path.join(root,'game/npc-life-decisions.js')).namespace;
 const ids=['cn-minister-works','cn-minister-granary','cn-official-rites'];
 function fixture(){
  const initial=brains.createLifeDecisions({actorIds:ids}).snapshot();for(const id of ids){initial.people[id].random=1;initial.people[id].needs={hunger:0,fatigue:0,social:.8};}
  const brain=brains.createLifeDecisions({actorIds:ids,saved:initial}),read=brain.choose(ids[0],[{id:'read',experience:{kind:'read',label:'刚才读过书卷'},duration:[10,10]}]);brain.tick(10);brain.complete(ids[0],read);
  const choice=brain.choose(ids[0],[{id:'conversation',experienceId:brain.experience(ids[0]).id,duration:[9,9],targets:[{id:ids[1]}]}]),event=brain.invite(ids[0],choice);assert.equal(event.status,'accepted');
  const positions=[[9.2,.145,-14.4],[10.45,.145,-14.4],[14,.145,-13.1]],officials=ids.map((id,i)=>{const root=new T.Group();root.position.set(...positions[i]);return {station:{id},root,route:[],phase:0,animate(){}};}),claims=facilitiesModule.namespace.createFacilityQueue();
  let reject=false;const saved={version:1,decisions:brain.snapshot(),runtime:{time:10,conversation:{id:event.id,participants:ids.slice(0,2),responses:event.responses,topic:'read',duration:9,elapsed:0,age:0,lastAt:10,phase:'talking'},stages:ids.map((id,i)=>[id,i<2?{path:[positions[i]],arrived:true,pairId:event.id,facilityId:'cn-official-garden-place-'+(i+1),choice:{id:'conversation',action:'relax',targetId:ids[1-i]},duration:9,elapsed:0}:{path:[positions[i]],arrived:true,idle:true,elapsed:0,duration:20}])}};
  const flow=lifeModule.namespace.createChinaOfficialLife({officials,npcs:officials,lot:{colliders:[],walkableSurfaces:[{minX:-30,maxX:30,minZ:-40,maxZ:40,y:.145}],bounds:{minX:-30,maxX:30,minZ:-40,maxZ:40}},furniture:{items:[],facilities:claims},doors:{},planPath:(_,p)=>[p],poseContext:()=>({}),travel(n,s){n.root.position.set(...s.path.at(-1));s.arrived=true;},safety:()=>[],saved,saveState:()=>!reject});
  return {flow,claims,officials,event,reject:()=>reject=true};
 }
 const a=fixture();a.claims.reserve('third-npc-workplace',ids[2]);a.flow.request(a.officials[0]);assert(a.flow.ready(a.officials[0]));assert(!a.flow.ready(a.officials[1]));assert(!a.flow.state().conversation);assert(a.claims.reservation('third-npc-workplace',ids[2]));for(const id of ids.slice(0,2)){assert.equal(a.flow.state().decisions.people[id].current,null);assert.deepEqual(JSON.parse(JSON.stringify(a.flow.state().decisions.people[id].relations)),{});assert(!a.claims.state().some(f=>f.reservations.some(r=>r.actor===id)));}a.flow.dispose();
 const b=fixture();b.reject();for(let i=0;i<100;i++){b.flow.tick(.1,{hour:15});for(const n of b.officials.slice(0,2))b.flow.update(n,.1,i*.1);}assert(!b.flow.state().conversation);assert.equal(b.flow.state().decisions.conversations[0].status,'cancelled');for(const id of ids.slice(0,2)){assert.equal(b.flow.state().decisions.people[id].current,null);assert.deepEqual(JSON.parse(JSON.stringify(b.flow.state().decisions.people[id].relations)),{});assert(!b.claims.state().some(f=>f.reservations.some(r=>r.actor===id)));}b.flow.dispose();
 console.log('PASS accepted pair summons and failed result persistence release both roles/places exactly, preserve third-party claim, grant no phantom relation');
})().catch(e=>{console.error(e);process.exitCode=1;});
