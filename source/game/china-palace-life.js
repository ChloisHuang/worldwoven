import {CHINA_CONSORTS,CONSORT_ROUTES,palaceResidentSave,palaceResident} from './china-palace-residents.js';
import {consortActivities,createPalaceLeisureClaims,createConsortPassage} from './china-consort-activities.js';
import {createLifeDecisions} from './npc-life-decisions.js';
import {canTraverse} from './navigation.js';
import {attachPalaceCostume,createPalaceMealKit} from './china-palace-costume.js';
import {courtRouteBudget,cachedCourtPlanner} from './china-court-schedule.js';

export const CHINA_PALACE_ROLES=Object.freeze([
 {id:'cn-emperor',npcName:'景珩 · 皇帝',royalRole:'emperor',ageYears:36,privateRoomId:'bedroom',npcPosition:[-21.7,7.815,-4.6]},
 ...CHINA_CONSORTS
]);
const point=a=>({x:a[0],y:a[1],z:a[2]}),near=(p,a,r=.065)=>Math.hypot(p.x-a[0],p.z-a[2])<r&&Math.abs(p.y-a[1])<.32;
const HALL=[[-18,.215,-13.35],[-15.1,.215,-13.35]],SHORE=[[-13.7,.145,-14.5],[-13.7,.145,-20.85],[-9.1,.145,-20.85]];
const STAIRS=[[-17.7,7.815,-10.5],[-17.7,7.815,-13.35],[-22,7.815,-13.35],[-22,5.915,-18.65],[-24.5,5.915,-18.65],[-24.5,4.015,-13.35],[-22,4.015,-13.35],[-22,2.115,-18.65],[-24.5,2.115,-18.65],[-24.5,.215,-13.35],...HALL];
const COURT=[[-14.4,.115,-10],[-14.4,.115,.4],[-8,.13,11],[-3,.13,11],[-3,1.415,6],[0,1.415,3],[0,1.415,-4.3]];
const reverse=a=>a.slice().reverse().map(p=>p.slice());

// The emperor keeps sole duty ownership; each consort leaves her own private
// room through public circulation. Lin keeps his original tea-host job.
export function createChinaPalaceLife({npcs,lot,furniture,doors,planPath,moveActor,poseContext,worldSeed=1,saved={},saveState=()=>{}}){
 const actors=CHINA_PALACE_ROLES.map(r=>npcs.find(n=>n.station.id===r.id)),host=npcs.find(n=>n.station.id==='cn-tea');
 if(actors.some(n=>!n)||!host)return null;
 const [emperor,...consorts]=actors,owned=new Set(actors),costumes=actors.map(attachPalaceCostume),seat=id=>furniture.items.find(i=>i.id===id);
 const throne=seat('china-furniture-throne'),privateSeat=seat('china-furniture-seat');if(!throne||!privateSeat){for(const c of costumes)c?.dispose();return null;}
 const meals=new Map(actors.map(n=>[n,createPalaceMealKit(n)]));
 const actorIds=[...actors,host].map(n=>n.station.id),claims=createPalaceLeisureClaims(),passage=createConsortPassage();
 const stages=new Map(),history=[],failures=[],brain=createLifeDecisions({worldSeed,actorIds,saved:palaceResidentSave({worldSeed,actorIds,saved}),onChange:saveState}),navigation={surfaces:lot.walkableSurfaces,legacyGround:false,bounds:lot.bounds,bodyHeight:1.95,maxStep:.4,radius:.25};
 const planDutyPath=cachedCourtPlanner(planPath);
 let time=0,disposed=false,playerState={},hostHeld=null,hostPreviousYaw=0,hostHeldAt=0,duty=null;
 const tell=(n,label)=>{const el=n.label?.querySelector?.('small');if(el)el.textContent=label;};
 const record=(n,event)=>{history.push({actor:n.station.id,event,time:+time.toFixed(2),position:n.root.position.toArray()});if(history.length>80)history.shift();};
 const stage=(id,label,path,duration=0,options={})=>({id,label,path,duration,...options});
 const ownRest=new Map([[emperor,privateSeat],...consorts.map(n=>[n,seat(n.station.privateBedId)])]);
 const homeExit=n=>n===emperor?STAIRS:[...CONSORT_ROUTES[n.station.id],...HALL];
 const homeReturn=n=>n===emperor?[...reverse(STAIRS),[-18.2,7.815,-5],n.home.toArray()]:[...reverse(HALL),...reverse(CONSORT_ROUTES[n.station.id]),n.home.toArray()];
 const scripts=new Map(),mealSeats=new Map([[emperor,seat('china-palace-dining-seat-19.8')]]),sharedMeals=['china-palace-dining-seat-19.8','china-palace-dining-seat-22.2'].map(seat).filter(Boolean);
 const available=(n,id)=>playerState.facilityId!==id&&claims.available(id,n.station.id)&&(id!=='palace-tea-host'||!interrupted(host)&&playerState.performing!==host.station.id);
 const DINING=[[-14.4,.115,.4],[-8,.13,11],[14,.13,11],[14,.13,4],[21,.215,4],[21,.215,1.3]];
 const candidates=n=>n!==emperor?consortActivities(n,{stage,homeExit,homeReturn,bed:ownRest.get(n),mealSeats:sharedMeals,host,available:id=>available(n,id)}):[
  {id:'read',label:n===emperor?'寝殿晨读 · 翻阅书卷':'在自己的客居静读',base:.25,traits:{curiosity:.9,quiet:.5},needs:{fatigue:-.2},relief:{social:.05,fatigue:-.10},duration:[10,18],cooldown:40,steps:[stage('private-reading','静读书卷',[n.home.toArray()],0,{action:'read',chosen:true})]},
  {id:'rest',label:'回自己的私室休息',base:.08,traits:{quiet:.3},needs:{fatigue:2.8,social:-.15},relief:{fatigue:-.65},duration:[12,22],cooldown:65,available:!!ownRest.get(n)&&playerState.facilityId!==ownRest.get(n).id,steps:[stage('private-rest','在自己的私室休息',[ownRest.get(n).position],0,{mount:ownRest.get(n),chosen:true}),stage('stand-after-rest','起身整理衣袖',[n.home.toArray()])]},
  {id:'garden',facilityId:'palace-emperor-shore',available:available(n,'palace-emperor-shore'),label:'去荷庭看看水色',base:.15,traits:{outdoors:1.2},needs:{fatigue:-.55,social:.2},relief:{fatigue:-.12,social:-.10},duration:[9,17],cooldown:70,steps:[stage('leave-suite','离开私室 · 沿公共通廊',homeExit(n)),stage('garden-view','荷庭驻足 · 看花与水色',SHORE,0,{look:[-5,.3,-18],chosen:true}),stage('return-suite','沿公共通廊回到自己的私室',[...reverse(SHORE),...homeReturn(n)])]},
  {id:'meal',facilityId:mealSeats.get(n)?.id,label:'去御膳餐厅用些点心',base:.02,traits:{appetite:.2},needs:{hunger:3.5},relief:{hunger:-.72,fatigue:-.05},duration:[12,18],cooldown:100,available:!!mealSeats.get(n)&&available(n,mealSeats.get(n).id),steps:[stage('leave-suite','离开私室 · 前往餐厅',homeExit(n)),stage('dining-arrival','沿外庭走到御膳餐厅',[...DINING,mealSeats.get(n)?.position||DINING.at(-1)]),stage('meal','在餐厅坐凳上用点心',[mealSeats.get(n)?.position||DINING.at(-1)],0,{mount:mealSeats.get(n),meal:true,chosen:true}),stage('return-suite','用餐后沿公共通廊回居',[...reverse(DINING),...homeReturn(n)])]},
  {id:'hall',label:'去正殿静坐',base:.12,traits:{curiosity:.5,quiet:.35},needs:{fatigue:-.2},relief:{fatigue:-.20},duration:[9,15],cooldown:90,available:playerState.facilityId!==throne.id,steps:[stage('public-stairs','离开寝殿 · 沿公共梯厅下楼',homeExit(n)),stage('hall-arrival','穿过仪庭 · 上正殿前阶',COURT),stage('hall-rest','在正殿御座稍坐',[throne.position],0,{mount:throne,chosen:true}),stage('return-residence','离殿回居 · 走公共梯厅',[...reverse(COURT),...homeReturn(n)])]}
 ];
 function choose(n){
  claims.release(n.station.id);
  if(n===emperor&&duty){
   duty.active=true;
   const departure=duty.fromPublic?[]:[stage('duty-public-stairs','应召出居 · 沿公共梯厅下楼',homeExit(n))];
   scripts.set(n,duty.kind==='edict-review'?[...departure,stage('duty-public-review','公共听候处阅批 · 留出院门通行',[HALL.at(-1)],Infinity,{look:[-15.1,.145,-14.45]}),stage('duty-return-home','阅批完毕 · 沿公共梯厅回居',homeReturn(n))]:[...departure,stage('duty-hall-arrival','前往朝议 · 沿正殿前阶入殿',COURT),stage('duty-hall-seat','朝议候奏 · 等候大臣依次进言',[throne.position],Infinity,{mount:throne}),stage('duty-return-home','朝议结束 · 沿公共梯厅回居',[...reverse(COURT),...homeReturn(n)])]);
   stages.set(n,{choice:null,cycles:stages.get(n)?.cycles||0});enter(n,0);return;
  }
  const reachable=steps=>{const end=steps?.find(s=>s.chosen)?.path.at(-1);return !!end&&(near(n.root.position,end,.1)||planPath(n.root.position,point(end),.25).length>0);};
  const options=candidates(n).map(c=>c.targets?{...c,targets:c.targets.map(t=>({...t,available:t.available!==false&&reachable(t.choice?.steps||c.steps)}))}:{...c,available:c.available!==false&&reachable(c.steps)});
  let choice=brain.choose(n.station.id,options,playerState.hour??10);
  if(choice&&!claims.reserve(choice.facilityId,n.station.id,n===emperor?360:120)){brain.complete(n.station.id,choice,{fulfilled:false});choice=null;}
  const steps=choice?choice.steps.map(s=>({...s,duration:s.chosen?choice.duration:s.duration})): [stage('quiet-pause','在自己的私室稍作停留',[n.home.toArray()],6)];
  scripts.set(n,steps);const previous=stages.get(n);stages.set(n,{choice,cycles:previous?.cycles||0});enter(n,0);
 }
 const safety=n=>[...(doors?.cameraColliders||[]),...npcs.filter(a=>a!==n).map(a=>a.root.position),...(playerState.position?[playerState.position]:[])].map(p=>p.minX===undefined?{minX:p.x-.27,maxX:p.x+.27,minZ:p.z-.27,maxZ:p.z+.27,minY:p.y,maxY:p.y+1.95}:p);
 function releaseHost(){if(!hostHeld)return;host.root.rotation.y=hostPreviousYaw;host.breakAt+=time-hostHeldAt;hostHeld=null;tell(host,host.station.npcLabel);}
 function enter(n,index){const previous=stages.get(n)||{};stages.set(n,{choice:previous.choice,cycles:previous.cycles||0,index,waypoint:0,elapsed:0,arrived:false,planned:false,stalled:0,retries:0,mount:null});n.route=[];record(n,scripts.get(n)[index].id);}
 function unmount(n,s){if(!s.mount)return true;const landing=furniture.standPoint(navigation,safety(n),s.mount);if(!landing)return false;n.root.position.copy(landing);s.mount=null;furniture.releaseActor(n.station.id);return true;}
 function advance(n,s){if(!unmount(n,s))return false;
  // Only Lin participated in this completed exchange. Passing NPCs gain no knowledge.
  if(scripts.get(n)[s.index].pair&&hostHeld===n&&s.elapsed>=scripts.get(n)[s.index].duration){brain.observe(n.station.id,s.choice,{observers:[{id:host.station.id,knowledge:'participant'}]});record(n,'tea-conversation:completed');}
  if(hostHeld===n)releaseHost();if(scripts.get(n)[s.index].chosen)claims.release(n.station.id);if(s.index+1===scripts.get(n).length){if(n===emperor&&duty?.active){record(n,'duty-released:'+duty.owner);duty=null;}if(s.choice){brain.complete(n.station.id,s.choice,{fulfilled:s.choice.fulfilled!==false});s.cycles++;}choose(n);}else enter(n,s.index+1);return true;}
 function cancelCommitment(n,s,reason){if(!unmount(n,s))return false;if(hostHeld===n)releaseHost();claims.release(n.station.id);if(s.choice){s.choice.fulfilled=false;brain.complete(n.station.id,s.choice,{fulfilled:false});}record(n,'leisure-deferred:'+reason);const room=lot.interiorRooms?.find(r=>r.id===n.station.privateRoomId),p=n.root.position,inOwnRoom=room&&p.x>room.minX&&p.x<room.maxX&&p.z>room.minZ&&p.z<room.maxZ&&Math.abs(p.y-(room.floorY??n.home.y))<.4;scripts.set(n,[stage('return-suite','改日再访 · 回自己的私室',inOwnRoom?[n.home.toArray()]:homeReturn(n))]);enter(n,0);return true;}
 function travel(n,s,to,dt){
  if(!passage.allow(n,to)){tell(n,'在自己的门前等候 · 让走廊里的人先行');return false;}
  if(s.yieldPoint){
   const target=point(s.yieldPoint),dx=target.x-n.root.position.x,dz=target.z-n.root.position.z,d=Math.hypot(dx,dz);
   if(d>.045){const before=n.root.position.clone(),amount=Math.min(d,dt*n.locomotion.walkSpeed*.65);moveActor(n,dx/d*amount,dz/d*amount,.25);n.walking=before.distanceToSquared(n.root.position)>1e-9;n.root.rotation.y=Math.atan2(dx,dz);return false;}
   const other=npcs.find(a=>a.station.id===s.yieldTo)?.root.position||playerState.position;
   if(other&&Math.abs(other.y-n.root.position.y)<.7&&Math.hypot(other.x-n.root.position.x,other.z-n.root.position.z)<1.15)return false;
   s.yieldPoint=null;s.yieldTo=null;s.planned=false;s.retries=0;
  }
  if(near(n.root.position,to)){n.route=[];s.planned=false;s.retries=0;return true;}
  if(!s.planned){n.route=planPath(n.root.position,point(to),.25);s.planned=true;}
  const direct=near(n.root.position,to,.45)&&canTraverse(n.root.position,point(to),lot.colliders,navigation,safety(n));
  const step=direct?{waypoint:point(to)}:doors.routeStep(n.route,n.root.position,.025);
  if(!step.waiting&&step.waypoint){
   const p=step.waypoint,dx=p.x-n.root.position.x,dz=p.z-n.root.position.z,d=Math.hypot(dx,dz);
   const obstacles=[...npcs.filter(a=>a!==n).map(a=>a.root.position),...(playerState.position?[playerState.position]:[])];
   const blocker=obstacles.find(p=>Math.abs(p.y-n.root.position.y)<.7&&Math.hypot(p.x-n.root.position.x,p.z-n.root.position.z)<.70&&(p.x-n.root.position.x)*dx+(p.z-n.root.position.z)*dz>.001&&Math.abs((p.x-n.root.position.x)*dz-(p.z-n.root.position.z)*dx)/Math.max(d,1e-10)<.55);
   if(blocker&&d>1e-10){
    const other=npcs.find(a=>a.root.position===blocker),yields=!other||!owned.has(other)||!other.walking||n.station.id>other.station.id;
    // A checked side-step in the public doorway prevents two household actors
    // waiting nose-to-nose. In a narrow passage the actor simply waits.
    if(yields)for(const sign of[1,-1]){const aside=[n.root.position.x+sign*dz/d*.82,n.root.position.y,n.root.position.z-sign*dx/d*.82];if(canTraverse(n.root.position,point(aside),lot.colliders,navigation,safety(n))){s.yieldPoint=aside;s.yieldTo=other?.station.id||'player';record(n,'make-room-for-'+s.yieldTo);break;}}
    s.stalled=0;return false;
   }
   if(d>1e-10){const before=n.root.position.clone(),amount=Math.min(d,dt*n.locomotion.walkSpeed*.78);moveActor(n,dx/d*amount,dz/d*amount,.25);n.walking=before.distanceToSquared(n.root.position)>1e-9;n.root.rotation.y=Math.atan2(dx,dz);}
  }
  if(n.walking)s.retries=0;s.stalled=n.walking||step.waiting?0:s.stalled+dt;
  if(s.stalled>4){s.stalled=0;s.planned=false;if(++s.retries===3){failures.push({actor:n.station.id,activity:s.choice?.id||null,stage:scripts.get(n)[s.index].id,to:to.slice(),position:n.root.position.toArray()});if(failures.length>8)failures.shift();}}
  return near(n.root.position,to);
 }
 function interrupted(n){return playerState.conversationActorId===n.station.id;}
 function animate(n,s,t){
  const stop=scripts.get(n)[s.index],context=poseContext(n,null);context.handoff=false;context.heldProp=null;context.seatedMeal=false;meals.get(n).show(false);
  if(s.mount){const m=s.mount;context.seatHeight=m.seatY===undefined?undefined:m.seatY-n.root.position.y-context.visualFloorOffset;if(m.kind==='bed'){context.visualFloorOffset=0;context.supportY=m.supportY;context.lieSupport=m.lieSupport;context.lieOffset=m.lieOffset;context.lieSurfaceHeightAt=(x,z)=>furniture.bedSupportAt(m,x,z);}}
  if(stop.pair&&hostHeld===n&&!interrupted(n)&&!interrupted(host)||s.greetingActive&&!interrupted(n))context.handoff=true;
  if(stop.meal&&s.mount&&!interrupted(n)){context.seatedMeal=true;meals.get(n).show(true);}
  n.animate(t+n.phase,n.walking,s.mount?(s.mount.kind==='bed'?'lie-rest':'chair-sit'):s.arrived&&!interrupted(n)?stop.action||null:null,context);meals.get(n).sync();
 }
 for(const n of actors)choose(n);
 return {
  owns:n=>owned.has(n)||hostHeld&&n===host,
  socialStatus(n){if(!owned.has(n)&&!(hostHeld&&n===host))return null;return {busy:false,attention:true,job:n===host?'与'+(palaceResident(hostHeld?.station.id)?.shortName||'来客')+'在茶席叙话':scripts.get(n)[stages.get(n).index].label};},
  // Palace life remains the sole movement/pose owner of its actors. A duty
  // drains unfinished leisure without granting its need/relationship relief.
  requestDuty(owner,options={}){
   if(disposed||!owner||duty&&duty.owner!==owner)return false;
   if(!duty){duty={owner,kind:options.kind==='edict-review'?'edict-review':'audience',active:false,release:false,yieldSeat:false};const s=stages.get(emperor);if(s.choice){s.choice.fulfilled=false;brain.complete(emperor.station.id,s.choice,{fulfilled:false});}record(emperor,'duty-requested:'+owner);}
   return true;
  },
  // Read-only estimate of the exact existing handoff/duty itinerary. This does
  // not move the emperor or borrow the consorts' routes, claims or controller.
  dutyPlan(owner){
   const s=stages.get(emperor),steps=scripts.get(emperor),fail=reason=>({reachable:false,seconds:Infinity,reason,stage:steps[s.index].id});
   if(disposed||duty&&duty.owner!==owner)return fail('duty-owned-by-another-service');
   if(interrupted(emperor))return fail('emperor-in-conversation');
   const landing=s.mount?furniture.standPoint(navigation,safety(emperor),s.mount):emperor.root.position;
   if(!landing)return fail('safe-stand-exit-blocked');
   if(duty?.active&&s.mount===throne&&!duty.release&&!duty.yieldSeat)return {reachable:true,seconds:0,distance:0,path:[],stage:steps[s.index].id};
   const path=[];let knownSegments=0,handoff=near(landing,emperor.home.toArray(),.4)?'home':near(landing,HALL.at(-1),.3)?'public':null;
   if(!duty?.active&&!handoff||duty?.active){
    if(s.yieldPoint)path.push(s.yieldPoint.slice());
    if(!s.arrived&&!s.yieldPoint&&emperor.route.length){path.push(...emperor.route.map(p=>[p.x,p.y,p.z]));knownSegments=path.length;}
    for(let i=s.index;i<steps.length;i++){
     if(i===s.index&&s.arrived)continue;
     for(const p of steps[i].path.slice(i===s.index?s.waypoint:0)){
      path.push(p.slice());
      if(!duty?.active&&(near(point(p),emperor.home.toArray(),.4)||near(point(p),HALL.at(-1),.3))){handoff=near(point(p),HALL.at(-1),.3)?'public':'home';break;}
     }
     if(duty?.active&&steps[i].mount===throne||!duty?.active&&handoff)break;
    }
   }
   if(!duty?.active){if(!handoff)return fail('no-reachable-duty-handoff');if(handoff==='home')path.push(...STAIRS);path.push(...COURT,throne.position);}
   const result=courtRouteBudget({position:landing,path,knownSegments,walkSpeed:emperor.locomotion.walkSpeed,planPath:planDutyPath,doorways:lot.doorways,safeExitSeconds:s.mount?2:0,doorSeconds:2});
   return {...result,stage:steps[s.index].id,handoff,path:path.map(p=>p.slice())};
  },
  releaseDuty(owner){if(duty?.owner===owner)duty.release=true;},
  setDutyLine(owner,line){if(duty?.owner===owner)duty.line=line;},
  dutyState(owner){if(!duty||duty.owner!==owner)return null;const s=stages.get(emperor);return {owner,active:duty.active,stage:scripts.get(emperor)[s.index].id,ready:duty.active&&(duty.kind==='edict-review'?scripts.get(emperor)[s.index].id==='duty-public-review'&&s.arrived:s.mount===throne)&&!duty.release&&!duty.yieldSeat,mounted:s.mount?.id||null,releasing:duty.release};},
  playerRequest(id){for(const n of actors){const s=stages.get(n);if(s.mount?.id===id){if(n===emperor&&duty?.active){duty.yieldSeat=true;}else{if(s.choice)s.choice.fulfilled=false;advance(n,s);}}}},
  update(dt,t,state={}){
   if(disposed)return;playerState=state;time+=dt;brain.tick(dt);
   for(const n of actors){
    n.walking=false;passage.leave(n);let s=stages.get(n),stop=scripts.get(n)[s.index];tell(n,stop.label);s.greetingActive=false;
    if(claims.tick(n.station.id,dt,interrupted(n)||hostHeld===n&&interrupted(host)))s.abortRequested='等待稍久 · 改日再来';
    if(s.abortRequested&&!(n===emperor&&duty)){if(cancelCommitment(n,s,s.abortRequested)){s=stages.get(n);stop=scripts.get(n)[s.index];}else{animate(n,s,t);continue;}}
    if(n===emperor&&duty){
     if(!duty.active&&!interrupted(n)){
      if(!unmount(n,s)){animate(n,s,t);continue;}
      if(near(n.root.position,n.home.toArray(),.4)||near(n.root.position,HALL.at(-1),.3)){
       duty.fromPublic=near(n.root.position,HALL.at(-1),.3);
       if(s.choice)brain.complete(n.station.id,s.choice,{fulfilled:false});choose(n);s=stages.get(n);stop=scripts.get(n)[s.index];
      }
     }
     if(duty.active&&stop.id==='duty-public-review'){
      if(duty.release){enter(n,s.index+1);s=stages.get(n);stop=scripts.get(n)[s.index];}
      else if(duty.line)tell(n,duty.line);
     }
     if(duty.active&&stop.id==='duty-hall-seat'){
      const occupied=state.facilityId===throne.id;
      if(duty.release){if(unmount(n,s)){enter(n,s.index+1);s=stages.get(n);stop=scripts.get(n)[s.index];}else{animate(n,s,t);continue;}}
      else if(occupied||duty.yieldSeat){
       if(!unmount(n,s)){animate(n,s,t);continue;}
       duty.seatYieldState??={index:s.index,planned:false,stalled:0,retries:0};
       // Leave the approach clear for the player before awaiting the chair.
       tell(n,'朝议暂候 · 为御座使用者让出通道');
       const clear=travel(n,duty.seatYieldState,[-2.4,1.415,-4.25],dt);
       if(clear&&!occupied){duty.yieldSeat=false;duty.seatYieldState=null;s.arrived=false;s.waypoint=0;s.planned=false;}
       animate(n,s,t);continue;
      }
      if(duty?.line)tell(n,duty.line);
     }
    }
    if(interrupted(n)){tell(n,stop.label+' · 停步与你交谈');if(!s.mount&&state.position)n.root.rotation.y=Math.atan2(state.position.x-n.root.position.x,state.position.z-n.root.position.z);animate(n,s,t);continue;}
    if(!s.arrived){if(travel(n,s,stop.path[s.waypoint],dt)){s.waypoint++;if(s.waypoint===stop.path.length){s.arrived=true;record(n,stop.id+':arrived');}}}
    if(s.arrived){
     if(stop.mount&&!s.mount&&!(n===emperor&&duty&&!duty.active)){
      if(state.facilityId!==stop.mount.id&&(stop.mount.kind==='bed'?furniture.canUse(navigation,safety(n),stop.mount):furniture.canSit(navigation,safety(n),stop.mount))){n.root.position.set(...stop.mount.anchor);n.root.rotation.y=stop.mount.yaw;n.walking=false;s.mount=stop.mount;record(n,stop.id+':seated');}
      else{if(n!==emperor&&(s.waited=(s.waited||0)+dt)>12)s.abortRequested='设施有人使用 · 稍后再来';animate(n,s,t);continue;}
     }
     if(stop.look)n.root.rotation.y=Math.atan2(stop.look[0]-n.root.position.x,stop.look[2]-n.root.position.z);
     if(stop.pair){
      const ready=near(host.root.position,host.home.toArray(),.18)&&!host.walking&&!host.route.length;
      if(!hostHeld&&ready&&!interrupted(host)&&state.performing!==host.station.id){hostHeld=n;hostPreviousYaw=host.root.rotation.y;hostHeldAt=time;record(n,'tea-host-present');}
      if(state.performing===host.station.id)releaseHost();
      if(hostHeld!==n||interrupted(host)||state.performing===host.station.id){if(!interrupted(host)&&(s.waited=(s.waited||0)+dt)>20)s.abortRequested='茶主人正忙 · 改日再访';animate(n,s,t);continue;}
      n.root.rotation.y=Math.atan2(host.root.position.x-n.root.position.x,host.root.position.z-n.root.position.z);host.root.rotation.y=Math.atan2(n.root.position.x-host.root.position.x,n.root.position.z-host.root.position.z);tell(n,'与 Lin 聊今日荷色和茶香');tell(host,'接待'+palaceResident(n.station.id).shortName+' · 茶案前叙话');
     }
     if(stop.garden&&!s.greetingComplete){
      const nearby=a=>a!==n&&stages.get(a)?.arrived&&scripts.get(a)?.[stages.get(a).index]?.garden&&!interrupted(a)&&Math.hypot(a.root.position.x-n.root.position.x,a.root.position.z-n.root.position.z)<2.1;
      const other=s.gardenPartner?consorts.find(a=>a.station.id===s.gardenPartner&&nearby(a)):s.elapsed>=3?consorts.find(nearby):null;
      if(other){s.gardenPartner=other.station.id;s.greetingActive=true;s.greetingElapsed=(s.greetingElapsed||0)+dt;n.root.rotation.y=Math.atan2(other.root.position.x-n.root.position.x,other.root.position.z-n.root.position.z);tell(n,'与'+palaceResident(other.station.id).shortName+'聊眼前荷色');if(s.greetingElapsed>=3.5){s.greetingComplete=true;s.choice.relationship={target:other.station.id,gain:.04};brain.observe(n.station.id,s.choice,{observers:[{id:other.station.id,knowledge:'participant'}]});record(n,'garden-greeting:'+other.station.id);}}
      else{s.gardenPartner=null;s.greetingElapsed=0;}
     }
     s.elapsed+=dt;if(s.elapsed>=(n===emperor&&duty&&!duty.active?0:stop.duration))advance(n,s);
    }
    animate(n,stages.get(n),t);
   }
   if(hostHeld){host.walking=false;const c=poseContext(host,null);c.handoff=!interrupted(host)&&!interrupted(hostHeld);host.animate(t+host.phase,false,null,c);}
  },
  state(){return {time,hostHeld:!!hostHeld,hostActorId:hostHeld?.station.id||null,claims:claims.state(),passage:passage.state(),duty:duty?{...duty}:null,decisions:brain.snapshot(),history:history.map(e=>({...e})),failures:failures.map(e=>({...e})),actors:actors.map(n=>{const s=stages.get(n);return {id:n.station.id,role:n.station.royalRole,ageYears:n.station.ageYears,privateRoomId:n.station.privateRoomId,activity:s.choice?.id||null,stage:scripts.get(n)[s.index].id,waypoint:s.waypoint,elapsed:s.elapsed,arrived:s.arrived,mounted:s.mount?.id||null,cycles:s.cycles,position:n.root.position.toArray(),walking:n.walking,paused:interrupted(n)};})};},
  dispose(){if(disposed)return;disposed=true;releaseHost();claims.dispose();passage.dispose();brain.dispose();for(const n of actors){n.route=[];furniture.releaseActor(n.station.id);if(n.poseContext){n.poseContext.handoff=false;n.poseContext.seatHeight=undefined;}}for(const c of costumes)c?.dispose();for(const kit of meals.values())kit.dispose();}
 };
}
