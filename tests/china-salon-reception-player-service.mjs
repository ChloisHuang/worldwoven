// Original production salon + official wallet + artist ledger + business debit
// + receptionist account. Direct arrivals isolate transaction/controller risk;
// Work-contact observer is doubled here for transaction isolation; real rig/
// brush/page/card contacts are checked by development/salon-reception/contact.mjs.
// This is not natural-demand, pathfinding, pose-contact or browser evidence.
import assert from 'node:assert/strict';
import {createChinaOfficialEconomy,CHINA_OFFICIAL_IDS} from '../source/game/china-official-economy.js';
import {createNPCDutyAccount} from '../source/game/npc-duty-account.js';
import {createNPCGuestAccounts} from '../source/game/npc-guest-accounts.js';
import {PALACE_GUARD_ROLE as GUARD} from '../source/game/formal-careers.js';
import {GAME_MINUTES_PER_SECOND as RATE} from '../source/game/simulation-clock.js';
import {createChinaSalonEconomy} from '../source/game/china-salon-economy.js';
import {createChinaSalonReceptionAccount} from '../source/game/china-salon-reception-account.js';
import {createChinaTavernProperty} from '../source/game/china-tavern-property.js';
import {createChinaOfficialSalonPayments} from '../source/game/china-official-salon-payments.js';
import {createChinaTavernSalon} from '../source/game/china-tavern-salon.js';
import {SALON_ARTISTS} from '../source/game/china-tavern-salon-artists.js';
import {SALON_ROOMS} from '../source/game/china-tavern-salon-rooms.js';
import {createGameCurrencyLedger} from '../source/game/currency-ledger.js';
import {registerHooks} from 'node:module';
const THREE=await import('../source/vendor/three/build/three.module.js');
registerHooks({resolve(specifier,context,next){return specifier==='three'?{url:new URL('../source/vendor/three/build/three.module.js',import.meta.url).href,shortCircuit:true}:next(specifier,context);}});
const {createCharacter}=await import('../source/game/characters.js'),{npcRoleAppearance}=await import('../source/game/appearance.js');await import('../source/game/character-live-entry.js');
const copy=structuredClone,customerId=CHINA_OFFICIAL_IDS[5],hostId='cn-tavern-reception';let artistId='cn-tavern-reciter';
class V{constructor(...p){this.set(...p);}set(x=0,y=0,z=0){Object.assign(this,{x,y,z});return this;}toArray(){return [this.x,this.y,this.z];}distanceTo(p){return Math.hypot(this.x-p.x,this.y-p.y,this.z-p.z);}clone(){return new V(...this.toArray());}}
function fixture(input={},dormant=true,observed=true,realContact=false){
 let saved=copy(input),service,fail=null,need={},account,property,artistEconomy,elapsed=0,revision=0;const npcs=[],poses=[];
 const actor=(id,pos,extra={})=>{const n={station:{id,npcName:id,ageYears:35,...extra},ageYears:35,alive:true,root:{position:new V(...(saved.positions?.[id]||pos)),rotation:{y:0}},home:new V(...pos),preferenceScore:0,locomotion:{walkSpeed:2},route:[],animate(t,walking,action,c){if(id===hostId)poses.push({walking,action,writing:!!c?.receptionWriting});}};if(realContact&&id===hostId){const real=createCharacter({...npcRoleAppearance('china',hostId,1),culture:'china',scale:.96});n.root=real.root;n.root.position.set(...(saved.positions?.[id]||pos));new THREE.Group().add(n.root);const observe=n.animate;n.animate=(...args)=>{real.animate(...args);observe(...args);};n.dispose=real.dispose;}npcs.push(n);return n;};
 const artist=actor(artistId,[18.8,7.815,18.66],{salon:{activities:[SALON_ARTISTS.find(a=>a.id===artistId).activity],willing:true}}),host=actor(hostId,[24.15,7.815,5.45],{workTarget:[24.15,8.95,6.15]}),guest=actor(customerId,[24.15,7.815,7.65]),player={ageYears:25,root:{position:new V(30,.215,20),rotation:{y:0}},locomotion:{walkSpeed:2}};
 function checkpoint(next){saved={...saved,...copy(next),...(service?{checkpoint:service.snapshot(),positions:Object.fromEntries(npcs.map(n=>[n.station.id,n.root.position.toArray()]))}:{})};return true;}
 const official=createChinaOfficialEconomy({saved:saved.chinaOfficialEconomy,getDay:()=>20,isAppointed:id=>CHINA_OFFICIAL_IDS.includes(id),saveState:(next,tx,patch={})=>{if(fail==='all'||fail===tx.action)return false;return checkpoint({...patch,chinaOfficialEconomy:next});}});
 const bank=createGameCurrencyLedger({saved,storage:{setItem:()=>true}});
 // Lazy counterpart access removes initialization cycles, while saved sources
 // remain available for strict replay before the live income ledger exists.
 property=createChinaTavernProperty({saved:saved.chinaTavernProperty,copperLedger:bank,getClock:()=>({day:20}),getTill:()=>artistEconomy?.summary().businessProceeds??saved.chinaSalonEconomy?.businessProceeds??0,getReceptionAccount:()=>account||saved.chinaSalonReceptionAccount,saveState:()=>false});
 account=createChinaSalonReceptionAccount({saved:saved.chinaSalonReceptionAccount,getSalonIncome:()=>artistEconomy?.snapshot()||saved.chinaSalonEconomy,getProperty:()=>property});
 artistEconomy=createChinaSalonEconomy({saved:saved.chinaSalonEconomy,copperLedger:bank,officialEconomy:official,getReceptionAccount:()=>account,saveState:(next,r,patch={})=>checkpoint({...patch,chinaSalonEconomy:next})});
 assert.equal(artistEconomy.loadError,null);assert.equal(account.loadError,null);assert.equal(property.loadError??property.state().loadError,null);
 const rig=createCharacter({...npcRoleAppearance('china',hostId,1),culture:'china',scale:1});player.root=rig.root;player.animate=rig.animate;player.fitExternalHandGrip=rig.fitExternalHandGrip;player.station={id:'player'};new THREE.Group().add(player.root);player.root.position.set(24.15,7.815,5.45);host.root.position.set(25.5,7.815,5.45);
 const port=createChinaOfficialSalonPayments({officialEconomy:official,artistEconomy});
 service=createChinaTavernSalon({...(realContact?{}:{receptionProps:{sync(){},clear(){},dispose(){},state:()=>null,apply(o,n,t,c){n.animate(t,false,'calligraphy',{...c,receptionWriting:true});return {observed,sessionId:o.id,cardId:o.receptionWork.cardId,phase:o.receptionWork.phase};}}}),npcs,copperLedger:bank,economy:artistEconomy,npcPayments:port,...(dormant?{receptionDuty:{resolve:()=>({holderId:'player',actor:player,revision,available:host.alive,alive:host.alive})}}:{}),sharedNeeds:{status:id=>need[id]||null,hunger:()=>.1},getPlayer:()=>player,poseContext:()=>({}),doors:{routeStep:r=>({waypoint:r[0]})},planPath:(_,p)=>[p],moveActor(n,x,z){n.root.position.x+=x;n.root.position.z+=z;},saved:saved.checkpoint?{continuity:saved.checkpoint}:{},saveState:()=>{if(fail==='all'||fail==='source')return false;return checkpoint({chinaSalonEconomy:artistEconomy.snapshot()});}});
 if(saved.checkpoint)assert(service.restore(saved.checkpoint));
 const pay=()=>{for(let day=0;day<2;day++)assert(official.completeDuty({actorId:customerId,day,receiptId:`cn-official-duty:${customerId}:${day}`,evidence:{kind:'office-work',completed:true,actorId:customerId,day,audienceDay:day,audienceCompleted:true,elapsed:8,duration:8}}).ok);};
 const tick=(count=1,context={})=>{for(let i=0;i<count;i++){elapsed+=.1;service.update(.1,elapsed,context);}};
 return {service,official,artistEconomy,account,property,artist,guest,host,player,pay,tick,poses,need,checkpoint,get saved(){return copy(saved);},set fail(v){fail=v;},changeHolder(){revision++;}};
}

// Actual service board, NPC payer, artist and employer ledgers. Direct arrival
// isolates worker controls; physical pen/card uses the actual player rig.
const f=fixture({},true,true,true);f.pay();assert(!f.service.request(artistId,'poetry'));assert(f.service.requestNPC(customerId,artistId,'poetry',20));f.artist.root.position.set(22.85,7.815,7.65);
f.tick(30);assert.equal(f.service.snapshot().session.receptionWork.seconds,0,'no auto player labor');
function work(f,phase){const w=f.service.receptionPlayerIntent();assert.equal(w.phase,phase);assert(f.service.executeReceptionPlayerWork(w));f.tick(22);}
work(f,'register');f.tick(15);assert.equal(f.service.snapshot().session.stage,'accepted');work(f,'reserve');assert.equal(f.service.snapshot().session.stage,'escort');assert.equal(f.official.account(customerId).bank,28);
const checkpoint=f.saved,cold=fixture(checkpoint,true,true,true);assert.equal(cold.service.snapshot().session.receptionWork.steps.reserveSeconds,2);assert.equal(cold.service.snapshot().session.payment,'reserved');
for(const[a,p]of[[[19.95,7.815,9.22],[21.2,7.815,9.22]],[[18.65,4.015,9.25],[17.55,4.015,9.25]],[SALON_ROOMS[0].actor,SALON_ROOMS[0].player]]){cold.artist.root.position.set(...a);cold.guest.root.position.set(...p);cold.tick();}cold.tick(25);assert.equal(cold.service.snapshot().session.stage,'fade');assert.equal(cold.artistEconomy.account(artistId).bank,0);
cold.fail='source';const close=cold.service.receptionPlayerIntent();assert(cold.service.executeReceptionPlayerWork(close));cold.tick(22);assert.equal(cold.service.snapshot().session.receptionWork.phase,'close','failed physical completion save is retryable');cold.fail='salon-settle';cold.tick(3);assert.equal(cold.service.snapshot().session.receptionWork.phase,'completed');assert.equal(cold.artistEconomy.account(artistId).bank,0);assert.equal(cold.service.snapshot().session.payment,'reserved','failed settlement retains exact held order for retry');cold.fail=null;cold.tick(2);assert.equal(cold.artistEconomy.account(artistId).bank,10);assert.equal(cold.account.account(hostId).bank,0);assert.equal(cold.property.state().balance,130);assert.equal(cold.service.receptionPlayerCompleted().proof.amount,0);const seconds=cold.service.receptionPlayerCompleted().waitSeconds;cold.tick(100);assert.equal(cold.service.receptionPlayerCompleted().waitSeconds,seconds);assert(cold.service.finishReceptionPlayerOrder(cold.service.receptionPlayerCompleted().sessionId));assert.equal(cold.service.receptionPlayerCompleted(),null);
const reload=fixture(cold.saved,true,true,true);assert.equal(reload.account.loadError,null);assert.equal(reload.account.account(hostId).bank,0);assert.equal(reload.artistEconomy.account(artistId).bank,10);
const refund=fixture({},true,true,true);refund.pay();assert(refund.service.requestNPC(customerId,artistId,'poetry',20));refund.artist.root.position.set(22.85,7.815,7.65);work(refund,'register');refund.tick(15);work(refund,'reserve');assert(refund.service.cancelReceptionPlayerOrder());assert.equal(refund.official.account(customerId).bank,48);assert.equal(refund.account.account(hostId).bank,0);assert.equal(refund.artistEconomy.account(artistId).bank,0);
console.log('PASS player real pen/card three manual phases; actual NPC20→artist10/business10 with zero incumbent wages; original reserved cold restore, source-save retry, settlement retry, fixed completion timestamp, explicit appraisal and same-order refund');

for(const specialist of SALON_ARTISTS){artistId=specialist.id;const one=fixture({},true,true,true);assert.deepEqual(one.service.npcChoices(customerId),[],'unfunded original customer cannot invent work');one.pay();one.need[customerId]={seekMeal:true};assert.deepEqual(one.service.npcChoices(customerId),[],'meal need holds invitation');one.need[customerId]={};assert(one.service.requestNPC(customerId,artistId,specialist.activity,20));one.artist.root.position.set(22.85,7.815,7.65);work(one,'register');one.tick(15);assert.equal(one.service.snapshot().session.stage,'accepted');work(one,'reserve');for(const[a,p]of[[[19.95,7.815,9.22],[21.2,7.815,9.22]],[[18.65,4.015,9.25],[17.55,4.015,9.25]],[SALON_ROOMS[0].actor,SALON_ROOMS[0].player]]){one.artist.root.position.set(...a);one.guest.root.position.set(...p);one.tick();}one.tick(25);work(one,'close');assert.equal(one.service.receptionPlayerCompleted().proof.activity,specialist.activity);assert.equal(one.account.account(hostId).bank,0);assert.equal(one.artistEconomy.account(artistId).bank,10);one.service.dispose();
const no=fixture({},true,true,true);no.pay();assert(no.service.requestNPC(customerId,artistId,specialist.activity,20));no.artist.station.salon.willing=false;no.artist.root.position.set(22.85,7.815,7.65);work(no,'register');no.tick(15);assert.equal(no.service.snapshot().session,null,'each specialist may refuse own invitation');assert.equal(no.official.account(customerId).bank,48);assert.equal(no.account.account(hostId).bank,0);no.service.dispose();}
console.log('PASS all four original specialties retain own consent, real funds/needs gates, original room card, actual completed payment and zero incumbent doublepay');
