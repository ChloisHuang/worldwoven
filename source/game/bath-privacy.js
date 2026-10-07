// ST04 observes real room crossings. It does not own a person's bath, payment,
// outfit, navigation, or consent. Only present informed people receive events.
const copy=x=>JSON.parse(JSON.stringify(x));
const inside=(p,z)=>p&&Math.abs(p.y-z.y)<.65&&p.x>=z.bounds[0]&&p.x<=z.bounds[1]&&p.z>=z.bounds[2]&&p.z<=z.bounds[3];
export const BATH_PRIVACY_ZONES=Object.freeze({
 china:[{id:'cn-bath',poolId:'china-furniture-bath-1',name:'后宫二层浴间',y:4.015,bounds:[-26,-20,-12,2],exit:[-23.5,4.015,-13.3]}],
 france:[{id:'fr-bath',poolId:'france-furniture-bath-1',name:'白金沐浴室',y:.23,bounds:[-25,-17,-13.5,-6.6],exit:[-15.7,.23,-9.5]}],
 japan:[...['men','women'].flatMap(side=>[
  {id:`jp-${side}-changing`,poolId:`japan-furniture-bath-${side==='men'?1:2}`,side,name:side==='men'?'男汤更衣间':'女汤更衣间',changing:true,y:3.8,bounds:side==='men'?[-12,-1,.3,5.2]:[-1,7,.3,5.2],exit:[side==='men'?-6:2,3.8,6.8]},
  {id:`jp-${side}-wet`,poolId:`japan-furniture-bath-${side==='men'?1:2}`,side,name:side==='men'?'男汤洗浴区':'女汤洗浴区',shared:true,y:3.8,bounds:side==='men'?[-12,-1,-15,.3]:[-1,5.8,-15,.3],exit:[side==='men'?-6:2,3.8,6.8]}
 ])],
 egypt:[{id:'eg-bath',poolId:'egypt-furniture-bath-1',name:'王室沐浴间',y:0,bounds:[12,16.29,-4.25,2.49],exit:[18.15,0,.8]}]
});
export function bathServicePassage(side,p){return !!p&&Math.abs(p.y-3.8)<.4&&p.z>=-2.7&&p.z<=5.2&&(side==='men'?p.x>=-6.9&&p.x<=-2:side==='women'&&p.x>=.4&&p.x<=3.6);}
export function bathPrivacyWish({zone,person,playerPosition,wrongSide=false}){
 if(!person||person.alive===false||person.perceives===false||!inside(person.position,zone))return null;
 const p=person.profile||{},relation=p.relations?.player||0,quiet=p.traits?.quiet??.5,fatigue=p.needs?.fatigue||0;
 const distance=Math.hypot(person.position.x-playerPosition.x,person.position.z-playerPosition.z);
 const changing=person.activity==='changing'||person.activity==='drying',bathing=person.activity==='bathing',washing=person.activity==='washing';
 // Public shared bathing is still public shared bathing. A quiet guest can
 // ask for personal space, never acquire the whole pool or eject legal peers.
 const personalSpace=(changing||washing||bathing)&&(changing||!zone.shared||distance<(quiet>.6||fatigue>.75?2.1:1.15));
 if(!wrongSide&&!personalSpace)return null;
 const reason=wrongSide?'wrong-side':changing?'changing':!zone.shared?'private-bath':'personal-space';
 const text=wrongSide?`这里是${zone.name}，请回公共廊核对自己的汤区。`:changing?'我正在整理衣着，请先到外面等。':relation>.2?'我们虽然熟悉，此刻我仍想留些私人空间。':fatigue>.75?'我现在有些疲倦，想安静休息，请留些距离。':zone.shared?'这池可以共用，不过请留些距离，等离池后再聊。':'我正在独自沐浴，请先到外面等。';
 return {reason,text,relation,quiet};
}
export function createBathPrivacy({country,getPlayer,getPeople,getClock,getSide=()=>null,getServiceAccess=()=>false,getProfile=()=>null,saved,saveState=()=>true,onEvent=()=>({ok:true}),notify=()=>{},retreat=()=>false}={}){
 const zones=BATH_PRIVACY_ZONES[country]||[];
 let state=saved?.version===1?copy(saved):{version:1,episodes:{},pending:[]},active=null,wait=0,lastScanAt=null,wasPaused=false;
 state.episodes??={};state.pending??=[];const observed=new Set(),yieldNotices=new Set();
 function commit(next){try{const r=saveState(copy(next));if(r===false||r?.then)return false;}catch{return false;}state=next;return true;}
 function flush(){if(!state.pending.length)return;const next=copy(state);while(next.pending.length){try{if(!onEvent(next.pending[0])?.ok)break;}catch{break;}next.pending.shift();}if(next.pending.length!==state.pending.length)commit(next);}
 function finish(episode,kind,now){
  const next=copy(state),e=next.episodes[episode.key];if(!e)return;if(e[kind]){if(kind==='retreat'&&e.open){e.open=false;commit(next);}return;}
  e[kind]=true;if(kind==='retreat')e.open=false;
  if(e.observerId)next.pending.push({id:`${e.key}:${kind}`,source:'bath-privacy',actorId:'player',participants:['player',e.observerId],outcome:kind==='intrusion'?'failed':e.intrusion?'cancelled':'completed',fault:kind==='intrusion',kind:kind==='intrusion'?'privacy-intrusion':'privacy-retreat',at:now});
  if(commit(next)){flush();if(kind==='intrusion')notify(`${e.name}：我已经说过需要空间，请先离开。之后可以在公共处谈清楚。`);}
 }
 function zoneAt(p){return zones.find(z=>inside(p,z))||null;}
 function scan(){
  const player=getPlayer();if(!player?.position)return;if(!player.poolId)yieldNotices.clear();
  const clock=getClock(),now=clock.seconds,zone=zoneAt(player.position),old=active,delta=lastScanAt===null?0:Math.max(0,now-lastScanAt);lastScanAt=now;
  if(player.paused||wasPaused){const next=copy(state);for(const e of Object.values(next.episodes))if(e.open)e.started+=delta;if(JSON.stringify(next)!==JSON.stringify(state))commit(next);}wasPaused=!!player.paused;
  if(player.paused){flush();return;}
  // Leaving this actual zone, rather than pressing a button, proves retreat.
  if(!zone)for(const e of Object.values(state.episodes).filter(e=>e.open)){if(observed.has(e.key))finish(e,'retreat',now);else{const next=copy(state);next.episodes[e.key].open=false;commit(next);}}
  active=null;
  if(!zone){flush();return;}
  const wrongSide=!!zone.side&&!!getSide()&&getSide()!==zone.side&&!getServiceAccess(zone);
  // One broad-phase pass only while inside one of the seven real room volumes,
  // at 1 Hz. No per-frame actor-pair or whole-world proximity scan.
  const present=getPeople(zone).filter(n=>inside(n.position,zone)&&n.alive!==false);
  const wants=present.map(n=>({n,wish:bathPrivacyWish({zone,person:{...n,profile:n.profile||getProfile(n.id)},playerPosition:player.position,wrongSide})})).filter(x=>x.wish);
  if(!wants.length&&!wrongSide){const next=copy(state);for(const e of Object.values(next.episodes))e.activeNow=false;if(JSON.stringify(next)!==JSON.stringify(state))commit(next);flush();return;}
  const next=copy(state),episodes=[];for(const e of Object.values(next.episodes))e.activeNow=false;
  for(const {n,wish} of wants.length?wants:[{n:{id:null,name:zone.name},wish:{reason:'wrong-side',text:`这里是${zone.name}，请回公共廊核对自己的汤区。`}}]){
   const key=`bath:${country}:${clock.day}:${zone.id}:${n.id||'sign'}`,prior=next.episodes[key];
   const continuing=old?.zone.id===zone.id&&old.episodes.some(e=>e.key===key);
   const e=prior||{key,observerId:n.id,name:n.name||n.id,started:now,reason:wish.reason};
   if(!continuing&&!e.open||!state.episodes[key]?.activeNow)e.started=now;e.open=true;e.activeNow=true;
   next.episodes[key]=e;episodes.push(e);observed.add(key);
   if(!continuing)notify(`${e.name}：${wish.text} 可选择“退到公共通道”，也可以自己走出去。`);
  }
  // Retain day keys long enough for reload/re-entry idempotency; old completed
  // event IDs remain in the shared relationship ledger.
  for(const [key,e] of Object.entries(next.episodes))if(!e.intrusion&&Number(key.split(':')[2])<clock.day-2&&!episodes.some(a=>a.key===key))delete next.episodes[key];
  if(JSON.stringify(next)!==JSON.stringify(state)&&!commit(next)){notify('隐私提醒尚未保存，请先退到公共通道。');active={zone,episodes:[],wrongSide};return;}
  active={zone,episodes,wrongSide};
  for(const e of episodes)if(e.observerId&&now-e.started>=8&&!player.retreating)finish(e,'intrusion',now);
  flush();
 }
 return {
  update(dt){wait-=Math.max(0,dt);if(wait>0)return;wait=1;scan();},
  refresh:scan,
  status:()=>active?{zoneId:active.zone.id,name:active.zone.name,exit:active.zone.exit.slice(),wrongSide:active.wrongSide,people:active.episodes.map(e=>e.observerId).filter(Boolean)}:null,
  retreat(){return !!active&&retreat(active.zone.exit.slice());},
  access(item){const id=item.poolId||item.id,z=zones.find(z=>z.poolId===id&&!z.changing);if(!z)return {allowed:true};if(z.side&&getSide()&&z.side!==getSide())return {allowed:false,message:`请使用自己的${getSide()==='men'?'男汤':'女汤'}，或在公共廊核对指引。`};const users=getPeople(z).filter(n=>inside(n.position,z)&&n.alive!==false);if(!z.shared&&users.length)return {allowed:false,message:'浴间还有人在使用，请等对方离开再入浴。'};return {allowed:true};},
  // Exact local movement guard: only the actor actually trying to cross the
  // player's occupied boundary is checked. Existing owners keep their route
  // and wait outside; once the player leaves, the original movement resumes.
  allowsMove(person,from,to,{probeOnly=false}={}){
   const p=getPlayer(),z=p?.poolId&&zones.find(z=>z.poolId===p.poolId&&!z.changing);if(!z||person.id==='player')return true;
   const distance=q=>Math.hypot(q.x-p.position.x,q.z-p.position.z);
   const entering=z.shared?inside(to,z)&&distance(to)<1.1&&distance(to)<distance(from)-.00001:!inside(from,z)&&inside(to,z);
   if(!entering)return true;
   if(!probeOnly&&!yieldNotices.has(person.id)){yieldNotices.add(person.id);notify(`${person.name||'对方'}：我先留出空间。你可以按 E 离池，或用移动键结束这次沐浴。`);}
   return false;
  },
  isPrivatePosition:p=>!!zoneAt(p),
  faultFor(id){const e=Object.values(state.episodes).filter(e=>e.observerId===id&&e.intrusion).sort((a,b)=>b.started-a.started)[0];return e?e.key+':intrusion':null;},
  memory(id){const all=Object.values(state.episodes).filter(e=>e.observerId===id).sort((a,b)=>b.started-a.started),e=all[0];if(!e)return null;return e.intrusion?'上次我已经说明需要私人空间，你却没有及时离开。我想先把这件事说清楚。':e.retreat?'谢谢你上次及时退到外面。现在在公共处，可以再问我是否愿意聊聊。':'我正在留些私人空间，等回到公共处再聊。';},
  suspend(){const next=copy(state);for(const e of Object.values(next.episodes))e.open=false;commit(next);active=null;observed.clear();},
  snapshot:()=>copy(state)
 };
}
