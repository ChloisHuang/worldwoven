// Actual original rigs/tools in a dormant assembled scene. Not production main.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const base=path.resolve('source'),cache=new Map();
function mod(f){f=f.split('?')[0];if(cache.has(f))return cache.get(f);let s=fs.readFileSync(f,'utf8');
 if(f===base+'/game/china-money-house.js'){const start=s.indexOf(' // Open ledger has a crease'),end=s.indexOf(' // Enclosed store:',start);if(start>=0){assert(end>start);s=s.slice(0,start)+' /* Original tools supplied once by dormant physical fixture. */\n'+s.slice(end);}else assert(s.includes('created once outside static packing'));}
 const m=new vm.SourceTextModule(s,{identifier:f});cache.set(f,m);return m;}
const link=(s,r)=>mod(s==='three'?base+'/vendor/three/build/three.module.js':path.resolve(path.dirname(r.identifier),s));
async function load(f){const m=mod(base+'/'+f);if(m.status==='unlinked')await m.link(link);if(m.status==='linked')await m.evaluate();return m.namespace;}
(async()=>{
 const G=await load('game/geometry.js'),T=G.THREE,{createTellerTools}=await load('game/china-teller-tools.js'),{TELLER_STANDS,TELLER_HOME}=await load('game/china-teller-audit-proof.js'),{createCharacter}=await load('game/characters.js');
 const scene=new T.Scene();let lot=null;
 if(process.env.TELLER_EXPORT==='1'){const {buildChina}=await load('game/regions-east.js');lot=buildChina();scene.add(lot.group);lot.roofGroup.visible=false;}
 else{G.box(scene,-22,1.235,-27.45,6.02,.12,1.04,0x9e7747);G.box(scene,-22,.715,-27.45,5.8,1,.92,0x63452d);}
 const tools=lot?.tellerTools||createTellerTools(G,{group:scene});assert.equal(tools.root.children.filter(n=>n===tools.ledger).length,1);assert.equal(tools.rods.length,11);assert(tools.rods.every(r=>r.length===7));
 const variants=[],baseRow={currency:'copper',accountOpened:true,cash:39,bank:145,held:6,total:190,reservationIds:['paid-original']};
 for(const variant of[0,1]){
  const actor=createCharacter({culture:'china',variant,scale:.96,...(variant===0?{bodyPreset:'masculine-lean',hairStyle:'low-bun',wardrobePreset:'scholar-long-robe',clothes:0x605e4b,accent:0xb89a61}:{bodyPreset:'feminine-balanced',hairStyle:'low-bun',wardrobePreset:'scholar-long-robe'})});scene.add(actor.root);actor.animate(0,false,null);actor.root.updateWorldMatrix(true,true);const lengths=()=>[0,1].flatMap(i=>{const body=actor.root.userData.body,u=body.worldToLocal(actor.root.userData.arms[i].getWorldPosition(new T.Vector3())),f=body.worldToLocal(actor.root.userData.forearms[i].getWorldPosition(new T.Vector3())),h=body.worldToLocal(actor.root.userData.hands[i].getWorldPosition(new T.Vector3()));return [u.distanceTo(f),f.distanceTo(h)];}),originalLengths=lengths();let maxGap=0;
  for(const stage of['check','calculate','record'])for(let i=0;i<=40;i++){
   const seconds=i/20,target=stage==='calculate'?'abacus':'ledger',row=baseRow;
   actor.root.position.fromArray(TELLER_STANDS[target]);actor.walking=false;const work={target,stage,currency:'copper',row,seconds};tools.pose(actor,10+seconds,work);scene.updateMatrixWorld(true);
   const state=tools.state(),hands=actor.root.userData.hands.map(h=>h.getWorldPosition(new T.Vector3()));const gaps=hands.map((p,i)=>p.distanceTo(new T.Vector3(...state.handTargets[i])));maxGap=Math.max(maxGap,...gaps);
   assert(tools.contact(actor,target,work),JSON.stringify({variant,stage,seconds,gaps,hands:hands.map(p=>p.toArray()),targets:state.handTargets}));
   assert(actor.root.position.z+.25<-27.91,'full body stays behind original counter');lengths().forEach((v,i)=>assert(Math.abs(v-originalLengths[i])<1e-7,JSON.stringify({variant,stage,seconds,segment:i,actual:v,original:originalLengths[i]})));
   if(process.env.TELLER_EXPORT==='1'&&variant===0&&seconds===(stage==='calculate'?1.5:1)){const focus=new T.Vector3(target==='abacus'?-20.8:-21.3,1.40,-27.75),camera=focus.clone().add(new T.Vector3(-2.8,1.1,-3.45).normalize().multiplyScalar(4.6));require('../development/teller-audit/export.cjs')(scene,T,`qa/china-teller/${stage}`,focus,camera);}
  }
  const big=Number.MAX_SAFE_INTEGER,row={...baseRow,cash:big,bank:0,held:0,total:big};let windows=[];actor.root.position.fromArray(TELLER_STANDS.abacus);
  for(const seconds of[1,2]){const work={target:'abacus',stage:'calculate',currency:'copper',row,seconds};tools.pose(actor,19+seconds,work);assert(tools.contact(actor,'abacus',work));windows.push(tools.rods.map(r=>(Math.abs(r[1].position.z+.118)<1e-7?5:0)+r.slice(2,6).filter((b,k)=>Math.abs(b.position.z-(-.033+k*.043))<1e-7).length).join(''));}
  assert.equal(BigInt(windows[0])*100000000000n+BigInt(windows[1]),BigInt(big),'actual eleven-rod windows must not truncate large totals');
  const work={target:'ledger',stage:'record',currency:'copper',row:baseRow,seconds:1};actor.root.position.fromArray(TELLER_STANDS.ledger);tools.pose(actor,20,work);assert(tools.contact(actor,'ledger',work));
  for(const container of[tools.ledger,tools.pen]){const children=[...container.children];container.clear();assert(!tools.contact(actor,'ledger',work),'empty tool group cannot certify work');container.add(...children);}
  const bead=tools.rods[0][0];bead.position.x+=.3;assert(!tools.contact(actor,'ledger',work));bead.position.x-=.3;
  tools.root.visible=false;assert(!tools.contact(actor,'ledger',work));tools.root.visible=true;tools.root.position.x=.1;assert(!tools.contact(actor,'ledger',work));tools.root.position.x=0;
  const rod=tools.abacus.children.find(n=>n.isMesh&&!tools.rods.flat().includes(n));rod.removeFromParent();assert(!tools.contact(actor,'ledger',work));tools.abacus.add(rod);
  const mesh=tools.ledger.children.find(n=>n.isMesh),positions=mesh.geometry.attributes.position.array,old=positions[0];positions[0]+=1;assert(!tools.contact(actor,'ledger',work));positions[0]=old;
  tools.pose(actor,20.1,work);assert(tools.contact(actor,'ledger',work));
  variants.push({variant,bodyPreset:actor.root.userData.appearance.bodyPreset,maxPalmTargetGap:maxGap});actor.dispose();actor.root.removeFromParent();
 }
 // Same real rigs and tools through the actual dormant controller, for three
 // complete calendar days. This is a counter-aisle supply/budget MODEL: no
 // production collision planner, NPC crowd, meal delivery or toilet is run.
 const {createTellerInspection}=await load('game/china-teller-inspection.js'),{createTellerAccount}=await load('game/china-teller-account.js'),{createCurrencyLedger}=await load('game/currency-ledger.js'),{createSimulationClock,GAME_MINUTES_PER_SECOND}=await load('game/simulation-clock.js');
 const supplies=[];
 for(const activity of['zero-transactions','actual-journal-fixture']){
  const actor=createCharacter({culture:'china',scale:.96,bodyPreset:'masculine-lean',hairStyle:'low-bun',wardrobePreset:'scholar-long-robe'});actor.station={id:'cn-money-house-teller'};actor.alive=true;actor.root.position.fromArray(TELLER_HOME);scene.add(actor.root);
  const clock=createSimulationClock({version:1,seconds:(1440-600)/GAME_MINUTES_PER_SECOND}),source=createCurrencyLedger({saveState:()=>true});
  if(activity==='actual-journal-fixture'){assert(source.creditWageToBank({amount:200,receiptId:'test-completed-work',roleId:'fixture-role',slotId:'fixture-slot',day:1}).ok);assert(source.withdraw(60,'fixture-withdraw').ok);assert(source.reserve(6,'fixture-hold').ok);}
  const sourceBefore=source.state();let savedWorld,savedAccount,poses=0,workSeconds=0,lastPoseTime=-1,restored=false;
  const economy=createTellerAccount({saveState:(s,r,patch)=>{savedAccount=s;savedWorld=patch.chinaTellerInspection;return true;}}),binding={status:'npc',holderId:actor.station.id,actor,revision:0,alive:true,available:true};
  const options={getDay:()=>clock.state().day,getActor:()=>actor,resolveAssignment:()=>binding,getLedger:()=>source,canControl:()=>!(clock.state().hour>=12&&clock.state().hour<15),isCounterOpen:()=>clock.state().hour<.35,economy,saveState:s=>{savedWorld=s;return true;},
   travel(n,p,dt){const dx=p[0]-n.root.position.x,dz=p[2]-n.root.position.z,d=Math.hypot(dx,dz),r=Math.min(1,dt*.6/(d||1));n.root.position.x+=dx*r;n.root.position.z+=dz*r;n.walking=d>.001;},
   pose(n,t,w){poses++;if(w){n.walking=false;if(t!==lastPoseTime)workSeconds+=.25;lastPoseTime=t;}tools.pose(n,t,w);},contact:(n,target,w)=>tools.contact(n,target,w)};
  let controller=createTellerInspection(options),paidDays=new Set(),budgets=[];const start=clock.state().seconds;
  while(clock.state().day<4){const c=clock.advance(.25);if(c.day===4)break;controller.update(.25,c.seconds);
   const state=controller.snapshot();if(!restored&&state.order?.stage==='calculate'&&state.order.calculationIndex===1&&state.order.seconds>=.75){controller.dispose();controller=createTellerInspection({...options,saved:state});restored=true;}
   if(c.hour>=18&&!paidDays.has(c.day)){const payment=economy.prepareMealPayment({actorId:actor.station.id,orderId:`cn-tavern-order-${c.day}`,amount:6});assert(payment.ok&&payment.commit().ok,'natural work must afford modeled daily cost');paidDays.add(c.day);budgets.push({day:c.day,income:economy.snapshot().receipts.filter(r=>r.evidence.day===c.day).reduce((s,r)=>s+r.amount,0),modeledMealCost:6,bank:economy.account(actor.station.id).bank});}
   assert(actor.root.position.z+.25<-27.91,'no counter penetration');
  }
  assert.equal(economy.snapshot().receipts.length,3);assert.equal(economy.account(actor.station.id).bank,6);assert.equal(paidDays.size,3);assert(restored);assert.equal(controller.snapshot().order,null);assert.deepEqual(source.state(),sourceBefore);
  supplies.push({activity,completeGameDays:3,loadedSeconds:clock.state().seconds-start,budgets,realToolPoseCalls:poses,workSeconds,midCalculationRestore:restored,mainNavigation:false,actualDining:false});controller.dispose();actor.dispose();actor.root.removeFromParent();
 }
 console.log(JSON.stringify({status:'PASS',scope:'Actual rigs and original-size ledger/abacus/brush, existing handoff-only IK, no main/needs/navigation',variants,supplies,exported:!!lot},null,2));tools.dispose();
})().catch(e=>{console.error(e);process.exit(1);});
