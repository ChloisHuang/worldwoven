// The production hunger gate must not slide its own saved 12-second decision
// deadline forward every frame. Uses the original official and dining lease API;
// route movement is doubled because the defect precedes all path planning.
const assert=require('node:assert/strict'),load=require('./fixtures/browser-module-loader.cjs').createBrowserModuleLoader('source');
(async()=>{
 const {createChinaOfficialLife}=await load('game/china-official-life.js'),{createLifeDecisions}=await load('game/npc-life-decisions.js'),{createFacilityQueue}=await load('game/npc-facilities.js'),T=await load('vendor/three/build/three.module.js');
 const id='cn-minister-works',root=new T.Group();root.position.set(14,.115,13.8);const actor={station:{id},root,route:[],phase:0,walking:false,animate(){}};
 const decisions=createLifeDecisions({worldSeed:42,actorIds:[id]}).snapshot();decisions.people[id].nextDecisionAt=12;decisions.people[id].current=null;
 let requests=0,lease=null;const saved={version:1,decisions,runtime:{time:0,conversation:null,stages:[[id,{id:'life-pause',idle:true,arrived:true,path:[[14,.115,13.8]],duration:12,elapsed:0}]]}};
 const flow=createChinaOfficialLife({officials:[actor],npcs:[actor],lot:{colliders:[],walkableSurfaces:[],bounds:{}},furniture:{items:[],facilities:createFacilityQueue()},doors:{},planPath:(_,to)=>[to],poseContext:()=>({}),safety:()=>[],travel(n,s){n.root.position.set(...s.path.at(-1));s.arrived=true;},sharedNeeds:{hunger:()=>1,status:()=>({seekMeal:true,seekToilet:false})},getTavern:()=>({officialMealAvailable:()=>true,officialMeal:()=>lease,requestOfficialMeal(){requests++;lease={actorId:id};return true;}}),saved});
 const tick=()=>{flow.tick(.1,{hour:14});flow.update(actor,.1,14);};
 for(let i=0;i<119;i++)tick();assert.equal(requests,0,'cannot skip the saved cooldown');assert.equal(flow.snapshot().decisions.people[id].nextDecisionAt,12,'urgent idle must not move its own deadline');
 for(let i=0;i<4;i++)tick();assert.equal(requests,1,'actual next decision requests the same official dining lease');assert(flow.state().actors[0].borrowed);assert.equal(actor.station.id,id);flow.dispose({suspend:true});
 console.log('PASS hungry original official preserves saved idle deadline, resumes one real dining request and keeps original identity');
})().catch(e=>{console.error(e);process.exitCode=1;});
