// A small adapter for staff whose original post is already covered. The shift
// controller remains the sole authority for coverage and urgent daily needs.
// These are two clear standing places beside the existing public kotatsu hall.
export const JAPAN_STAFF_TALK_PLACES=Object.freeze([[-4.9,7.6,6.5],[-3.55,7.6,6.5]]);
export const JAPAN_STAFF_WORK_TALK_PLACES=Object.freeze([[-5.25,11.4,-.3],[-3.9,11.4,-.3]]);
const ids=JAPAN_STAFF_TALK_PLACES.map((_,i)=>'japan-staff-public-tea-'+i),copy=x=>JSON.parse(JSON.stringify(x));
const near=(n,to)=>Math.hypot(n.root.position.x-to[0],n.root.position.z-to[2])<.2&&Math.abs(n.root.position.y-to[1])<.3;
export function createJapanStaffConversations({crew,brain,furniture,assign,clear,unmount,taskOf,available,canReach,save=()=>true,beginInteraction=()=>null,onInteraction=()=>{},note=()=>{},onRelease=()=>{}}){
 const stages=new Map(),claims=furniture.facilities;let pair=null,time=0,state={},checked=false;
 const actor=id=>crew.find(n=>n.station.id===id),owned=id=>stages.has(id),free=id=>!state.facilityId||state.facilityId!==id;
 const vacant=(id,who)=>free(id)&&!claims.state().some(f=>f.id===id&&(f.player||f.reservations.some(r=>r.actor!==who)));
 function idle(n,label='交班后的余暇 · 先歇一会儿'){
  clear(n);claims.releaseActor(n.station.id);brain.defer(n.station.id,12);
  const previous=stages.get(n.station.id);stages.set(n.station.id,{phase:'idle',label,mode:previous?.mode||available(n,state),age:previous?.age||0});
  assign(n,n.root.position.toArray(),{staffLife:true,staffConversation:true,arrived:true,label,duration:0,onDone:()=>false});
 }
 function release(n){clear(n);claims.releaseActor(n.station.id);stages.delete(n.station.id);onRelease(n.station.id);}
 function cancel(label='先忙手边的事，改日再聊'){
  if(!pair)return;const old=pair;pair=null;brain.cancelConversation(old.id);
  for(const id of old.participants){const n=actor(id);if(n)idle(n,label);}
  note('conversation-cancelled',{conversationId:old.id});save();
 }
 function finish(){
  const result=brain.finishConversation(pair.id,{elapsed:pair.elapsed,arrived:pair.participants.filter(id=>taskOf(actor(id))?.arrived&&near(actor(id),pair.places[pair.participants.indexOf(id)]))});
  if(!result.ok)return;const old=pair;pair=null;
  for(const id of old.participants){const feeling=result.event.results.find(r=>r.actorId===id)?.feeling;idle(actor(id),feeling==='appreciated'?'谈得投缘 · 下回还想一起歇歇':feeling==='mismatched'?'做事与歇息各有喜好 · 今日先聊到这里':'听过彼此的工作日常 · 各自歇息');}
  note('conversation-completed',{conversationId:old.id,results:result.event.results});save();
 }
 function walkPair(){
  for(const [i,id]of pair.participants.entries()){
   const n=actor(id),to=pair.places[i];
   assign(n,to,{staffLife:true,staffConversation:true,label:pair.short?'到香药房外侧说几句 · 新单优先':'约好到暖桌厅旁 · 聊聊工作后的余暇',face:pair.places[1-i],duration:0,onDone:()=>false});
  }
 }
 function invite(n,choice){
  const other=actor(choice.targetId),short=stages.get(n.station.id)?.mode!=='released'||stages.get(other?.station.id)?.mode!=='released',places=short?JAPAN_STAFF_WORK_TALK_PLACES:JAPAN_STAFF_TALK_PLACES;
  if(pair||!other||stages.get(other.station.id)?.phase!=='idle'||!available(n,state)||!available(other,state)||!brain.canReply(other.station.id)||ids.some(id=>!vacant(id,n.station.id)&&!vacant(id,other.station.id))||![n,other].every((a,i)=>canReach(a,places[i])))return false;
  const result=brain.invite(n.station.id,choice);if(!result.ok)return false;
  if(result.status==='declined'){idle(n,'同伴这会儿想独处 · 改日再聊');idle(other,'这会儿更想自己歇歇');note('conversation-declined',{conversationId:result.id});save();return true;}
  pair={id:result.id,places:places.map(p=>p.slice()),short,participants:result.participants,experience:result.experience,responses:result.responses,duration:choice.duration,elapsed:0,age:0,phase:'invited'};
  for(const [i,id]of pair.participants.entries()){clear(actor(id));claims.releaseActor(id);stages.set(id,{...stages.get(id),phase:'conversation',pairId:pair.id});if(!claims.reserve(ids[i],id,{purpose:'conversation'})){cancel('茶休位置有人，改日再聊');return true;}}
  walkPair();note('conversation-accepted',{conversationId:pair.id});if(save()===false)cancel('稍后再聊');return true;
 }
 function choose(n){
  const id=n.station.id,experience=brain.experience(id),partners=!pair&&experience?crew.filter(other=>other!==n&&stages.get(other.station.id)?.phase==='idle'&&available(other,state)&&brain.canReply(other.station.id)&&Math.abs(other.root.position.y-n.root.position.y)<.3&&Math.hypot(other.root.position.x-n.root.position.x,other.root.position.z-n.root.position.z)<6.5):[];
  const choice=brain.choose(id,[
   {id:'pause',base:.16,traits:{quiet:.3},duration:[8,13],cooldown:20,relief:{fatigue:-.04}},
   {id:'tea',available:stages.get(id)?.mode==='released',base:.3,traits:{quiet:.65,sociability:.2},needs:{fatigue:.2},duration:[6,11],cooldown:55,relief:{fatigue:-.12},experience:{kind:'staff-rest',label:'刚在暖桌厅旁歇过，聊起忙完一班后的休息'},targets:ids.map((facilityId,i)=>({id:facilityId,available:vacant(facilityId,id)&&canReach(n,JAPAN_STAFF_TALK_PLACES[i]),choice:{facilityId,to:JAPAN_STAFF_TALK_PLACES[i]}}))},
   {id:'conversation',base:.09,traits:{sociability:1.1},needs:{social:1.8},duration:stages.get(id)?.mode==='released'?[9,13]:[6,8],cooldown:90,experienceId:experience?.id,targets:partners.map(other=>({id:other.station.id,relationship:{target:other.station.id,weight:.9,opinionWeight:.9}}))}
  ],state.hour??12);
  if(!choice){brain.defer(id,12);return;}
  if(choice.id==='conversation'){if(!invite(n,choice)){brain.complete(id,choice,{fulfilled:false});idle(n,'同伴暂时走不开，稍后再说');}return;}
  if(choice.facilityId&&!claims.reserve(choice.facilityId,id)){brain.complete(id,choice,{fulfilled:false});idle(n);return;}
  stages.set(id,{...stages.get(id),phase:choice.id,choice});
  assign(n,choice.to||n.root.position.toArray(),{staffLife:true,staffConversation:true,label:choice.id==='tea'?'交班后到暖桌厅旁歇歇':'享受交班后的片刻清静',action:choice.id==='tea'?'relax':null,duration:choice.duration,onDone:()=>{brain.complete(id,choice);note('released-'+choice.id+'-completed',{workerId:id});idle(n);save();return true;}});
  save();
 }
 return {
  owns:owned,
  update(dt,playerState){
   time+=dt;state=playerState;
   // A saved intention without a matching scene checkpoint cannot establish
   // contact or award a result. Cancel it once, without another random draw.
   if(!checked){checked=true;for(const n of crew){const c=brain.state(n.station.id)?.current;if(c?.conversationId&&c.conversationId!==pair?.id)brain.cancelConversation(c.conversationId);}}
   for(const [id,s]of [...stages]){const n=actor(id);s.age=(s.age||0)+dt;if(!available(n,state)||s.mode!=='released'&&s.age>70){if(s.phase==='conversation')cancel();else if(s.choice)brain.complete(id,s.choice,{fulfilled:false});release(n);}}
   if(pair){
    if(pair.participants.some((id,i)=>!claims.reservation(ids[i],id))){cancel('让出茶休位置，改日再聊');return;}
    pair.age+=dt;if(pair.age>(pair.short?45:180)){cancel('路上耽搁了，改日再聊');return;}
    const together=pair.participants.every((id,i)=>taskOf(actor(id))?.arrived&&near(actor(id),pair.places[i]));
    if(together){
     const starting=pair.phase!=='talking';if(starting){pair.phase='talking';note('conversation-talking',{conversationId:pair.id});}
     if(!Object.hasOwn(pair,'interaction')){const event=beginInteraction(pair.participants.slice());pair.interaction=event?{...event,participants:event.participants.slice(),duration:0}:null;save();}
     const spoken=starting?0:Math.min(dt,Math.max(0,pair.duration-pair.elapsed));pair.elapsed+=spoken;
     if(pair.interaction&&spoken>0){pair.interaction.duration+=spoken;onInteraction({...pair.interaction,participants:pair.interaction.participants.slice()});}
     for(const [i,id]of pair.participants.entries()){const task=taskOf(actor(id)),feeling=pair.responses[id];task.label=pair.elapsed<3?(i?'说说看，忙完这一班有什么感受？':pair.experience.label):pair.elapsed<7?(i?(feeling==='appreciated'?'我也喜欢这样安排工作后的余暇':feeling==='mismatched'?'我想法有些不同，更喜欢自己的节奏':'各有各的习惯，听你说说'):'你忙完一班，会怎样安排休息？'):(feeling==='appreciated'?'下回有空，还想听听你的见闻':feeling==='mismatched'?'明白了，我们的习惯确实不同':'记住你的想法了');}
     if(pair.elapsed>=pair.duration)finish();
    }
   }
   for(const n of crew){const id=n.station.id;if(!owned(id)&&available(n,state)&&(!taskOf(n)||taskOf(n).idle)&&unmount(n)){clear(n);claims.releaseActor(id);idle(n);brain.defer(id,12+brain.state(id).traits.quiet*8);}
    if(stages.get(id)?.phase==='idle'&&brain.decisionDue(id))choose(n);
   }
  },
  abort(n){if(!owned(n.station.id))return false;const s=stages.get(n.station.id);if(s.phase==='conversation')cancel();else if(s.choice)brain.complete(n.station.id,s.choice,{fulfilled:false});release(n);return true;},
  playerRequest(id){if(ids.includes(id)&&pair)cancel('让出位置，改日再聊');},
  snapshot:()=>({version:1,time,pair:copy(pair),stages:[...stages].map(([id,s])=>[id,copy(s)])}),
  restore(s){if(s?.version!==1)return false;time=Math.max(0,s.time||0);stages.clear();pair=copy(s.pair||null);for(const[id,stage]of s.stages||[])if(actor(id))stages.set(id,copy(stage));
   if(pair){const event=brain.conversation(pair.id);if(event?.status!=='accepted'||!pair.participants.every(id=>actor(id)&&stages.get(id)?.pairId===pair.id)){cancel();}else{for(const[i,id]of pair.participants.entries())if(!claims.reserve(ids[i],id)){cancel();break;}if(pair)walkPair();}}
   for(const[id,s]of stages)if(s.phase!=='conversation'){const n=actor(id);if(s.choice){brain.complete(id,s.choice,{fulfilled:false});}idle(n);}checked=true;return true;
  },
  state:()=>({pair:copy(pair),actors:[...stages].map(([id,s])=>({id,...copy(s)}))}),
  dispose(){for(const id of stages.keys())claims.releaseActor(id);stages.clear();pair=null;}
 };
}
