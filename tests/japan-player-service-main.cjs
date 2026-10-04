// Player bathhouse chain through production E/touch, UI buttons and actual
// employee jobs. Only DOM output is simulated; routes and orders are real.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
assert.equal(process.env.QA_RESOURCE_WINDOW,'granted-by-owner');
const root=path.resolve('source'),cache=new Map();
function mod(file){if(cache.has(file))return cache.get(file);const m=new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{identifier:file});cache.set(file,m);return m;}
const link=(s,m)=>mod(s==='three'?root+'/vendor/three/build/three.module.js':path.resolve(path.dirname(m.identifier),s.split('?')[0]));
async function load(name){const m=mod(root+'/game/'+name);if(m.status==='unlinked')await m.link(link);if(m.status==='linked')await m.evaluate();return m.namespace;}
(async()=>{
 const {buildJapan}=await load('japan-bathhouse.js'),T=mod(root+'/vendor/three/build/three.module.js').namespace,C=await load('characters.js'),A=await load('appearance.js'),N=await load('navigation.js'),F=await load('floor-support.js'),M=await load('movement-runtime.js'),R=await load('japan-bathhouse-operations.js'),V=await load('japan-visitors.js'),Orders=await load('japan-service-orders.js'),Traits=await load('character-traits.js'),S=await load('npc-social.js'),UI=await load('japan-player-service-ui.js'),Camera=await load('camera.js');
 const staffIds=new Set(Object.values(Orders.JAPAN_SERVICE_WORKERS).flat()),frontDesk=process.env.LIFE_CHOICES==='1'?require('./japan-life-choices-main.cjs'):process.env.LOCAL_LIFE==='1'?require('./japan-courtyard-hall-life-main.cjs'):process.env.BATH_LIFE==='1'?require('./japan-bath-linen-life-main.cjs'):process.env.APOTHECARY_LIFE==='1'?require('./japan-apothecary-life-main.cjs'):process.env.FRONT_DESK_LIFE==='1'?require('./japan-frontdesk-life-main.cjs'):null;
 function element(tag='div'){return {tagName:tag,style:{},children:[],open:false,attributes:{},handlers:{},setAttribute(k,v){this.attributes[k]=v;},append(...children){for(const child of children){child.parent=this;this.children.push(child);}},replaceChildren(...children){this.children=[];this.append(...children);},querySelector(tag){return this.children.find(child=>child.tagName===tag)||null;},addEventListener(k,f){this.handlers[k]=f;},showModal(){this.open=true;},close(){this.open=false;},remove(){if(this.parent)this.parent.children=this.parent.children.filter(child=>child!==this);}};}
 const dom={head:element('head'),body:element('body'),hidden:false,addEventListener(){},createElement:element,createTextNode:textContent=>({textContent})};
 const lot=buildJapan(),furniture=(await load('furniture-interactions.js')).createFurnitureInteractions(lot,'japan'),doors=(await load('automatic-doors.js')).createAutomaticDoors(lot,'japan');
 const nodes=new Map(),events={},messages=[],state={THREE:T,...C,...A,...N,...F,...M,...R,...V,...Traits,...S,...Camera,createJapanPlayerServiceUI:o=>UI.createJapanPlayerServiceUI({...o,document:dom}),lot,furniture,automaticDoors:doors,active:{id:'japan'},navOptions:{surfaces:lot.walkableSurfaces,legacyGround:false,bounds:lot.bounds,bodyHeight:1.95,maxStep:.4},multiLevel:true,npcs:[],player:null,japanService:null,japanPlayerService:null,japanServiceUI:null,chinaArchery:null,npcSocial:null,seated:null,path:[],targetStation:null,pendingInteraction:null,performing:null,nearest:null,actionTime:0,walkTime:0,elapsed:0,mode:'lot',yaw:0,pitch:.22,distance:4.6,innerWidth:960,innerHeight:720,camera:new T.PerspectiveCamera(50,4/3,.08,180),camTarget:new T.Vector3(),followTarget:new T.Vector3(),desiredCamera:new T.Vector3(),cameraSolids:Camera.buildCameraSolids(lot),staticCameraSolids:Camera.buildCameraSolids(lot),roofShown:false,dusk:!!frontDesk,joy:{x:0,y:0},keys:new Set(),joyPointer:null,joyLastPoint:null,joyActionAnchor:null,arrivalViewUntil:0,outfitDraft:null,saved:{appearance:A.createAppearanceState(1),outfit:0,stamps:{}},outfitPreview:{state:()=>({open:false})},activityDialogues:{},furnitureLabels:[],npcLabels:[],scene:{remove(){}},lighting:{detach(){}},closeOutfitPreview(){},save(){},clearFeetPulse(){},showDoorwayHint(){},setDaybook(){},leaveLot(){throw Error('Conversation escaped to world');},finishInteraction(){throw Error('Conversation must not award a stamp');},toast:text=>messages.push(text),$:(id)=>{if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);},addEventListener:(name,fn)=>events[name]=fn,document:dom,feetPulse:null,feetPulseTimer:null,setTimeout:()=>0,clearTimeout(){},canvas:{focus(){}},matchMedia:()=>({matches:false}),clock:{getDelta:()=>0}};
 state.planPath=(a,b,r=.34)=>doors.planPath(a,b,state.navOptions,r);
 const main=fs.readFileSync(root+'/game/main.js','utf8'),take=(a,b)=>{const from=main.indexOf(a),to=main.indexOf(b,from);assert(from>=0&&to>from,a);return main.slice(from,to);};
 const functions=[take('function moveActor(','function lotBounds('),take('function groundHeight(','function configureNPCs('),take('function configureNPCs(','function configureChinaArchery('),take('function configureJapanService(','function enterRegion('),take('function disposeLot(','function leaveLot('),take('function furniturePose(','function renderStations('),take('function goToStation(','function refreshOutfitChoices('),take('function clearFeetPulse(','const projectPoint='),take('function updatePlayer(','let frame=0;'),main.split('\n').find(s=>s.startsWith("addEventListener('keydown'")),take("$('interact-button').onclick=", "$('daybook-activities').onclick=")].join('\n');
 vm.createContext(state);vm.runInContext(functions,state,{filename:'actual-main-social-functions.js'});
 const checkpoint=process.env.CHECKPOINT?JSON.parse(fs.readFileSync(process.env.CHECKPOINT,'utf8')):null;
 if(checkpoint)state.saved=checkpoint.saved;else state.saved.appearance.player.bodyPreset='masculine-lean';const originalAppearance=JSON.stringify(state.saved.appearance);
 if(frontDesk)frontDesk.seed({state,Orders,V,furniture});
 state.buildPlayer();state.configureNPCs();state.configureJapanService();state.configureNpcSocial();
 const report={status:'RUNNING',scope:'Actual main E/touch, service card handlers, player navigation and employee jobs; DOM stub only',stages:[]};let last='';
 const find=(root,test)=>test(root)?root:root.children?.map(x=>find(x,test)).find(Boolean);
 const dialog=()=>find(dom.body,e=>e.tagName==='dialog');
 const primary=()=>find(dialog(),e=>e.className==='jp-service-primary');
 const key=code=>events.keydown({code,repeat:false,preventDefault(){}});
 function frame(count=1){for(let i=0;i<count;i++){
  state.elapsed+=1/30;doors.update(1/30,[{position:state.player.root.position,radius:.34,height:1.95},...state.npcs.map(n=>({position:n.root.position,radius:.25,height:1.95}))]);state.cameraSolids=state.staticCameraSolids.concat(doors.cameraColliders);state.updatePlayer(1/30,state.elapsed);state.updateNPCs(1/30,state.elapsed);state.japanServiceUI.update();
  const s=state.japanPlayerService.state(),stage=s.visit?.stage||'none';if(stage!==last){last=stage;const row={time:+state.elapsed.toFixed(2),stage,position:state.player.root.position.toArray(),clothing:state.player.root.userData.appearance.wardrobePreset};report.stages.push(row);console.log(JSON.stringify(row));if(s.visit)fs.writeFileSync('/tmp/worldwoven-japan-player-checkpoint-'+stage+'.json',JSON.stringify({saved:state.saved,playerPosition:state.player.root.position.toArray(),stage}));}
  frontDesk?.observe?.(state);
  const failures=state.japanService.state().failures;assert.equal(failures.length,0,'Actual route failure: '+JSON.stringify(failures));
 }}
 function until(test,max=6000){for(let i=0;i<max;i++){frame();if(test())return;}throw Error('Player chain stalled: '+JSON.stringify({player:state.player.root.position.toArray(),service:state.japanPlayerService.state(),actors:state.japanService.state().actors,messages:messages.slice(-5),path:state.path.slice(-3)}));}
 function card(){state.japanServiceUI.open();assert(dialog().open);return primary();}
 function travel(){const b=card();assert(!b.disabled);b.onclick();until(()=>!state.path.length&&!state.pendingInteraction,6000);frame();}
 const stage=()=>state.japanPlayerService.state().visit?.stage;
 let playerVisitId;
 try {
  if(frontDesk){await frontDesk.run({state,T,Orders,furniture,doors,frame,until,card,key,report});return;}
  if(!checkpoint){
  frame();card();find(dialog(),e=>e.textContent==='灯花浴包').onclick();primary().onclick();until(()=>!state.path.length,2400);frame();assert(state.nearest?.playerService);key('KeyE');assert(dialog().open);primary().onclick();
  until(()=>!!state.japanPlayerService.state().visit?.tokenId,1800);playerVisitId=state.japanPlayerService.state().visit.id;assert.equal(state.japanPlayerService.state().visit.blendId,'lantern-petal');
  travel();key('KeyE');until(()=>stage()==='washing',300);assert.equal(state.player.root.userData.appearance.wardrobePreset,'onsen-swimwear','Changing visibly applies the temporary bathing outfit');
  travel();state.$('touch-action').onclick();until(()=>stage()==='waiting-bath',300);
  travel();until(()=>state.japanService.state().items.some(i=>i.visitId===playerVisitId&&i.kind==='mixture'&&i.location.id==='menService'),9000);key('KeyE');assert(state.japanPlayerService.state().visit.blendReceived);
  card().onclick();until(()=>!!state.seated,1800);until(()=>stage()==='bathing',60);assert(state.seated.poolId==='japan-furniture-bath-1');frame(90);key('KeyE');frame();assert.equal(stage(),'waiting-bath','Early exit preserves an unfinished bath');assert.equal(state.player.root.userData.appearance.wardrobePreset,'onsen-swimwear','Service outfit remains until drying');
  card().onclick();until(()=>!!state.seated,1800);until(()=>state.japanPlayerService.state().soakReady,400);key('KeyE');until(()=>!state.seated&&stage()==='drying',60);assert.equal(state.player.root.userData.appearance.wardrobePreset,'onsen-swimwear');
  travel();key('KeyE');until(()=>stage()==='resting',300);assert.notEqual(state.player.root.userData.appearance.wardrobePreset,'onsen-swimwear','Drying restores the saved wardrobe');
  card().onclick();until(()=>!!state.seated,1800);frame();state.$('touch-action').onclick();assert.equal(stage(),'waiting-meal');
  until(()=>stage()==='meal-ready',6500);frame();key('KeyE');assert.equal(stage(),'eating');until(()=>stage()==='checkout',300);assert(state.seated,'Eating does not teleport the seated player');
  }else{
   assert.equal(checkpoint.stage,'checkout','Continue only the saved, already-eaten checkout checkpoint');playerVisitId=state.japanPlayerService.state().visit.id;
   const seat=furniture.items.find(i=>i.id===state.japanPlayerService.state().visit.restSeatId);state.player.root.position.set(...seat.position);state.requestFurniture(seat);until(()=>!!state.seated,90);
  }
  // The order transition happens in updateNPCs, after that frame's nearest/E
  // label was drawn. Read the next rendered input state before pressing E.
  frame(2);key('KeyE');frame();assert(!state.seated);
  travel();key('KeyE');until(()=>!state.japanPlayerService.state().visit,1800);frame(2);
  const completed=state.japanService.state(),history=completed.history.filter(e=>e.visit===playerVisitId);for(const kind of (checkpoint?['checkout']:['register','prepare','deliverMix','cook','serve','checkout']))assert(history.some(e=>e.event===kind),kind+' was completed by the shared employee routine');assert(!completed.items.some(i=>i.visitId===playerVisitId));
  assert.equal(JSON.stringify(state.saved.appearance),originalAppearance,'Temporary service outfit never mutates saved appearance');
  // Leave with a new actual order pending; disposal preserves that same ID and
  // clears live employee claims instead of creating a second avatar on reload.
  card().onclick();until(()=>stage()==='check-in',1800);state.keys.add('KeyD');frame(7);state.keys.clear();card();assert.equal(primary().textContent,'前往服务位置');primary().onclick();assert(state.path.length,'A waiting player who stepped away is really guided back');until(()=>!!state.japanPlayerService.state().visit?.tokenId,1800);const pendingId=state.japanPlayerService.state().visit.id;state.disposeLot();
  const resumed=Orders.createJapanServiceOrders({saved:state.saved.japanOperations,worldSeed:1});assert.equal(resumed.state().visits.filter(v=>v.customerType==='player').length,1);assert.equal(resumed.state().visits.find(v=>v.customerType==='player').id,pendingId);assert(!resumed.jobs().some(j=>j.visitId===pendingId));assert.equal(resumed.state().claims.length,0);resumed.dispose();
  report.status='PASS';report.simulatedSeconds=state.elapsed;report.maxRSSMiB=process.resourceUsage().maxRSS/1024;assert(report.maxRSSMiB<1228.8);
 }catch(e){report.status='FAIL';report.error=String(e);console.log(JSON.stringify({service:state.japanPlayerService?.state(),actors:state.japanService?.state().actors,messages:messages.slice(-8)}));throw e;}
 finally {if(state.lot)state.disposeLot();console.log(JSON.stringify(report));}
})().catch(e=>{console.error(e);process.exitCode=1;});
