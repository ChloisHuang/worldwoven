import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as THREE from '../source/vendor/three/build/three.module.js';
import {followActorRoute,moveActorWithCollision,beginActorNavigationStep} from '../source/game/actor-navigation.js';
import {createAutomaticRouting} from '../source/game/automatic-routing.js';
import {canTraverse} from '../source/game/navigation.js';
import {nearbyInteraction,currentInteractionIntent} from '../source/game/player-interaction-intents.js';

// Exercise main's complete player frame and real route consumer without building
// a country scene. The original bug starts a provider on the final walking frame.
const main=fs.readFileSync(new URL('../source/game/main.js',import.meta.url),'utf8');
function source(name,end){const start=main.indexOf('function '+name+'('),stop=main.indexOf(end,start);assert(start>=0&&stop>start);return main.slice(start,stop);}
const functions=[
 ['currentControl','\nlet continuityReady'],['resolvePlayerIntent','\nfunction requestStationIntent'],
 ['requestStationIntent','\nfunction goToStation'],['cancelAction','\nfunction doInteraction'],
 ['doInteraction','\nfunction executeNearbyAction'],['executeNearbyAction','\nfunction startInteraction'],
 ['startInteraction','\nfunction furnitureSafetyBoxes'],['furnitureSafetyBoxes','\nfunction standFromSeat'],
 ['standFromSeat','\nfunction updateBathTransition'],['walkToFurniture','\nfunction requestFurniture'],
 ['startFurniture','\n\n\n\nconst shapeLabels'],['intentWaypoint','\nfunction dispatchPlayerArrival'],
 ['dispatchPlayerArrival','\nfunction updatePlayer'],['updatePlayer','\nfunction updateNPCs'],
 ['pauseForCareerPanel','\nconst careerHandbook'],
].map(([name,end])=>source(name,end)).join('\n');
const keyStart=main.indexOf("\naddEventListener('keydown',e=>"),keyEnd=main.indexOf(";addEventListener('keyup'",keyStart);
const script=new vm.Script(functions+'\n'+main.slice(keyStart,keyEnd)+';');
const checks=[];
function fixture({distance=.03,route=true,provider=true}={}){
 const elements=new Map(),events={},counts={started:0,cancelled:0,released:0},messages=[];
 const position=new THREE.Vector3(),target={id:'work',provider:provider?'china-tavern-service':undefined,intentKey:'work-1',name:'工作点',action:'开始工作',position:[distance,0,0],executionRadius:.001};
 const options={bounds:{minX:-5,maxX:5,minZ:-5,maxZ:5},multilevel:false};
 const router=createAutomaticRouting({doors:[],staticColliders:[],planningColliders:[],getSweepBoxes:()=>[],requestOpen:()=>{},getVersion:()=>0});
 router.constrainMove=(from,dx,dz)=>({dx,dz});
 const c={THREE,console,player:{root:{position,rotation:{y:0}},locomotion:{walkSpeed:1.5,hurrySpeed:2},walking:false,animate(){}},
  path:route?[new THREE.Vector3(...target.position)]:[],targetStation:target,pendingInteraction:target,performing:null,seated:null,bathTransition:null,
  keys:new Set(),joy:{x:0,y:0},joyPointer:null,joyLastPoint:null,joyActionAnchor:null,yaw:0,mode:'lot',roofShown:false,multiLevel:true,
  actionTime:0,studyTicket:null,walkTime:0,elapsed:0,arrivalViewUntil:0,nearest:null,npcs:[],lot:{stations:[],colliders:[]},navOptions:options,
  PLAYER_TRAVEL_SCALE:1,automaticDoors:router,followActorRoute,nearbyInteraction,currentInteractionIntent,canTraverse,
  menuOpen:false,interactionMenuOpen:()=>c.menuOpen,showDoorwayHint(){},activeDailyToilet:()=>null,groundHeight:()=>0,
  movementInputMagnitude:n=>Math.min(1,n),characterPoseContext:()=>({}),levelForPosition:()=>null,
  stationIntent:s=>s,nearbyInteractions:()=>[],uniqueInteractionActions:s=>s,contextualTarget:s=>s,nearbyInteractionClear:()=>true,
  serviceMenus:{candidates:()=>[]},studyMenu:{close(){}},formalCareers:{cancelLearning(){}},outfitPreview:{state:()=>({open:false})},
  furniture:{items:[],releaseActor(){counts.released++;},canSit:()=>true,canUse:()=>true,resolveBath:item=>item,occupyBath(){},standPoint:()=>new THREE.Vector3()},
  furniturePose:()=> 'sit',furnitureStatus:()=> '坐下',furnitureExit:()=> '起身',clearFeetPulse(){},buildPlayer(){},finishInteraction(){},
  toast:s=>messages.push(s),$:id=>{if(!elements.has(id))elements.set(id,{style:{}});return elements.get(id);},
  addEventListener:(name,fn)=>events[name]=fn,
 };
 for(const name of ['egyptMeal','egyptMealUI','japanPerformance','japanPerformanceUI','franceTea','franceMealUI','franceTeaEmployment','francePastryEmployment','franceGardener','franceLabor','japanWeatherCharms','japanService','japanPlayerService','japanServiceUI','japanReceptionEmployment','japanBathDeliveryEmployment','japanBathMixingEmployment','japanKitchenEmployment','chinaArchery','chinaGuardEmployment','chinaRoyalKitchen','chinaRoyalKitchenEmployment','chinaPalace','chinaAudience','chinaEdict','chinaClinic','chinaClinicEmployment','chinaClinicPhysicianEmployment','chinaMoneyHouse','chinaTavern','chinaTavernUI','chinaLodging','chinaLodgingUI','chinaSalon','chinaSalonEmployment','chinaSalonUI','chinaLabor','chinaService','chinaCareer','npcSocial'])c[name]=null;
 let live=target,acting=false;
 c.chinaService={resolveIntent:selected=>currentInteractionIntent(selected,live),executeIntent(selected){assert.equal(c.player.walking,false,'provider must begin on a stationary frame');counts.started++;acting=true;},stopActivity(){if(acting)counts.cancelled++;acting=false;},playerAction:()=>acting?'tidy':null,playerStation:()=>null,label:()=>null,intent:()=>null};
 c.contextMenu={update(){},activate(){c.executeNearbyAction(c.currentControl()||live);}};
 c.moveActor=(actor,dx,dz,radius)=>moveActorWithCollision(actor,dx,dz,radius,{colliders:[],navigation:options,npcs:[],playerPosition:position});
 c.planPath=(from,to)=>router.planPath(from,to,options,.34);
 const context=vm.createContext(c);script.runInContext(context);
 return {c,target,counts,messages,events,setLive:value=>{live=value;},acting:()=>acting,
  frame(dt=.1){beginActorNavigationStep(dt);c.elapsed+=dt;c.updatePlayer(dt,c.elapsed);if(acting&&c.player.walking)c.chinaService.stopActivity();},
  key(code){events.keydown({code,repeat:false,preventDefault(){}});},
 };
}
{
 const f=fixture(),route=f.c.path;
 f.frame();assert.equal(f.c.path.length,0);assert.equal(f.c.player.walking,true);assert.equal(f.counts.started,0);assert.equal(f.c.pendingInteraction,f.target);assert.equal(f.c.targetStation,f.target);
 const arrived=f.c.player.root.position.clone();assert.equal(arrived.x,.03);assert.equal(route.length,1,'provider proximity preserves the consumed route object as before');
 f.frame();assert.equal(f.counts.started,1);assert.equal(f.c.player.walking,false);assert.equal(f.c.pendingInteraction,null);assert.equal(f.c.targetStation,null);assert(f.acting());assert.equal(f.counts.cancelled,0);assert.deepEqual(f.c.player.root.position,arrived);
 for(let i=0;i<4;i++)f.frame();assert.equal(f.counts.started,1);checks.push('last moving frame retains intent; next stationary frame starts once and survives provider update');
}
{
 const f=fixture({distance:0,route:false});f.frame();assert.equal(f.counts.started,1);f.frame();assert.equal(f.counts.started,1);checks.push('same intent with an initially empty route executes once');
}
for(const cancel of ['manual','E','Escape','menu']){
 const f=fixture();f.frame();
 if(cancel==='manual')f.c.keys.add('KeyW');
 else if(cancel==='menu'){f.c.menuOpen=true;f.frame();assert.equal(f.counts.started,0);f.c.menuOpen=false;f.c.executeNearbyAction(f.c.currentControl());}
 else f.key(cancel==='E'?'KeyE':'Escape');
 f.frame();f.c.keys.clear();f.frame();assert.equal(f.counts.started,0,cancel);assert.equal(f.c.pendingInteraction,null,cancel);assert.equal(f.c.targetStation,null,cancel);assert.equal(f.c.path.length,0,cancel);
 checks.push(cancel+' cancellation prevents deferred execution');
}
{
 const f=fixture();f.frame();f.c.pauseForCareerPanel();f.frame();assert.equal(f.counts.started,0);assert.equal(f.c.pendingInteraction,null);checks.push('career menu opening clears pending action');
}
for(const invalid of ['stale','missing','away','other-floor','occluded']){
 const f=fixture();f.frame();
 if(invalid==='stale')f.setLive({...f.target,intentKey:'work-2'});
 if(invalid==='missing')f.setLive(null);
 if(invalid==='away')f.c.player.root.position.x=2;
 if(invalid==='other-floor')f.c.player.root.position.y=4;
 if(invalid==='occluded')f.c.nearbyInteractionClear=()=>false;
 f.frame();f.frame();assert.equal(f.counts.started,0,invalid);assert.equal(f.c.pendingInteraction,null,invalid);assert.equal(f.c.targetStation,null,invalid);checks.push(invalid+' intent cannot execute later');
}
{
 const f=fixture({distance:0,route:false});f.c.pendingInteraction=null;f.c.targetStation=null;
 assert(f.c.requestStationIntent(f.target));assert.equal(f.counts.started,1);assert.equal(f.c.path.length,0);assert.equal(f.c.player.root.position.x,0);checks.push('manual arrival still executes immediately without alignment movement');
}
{
 const f=fixture(),seat={id:'arrival-bench',furniture:true,kind:'seat',name:'长椅',position:[.03,0,0],anchor:[.03,.4,.12],yaw:.7};
 f.c.pendingInteraction=f.c.targetStation=seat;f.c.furniture.items=[seat];f.c.path=f.c.planPath(f.c.player.root.position,new THREE.Vector3(...seat.position));
 f.frame();assert.equal(f.c.path.length,0);assert.equal(f.c.player.walking,true);assert.equal(f.c.seated,null);assert.equal(f.c.pendingInteraction,seat);
 f.frame();assert.equal(f.c.seated,seat);assert.equal(f.c.player.walking,false);assert.deepEqual(f.c.player.root.position.toArray(),seat.anchor);assert.equal(f.counts.released,0);checks.push('routed furniture waits for stationary frame and preserves its authored seat anchor');
}
{
 const f=fixture({distance:0,route:false}),seat={id:'bench',furniture:true,kind:'seat',name:'长椅',position:[0,0,0],anchor:[0,.4,.12],yaw:.7};
 f.c.pendingInteraction=f.c.targetStation=seat;f.c.furniture.items=[seat];let clear=false,requests=0;
 f.c.furniture.canSit=()=>clear;f.c.japanService={playerRequest(){requests++;},isYieldingFor:()=>true};
 f.frame();assert.equal(f.c.pendingInteraction,seat);assert.equal(f.c.targetStation,seat);assert.equal(f.counts.released,0);assert.equal(f.c.seated,null);
 clear=true;f.frame();assert.equal(f.c.seated,seat);assert.deepEqual(f.c.player.root.position.toArray(),seat.anchor);assert.equal(f.c.pendingInteraction,null);assert.equal(f.c.targetStation,null);assert.equal(f.counts.released,0);
 f.frame();assert.equal(requests,2);checks.push('empty-route furniture yield retains reservation and mounts authored seat exactly once');
}
{
 const f=fixture({distance:0,route:false}),pool={id:'pool',furniture:true,kind:'bath',name:'浴池',position:[0,0,0],seats:[]};
 f.c.pendingInteraction=f.c.targetStation=pool;f.c.furniture.resolveBath=()=>null;
 f.frame();f.frame();assert.equal(f.c.pendingInteraction,pool);assert.equal(f.c.targetStation,pool);assert.equal(f.counts.released,0);assert.equal(f.messages.length,0,'retained wait does not repeat the arrival toast');
 f.key('KeyE');f.frame();assert.equal(f.c.pendingInteraction,null);assert.equal(f.c.targetStation,null);checks.push('full-pool empty-route wait remains cancellable without losing reservation early');
}
console.log(JSON.stringify({status:'PASS',scope:'Production main updatePlayer, arrival/intent/input/furniture functions with real route execution; no scene or browser claims',checks,maxRSSMiB:process.resourceUsage().maxRSS/1024},null,2));
