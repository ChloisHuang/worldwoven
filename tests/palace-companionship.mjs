import test from 'node:test';
import assert from 'node:assert/strict';
import {createPalaceCompanionship} from '../source/game/palace-companionship.js';
import {isSociallyHeld,holdSocialActors,releaseSocialActors,resetSocialHolds,setPlayerConversationHold} from '../source/game/npc-social-ownership.js';

const clone=x=>JSON.parse(JSON.stringify(x));
const actor=id=>({actorId:id,alive:true,root:{position:{x:0,y:0,z:0},rotation:{y:0}},walking:false});
function fixture(options={}){
 resetSocialHolds();
 const roster=['ruler','companion','player','unrelated','young'].map(actor),identities=Object.fromEntries(roster.map(a=>[a.actorId,{actorId:a.actorId,country:'china',revision:1,royalRole:a.actorId==='ruler'?'emperor':null,ageYears:a.actorId==='young'?17:27,alive:true}]));
 const contexts={},busy=new Set(),results=[],states=[],notices=[],fades=[],clock={day:2,hour:20,seconds:0};
 let saveFails=false,failedStage=null,placeAvailable=true,placeId='bedroom-1',arrive=false,journeyLost=false,starts=0,releases=0;
 const place=()=>({id:placeId,private:true,roomId:'original-ruler-bedroom',points:[[0,0,0],[.9,0,0]]});
 const context=(a,b)=>({available:true,completedCount:8,relation:.5,opinion:.2,trust:.3,interestGiven:!['unrelated','young'].includes(b),interestReceived:!['unrelated','young'].includes(a),privatePlaceAvailable:placeAvailable,selfProfile:{traits:{sociability:.8},needs:{social:.7,fatigue:0,hunger:0}},...contexts[`${a}|${b}`]});
 const api=createPalaceCompanionship({getRoster:()=>roster,getIdentity:id=>identities[id],getContext:context,getFactors:()=>({attraction:.7,acceptanceAppearance:.01,acceptanceContext:.02}),isAvailable:id=>!busy.has(id),getPlace:()=>placeAvailable?{ok:true,place:place()}:{ok:false,reason:'room-occupied'},getClock:()=>clock,
  worldSeed:2,saveState:s=>{if(saveFails||s.active?.stage===failedStage||s.history.at(-1)?.stage===failedStage)return false;states.push(clone(s));return true;},onChange:e=>notices.push(e),onPrivateFade:(on,e)=>fades.push([on,e]),onComplete:e=>results.push(e),
  createJourney:()=>{starts++;return {state:()=>({ok:true,phase:'approaching'}),update:()=>({ok:!journeyLost,phase:arrive?'arrived':'approaching',reason:journeyLost?'route-blocked':null}),cancel:()=>releases++,finish:()=>releases++};},...options});
 const tick=(seconds=1)=>{clock.seconds+=seconds;api.update(seconds);};
 const summon=()=>{let result=api.request();assert.equal(result.ok,true,JSON.stringify(result));tick(2);assert.equal(api.status()?.stage,'selected',JSON.stringify(api.history()));tick(3);assert.equal(api.status()?.stage,'summoned');tick(2);assert.equal(api.status()?.stage,'awaiting-response');return api.status();};
 return {api,roster,identities,contexts,busy,results,states,notices,fades,clock,tick,summon,arrive:()=>arrive=true,loseJourney:()=>journeyLost=true,fail:v=>saveFails=v,failStage:v=>failedStage=v,room:v=>placeAvailable=v,changePlace:()=>placeId='bedroom-2',starts:()=>starts,releases:()=>releases};
}

test('persistent flip, delayed summons, explicit per-occasion player response and ten actual seconds yield one shared result',()=>{
 const h=fixture(),event=h.summon();assert.equal(event.consent.player,false);assert.equal(h.starts(),0);assert.equal(isSociallyHeld('ruler'),false);
 assert.equal(h.api.respond('old-event','player',true).reason,'stale-invitation');assert.equal(h.api.respond(event.id,'player',undefined).reason,'explicit-response-required');assert.equal(h.starts(),0);
 assert.equal(h.api.respond(event.id,'player',true).ok,true);assert.equal(h.api.status().stage,'travelling');assert.equal(isSociallyHeld('ruler'),true);assert.equal(isSociallyHeld('player'),false);
 h.tick(20);assert.equal(h.results.length,0,'walking time is not together time');h.arrive();h.tick(1);assert.equal(h.api.status().stage,'together');assert.equal(h.api.status().elapsed,0);assert.equal(h.fades.at(-1)[0],true);h.tick(9.9);assert.equal(h.results.length,0);h.tick(.1);
 assert.equal(h.results.length,1);assert.equal(h.results[0].id,event.id);assert.equal(h.results[0].results.length,2);assert.ok(h.results[0].results.every(x=>x.action==='private-company'&&x.explicitConsent));assert.equal(h.api.status(),null);assert.equal(isSociallyHeld('ruler'),false);assert.equal(h.fades.at(-1)[0],false);
 const player=h.api.project('player',{}),ruler=h.api.project('ruler',{});assert.equal(player.interactions.ruler.completedCount,1);assert.equal(ruler.interactions.player.completedCount,1);assert.ok(player.relations.ruler>0);assert.equal(h.api.project('unrelated',{}).relations,undefined);
 const saved=h.api.snapshot();h.tick(1);assert.equal(h.api.respond(event.id,'player',true).reason,'stale-invitation');assert.equal(h.results.length,1);
 const restored=fixture({saved});restored.tick(1);assert.equal(restored.results.length,0);assert.equal(restored.api.project('player',{}).interactions.ruler.completedCount,1);
});

test('ordinary player cannot flip cards; membership and score do not manufacture consent or eligibility',()=>{
 const h=fixture();assert.equal(h.api.select('player','companion').reason,'current-emperor-required');assert.deepEqual(h.api.candidates('player'),[]);assert.deepEqual(h.api.candidates('ruler').sort(),['companion','player']);
 for(const id of ['young','unrelated'])assert.equal(h.api.select('ruler',id).ok,false);
 h.contexts['player|ruler']={boundary:true};assert.equal(h.api.request().reason,'relationship-unavailable');
 delete h.contexts['player|ruler'];h.identities.player.ageYears=17;assert.equal(h.api.request().ok,false);h.identities.player.ageYears=25;h.identities.player.revision=undefined;assert.equal(h.api.request().ok,false);
});

test('refusal, closing without reply and withdrawal cause no reward and restore routines',()=>{
 const no=fixture();let event=no.summon();assert.equal(no.api.respond(event.id,'player',false).ok,true);assert.equal(no.api.history().at(-1).stage,'declined');assert.equal(no.starts(),0);assert.equal(no.results.length,0);assert.equal(no.api.request().reason,'already-invited-tonight');no.busy.add('companion');no.tick(301);assert.equal(no.api.request().reason,'already-invited-tonight');assert.equal(no.api.project('player',{}).relations,undefined);
 const closed=fixture();closed.summon();closed.tick(60);assert.equal(closed.api.history().at(-1).reason,'response-expired');assert.equal(closed.results.length,0);
 const stop=fixture();event=stop.summon();stop.api.respond(event.id,'player',true);stop.arrive();stop.tick();assert.equal(stop.api.withdraw('unrelated').reason,'not-participant');assert.equal(stop.api.withdraw('player').ok,true);assert.equal(stop.results.length,0);assert.equal(isSociallyHeld('ruler'),false);assert.equal(stop.releases(),1);
});

test('live identities, death, adulthood, original room and new duties cancel every stage without replacement',()=>{
 const mutations=[h=>{h.identities.ruler.royalRole=null;h.identities.unrelated.royalRole='emperor';},h=>h.identities.player.revision++,h=>h.identities.player.alive=false,h=>h.identities.player.ageYears=17,h=>h.busy.add('ruler'),h=>h.room(false),h=>h.changePlace(),h=>{h.roster.splice(h.roster.findIndex(a=>a.actorId==='ruler'),1,actor('ruler'));},h=>{h.contexts['player|ruler']={boundary:true};}];
 for(const stage of ['selected','awaiting-response','travelling','together'])for(const mutate of mutations){
  const h=fixture();h.api.request();h.tick(2);if(stage!=='selected'){h.tick(3);h.tick(2);}if(['travelling','together'].includes(stage))h.api.respond(h.api.status().id,'player',true);if(stage==='together'){h.arrive();h.tick();}mutate(h);h.tick();assert.equal(h.api.status(),null,stage);assert.equal(h.results.length,0,stage);assert.equal(isSociallyHeld('ruler'),false,stage);
 }
});

test('all intermediate restores cancel safely; terminal history does not replay results',()=>{
 for(const stage of ['requested','selected','summoned','awaiting-response','travelling','together']){
  const h=fixture();h.api.request();if(stage!=='requested')h.tick(2);if(!['requested','selected'].includes(stage))h.tick(3);if(['awaiting-response','travelling','together'].includes(stage))h.tick(2);if(['travelling','together'].includes(stage))h.api.respond(h.api.status().id,'player',true);if(stage==='together'){h.arrive();h.tick();h.tick(8);}
  const saved=h.api.snapshot();assert.equal(saved.active.stage,stage);h.api.dispose();const restored=fixture({saved});assert.equal(restored.api.status(),null);assert.equal(restored.api.history().at(-1).reason,'restore-interrupted');restored.tick(10);assert.equal(restored.results.length,0);assert.equal(restored.api.project('player',{}).relations,undefined);
 }
});

test('failed acceptance or completion cannot award or retain actors; failed writes remain bounded and retryable',()=>{
 const accept=fixture(),e=accept.summon();accept.fail(true);assert.equal(accept.api.respond(e.id,'player',true).ok,false);assert.equal(accept.api.status(),null);assert.equal(accept.starts(),0);assert.equal(accept.results.length,0);assert.equal(accept.api.saveBlocked,true);accept.fail(false);accept.tick(5);assert.equal(accept.api.saveBlocked,false);
 const done=fixture(),event=done.summon();done.api.respond(event.id,'player',true);done.arrive();done.tick();done.failStage('completed');done.tick(10);assert.equal(done.results.length,0);assert.equal(done.api.status(),null);assert.equal(done.api.project('player',{}).relations,undefined);assert.equal(isSociallyHeld('ruler'),false);assert.equal(done.api.history().at(-1).reason,'save-failed');
 const saved=done.states.at(-1);assert.ok(saved.history.every(e=>e.stage!=='completed'));const restored=fixture({saved});restored.tick(10);assert.equal(restored.results.length,0);
 const reject=fixture({saveState:()=>Promise.resolve(true)});assert.equal(reject.api.request().reason,'save-failed');assert.equal(reject.api.status(),null);
});

test('fixed willingness is saved once, NPC recipient may refuse, unrelated social ownership never gets stolen',()=>{
 const h=fixture(),e=h.summon(),roll=e.decisions.ruler.roll;for(let i=0;i<5;i++)h.tick();assert.equal(h.api.status().decisions.ruler.roll,roll);
 const other={test:true};holdSocialActors(['ruler'],other);h.tick();assert.equal(h.api.status(),null);assert.equal(isSociallyHeld('ruler'),true);releaseSocialActors(other);
 const npc=fixture({worldSeed:11});assert.equal(npc.api.select('ruler','companion').ok,true);npc.tick(3);npc.tick(2);assert.equal(npc.api.history().at(-1)?.reason,'recipient-declined');assert.equal(npc.starts(),0);
});

test('NPC pair uses both live replies and same shared completion; dynamic eligible adult is a valid target',()=>{
 let h;for(let seed=1;seed<100;seed++){h=fixture({worldSeed:seed});const e=h.api.select('ruler','companion');if(e.event?.stage!=='selected')continue;h.tick(3);h.tick(2);if(h.api.status()?.stage==='travelling')break;}
 assert.equal(h.api.status()?.stage,'travelling');h.arrive();h.tick();h.tick(10);assert.equal(h.results.length,1);assert.equal(h.results[0].participants.includes('player'),false);assert.equal(h.api.project('ruler',{}).interactions.companion.completedCount,1);assert.equal(h.api.project('companion',{}).interactions.ruler.completedCount,1);
 const dynamic=fixture();dynamic.roster.push(actor('new-real-adult'));dynamic.identities['new-real-adult']={actorId:'new-real-adult',country:'china',revision:'new:1',royalRole:null,ageYears:31,alive:true};assert.ok(dynamic.api.candidates('ruler').includes('new-real-adult'));
});

test('one saved night opportunity remains bounded across roster growth and reload; daytime never auto-selects',()=>{
 const day=fixture();day.clock.hour=12;for(let i=0;i<20;i++)day.tick(120);assert.equal(day.api.history().length,0);assert.equal(day.api.status(),null);
 const run=size=>{const h=fixture();for(let i=0;i<size;i++){const id=`adult-${i}`;h.roster.push(actor(id));h.identities[id]={actorId:id,country:'china',revision:1,ageYears:25,royalRole:null,alive:true};}for(let i=0;i<20;i++){h.tick(120);if(h.api.status())h.api.cancel('test-end');}return h;};
 const small=run(0),large=run(50);assert.equal(small.api.snapshot().lastNight,'2');assert.equal(large.api.snapshot().lastNight,'2');assert.ok(small.api.snapshot().nextSerial<=2);assert.ok(large.api.snapshot().nextSerial<=2);assert.equal(small.api.snapshot().random,large.api.snapshot().random);
 const saved=large.api.snapshot(),restored=fixture({saved});for(let i=0;i<20;i++)restored.tick(120);assert.equal(restored.api.snapshot().nextSerial,saved.nextSerial);
});


test('night guard survives decline, cancellation and reload, permits the next night, and blocks daytime requests',()=>{
 const h=fixture({worldSeed:42});h.api.request();h.tick(2);assert.equal(h.api.history().at(-1).reason,'emperor-declined');const roll=h.api.history().at(-1).decisions.ruler.roll;h.busy.add('companion');h.tick(301);assert.equal(h.api.request().reason,'already-invited-tonight');assert.equal(h.api.history().at(-1).decisions.ruler.roll,roll);assert.equal(h.api.project('ruler',{}).relations,undefined);
 const restored=fixture({worldSeed:42,saved:h.api.snapshot()});assert.equal(restored.api.request().reason,'already-invited-tonight');restored.clock.day=3;restored.clock.hour=2;assert.equal(restored.api.request().reason,'already-invited-tonight','past midnight is still the same night');restored.clock.hour=12;assert.equal(restored.api.request().reason,'night-required');restored.clock.hour=20;assert.equal(restored.api.request().ok,true);
 const c=fixture();c.api.request();c.api.cancel();const state=c.api.snapshot(),loaded=fixture({saved:state});assert.equal(loaded.api.request().reason,'already-invited-tonight');delete state.nightAttempts;const legacy=fixture({saved:state});assert.equal(legacy.api.request().reason,'already-invited-tonight','legacy saved attempts migrate conservatively');
});


test('existing invitation reader reuses its owner without timeout, progress, consent or place bypass',()=>{
 const h=fixture(),e=h.summon(),before=h.api.snapshot();h.api.pauseForMenu(e.id);h.busy.add('ruler');h.tick(120);assert.equal(h.api.status().stage,'awaiting-response');assert.equal(h.api.snapshot().time,before.time);assert.equal(h.starts(),0);assert.equal(h.api.status().consent.player,false);
 h.api.releaseMenuPause(e.id);h.busy.clear();assert(h.api.respond(e.id,'player',true).ok);h.arrive();h.tick(1);const elapsed=h.api.status().elapsed;setPlayerConversationHold('ruler');h.tick(50);assert.equal(h.api.status().elapsed,elapsed);assert.equal(h.results.length,0);setPlayerConversationHold(null);h.tick(10);assert.equal(h.results.length,1);
 const blocked=fixture(),old=blocked.summon();blocked.api.pauseForMenu(old.id);blocked.room(false);blocked.tick(1);assert.equal(blocked.api.status(),null,'reading never preserves a revoked room right');assert(['room-occupied','relationship-unavailable'].includes(blocked.api.history().at(-1).reason));
 const dead=fixture(),invite=dead.summon();dead.api.pauseForMenu(invite.id);dead.identities.ruler.alive=false;dead.roster.find(a=>a.actorId==='ruler').alive=false;dead.tick(1);assert.equal(dead.api.status(),null,'death still revokes current identity during reading');
});
