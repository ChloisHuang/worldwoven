import {createLifeDecisions} from './npc-life-decisions.js';

// Reuse the existing preference/need decision process at the clinic's authored
// waiting room. Each candidate must have an actual route before it is chosen.
const SPOTS=[
 {id:'read',label:'候诊厅读书',point:[24.6,4.015,-24.3],action:'read',base:.4,traits:{quiet:.8,curiosity:.7},needs:{fatigue:.3},relief:{fatigue:-.09},duration:[14,22],cooldown:15},
 {id:'garden',label:'窗边看庭景',point:[23.55,4.015,-23.7],target:[23.55,4.015,-21.5],action:'wave',base:.3,traits:{outdoors:.8,quiet:.4},needs:{fatigue:.35},relief:{fatigue:-.10},duration:[10,18],cooldown:12},
];
export function createClinicPhysicianLife({doctor,planPath,travel,near,worldSeed=1,saved={},onChange=()=>{}}){
 const id=doctor.station.id;let dirty=false,time=0,next=0,current=null;
 let life=createLifeDecisions({worldSeed,actorIds:[id],saved:saved.brain,onChange:()=>{dirty=true;}});
 function restore(s={}){life=createLifeDecisions({worldSeed,actorIds:[id],saved:s.brain,onChange:()=>{dirty=true;}});time=Math.max(0,s.time||0);next=Math.max(time,s.next||0);const choice=life.state(id).current,spot=SPOTS.find(c=>c.id===choice?.id);current=spot&&s.current?.id===choice.id?{...spot,...choice,elapsed:Math.max(0,s.current.elapsed||0),travelled:Math.max(0,s.current.travelled||0)}:null;return true;}
 restore(saved);
 function end(fulfilled=false){if(!current)return;life.complete(id,current,{fulfilled});current=null;doctor.route=[];next=time+1;dirty=true;}
 function update(dt,{released=false,paused=false,hour=10}={}){
  time+=dt;life.tick(dt);
  if(!released){end();return null;}
  if(paused)return current&&near(doctor,current.point,.1)?current:null;
  if(!current&&time>=next){
   const choices=SPOTS.map(c=>({...c,reachable:near(doctor,c.point,.1)||planPath(doctor.root.position,{x:c.point[0],y:c.point[1],z:c.point[2]},.25).length>0}));
   const choice=life.choose(id,choices,hour);if(choice)current={...choice,elapsed:0,travelled:0};else next=time+6;
  }
  if(!current)return null;
  const arrived=travel(doctor,current.point,dt);if(arrived)current.elapsed+=dt;else current.travelled+=dt;
  const pose=arrived?current:null;if(current.elapsed>=current.duration)end(true);else if(current.travelled>60)end();
  return pose;
 }
 return {socialProfile:actorId=>actorId===id?life.state(id):null,update,restore,recall:end,label:()=>current?.label||'候诊厅稍歇',snapshot:()=>({version:1,time,next,current:current?{id:current.id,elapsed:current.elapsed,travelled:current.travelled}:null,brain:life.snapshot()}),
  flush:()=>{if(!dirty)return true;if(onChange()===false)return false;dirty=false;return true;}};
}
