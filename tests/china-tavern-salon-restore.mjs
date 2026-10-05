import assert from 'node:assert/strict';
import {createSalonArtistLife} from '../source/game/china-tavern-salon-life.js';
import {SALON_ARTISTS} from '../source/game/china-tavern-salon-artists.js';
import {createAutomaticRouting} from '../source/game/automatic-routing.js';
import {beginActorNavigationStep,followActorRoute,moveActorWithCollision} from '../source/game/actor-navigation.js';
import {blocked} from '../source/game/navigation.js';

// Only the changed Gu Liuying checkpoint: real shared movement through the
// authored table/chair/partition bounds, without constructing another scene.
const home=SALON_ARTISTS.find(a=>a.id==='cn-tavern-songwriter').position;
const walls=[
 {minX:22.14,maxX:22.46,minZ:15.2,maxZ:17.1},
 {minX:22.14,maxX:22.46,minZ:19.4,maxZ:21},
 {minX:23.75,maxX:24.65,minZ:16.41,maxZ:17.31},
 {minX:23.52,maxX:24.88,minZ:17.65,maxZ:18.75},
 {minX:21.6,maxX:23.3,minZ:15.04,maxZ:15.36},
].map(b=>({...b,minY:7.8,maxY:9.8}));
const navigation={bounds:{minX:20,maxX:26,minZ:11,maxZ:21},multilevel:false};
for(const [choice,phase,z]of [['practice','acting',16.6],['pause','acting',16.05],['pause','returning',16.05]]){
 const position={x:23.1,y:7.815,z},n={station:{id:'cn-tavern-songwriter'},root:{position,rotation:{y:0}},home:{toArray:()=>home.slice()},route:[],locomotion:{walkSpeed:1.5}};
 const doors=createAutomaticRouting({doors:[],staticColliders:walls,planningColliders:[],getSweepBoxes:()=>[],requestOpen:()=>{},getVersion:()=>0});
 const planPath=(from,to,r)=>doors.planPath(from,to,navigation,r),moveActor=(a,dx,dz,r)=>moveActorWithCollision(a,dx,dz,r,{colliders:walls,navigation,npcs:[n],playerPosition:null});
 let route=null,targetKey=null;
 const travel=(a,to,dt)=>{const key=to.join(',');if(key!==targetKey){targetKey=key;route=planPath(position,{x:to[0],y:to[1],z:to[2]},.25);}if(Math.hypot(position.x-to[0],position.z-to[2])<.07)return true;followActorRoute(a,dt,{route,doors,moveActor,npcs:[n],radius:.25,arrivalTolerance:.04});return Math.hypot(position.x-to[0],position.z-to[2])<.07;};
 const life=createSalonArtistLife({performers:[n],travel,pose(){},planPath});
 const target=[23.1,7.815,phase==='returning'?16.6:z],checkpoint={version:1,clock:20,stages:[[n.station.id,{phase,target,choice:{id:choice,to:[23.1,7.815,choice==='pause'?16.05:16.6],duration:7,action:'read',busy:choice==='practice',roam:choice==='pause'},elapsed:2,wait:0}]],readyAt:[[n.station.id,20]],roamingId:choice==='pause'?n.station.id:null,events:[]},saved=JSON.stringify(checkpoint),before={...position};
 assert(life.restore(checkpoint));assert.deepEqual(position,before,'restoring an intention never relocates the body');assert.equal(JSON.stringify(checkpoint),saved,'the input checkpoint is not mutated');
 const expected=phase==='returning'||choice==='practice'?home:[home[0],home[1],home[2]+.55];assert.deepEqual(life.state().actors[0].target,expected);assert.equal(life.state().actors[0].phase,phase==='returning'?'returning':'approaching');
 const pausedChoice=JSON.stringify(life.state().actors[0]),originalRoute=n.route;for(let i=0;i<20;i++)life.update(.1,20+i*.1,{conversationActorId:n.station.id});assert.equal(JSON.stringify(life.state().actors[0]),pausedChoice,'a social pause preserves the artist phase, intent and activity clock');assert.equal(n.route,originalRoute,'a social pause does not clear the artist route');assert.deepEqual(position,before,'the original artist stands in place while talking');
 let arrived=false;
 for(let i=0;i<240&&!arrived;i++){const last={...position};beginActorNavigationStep(1/60);life.update(1/60,20+i/60);assert(Math.hypot(position.x-last.x,position.z-last.z)<=.025+1e-6,'only ordinary continuous walking');assert(!blocked(position.x,position.z,walls,.25,navigation),'full radius never passes through the chair or partition');arrived=['acting','idle'].includes(life.state().actors[0].phase);}
 assert(arrived,'the saved activity resumes only after actually reaching its new point');assert(Math.hypot(position.x-expected[0],position.z-expected[2])<.08);assert.equal(life.state().actors[0].choice,phase==='returning'?null:choice);life.dispose();doors.dispose();
}
console.log('PASS: old Gu work, short pause and return checkpoints walk from retained positions to the revised points before resuming');
