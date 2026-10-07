// Small real-rig/tool contact fixture. No assembled country or production main.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const base=path.resolve('source'),cache=new Map();
function mod(f){if(cache.has(f))return cache.get(f);const m=new vm.SourceTextModule(fs.readFileSync(f,'utf8'),{identifier:f,initializeImportMeta:meta=>meta.url=require('node:url').pathToFileURL(f).href});cache.set(f,m);return m;}
const link=(s,r)=>mod(s==='three'?base+'/vendor/three/build/three.module.js':path.resolve(path.dirname(r.identifier),s));
async function load(f){const m=mod(base+'/'+f);if(m.status==='unlinked')await m.link(link);if(m.status==='linked')await m.evaluate();return m.namespace;}
(async()=>{
const G=await load('game/geometry.js'),T=G.THREE,{createCharacter}=await load('game/characters.js'),{createTellerTools}=await load('game/china-teller-tools.js'),{createCurrencyLedger}=await load('game/currency-ledger.js'),{createRegionalTellerEmployment}=await load('game/regional-teller-employment.js'),{REGIONAL_TELLER_ROLES}=await load('game/regional-teller-audit-proof.js');
for(const country of ['china','japan','france','egypt'])for(const variant of[0,1]){
 const scene=new T.Scene(),r=REGIONAL_TELLER_ROLES[country],home={china:[-21,.215,-28.25],japan:[9,0,8.35],france:[23.35,.23,2.23],egypt:[3.9,0,9.72]}[country],reg={china:[-21,.215,-26.35],japan:[9,0,6.2],france:[23.35,.23,.12],egypt:[3.9,0,7.65]}[country],rest=country==='china'?[home[0]-1.8,home[1],home[2]-.3]:[reg[0]+1.7,reg[1],reg[2]-.7];
 const player=createCharacter({culture:country,scale:.96,variant,bodyPreset:variant?'feminine-balanced':'masculine-lean'});player.alive=true;player.ageYears=24;player.root.position.fromArray(home);scene.add(player.root);
 const npc={alive:true,station:{id:r.incumbentId,npcName:r.incumbentName},root:new T.Group(),route:[],animate(){},phase:0};npc.root.position.fromArray(rest);scene.add(npc.root);
 const lot=country==='china'?{tellerTools:createTellerTools(G,{group:scene})}:{},bank=createCurrencyLedger({saveState:()=>true});
 const app=createRegionalTellerEmployment({country,npcs:[npc],lot,careers:{isHired:()=>true,workState:()=>({revision:0}),applicationResult:()=>null},ledger:bank,getPlayer:()=>player,getClock:()=>({day:1,hour:10,seconds:100}),getChinaAssignment:()=>({holderId:r.incumbentId}),saveState:()=>true,saveInspection:()=>true,saved:{version:1,revision:1,shift:{roleId:r.id,country,day:1,stage:'working',standInId:r.incumbentId,assignmentRevision:1},receipts:[],reviewQueue:null,lastEvent:null},planPath:()=>[],moveActor:()=>{},canSee:()=>true});
 player.root.position.fromArray(app.intent('begin-original').position);assert(app.inspection.start({country}).ok);
 for(let index=0;index<9;index++){
  const d=app.inspection.actionDescriptor();player.root.position.fromArray(d.position);assert(app.inspection.beginAction(d.stage).ok);
  for(let i=0;i<9&&app.inspection.actionDescriptor().key===d.key;i++)app.update(.25,i*.25);
  const actual=player.root.userData.hands.map(h=>h.getWorldPosition(new T.Vector3()).toArray());
  assert.notEqual(app.inspection.actionDescriptor().key,d.key,JSON.stringify({country,variant,d,actual,pose:app.playerPose(),tools:lot.tellerTools?.state(),error:app.inspection.lastError}));
 }
 console.log('PASS real physical',country,variant,'nine finite source gestures');app.dispose();lot.tellerTools?.dispose();player.dispose();
}
})().catch(e=>{console.error(e);process.exit(1)});
