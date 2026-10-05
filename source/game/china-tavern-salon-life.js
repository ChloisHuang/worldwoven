import {createLifeDecisions} from './npc-life-decisions.js';
import {SALON_ARTISTS} from './china-tavern-salon-artists.js';

const copy=value=>JSON.parse(JSON.stringify(value));
const point=p=>({x:p[0],y:p[1],z:p[2]});
const position=actor=>[actor.root.position.x,actor.root.position.y,actor.root.position.z];
const near=(p,to,r=.08)=>Math.hypot(p.x-to[0],p.z-to[2])<r&&Math.abs(p.y-to[1])<.3;
const OLD_SONGWRITER_POINTS=[[23.1,7.815,16.6],[23.1,7.815,16.05]];
// These are short, same-floor floor-space pauses beside each authored station.
// They avoid the qin table, listening chairs, banquet chairs and both openings.
const PROFILES={
 'cn-tavern-reciter':{offset:[-.55,0],work:'低声推敲诗句',study:'独自翻读旧词',pause:'停卷歇一歇',workWeight:.75,studyWeight:1.1,pauseWeight:.35},
 'cn-tavern-storyteller':{offset:[-.55,0],work:'整理江行说书稿',study:'翻阅山川手札',pause:'踱两步回想旅途',workWeight:1.1,studyWeight:.5,pauseWeight:.7},
 'cn-tavern-songwriter':{offset:[0,.55],work:'推敲新填曲词',study:'静读曲词韵谱',pause:'离案稍作歇息',workWeight:.65,studyWeight:1.3,pauseWeight:.3},
 'cn-tavern-chess-poet':{offset:[0,-.55],work:'默演棋局掌故',study:'翻读弈棋旧谱',pause:'缓步思索棋理',workWeight:.8,studyWeight:.6,pauseWeight:.8},
};

/**
 * Owns only the supplied, non-excluded artists' local life and pose. All motion
 * goes through travel(actor,[x,y,z],dt); pose(actor,t,action,target) is supplied
 * by the salon. No roots are relocated, furniture claimed or props created.
 *
 * saveState and snapshot use the existing createLifeDecisions snapshot directly.
 * A restored intention replans from the actor's real position; routes, occupancy
 * and elapsed pose time are never restored as if an activity had been completed.
 * The caller checks isBusy before a request, then interrupt on acceptance and
 * excludes the session/return actor until the salon hands it back at home.
 */
export function createSalonArtistLife({performers=[],worldSeed=1,saved={},saveState=()=>{},travel,pose,planPath,getPlayer=()=>null,isActorBusy=()=>false}){
 const artists=performers.filter(n=>PROFILES[n.station?.id]&&SALON_ARTISTS.some(a=>a.id===n.station.id));
 const owned=new Set(artists),stages=new Map(),readyAt=new Map(),events=[];
 let clock=Number.isFinite(saved?.time)?saved.time:0,roaming=null,disposed=false,saveError=null;
 const brain=createLifeDecisions({worldSeed,actorIds:artists.map(n=>n.station.id),saved:saved||{},onChange:value=>{
  try{saveError=saveState(value)===false?'save-failed':null;}catch{saveError='save-failed';}
 }});
 const home=n=>n.home?.toArray?.()||SALON_ARTISTS.find(a=>a.id===n.station.id).position.slice();
 const aside=n=>{const h=home(n),offset=PROFILES[n.station.id].offset;return [h[0]+offset[0],h[1],h[2]+offset[1]];};
 const record=(n,event,extra={})=>{events.push({actorId:n.station.id,event,time:+clock.toFixed(2),...extra});if(events.length>32)events.shift();};
 const stop=n=>{n.walking=false;n.route=[];};
 const busy=n=>!!stages.get(n)?.choice?.busy&&stages.get(n)?.phase==='acting';
 artists.forEach((n,index)=>readyAt.set(n,clock+.6+index*.7));

 function occupied(n,to){
  const p=getPlayer()?.root?.position;
  return !!p&&near(p,to,.7)||artists.some(other=>other!==n&&near(other.root.position,to,.65));
 }
 function reachable(n,to){
  if(occupied(n,to))return false;
  if(near(n.root.position,to))return true;
  const path=planPath(n.root.position,point(to),.25);
  if(!Array.isArray(path)||!path.length||!near(path.at(-1),to,.12))return false;
  // This is a local break, never an invitation to route around the building.
  let previous=n.root.position,length=0;
  for(const p of path){if(Math.abs(p.y-to[1])>.3)return false;length+=Math.hypot(p.x-previous.x,p.z-previous.z);previous=p;}
  return length<2;
 }
 function candidates(n){
  const profile=PROFILES[n.station.id],atHome=home(n),pause=aside(n),canPause=(!roaming||roaming===n)&&reachable(n,pause);
  return [
   {id:'practice',label:profile.work,action:n.station.npcAction==='tea'?'tea':'read',to:atHome,busy:true,base:profile.workWeight,traits:{curiosity:.45,quiet:.3},duration:[7,11],cooldown:24},
   {id:'study',label:profile.study,action:'read',to:atHome,busy:true,base:profile.studyWeight,traits:{curiosity:.9,quiet:.7},duration:[6,10],cooldown:28},
   {id:'pause',label:profile.pause,action:'relax',to:pause,roam:true,available:canPause,base:profile.pauseWeight,traits:{outdoors:.35},needs:{fatigue:1.3},relief:{fatigue:-.13},duration:[4,7],cooldown:25},
   {id:'idle',label:'歇场待客',action:'relax',to:atHome,base:.65,traits:{sociability:.45},duration:[4,7],cooldown:7},
  ];
 }
 function complete(n,s,fulfilled){
  if(s.choice)brain.complete(n.station.id,s.choice,{fulfilled});
  record(n,fulfilled?'completed':'interrupted',{choice:s.choice?.id||null});
  stages.delete(n);if(roaming===n)roaming=null;readyAt.set(n,clock+4);stop(n);
 }
 function interrupt(n){
  if(!owned.has(n)||busy(n))return false;
  const s=stages.get(n);
  if(s)complete(n,s,false);else{readyAt.set(n,clock+4);stop(n);}
  return true;
 }
 function yieldActor(n){
  const s=stages.get(n);
  if(s){if(s.choice)brain.complete(n.station.id,s.choice,{fulfilled:false});stages.delete(n);if(roaming===n)roaming=null;readyAt.set(n,clock+4);}
  // The external owner may already have installed a route. Do not clear it.
 }
 function returnHome(n,s){
  s.phase='returning';s.target=home(n);s.wait=0;s.elapsed=0;stop(n);
 }
 function restoreStage(n,state){
  const s=copy(state);
  // Old checkpoints can still hold an intention at the chair's narrow aisle.
  // Change only that intention: the restored body stays at its real position
  // and uses ordinary travel before resuming its saved activity.
  if(n.station.id==='cn-tavern-songwriter'&&OLD_SONGWRITER_POINTS.some(p=>near(point(s.target),p,.01))){
   const to=s.choice?.id==='pause'?aside(n):home(n);
   if(s.choice)s.choice.to=to.slice();
   s.target=s.phase==='returning'?home(n):to;
   if(s.phase==='acting')s.phase='approaching';
   s.elapsed=0;s.wait=0;
  }
  return s;
 }
 function updateActor(n,dt,t){
  let s=stages.get(n);
  if(!s&&clock>=readyAt.get(n)){
   if(!near(n.root.position,home(n))){
    if(!roaming||roaming===n){roaming=n;s={phase:'returning',choice:null,target:home(n),elapsed:0,wait:0};stages.set(n,s);}
   }else{
    const choice=brain.choose(n.station.id,candidates(n));
    if(choice){s={phase:'approaching',choice,target:choice.to.slice(),elapsed:0,wait:0};stages.set(n,s);if(choice.roam)roaming=n;record(n,'chosen',{choice:choice.id,resumed:!!choice.resumed,target:s.target.slice()});}
    else readyAt.set(n,clock+2);
   }
  }
  n.walking=false;
  if(s){
   if(s.phase==='approaching'||s.phase==='returning'){
    // A player entering the little pause slot makes this artist wait, never
    // overlap. Travel performs the full scene's remaining collision checks.
    const arrived=!occupied(n,s.target)&&travel(n,s.target,dt);
    if(arrived&&near(n.root.position,s.target)){
     stop(n);s.wait=0;
     if(s.phase==='returning'){complete(n,s,s.fulfilled!==false);s=null;}
     else{s.phase='acting';s.elapsed=0;record(n,'arrived',{choice:s.choice.id});}
    }else{
     s.wait=n.walking?0:s.wait+dt;
     if(s.phase==='approaching'&&s.wait>8){s.fulfilled=false;returnHome(n,s);}
    }
   }else if(s.phase==='acting'){
    s.elapsed+=dt;
    if(s.elapsed>=s.choice.duration){
     if(s.choice.roam)returnHome(n,s);else{complete(n,s,true);s=null;}
    }
   }
  }
  const action=s?.phase==='acting'?s.choice.action:s?null:'relax';
  pose(n,t,action,s?.phase==='acting'&&s.choice.id!=='pause'?n.station.workTarget:null);
 }
 return {
  update(dt,t,{excluded=new Set(),conversationActorId=null}={}){
   if(disposed||!Number.isFinite(dt)||dt<=0)return;
   clock+=dt;brain.tick(dt);
   for(const n of artists){
    if(excluded.has(n)||excluded.has(n.station.id)||isActorBusy(n)||n.serviceMount){yieldActor(n);continue;}
    if(conversationActorId===n.station.id){
     n.walking=false;pose(n,t,null,getPlayer()?.root?.position?position(getPlayer()):null);continue;
    }
    updateActor(n,dt,t);
   }
  },
  interrupt,
  isBusy:busy,
  label(n){const s=stages.get(n);return !owned.has(n)?null:s?.phase==='returning'?'歇场后回到原处':s?.phase==='approaching'?'缓步去旁边歇息':s?.choice?.label||'歇场待客';},
  continuity:()=>({version:1,clock,stages:[...stages].map(([n,s])=>[n.station.id,copy(s)]),readyAt:[...readyAt].map(([n,t])=>[n.station.id,t]),roamingId:roaming?.station.id||null,events:copy(events)}),
  restore(s){if(s?.version!==1)return false;clock=Math.max(0,s.clock||0);stages.clear();for(const [id,state]of s.stages||[]){const n=artists.find(n=>n.station.id===id);if(n&&['approaching','acting','returning'].includes(state.phase)&&Array.isArray(state.target))stages.set(n,restoreStage(n,state));}for(const[id,t]of s.readyAt||[]){const n=artists.find(n=>n.station.id===id);if(n&&Number.isFinite(t))readyAt.set(n,t);}roaming=artists.find(n=>n.station.id===s.roamingId)||null;events.splice(0,events.length,...copy(s.events||[]));return true;},
  socialProfile:id=>brain.state(id),
  snapshot:()=>brain.snapshot(),
  state:()=>({roamingId:roaming?.station.id||null,saveError,actors:artists.map(n=>{const s=stages.get(n);return {id:n.station.id,phase:s?.phase||'idle',choice:s?.choice?.id||null,busy:busy(n),elapsed:s?.elapsed||0,duration:s?.choice?.duration||0,position:position(n),target:s?.target.slice()||home(n)};}),events:copy(events),decisions:brain.snapshot()}),
  dispose(){if(disposed)return;disposed=true;brain.dispose();for(const n of stages.keys())stop(n);stages.clear();roaming=null;},
 };
}
