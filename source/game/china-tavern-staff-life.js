import {TAVERN_LAYOUT_VERSION} from './china-tavern-layout.js';
import {createLifeDecisions} from './npc-life-decisions.js';
import {createPalaceMealKit} from './china-palace-costume.js';

const copy=x=>JSON.parse(JSON.stringify(x));
const near=(n,p,r=.12)=>Math.hypot(n.root.position.x-p[0],n.root.position.z-p[2])<r&&Math.abs(n.root.position.y-p[1])<.35;
const WALKS=[[20,.115,22.4],[22,.115,22.4],[21.4,.215,19.9],[22.1,.215,9.15]];
// This is the existing personality/need sampler applied at activity boundaries.
// It never claims an order, changes a post, scans routes, or creates wages.
export function createTavernStaffLife({actors,furniture,getPlayer,getMounted,getClock,worldSeed=1,travel,unmount,effect,onChanged=()=>{},sharedNeeds=null,getAdditionalChoices=()=>[],onExternalChoice=()=>false}){
 const rows=new Map(),nextAt=new Map(),snacks=new Map(actors.map(n=>[n.station.id,1])),kits=new Map();
 let time=0,dirty=false,disposed=false,brain=null,events=[];
 const makeBrain=saved=>createLifeDecisions({worldSeed,actorIds:actors.map(n=>n.station.id),saved,sharedNeeds,onChange:()=>{dirty=true;}});
 brain=makeBrain({});
 const note=(n,event)=>{events.push({actorId:n.station.id,event,time});if(events.length>30)events.shift();dirty=true;};
 const snapshot=()=>({version:1,layoutVersion:TAVERN_LAYOUT_VERSION,time,brain:brain.snapshot(),rows:[...rows].map(([n,s])=>[n.station.id,copy(s)]),nextAt:[...nextAt].map(([n,t])=>[n.station.id,t]),snacks:[...snacks],events:copy(events)});
 const occupied=(seat,n)=>getMounted()?.id===seat.id||actors.some(a=>a!==n&&a.serviceMount?.id===seat.id)||!!furniture.facilities.reservation?.(seat.id,n.station.id)?.other;
 const freeSeat=(seat,n)=>{const all=furniture.facilities.state?.()||[],f=all.find(f=>f.id===seat.id);return !occupied(seat,n)&&!f?.reservations.some(r=>r.actor!==n.station.id);};
 function finish(n,s,fulfilled){if(n.serviceMount&&!unmount(n))return false;furniture.releaseActor(n.station.id);if(s?.choice)brain.complete(n.station.id,s.choice,{fulfilled});if(fulfilled&&s?.choice.id==='meal')snacks.set(n.station.id,Math.max(0,(snacks.get(n.station.id)||0)-1));rows.delete(n);n.route=[];kits.get(n)?.show(false);nextAt.set(n,time+3);note(n,fulfilled?'completed':'interrupted');return true;}
 function interrupt(n){const s=rows.get(n);if(s||n.serviceMount)return finish(n,s,false);kits.get(n)?.show(false);return true;}
 function candidates(n,{onDuty}){
  const seats=furniture.items.filter(s=>s.id.startsWith('china-tavern-dining-')&&s.id.endsWith('-1')&&!s.id.endsWith('--1')&&freeSeat(s,n));
  const seatTargets=seats.map(s=>({id:s.id,choice:{seatId:s.id,target:s.position.slice()}}));
  const people=actors.filter(a=>a!==n&&!a.walking&&Math.abs(a.root.position.y-n.root.position.y)<.3&&Math.hypot(a.root.position.x-n.root.position.x,a.root.position.z-n.root.position.z)<3.5);
  return [
   {id:'rest',label:onDuty?'短暂坐歇':'坐下休息',action:'relax',targets:seatTargets,base:.7,needs:{fatigue:2},traits:{quiet:.5},relief:{fatigue:-.22},duration:onDuty?[5,8]:[9,16],cooldown:12},
   {id:'meal',label:'吃自备点心',action:'meal',targets:seatTargets,available:!sharedNeeds?.has(n.station.id)&&!onDuty&&(snacks.get(n.station.id)||0)>0,base:.4,needs:{hunger:2},traits:{appetite:.8},relief:{hunger:-.35},duration:[8,12],cooldown:90},
   {id:'garden',label:onDuty?'在厅中活动片刻':'到院里散步',action:'relax',targets:(onDuty?WALKS.slice(2):WALKS).map((p,i)=>({p,i})).filter(({p})=>!near(n,p,.8)&&!actors.some(other=>other!==n&&near(other,p,.65))&&![...rows].some(([other,s])=>other!==n&&Math.hypot(s.target[0]-p[0],s.target[2]-p[2])<.65)).map(({p,i})=>({id:'walk-'+i,choice:{target:p.slice(),label:p[2]>21?'到院里散步':'在厅里走动'}})),base:.6,traits:{outdoors:1,curiosity:.4},relief:{fatigue:-.06},duration:[5,9],cooldown:8},
   {id:'social',label:'与熟人闲聊',action:'relax',targets:people.map(a=>({id:a.station.id,relationship:{target:a.station.id,gain:.025},choice:{target:n.root.position.toArray(),partnerId:a.station.id}})),base:.3,needs:{social:1.5},traits:{sociability:.8},relief:{social:-.2},duration:[4,7],cooldown:15},
   ...getAdditionalChoices(n,{onDuty}),
   {id:'pause',label:onDuty?'候客，舒展肩背':'伸展片刻',action:'relax',target:n.root.position.toArray(),base:.15,relief:{fatigue:-.03},duration:[3,5],cooldown:18},
  ];
 }
 function update(n,dt,t,{onDuty=false,conversationActorId=null}={}){
  if(disposed)return;let s=rows.get(n);
  if(conversationActorId===n.station.id){if(s&&!interrupt(n))return;n.walking=false;const p=getPlayer()?.root.position;effect(n,'relax',p?[p.x,p.y+1,p.z]:null);nextAt.set(n,time+3);return;}
  if(!s&&time>=(nextAt.get(n)||0)){
   const choice=brain.choose(n.station.id,candidates(n,{onDuty}),getClock()?.hour??10);
   if(choice?.external){const fulfilled=onExternalChoice(n,choice);brain.complete(n.station.id,choice,{fulfilled});nextAt.set(n,time+6);note(n,'external:'+choice.id);return;}
   if(choice){s={choice,target:choice.target.slice(),seatId:choice.seatId||null,phase:'approaching',elapsed:0,wait:0};rows.set(n,s);n.route=[];note(n,'chosen:'+choice.id);}else nextAt.set(n,time+3);
  }
  if(!s){effect(n,'relax');return;}
  if(s.phase==='acting'&&s.seatId&&!n.serviceMount)s.phase='approaching';
  if(s.phase==='approaching'){
   const seat=s.seatId&&furniture.items.find(i=>i.id===s.seatId);
   if(seat&&(!freeSeat(seat,n)||!furniture.facilities.reserve(seat.id,n.station.id,{purpose:'personal-'+s.choice.id}))){s.wait+=dt;if(s.wait>5)finish(n,s,false);return;}
   if(travel(n,s.target,dt)){
    if(seat){if(!furniture.facilities.occupy(seat.id,n.station.id))return;n.root.position.set(...seat.anchor);n.root.rotation.y=seat.yaw;n.serviceMount=seat;}
    s.phase='acting';s.elapsed=0;s.wait=0;note(n,'arrived:'+s.choice.id);
   }else{s.wait=n.walking?0:s.wait+dt;if(s.wait>8)finish(n,s,false);}
  }
  if(s.phase==='acting'){
   const partner=actors.find(a=>a.station.id===s.choice.partnerId),p=partner?.root.position;
   effect(n,s.choice.action,p?[p.x,p.y+1,p.z]:null);
   if(s.choice.id==='meal'){if(!kits.has(n))kits.set(n,createPalaceMealKit(n));kits.get(n).show(true);}
   s.elapsed+=Math.max(0,Math.min(.1,dt));if(s.elapsed>=s.choice.duration)finish(n,s,true);
  }
 }
 return {
  tick(dt){time+=Math.max(0,dt);brain.tick(dt);},update,interrupt,
  flush(){if(dirty){dirty=false;onChanged(snapshot());}},sync(){for(const kit of kits.values())kit.sync();},
  isActive:n=>rows.has(n),claimsSeat:(id,seatId)=>[...rows].some(([n,s])=>n.station.id===id&&s.seatId===seatId),
  label:n=>rows.get(n)?.phase==='approaching'?'前往'+rows.get(n).choice.label:rows.get(n)?.choice.label||'歇息片刻',
  socialProfile:id=>brain.state(id),
  snapshot,restore(s){if(s?.version!==1)return false;time=Math.max(0,s.time||0);brain=makeBrain(s.brain||{});rows.clear();for(const[id,row]of s.rows||[]){const n=actors.find(n=>n.station.id===id);if(n&&row.choice&&Array.isArray(row.target)&&!(sharedNeeds?.has(id)&&row.choice.id==='meal')){const next=copy(row),seat=next.seatId&&furniture.items.find(i=>i.id===next.seatId);if(s.layoutVersion!==TAVERN_LAYOUT_VERSION){if(seat)next.target=seat.position.slice();else if(next.choice.id==='garden'&&Math.hypot(next.target[0]-22.1,next.target[2]-14.15)<.01)next.target=[22.1,.215,9.15];next.choice.target=next.target.slice();if(seat||!near(n,next.target)){next.phase='approaching';next.wait=0;}}rows.set(n,next);}}nextAt.clear();for(const[id,t]of s.nextAt||[]){const n=actors.find(n=>n.station.id===id);if(n&&Number.isFinite(t))nextAt.set(n,t);}for(const[id,count]of s.snacks||[])if(snacks.has(id)&&Number.isInteger(count)&&count>=0)snacks.set(id,count);events=copy((s.events||[]).slice(-30));dirty=false;return true;},
  state:()=>({time,actors:actors.map(n=>({id:n.station.id,choice:rows.get(n)?.choice.id||null,phase:rows.get(n)?.phase||'idle',target:rows.get(n)?.target||null,elapsed:rows.get(n)?.elapsed||0,label:rows.get(n)?.choice.label||null})),events:copy(events),decisions:brain.snapshot()}),
  dispose(){disposed=true;for(const kit of kits.values())kit.dispose();kits.clear();rows.clear();}
 };
}
