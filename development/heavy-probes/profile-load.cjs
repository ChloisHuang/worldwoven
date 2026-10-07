// Diagnostic-only source wrappers, adapted from the verified R189 load profiler.
// START survives a guard stop inside a synchronous phase; END reports CPU/wall.
const enabled=process.env.TELLER_PROFILE==='1';
function start(name){const clock=process.hrtime.bigint(),cpu=process.cpuUsage();console.log('LOAD_PHASE',JSON.stringify({event:'START',name,utc:new Date().toISOString(),cpu}));return {clock,cpu};}
function end(name,begin){console.log('LOAD_PHASE',JSON.stringify({event:'END',name,utc:new Date().toISOString(),wallMs:Number(process.hrtime.bigint()-begin.clock)/1e6,cpu:process.cpuUsage(begin.cpu),rssMiB:process.memoryUsage().rss/1024/1024}));}
function measure(name,fn){if(!enabled)return fn();const begin=start(name);try{return fn();}finally{end(name,begin);}}
async function asyncMeasure(name,fn){if(!enabled)return fn();const begin=start(name);try{return await fn();}finally{end(name,begin);}}
function source(file,s){
 if(!enabled||!file.endsWith('/game/main.js'))return s;
 const a=s.indexOf('function enterRegion(id)'),b=s.indexOf('function disposeLot',a);if(a<0||b<0)throw Error('enterRegion profiling contract changed');
 let region=s.slice(a,b);
 const wrap=(code,name)=>{if(!region.includes(code))throw Error('profile call missing: '+code);region=region.replace(code,`__tellerMeasure(${JSON.stringify(name)},()=>${code})`);};
 wrap('active.build()','lot-geometry');wrap('lighting.attach(lot,active.id)','lighting-field');
 wrap('createFurnitureInteractions(lot,id,{curtains:saved.curtains,onCurtainChange:()=>save()})','furniture');
 wrap('buildPlayer()','player-character');wrap('configureNPCs()','npc-characters');wrap('installAutomaticDoors()','doors');
 wrap('new THREE.Box3().setFromObject(lot.group)','scene-bounds');wrap('restoreWorldContinuity(checkpoint)','restore-save-and-paths');
 region=region.replace(/(?<![\w.])(configure\w+)\(\);/g,(call,name)=>`__tellerMeasure('${name}',()=>${name}());`);
 wrap('renderStations()','station-ui');wrap('updateCamera(1,true)','initial-camera');return s.slice(0,a)+region+s.slice(b);
}
module.exports={measure,asyncMeasure,source};
