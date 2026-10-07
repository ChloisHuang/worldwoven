// Reproduces leisure spending a meal reserve, life and salon driving one body,
// cancelled-save actor theft, and reloading a borrowed actor into old furniture.
// Salon/money are bounded API doubles; public-route progression is inspected,
// not claimed as collision QA. Actual ledger/session tests cover their contracts.
const assert=require('node:assert/strict'),load=require('./fixtures/browser-module-loader.cjs').createBrowserModuleLoader('source');
const copy=value=>JSON.parse(JSON.stringify(value));
(async()=>{
 const {createChinaOfficialLife}=await load('game/china-official-life.js'),{createLifeDecisions}=await load('game/npc-life-decisions.js'),{createFacilityQueue}=await load('game/npc-facilities.js'),T=await load('vendor/three/build/three.module.js');
 const id='cn-minister-works',artistId='cn-tavern-reciter',reception=[24.15,7.815,7.65],quote={artistId,activity:'poetry',fee:45};
 function fixture({enabled=true,bank=51,cash=0,current='paid-salon',fatigue=.2,need={},duty=null,inspection=null,saved=null,owned=false}={}){
  const root=new T.Group();root.position.set(14,.115,8.8);
  let frames=0,moves=0,time=0,quotes=0,requests=0,cancels=0,blocked=false,move=true,available=true,stage='escort',funds={bank,cash},status={seekMeal:false,seekToilet:false,...need},check=inspection;
  const actor={station:{id},root,home:root.position.clone(),phase:0,route:[],walking:false,animate(){frames++;}};
  const calls=[],paths=[],claims=createFacilityQueue(),chair={id:'china-tavern-listening-17.5',kind:'chair',position:[17.5,7.815,13.6],anchor:[17.5,7.815,13.6],yaw:0};
  const decisions=createLifeDecisions({worldSeed:42,actorIds:[id]}).snapshot();
  decisions.people[id].needs.fatigue=fatigue;
  if(current)decisions.people[id].current={id:current,...(current==='paid-salon'?{targetId:artistId+':poetry'}:{}),duration:current==='listen'?18:0,startedAt:0};
  const salon={npcChoices(customerId){assert.equal(customerId,id);quotes++;return !owned&&available?[{...quote}]:[];},
   requestNPC(customerId,performer,activity,fee){requests++;calls.push({customerId,performer,activity,fee,position:root.position.toArray()});assert.deepEqual(root.position.toArray(),reception);owned=true;actor.route=[new T.Vector3(23,7.815,7)];return true;},
   ownsNPCCustomer:customerId=>customerId===id&&owned,npcStatus:customerId=>customerId===id&&owned?{stage,label:'原雅集控制器负责茶叙'}:null,
   cancelNPC(customerId,reason){assert.equal(customerId,id);cancels++;calls.push({reason});if(blocked)return false;owned=false;return true;}};
  const config={officials:[actor],npcs:[actor],lot:{colliders:[],walkableSurfaces:[],bounds:{}},furniture:{items:[chair],facilities:claims,canSit:()=>true,standPoint:()=>new T.Vector3(17.8,7.815,13.6)},doors:{},
   economy:{account:()=>({...funds})},sharedNeeds:{hunger:()=>.2,status:()=>({...status})},reports:{inspection:()=>check},planPath:(_,p)=>[p],poseContext:()=>({}),safety:()=>[],
   travel(n,s){moves++;paths.push(copy(s.path));if(!move)return;const p=s.path[s.index];n.root.position.set(...p);n.walking=true;if(++s.index===s.path.length)s.arrived=true;},
   saved:saved||{decisions,...(duty?{duties:{[id]:duty}}:{})},...(enabled?{getSalon:()=>salon}:{})};
  const flow=createChinaOfficialLife(config);
  return {flow,actor,claims,salon,calls,paths,config,quote,
   tick(playerState={},dt=.1){time+=dt;flow.tick(dt,{hour:15,day:0,...playerState});flow.update(actor,dt,time);},
   arrive(){for(let i=0;i<30&&!owned;i++)this.tick();assert(owned,'selected official actually reaches reception before borrowing');},
   stats:()=>({frames,moves,quotes,requests,cancels}),get owned(){return owned;},set owned(v){owned=v;},set blocked(v){blocked=v;},set move(v){move=v;},set available(v){available=v;},set funds(v){funds=v;},set status(v){status={...status,...v};},set inspection(v){check=v;},set salonStage(v){stage=v;}};
 }
 const off=fixture({enabled:false});assert.notEqual(off.flow.state().actors[0].activity,'paid-salon');assert.equal(off.stats().quotes,0,'default hook is dormant');off.flow.dispose({suspend:true});
 for(const account of [{bank:50,cash:0},{bank:0,cash:50},{bank:25,cash:25},{bank:0,cash:0}]){
  const f=fixture(account);assert.notEqual(f.flow.state().actors[0].activity,'paid-salon','fee plus five cannot spend the last meal coin');assert.equal(f.stats().requests,0);f.flow.dispose({suspend:true});
 }
 for(const account of [{bank:51,cash:0},{bank:0,cash:51},{bank:26,cash:25}]){
  const f=fixture(account);assert.equal(f.flow.state().actors[0].activity,'paid-salon');const before=copy(f.flow.snapshot().decisions.people[id]);
  assert.equal(f.stats().quotes,1);f.tick();assert.equal(f.stats().requests,0);assert.equal(f.stats().quotes,1,'walking does not resample candidates');
  const saved=f.flow.snapshot(),choice=saved.runtime.stages[0][1].choice;assert.deepEqual(copy(choice.salon),quote);assert.equal(choice.cooldown,120);assert.deepEqual(copy(choice.relief),{});assert.equal(choice.relationship,null);assert.deepEqual(copy(saved.decisions.people[id].traits),before.traits);
  f.arrive();assert.equal(f.stats().requests,1);assert.deepEqual(f.calls[0],{customerId:id,performer:artistId,activity:'poetry',fee:45,position:reception});assert(f.flow.state().actors[0].borrowedSalon);assert(!f.flow.meetingAvailable(f.actor));assert(!f.flow.socialCanPause(f.actor));
  const stats=f.stats(),position=f.actor.root.position.clone();f.actor.walking=true;f.actor.route=[new T.Vector3(23,7.815,8)];const route=f.actor.route;
  for(let i=0;i<4;i++)f.tick();assert.equal(f.stats().frames,stats.frames);assert.equal(f.stats().moves,stats.moves);assert.equal(f.actor.route,route);assert(f.actor.walking);assert(f.actor.root.position.equals(position),'life never drives the borrowed actor');
  const checkpoint=copy(f.flow.snapshot());checkpoint.positions[id]=[0,.115,0];checkpoint.runtime.stages[0][1].mount={$worldRef:'furniture',id:'china-tavern-listening-17.5'};checkpoint.runtime.stages[0][1].mountTarget=checkpoint.runtime.stages[0][1].mount;const actorPosition=f.actor.root.position.clone();f.actor.serviceMount={id:'salon-preserved'};
  const reload=createChinaOfficialLife({...f.config,saved:checkpoint});assert(f.actor.root.position.equals(actorPosition),'live salon position wins over older personal-life checkpoint');assert.equal(f.actor.serviceMount.id,'salon-preserved');assert(reload.state().actors[0].borrowedSalon);assert.equal(reload.mountForActor(f.actor),null,'borrowed actor cannot be restored into old furniture');reload.dispose({suspend:true});f.flow.dispose({suspend:true});
 }
 const free=fixture({enabled:false,current:'listen',bank:0});const freeChoice=free.flow.snapshot().runtime.stages[0][1].choice;assert.match(freeChoice.label,/免费听席/);assert.equal(freeChoice.duration,18);assert.equal(freeChoice.cooldown,120);assert.deepEqual(copy(freeChoice.relief),{social:-.5});assert.equal(free.stats().requests,0);free.flow.dispose({suspend:true});
 console.log('PASS dormant hook, six-copper retention at exact quoted fee, own cash/bank, saved preferences, original free seats, and exclusive physical handoff');
 // Needs and obligations exclude leisure at the original decision boundary.
 for(const config of [{need:{seekMeal:true}},{need:{seekToilet:true}},{fatigue:.95},{duty:{day:0,stage:'awaiting-archive'}},{inspection:{id:'inspect-1',label:'待巡视',point:[5,.115,1]}}]){
  const f=fixture(config);assert.notEqual(f.flow.state().actors[0].activity,'paid-salon');assert.equal(f.stats().quotes,0);f.flow.dispose({suspend:true});
 }
 // Arrival revalidates the saved exact quote and remaining meal budget.
 for(const change of [f=>{f.funds={cash:0,bank:50};},f=>{f.available=false;},f=>{quote.fee=50;}]){
  const f=fixture();change(f);for(let i=0;i<20;i++)f.tick();assert.equal(f.stats().requests,0);assert(!f.flow.state().actors[0].borrowedSalon);assert.equal(f.flow.socialProfile(id).cooldowns['paid-salon'],121.2);f.flow.dispose({suspend:true});quote.fee=45;
 }
 // Each interruption leaves the original controller in charge until refund
 // persistence succeeds. The next route is planned from the actual room.
 for(const reason of ['summon','meal','toilet','fatigue','duty','inspection','meeting','conversation']){
  const f=fixture();f.arrive();f.actor.root.position.set(24.2,4.015,19.3);f.actor.walking=true;f.actor.route=[new T.Vector3(23.5,4.015,19.3)];const pos=f.actor.root.position.clone(),route=f.actor.route;
  const states={};if(reason==='summon')f.flow.request(f.actor);if(reason==='meal')f.status={seekMeal:true};if(reason==='toilet')f.status={seekToilet:true};if(reason==='duty')f.flow.courtCompleted(0);if(reason==='inspection')f.inspection={id:'inspect-1',label:'待巡视',point:[5,.115,1]};if(reason==='meeting')states.meetingActorId=id;if(reason==='conversation')states.conversationActorId=id;
  if(reason==='fatigue')f.flow.tick(800,{hour:15}); // Advance the actual fatigue source.
  f.blocked=true;const stats=f.stats();f.tick(states);assert(f.owned);assert(!f.flow.ready(f.actor));assert(f.flow.state().actors[0].borrowedSalon);assert.equal(f.stats().frames,stats.frames);assert.equal(f.stats().moves,stats.moves);assert.equal(f.actor.route,route);assert(f.actor.walking);assert(f.actor.root.position.equals(pos));
  assert.equal(f.flow.resume(f.actor),false,'explicit resume also waits for the refund commit');assert(f.owned);assert(f.actor.root.position.equals(pos));
  f.blocked=false;f.tick(states);assert(!f.owned);assert(!f.flow.state().actors[0].borrowedSalon);assert(f.actor.root.position.equals(pos),'release itself never moves the customer');
  if(reason==='summon'){assert(f.flow.ready(f.actor));const exit=f.flow.courtPlan(f.actor);assert(exit.path.some(p=>p[1]<pos.y));assert.deepEqual(copy(exit.path.at(-1)),[14,.115,8.8]);}
  assert.deepEqual(copy(f.flow.socialProfile(id).relations),{});assert.deepEqual(copy(f.flow.socialProfile(id).opinions),{});f.flow.dispose({suspend:true});
 }
 // An artist cancellation or controller absence gives no fabricated relief,
 // relationship, experience, fresh request, or replay of the old paid action.
 const ownedOnLoad=fixture({owned:true,current:null});assert(ownedOnLoad.flow.state().actors[0].borrowedSalon);assert.equal(ownedOnLoad.stats().quotes,0,'live owner with no life stage cannot sample a new commitment');ownedOnLoad.flow.dispose({suspend:true});
 const missing=fixture();missing.arrive();const borrowedSave=missing.flow.snapshot(),missingPosition=missing.actor.root.position.clone();missing.owned=false;const dormantRestore=createChinaOfficialLife({...missing.config,getSalon:()=>null,saved:borrowedSave});dormantRestore.tick(.1,{hour:15});dormantRestore.update(missing.actor,.1,1);assert(missing.actor.root.position.equals(missingPosition));assert(!dormantRestore.state().actors[0].borrowedSalon);assert.equal(missing.stats().requests,1,'missing terminal session is never recreated');dormantRestore.dispose({suspend:true});missing.flow.dispose({suspend:true});
 const ended=fixture();ended.arrive();const previous=ended.flow.socialProfile(id);ended.owned=false;ended.tick();const after=ended.flow.socialProfile(id);assert.equal(after.needs.social,previous.needs.social+.0001);assert.deepEqual(copy(after.experiences),copy(previous.experiences));assert.equal(after.cooldowns['paid-salon']-ended.flow.snapshot().decisions.time,120);assert.equal(ended.stats().requests,1);const restored=createChinaOfficialLife({...ended.config,getSalon:()=>null,saved:ended.flow.snapshot()});assert(!restored.state().actors[0].borrowedSalon);restored.dispose({suspend:true});ended.flow.dispose({suspend:true});
 const waiting=fixture();let checks=0,busy=true;waiting.salon.npcOfferStatus=()=>{checks++;return {ok:!busy,waitable:busy,revision:0};};
 for(let i=0;i<25;i++)waiting.tick();assert(!waiting.owned);assert.equal(waiting.stats().requests,0);assert.match(waiting.flow.snapshot().runtime.stages[0][1].label,/原艺者/);const firstChecks=checks;
 for(let i=0;i<9;i++)waiting.tick();assert(checks-firstChecks<=1,'busy recheck at most once each simulated second');busy=false;for(let i=0;i<15&&!waiting.owned;i++)waiting.tick();assert(waiting.owned);assert.equal(waiting.stats().requests,1);waiting.flow.dispose({suspend:true});
 const deadline=fixture();deadline.salon.npcOfferStatus=()=>({ok:false,waitable:true,revision:0});for(let i=0;i<150;i++)deadline.tick();assert.equal(deadline.stats().requests,0);assert(!deadline.flow.state().actors[0].borrowedSalon);assert(deadline.flow.socialProfile(id).cooldowns['paid-salon']>120);deadline.flow.dispose({suspend:true});
 const revoked=fixture();let offer={ok:false,waitable:true,revision:0};revoked.salon.npcOfferStatus=()=>offer;for(let i=0;i<25;i++)revoked.tick();offer={ok:false,waitable:false,revision:1,code:'artist-declined'};for(let i=0;i<15;i++)revoked.tick();assert.equal(revoked.stats().requests,0);assert.notEqual(revoked.flow.state().actors[0].activity,'paid-salon');revoked.flow.dispose({suspend:true});
 // Actual R190 observation exposed a split local/absolute idle clock boundary.
 // A12s local elapsed can finish about1e-12s before the absolute deadline;
 // repeating idle() must not renew that original deadline indefinitely.
 const idleSeed=fixture({current:null}),idleSaved=copy(idleSeed.flow.snapshot());idleSeed.flow.dispose({suspend:true});
 idleSaved.decisions.time=368.69999999998976;idleSaved.runtime.time=368.69999999998976;
 Object.assign(idleSaved.decisions.people[id],{current:null,choices:4,nextDecisionAt:372.449999999991});
 idleSaved.runtime.stages=[[id,{path:[[14,.115,8.8]],label:'original idle',index:0,arrived:true,planned:false,stalled:0,retries:0,elapsed:8.250000000000009,idle:true,duration:12}]];
 const drift=fixture({saved:idleSaved,current:null});
 for(let i=0;i<27;i++)drift.tick({},.15);
 assert(drift.flow.snapshot().decisions.people[id].choices>4,'original idle deadline must lead to a decision, not another12-second defer');
 drift.flow.dispose({suspend:true});
 console.log('PASS original .15-step idle floating boundary resumes decisions without changing RNG or cooldown policy');
 console.log('PASS exact-artist transient practice wait, once-per-second recheck, 12-second expiry and non-waitable refusal/reservation cancellation without payment');
 console.log('PASS needs/duty/meeting/summon priority, exact quote revalidation, blocked refund retries without body theft, current-position stair exit, cooldown and no invented relief/relationships');
})().catch(e=>{console.error(e);process.exitCode=1;});
