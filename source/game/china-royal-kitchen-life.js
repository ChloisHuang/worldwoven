import {createLifeDecisions} from './npc-life-decisions.js';
const SPOTS=[
 {id:'read',label:'Jia · 餐厅侧边读书歇脚',point:[24.25,.215,-4.9],action:'read',base:.3,traits:{quiet:.8,curiosity:.7},needs:{fatigue:.3},relief:{fatigue:-.09},duration:[14,24],cooldown:20},
 {id:'garden',label:'Jia · 廊边看看庭景',point:[24.2,.215,-3.8],target:[24.2,.215,0],base:.25,traits:{outdoors:1,quiet:.3},needs:{fatigue:.3},relief:{fatigue:-.1},duration:[12,20],cooldown:17},
];
export function createRoyalKitchenLife({actor,worldSeed,planPath,travel,near,saved={}}){
 const id=actor.station.id,name=actor.station.npcName||'Jia',spots=SPOTS.map(s=>({...s,label:s.label.replace('Jia',name)}));let current=null,time=0,next=0,brain;
 function restore(s={}){brain=createLifeDecisions({worldSeed,actorIds:[id],saved:s.brain});time=s.time||0;next=s.next||0;const choice=brain.state(id).current,spot=spots.find(c=>c.id===choice?.id);current=spot&&s.current?.id===spot.id?{...spot,...choice,elapsed:s.current.elapsed||0,travelled:s.current.travelled||0}:null;}
 restore(saved);
 function end(fulfilled=false){if(!current)return;brain.complete(id,current,{fulfilled});current=null;actor.route=[];next=time+3;}
 function update(dt,{released=false,paused=false,hour=10}={}){time+=dt;brain.tick(dt);if(!released){end();return null;}if(paused)return current&&near(actor,current.point)?current:null;
  if(!current&&time>=next){const choice=brain.choose(id,spots.map(c=>({...c,reachable:near(actor,c.point)||planPath(actor.root.position,{x:c.point[0],y:c.point[1],z:c.point[2]},.25).length>0})),hour);if(choice)current={...choice,elapsed:0,travelled:0};else next=time+6;}
  if(!current)return null;const arrived=travel(actor,current.point,dt);if(arrived)current.elapsed+=dt;else current.travelled+=dt;const pose=arrived?current:null;if(current.elapsed>=current.duration)end(true);else if(current.travelled>60)end();return pose;
 }
 return {update,restore,recall:()=>end(),snapshot:()=>({version:1,time,next,brain:brain.snapshot(),current:current?{id:current.id,elapsed:current.elapsed,travelled:current.travelled}:null}),label:()=>current?.label||name+' · 餐厅侧边歇脚'};
}
