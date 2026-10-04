// Prevent carried-prop duplication/loss on wardrobe rebuild and region reload.
// Runs only two weather hooks through actual E/touch, movement and save handlers.
const fs=require('node:fs'),vm=require('node:vm');
let harness=fs.readFileSync('tests/fixtures/hotfix-input-harness.cjs','utf8');
const additions="\nexport function weatherReview(){return {player,lot,camera,scene,sun,lighting,japanWeatherCharms,navOptions};} export function weatherStep(dt){elapsed+=dt;updateAutomaticDoors(dt);updatePlayer(dt,elapsed);japanWeatherCharms?.update(elapsed);} export function weatherView(a,p=.16){yaw=a;pitch=p;distance=4.6;updateCamera(1,true);} export {navigateTo,configureStableShadows,blocked};";
harness=harness.replace("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),", "new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?"+JSON.stringify(additions)+":''),");
harness=harness.replace("const document={body:new E('body')","const document={head:new E('head'),body:new E('body')");
harness=harness.replace('vm.createContext({console,','vm.createContext({Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,');
const begin=harness.indexOf('const report=[];for(let round=0;'),end=harness.indexOf('\nconsole.log(JSON.stringify(',begin);
const body=String.raw`
const out=process.env.WEATHER_OUT||'/tmp/worldwoven-weather-integration',report={status:'RUNNING',checks:[],frames:[]};fs.mkdirSync(out,{recursive:true});
const record=label=>{report.checks.push(label);console.log(label);fs.writeFileSync(out+'/checks.json',JSON.stringify(report,null,2));};
const enter=()=>{all.find(e=>e.dataset.region==='japan').onclick();ids.travel.onclick();};enter();
let review=main.namespace.weatherReview();const T=three.namespace,points=review.lot.weatherCharmPoints;
assert.equal(points.length,2);assert.equal(review.lot.stations.length,14);const sourceIdentity=JSON.stringify(state().playerLook);
const frame=(count=1)=>{for(let i=0;i<count;i++){now+=100;main.namespace.weatherStep(.1);}};
const key=code=>events.keydown({code,repeat:false,preventDefault(){}});
const travel=point=>{main.namespace.navigateTo(new T.Vector3(...point));assert(state().pathLength,'real route found');for(let i=0;i<1200&&state().pathLength;i++)frame();assert.equal(state().pathLength,0,'real route completes');frame();};
const weather=()=>state().japanWeatherCharms;
const activeCharms=()=>{const all=[];review.lot.group.traverse(o=>{if(o.userData.weatherCharm)all.push(o);});return all;};
function handContact(){const doll=activeCharms().find(o=>o.userData.weatherCharm.kind==='fair');review.lot.group.updateMatrixWorld(true);const origin=doll.getWorldPosition(new T.Vector3()),hand=review.player.root.userData.hands[0].getWorldPosition(new T.Vector3());assert(origin.distanceTo(hand)<.09,'cord contacts actual hand');assert.equal(review.player.root.userData.tools.cloth.visible,false,'old towel hidden');return origin.distanceTo(hand);}
// Start on the existing outdoor entry approach, then navigate along the actual
// balcony between hooks. No bath, stairs or employee schedule is exercised.
review.player.root.position.set(-2.0,0,11.1);travel(points[0].approach);
assert.equal(state().nearest,points[0].id);assert.equal(ids['touch-action'].textContent,'拿起晴天娃娃');key('KeyE');frame();
assert.equal(weather().carriedId,points[0].id);assert.equal(activeCharms().length,2);assert.equal(JSON.parse(storage['worlds-days-v1']).japanWeatherCharms.carriedId,points[0].id);handContact();
const poseBefore=review.player.root.position.clone();key('KeyD');frame(10);events.keyup({code:'KeyD'});assert(review.player.root.position.distanceTo(poseBefore)>.1);report.handContactMetres=handContact();record('E takes the white charm; real walking retains one visible charm at the actual hand and hides the towel');
// Existing outfit UI rebuilds the real avatar while the charm remains owned by
// the region adapter. Closing restores the held model and saved identity.
ids['appearance-button'].onclick();frame();assert(activeCharms().find(o=>o.userData.weatherCharm.kind==='fair').visible===false);ids['outfit-confirm'].onclick();frame();review=main.namespace.weatherReview();assert.equal(activeCharms().length,2);handContact();record('outfit preview temporarily stows the same charm; rebuilt avatar gets it back without duplicate geometry');
travel(points[0].approach);assert.equal(state().nearest,points[0].id);assert.equal(ids['touch-action'].textContent,'挂回窗边');ids['touch-action'].onclick();frame();assert.equal(weather().carriedId,null);assert(weather().hooks.every(h=>h.state==='hanging'));record('touch action hangs the white charm back at its own reachable window hook');
// A through-wall approach must never expose the exterior hook.
review.player.root.position.set(-5,0,8.55);frame();assert.notEqual(state().nearest,points[0].id);review.player.root.position.set(...points[0].approach);frame();
travel(points[1].approach);assert.equal(state().nearest,points[1].id);ids['touch-action'].onclick();frame();assert.equal(weather().carriedId,points[1].id);key('KeyE');frame();assert.equal(weather().carriedId,null);assert.equal(weather().uses[points[1].id].picked,1);assert.equal(weather().uses[points[1].id].hung,1);record('the other hook is reachable through actual movement; touch take and E rehang preserve independent use counts');
// Capture only one normal TPS view of the changed window bay.
if(process.env.WEATHER_MESA==='1'){
 const W=await import('/workspace/shared/cultural-life-r12-webgl/node_modules/@onirenaud/node-webgl/dist/index.js');W.installDOM({fetch:false});W.init({api:'gles'});
 const canvas=W.createCanvas(1100,760),actual=new T.WebGLRenderer({canvas,antialias:true});actual.setSize(1100,760,false);actual.outputColorSpace=T.SRGBColorSpace;main.namespace.configureStableShadows(actual,review.sun);review.camera.aspect=1100/760;review.camera.updateProjectionMatrix();
 review.player.root.position.set(5.38,0,10.40);review.player.root.rotation.y=Math.PI;frame();main.namespace.weatherView(.12,.12);review.scene.updateMatrixWorld(true);review.lighting.update(review.player.root.position);actual.render(review.scene,review.camera);actual.getContext().finish();assert.equal(actual.getContext().getError(),0);fs.writeFileSync(out+'/weather-window-normal-tps.png',canvas.toBuffer('image/png'));
 const gl=actual.getContext(),dbg=gl.getExtension('WEBGL_debug_renderer_info');report.frames.push({name:'weather-window-normal-tps',camera:review.camera.position.toArray(),player:review.player.root.position.toArray(),fov:review.camera.fov,renderer:gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL),calls:actual.info.render.calls,triangles:actual.info.render.triangles});actual.dispose();canvas.dispose();
}
travel(points[1].approach);ids['touch-action'].onclick();frame();assert.equal(weather().carriedId,points[1].id);const durable=JSON.parse(storage['worlds-days-v1']).japanWeatherCharms;
ids['return-world'].onclick();review=null;assert.equal(state().characterResources.activeReferences,0);assert.equal(state().japanWeatherCharms,null);assert.equal(JSON.parse(storage['worlds-days-v1']).japanWeatherCharms.carriedId,points[1].id);global.gc?.();
enter();review=main.namespace.weatherReview();frame();assert.equal(activeCharms().length,2);assert.equal(weather().carriedId,points[1].id);assert.equal(weather().uses[points[1].id].picked,durable.uses[points[1].id].picked);assert.equal(weather().hooks.filter(h=>h.state==='carried').length,1);record('leave clears the adapter and avatar; re-entry restores exactly the carried doll and the two original hooks');
review.player.root.position.set(2,0,11.1);travel(points[1].approach);ids['touch-action'].onclick();frame();assert.equal(weather().carriedId,null);assert.equal(weather().uses[points[1].id].hung,durable.uses[points[1].id].hung+1);record('restored carried state can really hang back through touch after re-entry');
ids['return-world'].onclick();review=null;assert.equal(state().characterResources.activeReferences,0);report.status='PASS';report.scope='Production Japanese two-hook E/touch, real movement, existing carry pose, wardrobe rebuild, save and leave/re-entry in simulated DOM; one actual Mesa normal TPS frame; no employee, bath or stair reruns';report.maxRSSMiB=process.resourceUsage().maxRSS/1024;fs.writeFileSync(out+'/checks.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));return;
`;
harness=harness.slice(0,begin)+body+harness.slice(end);
new vm.Script(harness,{filename:'tests/japan-weather-charms-inherited.cjs',importModuleDynamically:vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER}).runInNewContext({Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,global,__dirname:process.cwd()+'/tests',__filename:__filename});
