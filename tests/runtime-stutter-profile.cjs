// One authored scene, same-scene R16.44/current production function comparison.
// CPU/DOM stub evidence only: not GPU, browser layout, or mobile frame rate.
const fs=require('node:fs'),vm=require('node:vm'),cp=require('node:child_process');
const {performance}=require('node:perf_hooks');
const stats=new Map(),stack=[];let enabled=false,domWrites=0,unchangedDomWrites=0;
function measure(name,fn){return function(...args){if(!enabled)return fn.apply(this,args);const key=stack.length?stack[0]+'/'+name:name,start=performance.now();stack.push(name);try{return fn.apply(this,args);}finally{stack.pop();const ms=performance.now()-start,s=stats.get(key)||{calls:0,ms:0,max:0};s.calls++;s.ms+=ms;s.max=Math.max(s.max,ms);stats.set(key,s);}};}
const bench={measure,write(unchanged){if(enabled){domWrites++;if(unchanged)unchangedDomWrites++;}},reset(){stats.clear();domWrites=0;unchangedDomWrites=0;},start(){enabled=true;},stop(){enabled=false;},report(label){console.log(JSON.stringify({label,domWrites,unchangedDomWrites,stats:Object.fromEntries([...stats].map(([k,v])=>[k,{calls:v.calls,ms:+v.ms.toFixed(2),max:+v.max.toFixed(2)}]))}));}};
const old=cp.execFileSync('git',['show','f3d03eedd48141413173d2be1b653c721faa1ac4:source/game/main.js'],{encoding:'utf8'});
const oldCamera=cp.execFileSync('git',['show','2d23a953a4f761d1db962bc5ee66b8d447dd9b80:source/game/camera.js'],{encoding:'utf8'});
const rayExtra='\n'+oldCamera.slice(oldCamera.indexOf('export function cameraDistanceToObstacle'),oldCamera.indexOf('export function resolveCameraPosition')).replace('export function cameraDistanceToObstacle','function oldCameraDistanceToObstacle')+String.raw`
const patchedCameraDistanceToObstacle=cameraDistanceToObstacle;
export function profileCameraVersion(version){cameraDistanceToObstacle=__bench.measure('cameraDistanceToObstacle',version==='original'?oldCameraDistanceToObstacle:patchedCameraDistanceToObstacle);}
export function profileCameraCheck(from,to,boxes,radius){const old=oldCameraDistanceToObstacle(from,to,boxes,radius),patched=patchedCameraDistanceToObstacle(from,to,boxes,radius);if(Math.abs(old-patched)>1e-12)throw Error('Camera parity '+old+' '+patched);return patched;}
profileCameraVersion('patched');
`;
const navExtra=String.raw`
const profileCurrentCanTraverse=canTraverse;
export function profileNavigationVersion(version){canTraverse=__bench.measure('canTraverse',version==='original'?(a,b,colliders,options,live=[])=>profileCurrentCanTraverse(a,b,live.length?colliders.concat(live):colliders,options):profileCurrentCanTraverse);}
colliderIndex=__bench.measure('colliderIndex',colliderIndex);
profileNavigationVersion('patched');
`;
const extract=(name,next)=>old.slice(old.indexOf('function '+name+'('),old.indexOf('function '+next+'(',old.indexOf('function '+name+'('))).replace('function '+name+'(','function '+name+'R1644(');
const intentTest=fs.readFileSync('tests/nearby-interaction-main.cjs','utf8');
const intentExtras=vm.runInNewContext(intentTest.match(/const extras=([^\n]+);\nharness=/)[1]);
const extras=intentExtras+'\n'+extract('updatePlayer','updateNPCs')+'\n'+extract('updateFurnitureLabels','updatePlayer')+String.raw`
export function profileScene(){
 for(const [name,service]of Object.entries({chinaAudience,chinaPalace,chinaClinic,chinaSalon,chinaMoneyHouse,chinaTavern,chinaLabor,chinaEdict,chinaArchery,gameHealth,npcSocial,japanService,japanServiceUI}))if(service?.update)service.update=__bench.measure(name,service.update);
 furniture.isVisible=__bench.measure('furniture.isVisible',furniture.isVisible);
 return {player,lot,furniture,camera,cameraSolids,npcs};
}
export function profilePosition(x,y,z){player.root.position.set(x,y,z);path=[];pendingInteraction=null;performing=null;seated=null;keys.clear();}
export function profileStep(dt){elapsed+=dt;updateAutomaticDoors(dt);updatePlayer(dt,elapsed);updateNPCs(dt,elapsed);updateGameHealth(dt);updateCamera(dt);updateLabels();updateFurnitureLabels();}
export function profilePlayers(version,dt,t){(version==='R16.44'?updatePlayerR1644:updatePlayer)(dt,t);}
export function profileLabels(version){(version==='R16.44'?updateFurnitureLabelsR1644:updateFurnitureLabels)();}
updatePlayer=__bench.measure('updatePlayer',updatePlayer);updatePlayerR1644=__bench.measure('updatePlayerR1644',updatePlayerR1644);updateNPCs=__bench.measure('updateNPCs',updateNPCs);updateGameHealth=__bench.measure('updateGameHealth',updateGameHealth);updateCamera=__bench.measure('updateCamera',updateCamera);updateAutomaticDoors=__bench.measure('updateAutomaticDoors',updateAutomaticDoors);updateLabels=__bench.measure('updateLabels',updateLabels);updateFurnitureLabels=__bench.measure('updateFurnitureLabels',updateFurnitureLabels);updateFurnitureLabelsR1644=__bench.measure('updateFurnitureLabelsR1644',updateFurnitureLabelsR1644);renderActivityStations=__bench.measure('renderActivityStations',renderActivityStations);nearbyInteractionClear=__bench.measure('nearbyInteractionClear',nearbyInteractionClear);planPath=__bench.measure('planPath',planPath);
`;
let harness=fs.readFileSync('tests/fixtures/hotfix-input-harness.cjs','utf8');
harness=harness.replace('vm.createContext({console,','vm.createContext({__bench:bench,console,');
harness=harness.replace('this.tagName=tag;','this.tagName=tag;let txt,hidden;Object.defineProperties(this,{textContent:{get:()=>txt,set:v=>{bench.write(txt===v);txt=v;}},hidden:{get:()=>hidden,set:v=>{bench.write(hidden===v);hidden=v;}}});');
harness=harness.replace('setAttribute(k,v){','setAttribute(k,v){bench.write(this.attrs[k]===String(v));');
harness=harness.replace("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),", "new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?"+JSON.stringify(extras)+":file.endsWith('/game/camera.js')?"+JSON.stringify(rayExtra)+":file.endsWith('/game/navigation.js')?"+JSON.stringify(navExtra)+":''),");
const begin=harness.indexOf('const report=[];for(let round=0;'),end=harness.indexOf('\nconsole.log(JSON.stringify(',begin);
const body=String.raw`
const start=performanceHost.now();console.log('SCENE_BEGIN');all.find(e=>e.dataset.region===(process.env.PROFILE_REGION||'china')).onclick();ids.travel.onclick();
const r=main.namespace.profileScene();console.log(JSON.stringify({scene:state().region,initMs:performanceHost.now()-start,cameraBoxes:r.cameraSolids.length,stations:r.lot.stations.length,furniture:r.furniture.items.length,npcs:r.npcs.length,rssMiB:process.memoryUsage().rss/1048576}));
const spawn=r.player.root.position.toArray(),chair=r.furniture.items.find(i=>i.id==='china-clinic-consult-seat')||r.furniture.items.find(i=>i.kind==='seat');
const cameraProfile=cache.get(path.join(root,'game/camera.js')).namespace;
const navigationProfile=cache.get(path.join(root,'game/navigation.js')).namespace;
let seed=813;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
for(let i=0;i<(process.env.PROFILE_FIXED_ONLY?0:600);i++){const from=new three.namespace.Vector3(random()*60-30,random()*12,random()*80-40),to=from.clone().add(new three.namespace.Vector3(i%5===0?0:random()*12-6,i%7===0?0:random()*6-3,i%3===0?0:random()*12-6));cameraProfile.profileCameraCheck(from,to,r.cameraSolids,i%2?.18:0);}if(!process.env.PROFILE_FIXED_ONLY)console.log('PASS 600 authored-scene camera sweep parity rays');
for(const place of process.env.PROFILE_FIXED_ONLY?[]:[{label:'spawn-idle',position:spawn},{label:'near-seat-movement',position:chair.position}]){
 main.namespace.profilePosition(...place.position);r.camera.position.set(place.position[0],place.position[1]+1.5,place.position[2]+1);r.camera.lookAt(r.furniture.markerPoint(chair));r.camera.updateMatrixWorld(true);
 for(let round=0;round<3;round++)for(const version of round%2?['patched','original']:['original','patched']){
  cameraProfile.profileCameraVersion(version);
  bench.reset();bench.start();const times=[];for(let i=0;i<80;i++){main.namespace.profilePosition(place.position[0]+(place.label.includes('movement')?Math.sin(i*.02)*.2:0),place.position[1],place.position[2]);const s=performanceHost.now();main.namespace.profilePlayers('R16.45',0,0);if(i%2===0)main.namespace.profileLabels('R16.45');times.push(performanceHost.now()-s);}
  bench.stop();if(round){times.sort((a,b)=>a-b);console.log(JSON.stringify({sample:place.label,version,round,mean:times.reduce((a,b)=>a+b,0)/times.length,p95:times[Math.floor(times.length*.95)],max:times.at(-1)}));bench.report(place.label+' '+version);}
 }
}
main.namespace.profilePosition(...spawn);for(let i=0;i<12;i++)main.namespace.profileStep(1/60);
const inspector=require('node:inspector'),session=new inspector.Session();session.connect();const post=(name,params={})=>new Promise((resolve,reject)=>session.post(name,params,(err,result)=>err?reject(err):resolve(result)));await post('Profiler.enable');await post('Profiler.start');
for(let block=0;block<(process.env.PROFILE_FIXED_ONLY?3:6);block++){const version=process.env.PROFILE_FIXED_ONLY?'patched':block%2?'original':'patched';cameraProfile.profileCameraVersion(version);navigationProfile.profileNavigationVersion(version);bench.reset();bench.start();const times=[];for(let i=0;i<120;i++){const s=performanceHost.now();main.namespace.profileStep(1/60);times.push(performanceHost.now()-s);}bench.stop();times.sort((a,b)=>a-b);console.log(JSON.stringify({sample:'full-current',version,block,mean:times.reduce((a,b)=>a+b,0)/times.length,p95:times[114],max:times.at(-1),rssMiB:process.memoryUsage().rss/1048576}));bench.report('full-current '+version);await new Promise(resolve=>setImmediate(resolve));}
const profile=await post('Profiler.stop');fs.writeFileSync('/tmp/worldwoven-stutter.cpuprofile',JSON.stringify(profile.profile));session.disconnect();
cameraProfile.profileCameraVersion('patched');navigationProfile.profileNavigationVersion('patched');
console.log('PROFILE_DONE');
`;
const intentBody=process.env.PROFILE_INTERACTIONS?intentTest.slice(intentTest.indexOf('const body=String.raw`')+String('const body=String.raw`').length,intentTest.indexOf('\n`;')).replace("all.find(e=>e.dataset.region==='china').onclick();ids.travel.onclick();tick(2);",''):'';
harness=harness.slice(0,begin)+body+'\n{'+intentBody+'}\n'+harness.slice(end);harness=harness.replace(/console.log\(JSON.stringify\(\{status:'PASS',scope:'Production controller[\s\S]*?\},null,2\)\);/,'');
new vm.Script(harness,{filename:'tests/runtime-stutter-inherited.cjs'}).runInNewContext({require,console,process,Buffer,bench,setImmediate,performanceHost:performance,__dirname:process.cwd()+'/tests',__filename});
