// Narrow adapter of the existing real-main harness: the four corrected dining
// stools only. One selected region/process; optional one normal-camera frame.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
assert.equal(process.env.QA_RESOURCE_WINDOW,'granted-by-owner');
assert(['china','egypt'].includes(process.env.REGION));
let harness=fs.readFileSync('tests/fixtures/hotfix-input-harness.cjs','utf8');
const additions=`
export function facingReview(){return {player,lot,furniture,camera,scene,sun,navOptions};}
export function facingStep(){elapsed+=.05;updateAutomaticDoors(.05);updatePlayer(.05,elapsed);}
export function facingView(a){yaw=a;pitch=.22;distance=4.6;updateCamera(1,true);lighting.update(player.root.position);}
export {requestFurniture,standFromSeat,configureStableShadows};`;
harness=harness.replace("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),","new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?"+JSON.stringify(additions)+":''),");
harness=harness.replace("const document={body:new E('body')","const document={head:new E('head'),body:new E('body')");
harness=harness.replace('vm.createContext({console,','vm.createContext({Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,console,');
if(process.env.REGION==='egypt')harness=harness.replace('variant:2','variant:3');
const begin=harness.indexOf('const report=[];for(let round=0;'),end=harness.indexOf('\nconsole.log(JSON.stringify(',begin);
const body=String.raw`
const region=process.env.REGION,out=process.env.OUT_DIR;assert(out);fs.mkdirSync(out,{recursive:true});
const report={status:'RUNNING',region,checks:[],frames:[],scope:'Only the two corrected dining stools: legal local approach/transfer via production navigation, actual main sit and stand from the landing, actual pose; simulated DOM. Optional Three/Mesa normal gameplay camera.'};
all.find(e=>e.dataset.region===region).onclick();ids.travel.onclick();
const review=main.namespace.facingReview(),T=three.namespace,N=cache.get(root+'/game/navigation.js').namespace;
const seats=review.furniture.items.filter(i=>i.kind==='seat'&&(region==='china'?i.id.startsWith('china-palace-dining-seat-'):Math.abs(i.center[2]+9.3)<.01));assert.equal(seats.length,2);
let renderer,canvas;
if(process.env.RENDER==='1'){
 const W=await import('/workspace/shared/cultural-life-r12-webgl/node_modules/@onirenaud/node-webgl/dist/index.js');W.installDOM({fetch:false});W.init({api:'gles'});canvas=W.createCanvas(1100,760);renderer=new T.WebGLRenderer({canvas,antialias:true});renderer.setSize(1100,760,false);renderer.outputColorSpace=T.SRGBColorSpace;main.namespace.configureStableShadows(renderer,review.sun);review.camera.aspect=1100/760;review.camera.updateProjectionMatrix();
}
try{for(const [index,item]of seats.entries()){
 const p=new T.Vector3(...item.position),start=[[.6,0],[-.6,0],[0,.6],[0,-.6]].map(([x,z])=>p.clone().add(new T.Vector3(x,0,z))).find(q=>!N.blocked(q.x,q.z,review.lot.colliders,.39,{...review.navOptions,y:q.y})&&N.canTraverse(q,p,review.lot.colliders,{...review.navOptions,radius:.34}));assert(start,item.id+' local approach');
 assert(review.furniture.canSit(review.navOptions,[],item),item.id+' legal seat transfer');review.player.root.position.copy(p);main.namespace.requestFurniture(item);
 let steps=0;while(state().seated!==item.id&&steps++<100)main.namespace.facingStep();assert.equal(state().seated,item.id,item.id+' production sit from landing '+JSON.stringify(state().player));assert(state().playerPose.seated);assert(Math.abs(state().playerYaw-item.yaw)<1e-8);
 review.player.root.updateMatrixWorld(true);const hips=review.player.root.getObjectByName('pelvis').getWorldPosition(new T.Vector3()),knees=review.player.root.userData.knees.map(k=>k.getWorldPosition(new T.Vector3())),forward=knees[0].clone().add(knees[1]).multiplyScalar(.5).sub(hips);forward.y=0;forward.normalize();
 const target=new T.Vector3(region==='china'?item.center[0]:17.9,hips.y,region==='china'?-1.7:-9.3),toward=target.sub(hips);toward.y=0;toward.normalize();assert(forward.dot(toward)>.98,item.id+' actual knees face the table');
 if(renderer&&index===0){main.namespace.facingView(region==='china'?-2.0:-.55);review.scene.updateMatrixWorld(true);renderer.render(review.scene,review.camera);const gl=renderer.getContext();gl.finish();assert.equal(gl.getError(),0);assert(review.player.root.visible);const name=region+'-dining-seated.png';fs.writeFileSync(out+'/'+name,canvas.toBuffer('image/png'));report.frames.push({name,camera:review.camera.position.toArray(),target:state().cameraTarget,fov:review.camera.fov,appearance:state().playerLook});}
 assert(main.namespace.standFromSeat(),item.id+' production stand');assert.equal(state().seated,null);assert(!state().playerPose.seated);const landing=review.player.root.position;assert(!N.blocked(landing.x,landing.z,review.lot.colliders,.34,{...review.navOptions,y:landing.y}));
 report.checks.push({id:item.id,approach:item.position,anchor:item.anchor,yaw:item.yaw,kneesTowardTable:forward.dot(toward),stand:landing.toArray(),steps});console.log('PASS '+item.id);
}ids['return-world'].onclick();assert.equal(state().characterResources.activeReferences,0);report.status='PASS';}
catch(error){report.status='FAIL';throw error;}
finally{renderer?.dispose();canvas?.dispose();report.maxRSSMiB=process.resourceUsage().maxRSS/1024;fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
return;
`;
harness=harness.slice(0,begin)+body+harness.slice(end);
new vm.Script(harness,{filename:'tests/corrected-facing-inherited.cjs',importModuleDynamically:vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER}).runInNewContext({Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,global,__dirname:process.cwd()+'/tests',__filename});
