// Exercise the actual handoff controller with two bare actors and its tiny prop
// group. No country build, character models, rendering or global simulation loop.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve('source'),modules=new Map();
function moduleAt(file){if(!modules.has(file))modules.set(file,new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{identifier:file}));return modules.get(file);}
const resolve=(specifier,from)=>moduleAt(specifier==='three'?root+'/vendor/three/build/three.module.js':path.resolve(path.dirname(from.identifier),specifier));
(async()=>{
 const service=moduleAt(root+'/game/china-clinic-service.js');await service.link(resolve);await service.evaluate();
 const T=moduleAt(root+'/vendor/three/build/three.module.js').namespace,C=moduleAt(root+'/game/china-clinic.js').namespace.CHINA_CLINIC;
 const {createGameHealthWorld}=await import('../source/game/game-health-world.js');
 const actor=(id,position)=>{const root=new T.Group();root.position.fromArray(position);return {station:{id},root,route:[],locomotion:{walkSpeed:1},phase:0,animate(){}};};
 const doctor=actor('cn-clinic-physician',C.points.doctor),assistant=actor('cn-pharmacy-assistant',C.points.assistant),player=actor('player',C.points.consult),npcs=[doctor,assistant];
 const initial=createGameHealthWorld({worldSeed:3});initial.enter('china',npcs);const seeded=initial.snapshot();Object.assign(seeded.health.people[assistant.station.id].conditions.mistbell,{stage:'ill',remaining:240});
 const health=createGameHealthWorld({worldSeed:3,saved:seeded});health.enter('china',npcs);let events=[],time=0,durable;
 const make=saved=>service.namespace.createChinaClinicService({npcs,lot:{group:new T.Group(),clinic:true},doors:{routeStep:()=>({waiting:false,waypoint:null})},planPath:()=>[],moveActor(){},poseContext:()=>({}),saved,saveState:s=>{durable=s;health.clinicReceipts(s);},onInteraction:event=>{events.push(event);health.interaction(event);}});
 const clinic=make({}),state={player,facilityId:C.seatId};
 const step=dt=>{time+=dt;clinic.update(dt,time,state);health.update(dt,{player,actors:npcs});};
 assert(clinic.beginConsultation({id:C.seatId},player));step(2.2);step(3.4);
 doctor.root.position.fromArray(C.points.doctorHandoff);assistant.root.position.fromArray(C.points.assistantHandoff);step(1.3);
 state.facilityId=null;player.root.position.fromArray(C.points.counter);assistant.root.position.fromArray(C.points.stock);step(.1);step(4);assistant.root.position.fromArray(C.points.assistant);step(.1);
 assert.equal(clinic.state().order.stage,'ready');step(10);assert.equal(events.length,0,'nearby counter waiting never emits a contact');
 const order=clinic.state().order;assert(clinic.startPlayer(assistant.station.id,player,order.id));step(.1);step(.5);
 assert.equal(events.length,1);assert.deepEqual(events[0].participants,[assistant.station.id,'player']);assert.equal(events[0].id,order.id);assert.equal(events[0].duration,.5);
 assert(health.snapshot().health.people.player.conditions.mistbell.dose>0);assert.equal(health.snapshot().health.people[doctor.station.id].conditions.mistbell.dose,0);
 clinic.stopPlayer();step(2);assert.equal(events.length,1,'cancelled handoff emits nothing');assert(clinic.startPlayer(assistant.station.id,player,order.id));step(.1);step(1.3);
 assert.equal(clinic.state().order.stage,'complete');assert.equal(events.at(-1).duration,1.8,'resume preserves only actual handoff time');assert.equal(health.snapshot().health.interactionProgress['china-clinic-delivery'].duration,1.8);
 const count=events.length;step(5);assert.equal(events.length,count,'completed handoff cannot continue emitting');clinic.dispose();
 const restored=make(durable);restored.state();health.clinicReceipts(durable);assert.equal(events.length,count,'loading old delivered history and care receipts never emits a contact');restored.dispose();
 console.log('PASS actual named clinic handoff only; ready/cancel/complete/history emit no contact; resume duration is cumulative');
})().catch(error=>{console.error(error);process.exitCode=1;});
