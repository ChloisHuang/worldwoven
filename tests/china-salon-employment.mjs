// Finite purse, atomic cross-ledger commits, voluntary choice and reload edges.
// Direct room arrival isolates these risks; production paths have one main test.
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {pathToFileURL} from 'node:url';
registerHooks({resolve(id,c,next){return id==='three'?{url:pathToFileURL(process.cwd()+'/source/vendor/three/build/three.module.js').href,shortCircuit:true}:next(id,c);}});
const T=await import('three');
const {createChinaSalonEmployment}=await import('../source/game/china-salon-employment.js');
const {createTavernServiceScene}=await import('../source/game/china-tavern-service-scene.js');
const {createSalonRoomLedger,SALON_ROOMS}=await import('../source/game/china-tavern-salon-rooms.js');
const {createFormalCareers}=await import('../source/game/formal-careers.js');
const {SALON_POET_ROLE:R,SALON_ARTIST_ROLES:ROLES}=await import('../source/game/china-salon-career-role.js');
const {careerInterviewRoll}=await import('../source/game/career-applications.js');
const {createGameCurrencyLedger}=await import('../source/game/currency-ledger.js');
const {createFacilityQueue}=await import('../source/game/npc-facilities.js');
const copy=x=>JSON.parse(JSON.stringify(x));
function fixture(prior={},options={}){
 const role=options.role||R,store=copy(prior),flags={},notices=[],clock=store.clock||{day:0,hour:10,seconds:0};let employment,mounted=null;
 const write=next=>{if(flags.save||flags.wage&&next.copperLedger?.transactions?.some(t=>t.action==='wage')||flags.employment&&next.chinaSalonEmployment?.revision!==store.chinaSalonEmployment?.revision)return false;Object.assign(store,copy(next));return true;};
 const bank=createGameCurrencyLedger({saved:store,storage:{setItem:(_k,s)=>write(JSON.parse(s))},getClock:()=>clock,transactionParticipant:tx=>employment?.prepareCurrencyCommit(tx)});
 const initial=createFormalCareers({getClock:()=>clock,saveState:()=>true}).state();delete initial.loadError;delete initial.lastError;initial.skills.art=options.art??role.skillRequirements.art;initial.skills.writing=role.skillRequirements.writing??1;initial.skills.ritual=role.skillRequirements.ritual??0;
 let seed=1;while(careerInterviewRoll(seed,role.id,clock.day)>=.6)seed++;
 const careers=createFormalCareers({worldSeed:seed,getClock:()=>clock,saved:store.formalCareers||initial,saveState:s=>write({...store,formalCareers:s})});
 const group=new T.Group();const actor=(id,name,position,age=29)=>{const root=new T.Group();root.position.set(...position);group.add(root);return {root,ageYears:age,station:{id,npcName:name,npcPosition:position,ageYears:age},home:root.position.clone(),route:[],phase:0,animate(){},locomotion:{walkSpeed:5}};};
 const npcs=[actor('cn-tavern-host','许安',[24.1,.215,11.4]),actor('cn-tavern-cook','沈禾',[23.3,.215,9.36]),actor('cn-tavern-assistant','陆青',[22,.215,14.1]),actor('cn-tavern-diner-west','顾谨',[20,.115,22.4]),actor('cn-tavern-diner-east','周棠',[22,.115,22.4]),actor('cn-tavern-reception','温晚',[24.15,7.815,5.45],41)];
 const p=actor('player','你',[24.15,7.815,7.65],options.age??24),items=[18.1,23.9].flatMap(x=>[-1,1].map(side=>({id:`china-tavern-dining-${x}-${side}`,position:[x+1,.215,18.1+side*1.32],anchor:[x,.215,18.1+side*1.32],center:[x,.215,18.1+side*1.32],seatY:.9,yaw:0})));
 const facilities=createFacilityQueue(),furniture={items,facilities,releaseActor:id=>facilities.releaseActor(id),standPoint:(_n,_e,s)=>new T.Vector3(...s.position)};
 const scene=createTavernServiceScene({npcs,lot:{group},furniture,doors:{routeStep:route=>({waypoint:route[0]})},planPath:(_a,b)=>[b],moveActor:(n,dx,dz)=>{n.root.position.x+=dx;n.root.position.z+=dz;},poseContext:()=>({}),getPlayer:()=>p,getMounted:()=>mounted,sharedNeeds:{hunger:()=>.1,status:()=>({seekMeal:!!flags.hungry,seekToilet:false}),has:()=>true},saveState:s=>write({...store,chinaServiceWorld:s}),propsFactory:()=>({clear(){},update(){},state:()=>({}),dispose(){}})});
 if(store.chinaServiceWorld)scene.restoreWorld(store.chinaServiceWorld);else{scene.initializeWorld();const w=scene.snapshot();w.revision++;for(const v of w.visitors){v.mode='idle';v.copper=options.copper??1000;}for(const o of w.orders)o.stage='done';assert(scene.saveLodgingWorld(w));}
 const ledger=createSalonRoomLedger({occupants:()=>[...npcs,p].map(n=>({id:n.station.id,position:n.root.position})),roomAvailable:()=>!flags.roomBlocked});
 const salon={receptionist:npcs.at(-1),ledger,active:()=>false,workRoomAvailable:()=>!flags.roomBlocked,resetWorkRoute:n=>{n.route=[];},workReachable:()=>!flags.unreachable,workTravel:(n,to)=>{n.root.position.set(...to);n.walking=true;return true;},workPose(){}};
 const build=()=>createChinaSalonEmployment({salon,scene,careers,copperLedger:bank,npcs,getPlayer:()=>p,getClock:()=>clock,getMounted:()=>mounted,getBusy:()=>!!flags.busy,getAppearanceScore:options.appearanceScore===undefined?undefined:()=>options.appearanceScore,saved:store.chinaSalonEmployment,notify:n=>notices.push(n),saveState:(s,participant)=>{if(!write({...store,...participant?.patch,chinaSalonEmployment:s}))return false;participant?.committed?.();return true;}});
 employment=build();scene.setSalonService(employment);
 if(store.positions)for(const n of [...npcs,p])if(store.positions[n.station.id])n.root.position.set(...store.positions[n.station.id]);
 const tick=(count=1)=>{for(let i=0;i<count;i++){clock.seconds+=.1;clock.hour+=.1*.7/60;careers.observeDay();employment.update(.1,clock.seconds);}};
 const act=(kind,expected=true)=>{const q=employment.intent(kind,role.id);assert(q,'intent '+kind);p.root.position.set(...q.position);p.walking=false;assert.equal(employment.executeIntent(q),expected,'execute '+kind);return q;};
 const hire=()=>{act('formal-apply');assert.equal(careers.applicationResult(role.id).status,'pending');assert.equal(careers.state().tenure,null);act('formal-review');assert(careers.isHired(role.id));assert.equal(employment.state().shift,null);};
 const invite=()=>{tick();const n=npcs[3],choices=employment.lifeChoices(n);assert.equal(choices.length,1);assert.equal(choices[0].targets.length,1);assert(employment.invite(n,{id:'salon-'+role.activity,...choices[0].targets[0].choice}));tick();assert.equal(employment.state().order.stage,'offered');return employment.state().order;};
 const complete=()=>{act('take-invitation');act('go-room');tick();assert.equal(employment.state().order.stage,'choose');act('poem-river');tick(81);assert.equal(employment.state().order.stage,'discussion');act('answer-river');assert.equal(employment.state().order.stage,'ready');};
 return {store,clock,flags,bank,careers,scene,salon,p,npcs,act,tick,hire,invite,complete,get e(){return employment;},reload(){store.clock=copy(clock);store.positions=Object.fromEntries([...npcs,p].map(n=>[n.station.id,n.root.position.toArray()]));employment.dispose();return fixture(store,options);},notices};
}
for(const age of [17,41]){const f=fixture({}, {age});assert(!f.careers.eligibility(R.id,{ageYears:age}).ok);f.act('formal-apply',false);assert.equal(f.careers.applicationResult(R.id).status,'rejected');const r=f.reload();assert.equal(r.careers.state().loadError,null);assert(!r.careers.isHired(R.id));}
const pending=fixture();pending.act('formal-apply');const pendingId=pending.careers.applicationResult(R.id).id,pr=pending.reload();assert.equal(pr.careers.applicationResult(R.id).id,pendingId);pr.act('formal-review');assert(pr.careers.isHired(R.id));assert.equal(pr.careers.slotHolder(R.id),'player');assert.equal(pr.careers.state().lastDuty,null);assert.equal(pr.e.state().shift,null);
console.log('PASS 18–40 local durable pending/interview and one long-term slot, no automatic shift');
const f=fixture();f.hire();f.act('accept');const o=f.invite();f.p.root.userData.appearance={shapeTraits:{jawWidth:.84,legLength:1.06,eyeSize:1.2,noseSize:.8,noseWidth:.8,socketDepth:1.65},skin:0xead6bc};const highQuote=f.e.state().quote;f.p.root.userData.appearance.skin=0x251812;assert.equal(f.e.state().quote,highQuote,'same shape with different skin has the same quote');assert.equal(f.e.state().order.fee,o.fee,'appearance change cannot reprice the accepted event ID');const worldBefore=f.scene.snapshot(),bankBefore=f.bank.state();f.flags.save=true;f.act('take-invitation',false);assert.deepEqual(f.scene.snapshot(),worldBefore);assert.deepEqual(f.bank.state(),bankBefore);assert.equal(f.salon.ledger.state().filter(r=>r.claim).length,0);f.flags.save=false;f.act('take-invitation');assert.equal(f.scene.snapshot().visitors[0].copper,955);assert.equal(f.e.state().order.id,o.id);assert.equal(f.scene.owns(f.npcs[3]),false);f.flags.hungry=true;f.scene.update(.1,1);assert.equal(f.scene.snapshot().visitors[0].mode,'salon','R89 low funds/needs code cannot reclaim salon lease');f.flags.hungry=false;
const r=f.reload();r.tick();assert.equal(r.e.state().order.id,o.id);assert.equal(r.scene.snapshot().visitors[0].copper,955);assert.equal(r.salon.ledger.claim(r.e.state().order.roomId).owner,o.id);r.flags.save=true;r.act('decline',false);assert.equal(r.scene.snapshot().visitors[0].copper,955);assert(r.e.state().order);r.flags.save=false;r.act('decline');assert.equal(r.scene.snapshot().visitors[0].copper,1000);assert.equal(r.e.state().order,null);assert.equal(r.bank.state().bank,0);assert(r.e.state().shift);assert.equal(r.e.cancel(),false);r.act('end-shift');assert(r.careers.isHired(R.id));assert.equal(r.careers.state().performance,0);
console.log('PASS failed/retried reserve/refund atomicity, same-ID reload, room/visitor lease and voluntary decline without penalties');
const done=fixture();done.hire();done.act('accept');const order=done.invite();done.complete();assert.equal(done.bank.state().bank,0);assert.equal(done.e.state().latestReview.positive,true);const early=done.e.snapshot(),oldWorld=done.scene.continuitySnapshot();done.flags.wage=true;done.act('settle',false);assert.equal(done.e.state().order.stage,'ready');assert.equal(done.scene.snapshot().visitors[0].salonPayment.status,'reserved');assert.equal(done.bank.state().bank,0);done.flags.wage=false;done.act('settle');assert.equal(done.bank.state().bank,45);assert.equal(done.scene.snapshot().visitors[0].copper,955);assert.equal(done.scene.snapshot().visitors[0].salonPayment.status,'settled');assert.equal(done.e.state().order,null);assert(done.e.state().shift);assert.equal(done.e.state().reviews.length,1);assert.equal(done.e.restore(early),false);assert.equal(done.scene.restoreContinuity(oldWorld),false);assert.equal(done.bank.creditWageToBank({amount:45,receiptId:order.id,currency:'copper',roleId:R.id,slotId:R.slotId,day:order.day}).ok,true);assert.equal(done.bank.state().bank,45);const loaded=done.reload();loaded.tick();assert.equal(loaded.bank.state().bank,45);assert.equal(loaded.e.state().reviews.length,1);loaded.act('end-shift');loaded.act('formal-resign');assert.equal(loaded.careers.slotHolder(R.id),'cn-tavern-reciter');
console.log('PASS actual poem/response completion, failed wage retry, atomic source-debit/bank-credit/review and no replay/stale rollback');
const empty=fixture({}, {copper:2});empty.hire();empty.act('accept');empty.tick();assert.deepEqual(empty.e.lifeChoices(empty.npcs[3]),[]);empty.act('end-shift');assert.equal(empty.bank.state().bank,0);assert(empty.careers.isHired(R.id));empty.clock.day++;empty.clock.hour=10;empty.careers.observeDay();assert.equal(empty.careers.state().performance,0);empty.act('accept');empty.p.ageYears=17;empty.tick();assert.equal(empty.e.state().shift,null);assert.deepEqual(empty.e.lifeChoices(empty.npcs[3]),[]);
const blocked=fixture();blocked.hire();blocked.act('accept');blocked.tick();blocked.flags.hungry=true;assert.deepEqual(blocked.e.lifeChoices(blocked.npcs[3]),[]);blocked.flags.hungry=false;blocked.npcs[3].ageYears=17;assert.deepEqual(blocked.e.lifeChoices(blocked.npcs[3]),[]);blocked.npcs[3].ageYears=29;blocked.flags.roomBlocked=true;assert.deepEqual(blocked.e.lifeChoices(blocked.npcs[3]),[]);blocked.flags.roomBlocked=false;blocked.flags.unreachable=true;assert.equal(blocked.e.invite(blocked.npcs[3],{id:'salon-poetry'}),false);assert.equal(blocked.scene.snapshot().visitors[0].copper,1000);
const priced=fixture({}, {art:8,appearanceScore:95});assert.equal(priced.e.state().quote,405);const noSkin=fixture({}, {art:8,appearanceScore:95});noSkin.p.root.userData.appearance={skin:0x100101,race:'fictional'};assert.equal(noSkin.e.state().quote,405);
console.log('PASS low budgets/hunger/minor/occupied/unreachable exclusion, zero-income free shifts, no automatic absence and bounded appearance/skill quote');

const roomRecovery=fixture();roomRecovery.hire();roomRecovery.act('accept');roomRecovery.invite();roomRecovery.complete();const rr=roomRecovery.reload();rr.flags.roomBlocked=true;rr.tick();assert.equal(rr.e.state().loadError,null);rr.act('settle');assert.equal(rr.bank.state().bank,45);assert.equal(rr.e.state().order,null);console.log('PASS completed unpaid service remains payable after room-conflict reload');

// Authored legacy saves, not a production top-up: preserve pre-upgrade fee6
// for both a created unpaid invitation and a pre-reserved original purse.
for(const prepaid of [false,true]){
 const old=fixture();old.hire();old.act('accept');old.invite();if(prepaid)old.act('take-invitation');const save=copy(old.store),o=save.chinaSalonEmployment.order;
 if(prepaid){const v=save.chinaServiceWorld.visitors[0];v.copper+=o.fee-6;v.salonPayment.amount=6;}
 o.fee=6;delete o.quoteVersion;delete o.roleId;delete save.chinaSalonEmployment.shift.roleId;save.positions=Object.fromEntries([...old.npcs,old.p].map(n=>[n.station.id,n.root.position.toArray()]));const restore=fixture(save);restore.tick();assert.equal(restore.e.state().loadError,null);assert.equal(restore.e.state().order.fee,6);assert.equal(restore.e.state().quote,45);
 if(prepaid){restore.act('decline');assert.equal(restore.scene.snapshot().visitors[0].copper,1000);assert.equal(restore.e.cancel(),false);}else{restore.complete();restore.act('settle');assert.equal(restore.bank.state().bank,6);assert.equal(restore.scene.snapshot().visitors[0].copper,994);}
}
console.log('PASS old unpaid and prepaid artist orders retain original fee and ID across quote upgrade');

const noBudget=fixture({}, {copper:30,appearanceScore:95});noBudget.hire();noBudget.act('accept');noBudget.tick();assert(noBudget.e.state().quote>30);assert.deepEqual(noBudget.e.lifeChoices(noBudget.npcs[3]),[]);assert.equal(noBudget.scene.snapshot().visitors[0].copper,30);noBudget.act('end-shift');assert(noBudget.careers.isHired(R.id));console.log('PASS high quote leaves real-budget guests in ordinary life and permits zero-income handover');

// A restored already-offered customer must walk to the current desk rather
// than stay forever at the old one, without reissuing or repricing the order.
const offered=fixture();offered.hire();offered.act('accept');offered.invite();const oldOffer=copy(offered.store);delete oldOffer.chinaSalonEmployment.layoutVersion;oldOffer.positions=Object.fromEntries([...offered.npcs,offered.p].map(n=>[n.station.id,n.root.position.toArray()]));oldOffer.positions['cn-tavern-diner-west']=[22.85,7.815,12.65];oldOffer.positions.player=[24.15,7.815,12.65];const invitation=copy(oldOffer.chinaSalonEmployment.order),offerReload=fixture(oldOffer),beforePosition=offerReload.npcs[3].root.position.toArray();assert.deepEqual(beforePosition,[22.85,7.815,12.65]);let resumedTarget=null;offerReload.salon.workTravel=(n,to)=>{resumedTarget=to;return false;};offerReload.tick();assert.deepEqual(resumedTarget,[22.85,7.815,7.65]);assert.deepEqual(offerReload.npcs[3].root.position.toArray(),beforePosition);assert.deepEqual(offerReload.e.state().order,invitation);assert.equal(offerReload.scene.snapshot().visitors[0].copper,1000);assert.deepEqual(offerReload.e.intent('take-invitation').position,[24.15,7.815,7.65]);
console.log('PASS offered customer resumes toward moved reception with exact same order, quote, stage and purse');

// Each current specialty crosses the real career application, room, original
// purse and atomic bank pipeline. These fixture purses are isolated test data.
for(const role of ROLES.filter(role=>role.id!==R.id)){
 const f=fixture({}, {role});f.hire();assert.equal(f.careers.slotHolder(role.id),'player');
 assert.equal(f.e.forRole(role.id).formal.role.id,role.id);assert.equal(f.e.forRole(R.id).formal.role.id,R.id);
 f.act('accept');assert(f.e.onShift(role.incumbentId));assert(!f.e.onShift(R.incumbentId));
 const order=f.invite(),original=f.scene.snapshot().visitors[0].copper;f.act('take-invitation');f.act('go-room');f.tick();
 assert.equal(f.e.intent('poem-river',role.id),null);assert.equal(f.e.intent('piece-'+order.request,R.id),null);
 f.act('piece-'+order.request);
 if(role.activity==='story'){assert.equal(f.e.intent('answer-cause'),null);f.tick(81);f.act('answer-cause');assert.equal(f.e.state().latestReview.proof.narratedSeconds,8);}
 if(role.activity==='music'){
  const pattern=f.e.state().piece.pattern;for(const beat of pattern){f.act('beat-'+beat);assert.equal(f.e.intent('beat-'+beat),null);f.tick(beat==='short'?11:21);}assert.deepEqual(f.e.state().latestReview.proof.beats,pattern);assert.equal(f.e.state().latestReview.proof.performedSeconds,6);
 }
 if(role.activity==='chess'){assert.equal(f.e.intent('move-4'),null);f.act('move-5');assert.equal(f.e.state().latestReview.proof.move.captured,1);assert.equal(f.e.state().latestReview.proof.move.board[4],'.');}
 assert.equal(f.e.state().order.stage,'ready');assert.equal(f.e.state().latestReview.positive,true);
 const denied=f.e.prepareCurrencyCommit({action:'wage',roleId:R.id,slotId:R.slotId,requestId:order.id,amount:order.fee,currency:'copper',day:order.day});assert.equal(denied.ok,false);
 const restored=f.reload();restored.tick();assert.equal(restored.e.state().loadError,null);assert.equal(restored.e.state().order.id,order.id);restored.act('settle');assert.equal(restored.bank.state().bank,order.fee);assert.equal(restored.scene.snapshot().visitors[0].copper,original-order.fee);assert.equal(restored.e.state().reviews[0].roleId,role.id);
 restored.act('end-shift');restored.act('formal-resign');assert.equal(restored.careers.slotHolder(role.id),role.incumbentId);
 console.log('PASS actual '+role.activity+' application, distinct timed/work proof, role-pinned finite payment, ready reload and incumbent handback');
}
for(const role of ROLES.filter(r=>r.id!==R.id)){
 const f=fixture({}, {role});f.hire();f.act('accept');f.invite();f.act('take-invitation');f.act('go-room');f.tick();f.act('piece-'+f.e.state().order.request);
 if(role.activity==='story'){f.tick(81);f.act('answer-wrong');}
 if(role.activity==='music'){for(let i=0;i<4;i++){f.act('beat-short');f.tick(11);}}
 if(role.activity==='chess'){f.act('move-0');}
 assert.equal(f.e.state().order.stage,'ready');assert.equal(f.e.state().latestReview.positive,false);assert.equal(f.e.state().latestReview.score,-1);
}
console.log('PASS wrong story cause, actual mismatched four-beat sequence and non-capturing legal chess move get distinct negative work reviews');
const musicRole=ROLES.find(r=>r.activity==='music'),music=fixture({}, {role:musicRole});music.hire();music.act('accept');music.invite();music.act('take-invitation');music.act('go-room');music.tick();music.act('piece-quiet');music.act('beat-short');music.tick(5);
const midBeat=music.reload();midBeat.tick(3);assert.equal(midBeat.e.state().order.stage,'beat');assert.deepEqual(midBeat.e.state().order.beats,[]);midBeat.tick(8);assert.equal(midBeat.e.state().order.stage,'rhythm');assert.deepEqual(midBeat.e.state().order.beats,['short']);midBeat.act('decline');assert.equal(midBeat.scene.snapshot().visitors[0].copper,1000);assert.equal(midBeat.bank.state().bank,0);
console.log('PASS partly played beat reload requires remaining live work, cannot double-count a note and cancels with full original-purse refund');
const {salonChessMove}=await import('../source/game/china-salon-career-services.js');assert.equal(salonChessMove('escape',0),null);assert.equal(salonChessMove('escape',2).correct,false);assert.equal(salonChessMove('escape',5).correct,true);assert.equal(salonChessMove('escape',5).liberties,2);
console.log('PASS actual Go adjacency, suicide rejection, escape liberties and capture are evaluated from each authored position');

// The same physical registration exposes all four bounded slots. Each role's
// own card carries its own actor, eligibility, and specialist live work controls.
const {appendSalonCareerPanel}=await import('../source/game/china-salon-career-panel.js');
const {studyOptions}=await import('../source/game/study-lessons.js');
const uiNode=(tag,text=null,className='')=>({tag,textContent:text||'',className,style:{},children:[],attributes:{},append(...items){this.children.push(...items);},setAttribute(k,v){this.attributes[k]=v;}});
const uiText=node=>[node.textContent,...node.children.map(uiText)].join(' ');
for(const role of ROLES){
 const f=fixture({}, {role}),local=f.e.forRole(role.id);assert.equal(local.intent('formal-view').roleId,role.id);assert.equal(local.intent('formal-view').targetKey,'cn-tavern-reception');
 for(const [skill,required]of Object.entries(role.skillRequirements)){assert(studyOptions('cn-rest','china').some(book=>book.skill===skill));const seed=f.careers.state();delete seed.loadError;delete seed.lastError;seed.skills[skill]=required-1;const below=createFormalCareers({saved:seed,getClock:()=>f.clock,saveState:()=>true});assert(below.eligibility(role.id,{ageYears:24}).reasons.includes(skill+'-required'));}
 f.hire();const panel={body:uiNode('div'),actions:uiNode('div')};appendSalonCareerPanel({panel,role,service:local,make:uiNode,action:(_role,kind)=>local.intent(kind)?uiNode('button',local.intent(kind).action):null});assert(uiText(panel.body).includes(role.incumbentName));assert(uiText(panel.body).includes(role.specialty));
 f.act('accept');f.invite();f.act('take-invitation');f.act('go-room');f.tick();f.act((role.activity==='poetry'?'poem-':'piece-')+f.e.state().order.request);
 const live={body:uiNode('div'),actions:uiNode('div')};appendSalonCareerPanel({panel:live,role,service:local,make:uiNode,action:(_role,kind)=>local.intent(kind)?uiNode('button',local.intent(kind).action):null});assert(uiText(live.body).includes(f.e.state().piece.name));
 if(role.activity==='music'){assert(uiText(live.body).includes('曲谱'));assert(uiText(live.actions).includes('短拍'));assert(uiText(live.actions).includes('长拍'));}
 if(role.activity==='chess'){assert(live.body.children.some(node=>node.className==='salon-career-board'&&node.children.length===9));assert(uiText(live.actions).includes('落黑子'))}
}
console.log('PASS all four local role routes, skill deficits with real local study supply, incumbent-specific cards and distinct music/chess live controls');

const learning=createFormalCareers({getClock:()=>({day:0,hour:10,seconds:0}),saveState:()=>true});
for(const [id,skill]of [['story-intro','writing'],['music-meter-intro','art'],['chess-liberties-intro','art']]){const issued=learning.learningTicket('cn-rest',id);assert(issued.ok);assert.equal(learning.completeLearning(issued.ticket,{seconds:7.9}).code,'learning-incomplete');assert.equal(learning.completeLearning(issued.ticket,{seconds:8}).skill,skill);assert.equal(learning.completeLearning(issued.ticket,{seconds:8}).code,'learning-replayed');}
console.log('PASS new specialist study uses real issued/read/completed/replay-safe skill tickets, not free skill awards');

// Browsing another specialty must not inherit the active poetry job, its good
// review, or the premium earned by that review. The live payable receipt stays
// on the active poetry role throughout read-only catalogue access.
const viewed=fixture({}, {appearanceScore:97});viewed.hire();viewed.act('accept');viewed.invite();viewed.complete();const beforeBrowse=copy(viewed.e.state().order);
const storyCard=viewed.e.forRole('cn-salon-storyteller').state();assert.equal(storyCard.specialty,'story');assert.equal(storyCard.latestReview,null);assert.equal(storyCard.order,null);assert.equal(storyCard.shift,null);assert.equal(storyCard.piece,null);assert.equal(storyCard.job,null);assert.deepEqual(viewed.e.state().order,beforeBrowse);
viewed.act('settle');const poetryCard=viewed.e.forRole(R.id).state(),freshStory=viewed.e.forRole('cn-salon-storyteller').state();assert(poetryCard.latestReview.positive);assert.equal(freshStory.latestReview,null);assert.deepEqual(freshStory.reviews,[]);assert.equal(freshStory.quote,beforeBrowse.fee);assert(poetryCard.quote>freshStory.quote);assert.equal(viewed.e.state().quote,poetryCard.quote);assert.equal(viewed.bank.state().bank,beforeBrowse.fee);
console.log('PASS specialty-scoped profile/quote/review browsing cannot leak the active poetry order or change its original payment');
