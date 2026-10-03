// Regression for a single click at an NPC-occupied bath, using the exact main
// updatePlayer/updateNPCs/input functions, real scene, doors, collision, furniture
// clearance and NPC scheduler. Only DOM output is stubbed; no repeated click or
// direct retry of startFurniture is injected by this test.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
assert.equal(process.env.QA_RESOURCE_WINDOW,'granted-by-owner');
const root=path.resolve('source'),cache=new Map();
function mod(file){if(cache.has(file))return cache.get(file);let body=fs.readFileSync(file,'utf8');
 // Fixture entry only: initialize the already-tested bathing checkpoint without
 // replaying an unrelated whole visit. Every ensuing frame uses production code.
 if(file.endsWith('/japan-service-routine.js'))body=body.replace('  owns:n=>owned.has(n),',"  __testOccupiedBath(){guest.root.position.set(...bath.position);outfit('onsen-swimwear');enter('bathing');tickTask(guest.serviceTask,0);},\n  owns:n=>owned.has(n),");
 const m=new vm.SourceTextModule(body,{identifier:file});cache.set(file,m);return m;
}
const link=(s,m)=>mod(s==='three'?root+'/vendor/three/build/three.module.js':path.resolve(path.dirname(m.identifier),s.split('?')[0]));
async function load(name){const m=mod(root+'/game/'+name);if(m.status==='unlinked')await m.link(link);if(m.status==='linked')await m.evaluate();return m.namespace;}
(async()=>{
 const {buildJapan}=await load('japan-bathhouse.js'),T=mod(root+'/vendor/three/build/three.module.js').namespace,C=await load('characters.js'),A=await load('appearance.js'),N=await load('navigation.js'),F=await load('floor-support.js'),M=await load('movement-runtime.js'),R=await load('japan-service-routine.js');
 const lot=buildJapan(),furniture=(await load('furniture-interactions.js')).createFurnitureInteractions(lot,'japan'),doors=(await load('automatic-doors.js')).createAutomaticDoors(lot,'japan'),bath=furniture.items.find(i=>i.id==='japan-furniture-bath-1');
 const nodes=new Map(),events={},messages=[],state={THREE:T,...C,...A,...N,...F,...M,...R,lot,furniture,automaticDoors:doors,active:{id:'japan'},navOptions:{surfaces:lot.walkableSurfaces,legacyGround:false,bounds:lot.bounds,bodyHeight:1.95,maxStep:.4},multiLevel:true,npcs:[],player:null,japanService:null,seated:null,path:[],targetStation:null,pendingInteraction:null,performing:null,nearest:null,actionTime:0,walkTime:0,elapsed:0,mode:'lot',yaw:0,roofShown:false,joy:{x:0,y:0},keys:new Set(),joyPointer:null,joyLastPoint:null,joyActionAnchor:null,arrivalViewUntil:0,outfitDraft:null,saved:{appearance:A.createAppearanceState(1),outfit:0},outfitPreview:{state:()=>({open:false})},activityDialogues:{},save(){},clearFeetPulse(){},showDoorwayHint(){},finishInteraction(){throw Error('Unexpected ordinary activity');},toast:text=>messages.push(text),$:(id)=>{if(!nodes.has(id))nodes.set(id,{style:{},setAttribute(){},open:false});return nodes.get(id);},addEventListener:(name,fn)=>events[name]=fn,document:{hidden:false,addEventListener(){}},clock:{getDelta:()=>0}};
 state.planPath=(a,b,r=.34)=>doors.planPath(a,b,state.navOptions,r);
 const main=fs.readFileSync(root+'/game/main.js','utf8'),take=(a,b)=>{const from=main.indexOf(a),to=main.indexOf(b,from);assert(from>=0&&to>from,a);return main.slice(from,to);};
 const functions=[take('function moveActor(','function lotBounds('),take('function groundHeight(','function configureNPCs('),take('function configureJapanService(','function enterRegion('),take('function furniturePose(','function renderStations('),take('function goToStation(','function refreshOutfitChoices('),take('function updatePlayer(','let frame=0;'),main.split('\n').find(s=>s.startsWith("addEventListener('keydown'"))].join('\n');
 vm.createContext(state);vm.runInContext(functions,state,{filename:'actual-main-functions.js'});
 const report={scope:'One real occupied-bath click through actual input/updatePlayer/updateNPCs frames; no whole-loop replay or browser rendering',cases:[]};
 function reset(){state.japanService?.dispose();state.npcs.forEach(n=>{n.dispose();n.root.removeFromParent();});state.seated=null;state.pendingInteraction=null;state.targetStation=null;state.performing=null;state.path=[];state.keys.clear();state.joy={x:0,y:0};messages.length=0;
  state.npcs=lot.stations.filter(s=>R.JAPAN_SERVICE_ROLES.includes(s.id)).map((station,i)=>{const n={...C.createCharacter({...A.npcRoleAppearance('japan',station.id,1),culture:'japan',scale:.96}),station,characterScale:.96,phase:i*6.7,route:[],walking:false};n.root.position.set(...station.npcPosition);n.home=n.root.position.clone();lot.group.add(n.root);return n;});
  state.buildPlayer();state.player.root.position.set(...bath.position);state.configureJapanService();state.japanService.__testOccupiedBath();state.updateNPCs(0,state.elapsed);assert.equal(state.npcs.find(n=>n.station.id==='jp-balcony').serviceMount?.id,bath.id);
 }
 function frame(){state.elapsed+=1/30;doors.update(1/30,[{position:state.player.root.position,radius:.34,height:1.95},...state.npcs.map(n=>({position:n.root.position,radius:.25,height:1.95}))]);state.updatePlayer(1/30,state.elapsed);state.updateNPCs(1/30,state.elapsed);}
 try{for(const scenario of ['single-click','manual-cancel','e-cancel']){reset();state.requestFurniture(bath);assert.equal(state.pendingInteraction,bath);assert.equal(state.path.length,0);assert.equal(state.seated,null);
   if(scenario!=='single-click'){events.keydown({code:scenario==='manual-cancel'?'KeyW':'KeyE',repeat:false,preventDefault(){}});frame();state.keys.clear();assert.equal(state.pendingInteraction,null,'Cancel clears pending immediately');assert.equal(state.targetStation,null,'Cancel clears deferred destination');}
   let mountedAt=null;for(let i=0;i<240;i++){frame();if(state.seated){mountedAt=i+1;break;}}
   const guest=state.npcs.find(n=>n.station.id==='jp-balcony'),result={scenario,frames:mountedAt||240,mounted:state.seated?.id||null,pending:state.pendingInteraction?.id||null,pathLength:state.path.length,approachClear:furniture.canUse(state.navOptions,state.furnitureSafetyBoxes(),bath),guestPosition:guest.root.position.toArray(),messages:messages.slice()};report.cases.push(result);console.log(JSON.stringify(result));
   if(scenario==='single-click'){assert.equal(state.seated,bath,'One click must mount after the real NPC/clearance update, without test-injected retries');assert.equal(messages.filter(s=>s==='工作人员正在让出位置，马上就好').length,1,'Waiting is announced once');}
   else assert.equal(state.seated,null,'Cancelled waiting may not mount later');
  }report.status='PASS';
 }catch(e){report.status='FAIL';report.error=String(e);throw e;}finally{report.maxRSSMiB=process.resourceUsage().maxRSS/1024;if(process.env.REPORT_PATH)fs.writeFileSync(process.env.REPORT_PATH,JSON.stringify(report,null,2));state.japanService?.dispose();state.npcs.forEach(n=>n.dispose());state.disposePerson(state.player);doors.dispose();furniture.dispose();console.log(JSON.stringify({status:report.status,maxRSSMiB:report.maxRSSMiB}));}
})().catch(e=>{console.error(e);process.exitCode=1;});
