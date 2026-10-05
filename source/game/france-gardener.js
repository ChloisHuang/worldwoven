import {followActorRoute} from './actor-navigation.js';
import {createLifeDecisions} from './npc-life-decisions.js';
import {visualSupportHeight} from './floor-support.js';
import {FRANCE_GARDENER as P} from './france-gardener-place.js';
import {createFranceGardenerProps} from './france-gardener-props.js';

const labels={meeting:'到登记簿旁接待帮工',collect:'去架边取浇水壶',takeCan:'拿起浇水壶',bedA:'去第一畦玫瑰苗圃',waterA:'给第一畦玫瑰浇水',bedB:'去第二畦玫瑰苗圃',waterB:'给第二畦玫瑰浇水',returnCan:'把水壶送回工具架',putCan:'放好浇水壶',takeShears:'取下园艺剪',hedge:'去西苑黄杨篱',prune:'修齐黄杨新梢',returnShears:'把园艺剪送回架边',putShears:'合拢放好园艺剪',rest:'到树下歇歇脚',garden:'沿玫瑰游径散步',idle:'看看西苑的花草'};
const copy=x=>JSON.parse(JSON.stringify(x)),gap=(n,p)=>Math.hypot(n.root.position.x-p[0],n.root.position.z-p[2]);
export function createFranceGardener({npcs,lot,doors,planPath,moveActor,poseContext,getPlayer,getBorrowedPose=()=>null,worldSeed=1,saved={},saveState=()=>{},notify=()=>{},propsFactory=createFranceGardenerProps}){
 const n=npcs.find(a=>a.station.id===P.id);if(!n)return null;
 const props=propsFactory(lot.group),history=[];let brain;
 brain=createLifeDecisions({worldSeed,actorIds:[P.id],saved:saved.continuity?.life||saved.life,onChange:life=>saveState({life})});
 let time=0,stage='collect',phase=0,tool=null,routeKey=null,stalled=0,commitment=null,choiceElapsed=0,choiceTravel=0,jobTime=0,nextDecision=0,disposed=false,paused=false,cycles=0,cancelled=false;
 let meeting=false,loanOwner=null,borrowed=false;
 const transferBusy=()=>['takeCan','putCan','takeShears','putShears'].includes(stage);
 function requestMeeting(){
  if(disposed||transferBusy())return false;
  if(!meeting){meeting=true;if(!['idle','rest','garden','meeting'].includes(stage))cancel();}
  return true;
 }
 function releaseMeeting(){meeting=false;if(stage==='meeting'){enter('idle');nextDecision=time+2;}}
 function reserveTools(id){if(disposed||!id||loanOwner&&loanOwner!==id||tool||transferBusy())return false;loanOwner=id;if(!['idle','rest','garden','meeting'].includes(stage)){completeChoice(false);enter('idle');nextDecision=time+3;}return true;}
 function releaseTools(id){if(loanOwner!==id||borrowed)return false;loanOwner=null;return true;}
 function takeCan(id){if(loanOwner!==id||borrowed||tool||transferBusy())return false;borrowed=true;record('player-take-can',{jobId:id});return true;}
 function returnCan(id){if(loanOwner!==id||!borrowed)return false;borrowed=false;loanOwner=null;record('player-return-can',{jobId:id});return true;}
 const record=(event,extra={})=>{history.push({event,time:+time.toFixed(2),...extra});if(history.length>48)history.shift();};
 function enter(s){stage=s;phase=0;routeKey=null;n.route=[];stalled=0;record(s);}
 function travel(to,dt){
  n.walking=false;if(gap(n,to)<.06){n.route=[];routeKey=null;return true;}
  const key=to.join(',');if(routeKey!==key){routeKey=key;n.route=planPath(n.root.position,{x:to[0],y:to[1],z:to[2]},.25);stalled=0;}
  const step=followActorRoute(n,dt,{doors,moveActor,npcs,playerPosition:getPlayer()?.root.position,radius:.25,speedScale:.8,arrivalTolerance:.035});
  if(step.waiting){stalled=0;return false;}stalled=n.walking?0:stalled+dt;if(stalled>2){routeKey=null;n.route=[];}
  return gap(n,to)<.06;
 }
 function completeChoice(fulfilled=true){if(commitment)brain.complete(P.id,commitment,{fulfilled});commitment=null;choiceElapsed=choiceTravel=0;}
 function finish(){record(cancelled?'cancelled':'complete');if(!cancelled)cycles++;completeChoice(!cancelled);cancelled=false;jobTime=0;enter('idle');nextDecision=time+3;}
 function cancel(){if(disposed||['idle','rest','garden'].includes(stage))return false;cancelled=true;if(tool)enter(tool==='can'?'returnCan':'returnShears');else{finish();nextDecision=time+8;}return true;}
 function candidates(){return [
  {id:'work',base:.4,traits:{quiet:.25},duration:[70,90],cooldown:55,available:!loanOwner&&!meeting},
  {id:'rest',base:.3,traits:{quiet:.65},needs:{fatigue:1.6},duration:[12,21],relief:{fatigue:-.20},cooldown:45,point:P.rest},
  {id:'garden',base:.35,traits:{outdoors:.8,curiosity:.45},duration:[10,18],relief:{fatigue:-.07,social:-.03},cooldown:38,point:P.walk}
 ];}
 function request(){if(disposed)return false;if(loanOwner||meeting){notify('埃米尔：帮工正在使用苗圃和水壶，归还后我再照料');return false;}if(!['idle','rest','garden'].includes(stage)){notify('埃米尔：这两畦花和黄杨篱正在照料，工具用完会放回去');return false;}completeChoice(false);cancelled=false;jobTime=0;enter('collect');notify('埃米尔：先浇两畦玫瑰，再换剪刀修一段黄杨');return true;}
 const api={owns:a=>a===n,ownsStation:id=>id===P.id,request,cancel,requestMeeting,releaseMeeting,reserveTools,releaseTools,takeCan,returnCan,
  hostReady:()=>meeting&&stage==='meeting'&&!n.walking&&gap(n,P.host)<.08&&!paused,
  loanState:()=>({owner:loanOwner,borrowed,toolHolder:borrowed?'player':tool==='can'?'gardener':'rack',beds:loanOwner?['player','player']:['bedA','waterA','bedB','waterB'].includes(stage)?['gardener','gardener']:[null,null]}),
  socialProfile:id=>id===P.id?brain.state(id):null,
  socialStatus:()=>{const busy=!!tool||!['idle','rest','garden','meeting'].includes(stage)||stage==='meeting'&&gap(n,P.host)>.08;return {busy,canPause:!busy,attention:true,job:labels[stage]};},
  update(dt,t,{conversationActorId=null,hour=10}={}){
   if(disposed)return;time+=dt;brain.tick(dt);n.walking=false;paused=conversationActorId===P.id;
   let target=null,action=null,transfer=null;
   if(!paused){
    if(meeting&&['idle','rest','garden'].includes(stage)){completeChoice(false);enter('meeting');}
    if(stage==='meeting'){travel(P.host,dt);}
    if(stage==='idle'&&time>=nextDecision){commitment=brain.choose(P.id,candidates(),hour);if(commitment){record('choice',{choice:commitment.id});enter(commitment.id==='work'?'collect':commitment.id);jobTime=0;}else nextDecision=time+3;}
    if(stage==='rest'||stage==='garden'){
     const point=stage==='rest'?P.rest:P.walk;choiceTravel+=dt;
     if(travel(point,dt))choiceElapsed+=dt;
     if(choiceElapsed>=(commitment?.duration||15)||choiceTravel>70){completeChoice(choiceElapsed>0);enter('idle');nextDecision=time+2;}
    }else if(stage!=='idle'&&stage!=='meeting'){
     jobTime+=dt;
     // A player blocking a lane never becomes a false arrival. A stalled work
     // commitment stops safely; held tools are still carried back on real paths.
     if(jobTime>150&&!cancelled)cancel();
     if(stage==='collect'&&travel(P.approach,dt))enter('takeCan');
     else if(stage==='bedA'&&travel(P.beds[0].approach,dt))enter('waterA');
     else if(stage==='bedB'&&travel(P.beds[1].approach,dt))enter('waterB');
     else if(stage==='returnCan'&&travel(P.approach,dt))enter('putCan');
     else if(stage==='hedge'&&travel(P.hedge.approach,dt))enter('prune');
     else if(stage==='returnShears'&&travel(P.approach,dt))enter('putShears');
     else if(['takeCan','putCan','takeShears','putShears','waterA','waterB','prune'].includes(stage)){
      phase+=dt;const duration=stage==='prune'?6:stage.startsWith('water')?5:1.35;
      if(phase>=duration){
       if(stage==='takeCan'){tool='can';enter('bedA');}
       else if(stage==='waterA')enter('bedB');else if(stage==='waterB')enter('returnCan');
       else if(stage==='putCan'){tool=null;if(cancelled)finish();else enter('takeShears');}
       else if(stage==='takeShears'){tool='shears';enter('hedge');}
       else if(stage==='prune')enter('returnShears');else{tool=null;finish();}
      }
     }
    }
   }
   if(stage==='waterA'||stage==='waterB'){target=P.beds[stage==='waterA'?0:1].target;action='water';}
   else if(stage==='prune'){target=P.hedge.target;action='prune';}
   else if(['takeCan','putCan','takeShears','putShears'].includes(stage)){const isCan=stage.endsWith('Can');target=[P.standTop[0]+(isCan?.14:.32),isCan?P.standTop[1]+.365:1.12,P.standTop[2]+(isCan?-.22:.30)];transfer={tool:isCan?'can':'shears',pickup:stage.startsWith('take'),ratio:Math.min(1,phase/1.35)};}
   if(target&&!paused)n.root.rotation.y=Math.atan2(target[0]-n.root.position.x,target[2]-n.root.position.z);
   n.root.position.y=visualSupportHeight(lot,n.root.position.x,n.root.position.z,0,false)??n.root.position.y;
   const c=poseContext(n,null);c.handoff=false;c.heldProp=null;c.archery=null;
   if(!paused){
    if(action==='water')c.archery={hands:[[-.16,1.04,.27],[.19,1.05+Math.sin(phase*.9)*.025,.37]]};
    else if(action==='prune'){const spread=.13+(Math.sin(phase*5)+1)*.035;c.archery={hands:[[-spread,.74,.21],[spread,.74,.21]]};}
    else if(transfer)c.archery={hands:[null,[0,(target[1]-n.root.position.y)/(n.characterScale||1),gap(n,target)/(n.characterScale||1)]]};
    else if(tool)c.archery={hands:[null,[.30,.86,.17]]};
   }
   n.animate(t+(n.phase||0),n.walking,stage==='rest'&&!n.walking&&!paused?'relax':null,c);
   const borrowedPose=loanOwner?getBorrowedPose():null;
   props.update(borrowedPose|| (borrowed?{actor:getPlayer(),tool:'can'}:{actor:n,tool,action,target,phase,transfer,paused}));
   const label=n.label?.querySelector?.('small');if(label)label.textContent=paused?'停下手边的工具聊两句':labels[stage];
  },
  snapshot:()=>({version:1,time,stage,phase,tool,commitment:copy(commitment),choiceElapsed,choiceTravel,jobTime,nextDecision,cycles,cancelled,meeting,loanOwner,borrowed,history:copy(history),life:brain.snapshot()}),
  restore(s){if(s?.version!==1||!labels[s.stage])return false;time=Math.max(0,s.time||0);stage=s.stage;phase=Math.max(0,s.phase||0);tool=['can','shears'].includes(s.tool)?s.tool:null;commitment=copy(s.commitment);choiceElapsed=Math.max(0,s.choiceElapsed||0);choiceTravel=Math.max(0,s.choiceTravel||0);jobTime=Math.max(0,s.jobTime||0);nextDecision=Math.max(time,s.nextDecision||0);cycles=Math.max(0,s.cycles||0);cancelled=!!s.cancelled;meeting=!!s.meeting;loanOwner=s.loanOwner||null;borrowed=!!s.borrowed;history.splice(0,history.length,...copy(s.history||[]));routeKey=null;stalled=0;n.route=[];return true;},
  state:()=>({actorId:P.id,loan:{owner:loanOwner,borrowed,meeting},stage,phase,tool,paused,cycles,cancelled,position:n.root.position.toArray(),history:copy(history),props:props.state(),choice:commitment?{id:commitment.id,duration:commitment.duration}:null,life:brain.snapshot()}),
  dispose({suspend=false}={}){if(disposed)return;disposed=true;meeting=false;loanOwner=null;borrowed=false;if(!suspend)completeChoice(false);n.route=[];n.walking=false;if(n.poseContext){n.poseContext.archery=null;n.poseContext.handoff=false;n.poseContext.heldProp=null;}brain.dispose();props.dispose();}
 };if(saved.continuity)api.restore(saved.continuity);return api;
}
