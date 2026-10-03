// Dialogue-reconstructed R17 integration. Syntax and real-scene gates pending.
import * as G from './geometry.js';
import {findPath} from './navigation.js';
import {PLAYER_TRAVEL_SCALE} from './movement-runtime.js';
import {buildPracticeBow} from './china-practice-court.js';
import {createPalacePracticeWorkflow,PALACE_PRACTICE_ANCHORS} from './palace-practice-workflow.js';
const {THREE}=G;
const TEXT={idle:'等候来客','walk-home':'返回值守',greet:'迎候习射',inspect:'巡查练习场',patrol:'巡视护廊','walk-rack':'走向弓架',checkout:'领取练习弓','walk-to-marker':'走向射位',ready:'检查靶道','stylized-practice':'宫卫习射',result:'查看靶面','return-rack':'归还练习弓','return-bow':'整理弓架',exit:'离开射位',waiting:'在候练区稍候',queue:'走向候练区','check-in':'前往习射庭','reset-target':'整理靶面','maintenance-open':'打开维护侧门','maintenance-walk':'沿维护通道前行','maintenance-close':'关好维护侧门',rest:'记下习射记录',blocked:'等待通道让开',complete:'完成宫卫习射'};
export function createPalacePractice({lot,getPlayer,getNPCs,getNavOptions,getDoors,moveActor,onComplete,onMessage}){
 if(!lot.practice)return null;
 const court=lot.practice,paths=new Map(),moving=new Map(),bowViews=new Map(),stage=court.dynamicGroup;
 let finished=false,lastShot=null,shotFrom=null;
 const who=id=>id==='player'?getPlayer():getNPCs().find(n=>n.station.id==='cn-archery');
 const idFor=person=>person===getPlayer()?'player':person?.station?.id==='cn-archery'?'cn-guard-rui':null;
 const people=()=>[...(getPlayer()?[{id:'player',person:getPlayer(),radius:.34}]:[]),...getNPCs().map(n=>({id:n.station.id==='cn-archery'?'cn-guard-rui':n.station.id,person:n,radius:.25}))];
 const solids=access=>access==='maintenance'?court.runtimeColliders():lot.colliders;
 const actualNear=(p,q)=>Math.hypot(p.x-q.x,p.z-q.z)<.035&&Math.abs(p.y-q.y)<.14;
 function step({actorId,target,routeId,waypointIndex,dt,radius,gateAccess}){
  const person=who(actorId);if(!person)return {status:'blocked',reason:'missing-actor'};
  const pos=person.root.position;if(actualNear(pos,target))return 'arrived';
  const key=routeId+':'+waypointIndex+':'+gateAccess;let data=paths.get(actorId);
  if(!data||data.key!==key){const cols=solids(gateAccess),options={...getNavOptions(),pathRadius:Math.max(.39,radius+.05)};
   // Fixed court-only paths have no proximity building doors. Maintenance
   // removes only public exclusion; actual gate/screens/walls stay collidable.
   const route=findPath(pos,target,cols,options);data={key,route};paths.set(actorId,data);if(!route.length)return {status:'blocked',reason:'no-legal-court-route'};
  }
  let budget=dt*person.locomotion.walkSpeed*(actorId==='player'?PLAYER_TRAVEL_SCALE:.82);
  while(data.route.length&&budget>1e-7){const to=data.route[0],dx=to.x-pos.x,dz=to.z-pos.z,d=Math.hypot(dx,dz);if(d<.012){data.route.shift();continue;}
   const amount=Math.min(d,budget),nx=pos.x+dx/d*amount,nz=pos.z+dz/d*amount;
   if(people().some(o=>o.id!==actorId&&Math.abs(o.person.root.position.y-pos.y)<1.8&&Math.hypot(o.person.root.position.x-nx,o.person.root.position.z-nz)<radius+o.radius+.07))return 'pending';
   const before=pos.clone();moveActor(person,dx/d*amount,dz/d*amount,radius,solids(gateAccess));const travelled=pos.distanceTo(before);if(travelled<1e-7)return 'pending';moving.set(actorId,true);person.root.rotation.y=Math.atan2(dx,dz);budget-=amount;
  }
  return actualNear(pos,target)?'arrived':'pending';
 }
 const anchors={...PALACE_PRACTICE_ANCHORS,waiting:court.config.wait,home:court.config.home,rack:court.config.rack,checkIn:court.config.checkIn,maintenanceInside:court.config.maintenanceInside,
  downrange:court.config.downrange,lanes:PALACE_PRACTICE_ANCHORS.lanes.map(l=>({...l,marker:{...l.marker,z:17.65}}))};
 const controller=createPalacePracticeWorkflow({anchors,moveActor:step,stopActor:id=>paths.delete(id),onComplete:e=>{finished=true;onComplete?.(e);}});
 const flight=new THREE.Group();flight.name='Authored target-only practice arrow';stage.add(flight);G.cyl(flight,0,0,0,.008,.008,.46,0xcba874,6).rotation.x=Math.PI/2;for(const side of[-1,1])G.box(flight,side*.025,0,-.17,.04,.008,.13,0xe2d2aa).rotation.z=side*.2;flight.visible=false;
 const marks=[];for(const x of[19.65,22.25]){const m=G.mesh(stage,new THREE.RingGeometry(.06,.1,24),0xf0d38c,x,1.45,10.856,{side:THREE.DoubleSide});m.visible=false;marks.push(m);}
 function viewFor(id){let v=bowViews.get(id);if(v)return v;const bow=buildPracticeBow(G);bow.name='Held practice bow '+id;bow.getObjectByName('practice bow resting string').visible=false;stage.add(bow);const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(9),3));const material=new THREE.LineBasicMaterial({color:0xe8d9ba}),string=new THREE.Line(geo,material);stage.add(string);v={bow,string};bowViews.set(id,v);return v;}
 function render(){const s=controller.getState();court.setBowCheckedOut(!!s.bowHolder);for(const id of['player','cn-guard-rui']){const v=viewFor(id),a=who(id),state=id==='player'?s.player:s.guard;v.bow.visible=!!a&&state.bowHeld;v.string.visible=v.bow.visible;if(!v.bow.visible)continue;a.root.updateMatrixWorld(true);const left=a.root.userData.hands[0].getWorldPosition(new THREE.Vector3()),right=a.root.userData.hands[1].getWorldPosition(new THREE.Vector3());v.bow.position.copy(left);v.bow.rotation.set(0,a.root.rotation.y,0);v.bow.updateMatrixWorld(true);const ends=[new THREE.Vector3(-.015,-.59,-.02),new THREE.Vector3(-.015,.59,-.02)].map(p=>p.applyMatrix4(v.bow.matrixWorld));const mid=state.poseAction==='archery-draw'?right:left.clone().add(new THREE.Vector3(0,0,-.02).applyAxisAngle(new THREE.Vector3(0,1,0),a.root.rotation.y));const p=v.string.geometry.attributes.position;[ends[0],mid,ends[1]].forEach((x,i)=>p.setXYZ(i,x.x,x.y,x.z));p.needsUpdate=true;v.string.geometry.computeBoundingSphere();}
  if(s.shot){if(lastShot!==s.shot.id){lastShot=s.shot.id;const actor=who(s.shot.actorId);shotFrom=actor?.root.userData.hands[0].getWorldPosition(new THREE.Vector3())||null;}if(shotFrom){const target=new THREE.Vector3(s.shot.target.x,s.shot.target.y,s.shot.target.z);flight.visible=true;flight.position.lerpVectors(shotFrom,target,s.shot.progress);flight.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),target.sub(shotFrom).normalize());}}else flight.visible=false;
  for(let i=0;i<marks.length;i++)marks[i].visible=s.needsReset&&((i===0&&s.player.shots>0)||(i===1&&s.guard.shots>0));
 }
 return {
  start(){finished=false;controller.startPlayer();onMessage?.('先到候练区，宫卫会检查靶道并带你领取练习弓');},
  cancel(){controller.interruptPlayer();paths.delete('player');moving.delete('player');},
  update(dt,{manual=false}={}){moving.clear();const old=controller.getState();const frame=people().map(o=>({id:o.id,position:o.person.root.position,radius:o.radius,height:1.95}));const gate=court.state();const s=controller.update(dt,{actors:frame,maintenanceGateOpen:gate.maintenanceGateClosed?false:gate.maintenanceGateOpen?true:undefined,downrangeGateOpen:gate.downrangeGateOpen,playerManual:manual,lotActive:true});court.requestMaintenance(s.maintenanceGateRequested);if(old.player.status!=='blocked'&&s.player.status==='blocked')onMessage?.('习射路线暂被挡住了，请让出通道后重新开始');},
  render,pose(person){const id=idFor(person),s=controller.getState();return id?(id==='player'?s.player:s.guard):null;},
  isMoving(person){return moving.get(idFor(person))||false;},
  isPlayerControlled(){return controller.getState().playerControlled;},
  text(person){const s=this.pose(person);return s?TEXT[s.phase]||(/maintenance|reset/.test(s.phase)?'整理靶场':s.bowHeld?'携弓前行':'巡视习射庭'):null;},
  getState:()=>({...controller.getState(),gates:court.state(),finished}),
  dispose(){controller.dispose();paths.clear();for(const v of bowViews.values())v.string.material.dispose();bowViews.clear();},
 };
}
