// A stalled route or conversation must never count as watering/pruning time;
// cancellation must take the same physical tool back, and unload releases it.
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {pathToFileURL} from 'node:url';
import fs from 'node:fs';
import vm from 'node:vm';
registerHooks({resolve(id,ctx,next){return id==='three'?{url:pathToFileURL(process.cwd()+'/source/vendor/three/build/three.module.js').href,shortCircuit:true}:next(id,ctx);}});
const T=await import('three'),{createFranceGardener}=await import('../source/game/france-gardener.js'),{FRANCE_GARDENER:P}=await import('../source/game/france-gardener-place.js');
function fixture({blocked=false,saved={}}={}){
 const root=new T.Group(),group=new T.Group(),hands=[new T.Object3D(),new T.Object3D()];hands[0].position.set(-.16,.74,.21);hands[1].position.set(.16,1.05,.37);root.add(...hands);root.userData.hands=hands;root.position.set(...P.approach);group.add(root);
 const actor={root,station:{id:P.id,npcAction:'garden'},route:[],characterScale:1,locomotion:{walkSpeed:2},animate(){}},other={station:{id:'france-salon'},root:new T.Group()},player={root:new T.Group()};player.root.position.set(30,0,30);other.root.position.set(25,0,25);let waiting=blocked,clock=0,conversationActorId=null;
 const doors={routeStep(route,p){if(waiting)return {waiting:true};while(route[0]&&Math.hypot(route[0].x-p.x,route[0].z-p.z)<.035)route.shift();return {waypoint:route[0]};}};
 const service=createFranceGardener({npcs:[actor,other],lot:{group,walkableSurfaces:[]},doors,planPath:(_a,b)=>[new T.Vector3(b.x,b.y,b.z)],moveActor:(n,x,z)=>{n.root.position.x+=x;n.root.position.z+=z;},poseContext:n=>n.poseContext??={},getPlayer:()=>player,worldSeed:1,saved});
 const tick=(count=1)=>{for(let i=0;i<count;i++){clock+=.1;service.update(.1,clock,{conversationActorId});}},until=(p,limit=4000)=>{for(let i=0;i<limit&&!p(service.state());i++)tick();assert(p(service.state()),'Expected garden state: '+JSON.stringify(service.state()));};
 return {service,actor,other,group,tick,until,setBlocked:v=>waiting=v,talk:v=>conversationActorId=v?P.id:null};
}
{
 const f=fixture();assert(f.service.owns(f.actor));assert(!f.service.owns(f.other));f.until(s=>s.stage==='waterA'&&s.phase>.5);const before=f.service.state();assert.equal(f.service.socialStatus(f.actor).busy,true,'active watering offers only a short greeting');f.talk(true);f.tick(25);const paused=f.service.state();assert.equal(paused.phase,before.phase);assert.equal(paused.props.waterVisible,false);assert.equal(paused.props.held,'can');assert.equal(paused.position[0],before.position[0]);f.talk(false);f.tick();assert(f.service.state().props.waterVisible);f.until(s=>s.cycles===1);
 const state=f.service.state();for(const event of['takeCan','waterA','waterB','putCan','takeShears','prune','putShears','complete'])assert(state.history.some(e=>e.event===event),event);assert.equal(state.tool,null);assert(!state.props.waterVisible);assert(!state.props.clippingsVisible);f.until(s=>s.choice);assert(['rest','garden','work'].includes(f.service.state().choice.id));f.service.dispose();assert.equal(f.group.children.length,1);assert.equal(f.actor.poseContext.archery,null);f.service.dispose();
}
{
 const f=fixture({blocked:true});f.until(s=>s.stage==='bedA');f.tick(80);assert.equal(f.service.state().stage,'bedA');assert(!f.service.state().props.waterVisible);f.setBlocked(false);f.until(s=>s.stage==='waterA');f.service.dispose();assert.equal(f.actor.route.length,0);
}
for(const stage of['waterA','waterB','prune']){
 const f=fixture();f.until(s=>s.stage===stage&&s.phase>.4);assert(f.service.cancel());f.until(s=>s.history.some(e=>e.event==='cancelled'));assert.equal(f.service.state().tool,null);assert.equal(f.service.state().cycles,0);assert(!f.service.state().props.waterVisible);assert(!f.service.state().props.clippingsVisible);f.service.dispose();
}
{
 const f=fixture();f.tick();assert(f.service.cancel());assert.equal(f.service.state().stage,'idle');assert.equal(f.service.state().cancelled,false);assert(f.service.request());f.until(s=>s.cycles===1);f.service.dispose();
}
{
 const person={needs:{hunger:.4,fatigue:.6}},main=fs.readFileSync('source/game/main.js','utf8'),start=main.indexOf('function updateGameHealth('),end=main.indexOf('\n}',start)+2;
 let observed=null;const state={dailyNeeds:{status:()=>null},saved:{franceGardener:{life:{people:{[P.id]:person}}}},gameHealth:{update(_dt,context){observed=context.lifePeople;},text:()=>''},$:()=>({textContent:'',hidden:true}),npcs:[],player:{walking:false},seated:null,bathTransition:null,keys:new Set()};
 vm.createContext(state);vm.runInContext(main.slice(start,end)+';updateGameHealth(.1);',state);assert.equal(observed[P.id],person,'Existing gardener needs are passed directly to health');
}
console.log('PASS French gardener: full two-bed / shears chain, physical arrival wait, social pause/resume, three tool-return cancellations, exclusive actor ownership and idempotent disposal');

{
 const f=fixture();f.until(s=>s.stage==='waterA'&&s.phase>.8);const checkpoint=JSON.parse(JSON.stringify(f.service.snapshot())),position=f.actor.root.position.toArray();f.service.dispose({suspend:true});const g=fixture({saved:{continuity:checkpoint}});g.actor.root.position.set(...position);assert(g.service.restore(checkpoint));assert.equal(g.service.state().phase,checkpoint.phase);assert.equal(g.service.state().tool,'can');g.until(s=>s.cycles===1);assert.equal(g.service.state().history.filter(e=>e.event==='takeCan').length,1);g.service.dispose();console.log('PASS gardener keeps held can and observed watering time across scene reconstruction');
}
