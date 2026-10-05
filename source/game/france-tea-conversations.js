// Only the three original tea residents borrow these two public gallery places.
// Their existing controller owns movement, work priority and the single life brain.
export const FRANCE_TEA_TALK_PLACES=Object.freeze([[0,.23,-5],[0,.23,-3.5]]);
const placeIds=FRANCE_TEA_TALK_PLACES.map((_,i)=>'france-tea-talk-'+i),copy=x=>JSON.parse(JSON.stringify(x));
const near=(n,p)=>Math.hypot(n.root.position.x-p[0],n.root.position.z-p[2])<.12&&Math.abs(n.root.position.y-p[1])<.4;
export function createFranceTeaConversations({actors,brain,claims,available,canReach,travel,clear,save=()=>true,beginInteraction=()=>null,onInteraction=()=>{},note=()=>{},onRelease=()=>{}}){
 let pair=null,checked=false;
 const actor=id=>actors.find(n=>n.station.id===id),owns=n=>!!pair?.participants.includes(n.station.id);
 const vacant=()=>!claims.state().some(f=>placeIds.includes(f.id)&&(f.player||f.reservations.length));
 function release(){const old=pair;if(!old)return;pair=null;for(const[i,id]of old.participants.entries()){claims.release(placeIds[i],id);const n=actor(id);if(n){clear(n);onRelease(n);}}}
 function cancel(reason='先忙手边的事，改日再聊') {if(!pair)return false;const id=pair.id;brain.cancelConversation(id);release();note('conversation-cancelled',{conversationId:id,reason});save();return true;}
 function candidate(n){
  const experience=brain.experience(n.station.id),partners=!pair&&experience&&available(n)&&vacant()?actors.filter(other=>other!==n&&available(other)&&brain.canReply(other.station.id)):[];
  return {id:'conversation',base:.09,traits:{sociability:1.1},needs:{social:1.8},duration:[6,8],cooldown:90,experienceId:experience?.id,targets:partners.map(other=>({id:other.station.id,relationship:{target:other.station.id,weight:.9,opinionWeight:.9}}))};
 }
 function invite(n,choice){
  const other=actor(choice.targetId),places=FRANCE_TEA_TALK_PLACES;
  if(pair||!other||!available(n)||!available(other)||!brain.canReply(other.station.id)||!vacant()||![n,other].every((a,i)=>canReach(a,places[i])))return false;
  const result=brain.invite(n.station.id,choice);if(!result.ok)return false;
  if(result.status==='declined'){note('conversation-declined',{conversationId:result.id,participants:result.participants});onRelease(n);save();return true;}
  pair={id:result.id,places:places.map(p=>p.slice()),participants:result.participants,experience:result.experience,responses:result.responses,duration:choice.duration,elapsed:0,age:0,phase:'invited'};
  for(const[i,id]of pair.participants.entries()){clear(actor(id));if(!claims.reserve(placeIds[i],id,{purpose:'conversation'})){cancel('廊下位置有人，稍后再聊');return true;}}
  note('conversation-accepted',{conversationId:pair.id,participants:pair.participants});if(save()===false)cancel('交谈约定尚未保存');return true;
 }
 function update(dt){
  if(!checked){checked=true;for(const n of actors){const c=brain.state(n.station.id)?.current;if(c?.conversationId&&c.conversationId!==pair?.id)brain.cancelConversation(c.conversationId);}}
  if(!pair)return;
  if(pair.participants.some((id,i)=>!available(actor(id))||!claims.reservation(placeIds[i],id))){cancel();return;}
  pair.age+=dt;if(pair.age>75){cancel('路上耽搁了，改日再聊');return;}
  const wasTogether=pair.participants.every((id,i)=>near(actor(id),pair.places[i]));
  for(const[i,id]of pair.participants.entries())travel(actor(id),pair.places[i],dt);
  if(!pair.participants.every((id,i)=>near(actor(id),pair.places[i])))return;
  const starting=pair.phase!=='talking';if(starting){pair.phase='talking';note('conversation-talking',{conversationId:pair.id});}
  if(!Object.hasOwn(pair,'interaction')){const event=beginInteraction(pair.participants.slice());pair.interaction=event?{...event,participants:event.participants.slice(),duration:0}:null;}
  if(!pair.contactReady){pair.contactReady=true;if(save()===false){pair.contactReady=false;return;}}
  const spoken=starting||!wasTogether?0:Math.min(dt,Math.max(0,pair.duration-pair.elapsed));pair.elapsed+=spoken;
  if(pair.interaction&&spoken>0){pair.interaction.duration+=spoken;onInteraction({...pair.interaction,participants:pair.interaction.participants.slice()});}
  if(pair.elapsed<pair.duration)return;
  const result=brain.finishConversation(pair.id,{elapsed:pair.elapsed,arrived:pair.participants});
  if(!result.ok)return;const id=pair.id;release();note('conversation-completed',{conversationId:id,results:result.event.results});save();
 }
 return {candidate,invite,update,cancel,owns,
  face(n){const i=pair?.participants.indexOf(n.station.id)??-1;return i<0?null:pair.places[1-i];},
  talking:n=>owns(n)&&pair.phase==='talking',
  label(n){if(!owns(n))return null;if(pair.phase!=='talking')return '相约到公共连廊说几句 · 来单先忙';const feeling=pair.responses[n.station.id];return pair.elapsed<2.5?pair.experience.label:feeling==='appreciated'?'喝茶与忙完一单的余暇 · 彼此谈得投缘':feeling==='mismatched'?'对喝茶与歇息各有想法 · 保留自己的习惯':'听听对方喝茶与工作的日常';},
  snapshot:()=>({version:1,pair:copy(pair)}),
  restore(s){if(s?.version!==1)return false;pair=copy(s.pair||null);checked=true;if(pair){const event=brain.conversation(pair.id);if(event?.status!=='accepted'||!pair.participants.every(id=>actor(id)&&brain.state(id)?.current?.conversationId===pair.id)){release();}else{for(const[i,id]of pair.participants.entries())if(!claims.reserve(placeIds[i],id,{purpose:'conversation'})){cancel();break;}}}for(const n of actors){const c=brain.state(n.station.id)?.current;if(c?.conversationId&&c.conversationId!==pair?.id)brain.cancelConversation(c.conversationId);}return true;},
  dispose(){release();}
 };
}
