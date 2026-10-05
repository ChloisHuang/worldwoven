// Real tea controller, formal-career adapter and bank. Detects duplicate
// custody/pay, unsupported consumer farming and interrupted-service failures.
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {pathToFileURL} from 'node:url';
registerHooks({resolve(id,ctx,next){return id==='three'?{url:pathToFileURL(process.cwd()+'/source/vendor/three/build/three.module.js').href,shortCircuit:true}:next(id,ctx);}});
const T=await import('three'),{createFranceTeaService,FRANCE_TEA:P}=await import('../source/game/france-tea-service.js'),{createFacilityQueue}=await import('../source/game/npc-facilities.js');
const {createFranceTeaCareers}=await import('../source/game/france-tea-careers.js');
const {createFormalCareers,TEA_PREPARER_ROLE,TEA_SERVER_ROLE}=await import('../source/game/formal-careers.js');
const {createCurrencyLedger}=await import('../source/game/currency-ledger.js');
const clone=x=>JSON.parse(JSON.stringify(x));
function fixture({player=false,blockedSeat=false,doorWaiting=false}={}){
 const group=new T.Group(),seat={id:'real-loggia-south',kind:'seat',center:[6.6,.16,12.5],anchor:[6.6,.16,12.21],position:[5.37,.16,12.5],seatY:.9535,yaw:Math.PI};
 const actor=(id,position)=>{const root=new T.Group();root.position.set(...position);const hands=[new T.Object3D(),new T.Object3D()];hands[0].position.set(-.19,1.12,.43);hands[1].position.set(.19,1.12,.43);root.add(...hands);root.userData.hands=hands;group.add(root);return {root,station:{id,npcLabel:id,npcAction:'read'},ageYears:24,characterScale:.96,phase:0,route:[],locomotion:{walkSpeed:2},animate(){}};};
 const npcs=[actor(P.cook,P.cookAside),actor(P.host,P.hostHome),actor(P.guest,P.guestHome)],person=actor('player',player?seat.anchor:[30,0,30]);let mounted=player?seat:null,wait=doorWaiting,clock=0,seatBlocked=blockedSeat;
 const furniture={items:[seat],facilities:createFacilityQueue(),canSit:()=>!seatBlocked,standPoint:()=>seatBlocked?null:new T.Vector3(...seat.position),releaseActor(id){this.facilities.releaseActor(id);}};
 const lot={group,colliders:[],walkableSurfaces:[],bounds:{minX:-35,maxX:35,minZ:-35,maxZ:35}},doors={cameraColliders:[],routeStep(route,p){if(wait)return {waiting:true};while(route[0]&&Math.hypot(route[0].x-p.x,route[0].z-p.z)<.05)route.shift();return {waypoint:route[0]};}};
 const service=createFranceTeaService({npcs,lot,furniture,doors,planPath:(a,b)=>[...(b.z < -8.3&&a.x > -5.4?[new T.Vector3(-5.0,b.y,-8.5)]:[]),new T.Vector3(b.x,b.y,b.z)],moveActor:(n,dx,dz)=>{n.root.position.x+=dx;n.root.position.z+=dz;},poseContext:n=>n.poseContext??={},getPlayer:()=>person,getMounted:()=>mounted,onSeat:item=>{mounted=item;person.root.position.set(...item.anchor);},worldSeed:1});
 const tick=(count=1)=>{for(let i=0;i<count;i++){clock+=.1;service.update(.1,clock);}};
 const until=(predicate,limit=5000)=>{for(let i=0;i<limit&&!predicate(service.state());i++)tick();assert(predicate(service.state()),'Did not reach expected state: '+JSON.stringify(service.state().order));};
 return {service,npcs,person,seat,tick,until,furniture,setDoor:v=>wait=v,setSeat:v=>seatBlocked=v,leave(){mounted=null;person.root.position.set(15,0,15);service.leaveSeat(seat.id);}};
}
function employee(role,{durable={},failures={}}={}){
 const f=fixture(),clock={day:1,hour:10,seconds:0},notices=[];
 const save=(key,next)=>{if(failures[key])return false;durable[key]=clone(next);};
 const bank=createCurrencyLedger({saved:durable.bank,saveState:n=>save('bank',n)});
 const careers=createFormalCareers({saved:durable.careers,getClock:()=>clock,creditWageToBank:bank.creditWageToBank,saveState:n=>save('careers',n)});
 const adapter=createFranceTeaCareers({tea:f.service,careers,getPlayer:()=>f.person,getClock:()=>clock,saved:durable.tea,saveState:n=>save('tea',n),notify:t=>notices.push(t)});
 const teaTick=f.tick;
 f.tick=(count=1)=>{for(let i=0;i<count;i++){clock.seconds+=.1;adapter.beforeClock();careers.observeDay();adapter.update(.1);teaTick();}};
 f.until=(predicate,limit=8000)=>{for(let i=0;i<limit&&!predicate();i++)f.tick();assert(predicate(),'Did not reach state '+JSON.stringify({tea:f.service.state(),adapter:adapter.state(),careers:careers.state(),notices:notices.slice(-5)}));};
 f.tick();
 function choose(kind){const s=adapter.forRole(role.id).intent(kind);assert(s,'missing intent '+kind);f.person.root.position.set(...s.position);f.person.walking=false;assert(adapter.executeIntent(s),'cannot execute '+kind);f.tick();return s;}
 function hire(){for(const [skill,need]of Object.entries(role.skillRequirements)){while(careers.state().skills[skill]<need){const t=careers.learningTicket('france-salon',skill+'-intro');assert(t.ok);assert(careers.completeLearning(t.ticket,{seconds:8}).ok);}}choose('formal-apply');f.until(()=>careers.isHired(role.id));}
 function start(){choose('accept');f.until(()=>!!adapter.state().job);}
 function work(){f.until(()=>adapter.state().job?.stage==='ready'||!!adapter.forRole(role.id).intent('work'));if(adapter.state().job?.stage==='ready')return false;const s=choose('work');f.until(()=>!f.service.dutyState()?.step&&!adapter.state().pending);return s;}
 function complete(){let count=0;while(adapter.state().job?.stage==='working'){work();assert(++count<20);}choose('claim');f.until(()=>!adapter.state().job);}
 return {...f,clock,notices,bank,careers,adapter,durable,failures,choose,hire,start,work,complete};
}
for(const role of[TEA_PREPARER_ROLE,TEA_SERVER_ROLE]){
 const f=employee(role);f.hire();f.start();assert.equal(f.service.request(),false,'employee cannot farm own consumer order');f.complete();
 assert.equal(f.careers.state().lastDuty.stage,'paid');assert.equal(f.careers.state().lastDuty.wage,role.wage+1);
 assert.equal(f.bank.state().balances.france.bank,role.wage+1);assert.equal(f.bank.state().cash,0);
 const steps=f.service.state().history.filter(e=>e.event==='player-duty-step').map(e=>e.key);
 assert.deepEqual(steps,role===TEA_PREPARER_ROLE?['receive-order','cut-cake','brew-tea','release-tray']:['take-order','report-order','take-tray','serve-tray','clear-tray','wash-cups']);
 assert.equal(f.service.state().history.filter(e=>e.event==='player-duty-completed').length,1);
 assert.equal(f.adapter.forRole(role.id).intent()?.kind,'view');
 const reloaded=employee(role,{durable:f.durable});assert.equal(reloaded.careers.state().lastDuty.stage,'paid');assert.equal(reloaded.bank.state().balances.france.bank,role.wage+1);
 reloaded.adapter.dispose();reloaded.service.dispose();f.adapter.dispose();f.service.dispose();
}
console.log('PASS French tea roles: actual full duties, real guest, shared tray, localized approval, French bank wage and paid reload');
