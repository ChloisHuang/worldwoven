// Opt-in one-load timings. No game-source files or simulation semantics change.
const enabled=process.env.QUEUE_PROFILE==='1',totals=new Map();
function add(name,start){const ms=Number(process.hrtime.bigint()-start)/1e6,row=totals.get(name)||{calls:0,ms:0};row.calls++;row.ms+=ms;totals.set(name,row);if(!name.startsWith('dom-'))console.log('LOAD_PHASE',JSON.stringify({name,ms:+ms.toFixed(3)}));}
function measure(name,fn){if(!enabled)return fn();const start=process.hrtime.bigint();try{return fn();}finally{add(name,start);}}
async function asyncMeasure(name,fn){if(!enabled)return fn();const start=process.hrtime.bigint();try{return await fn();}finally{add(name,start);}}
function source(file,s){
 if(!enabled||!file.endsWith('/game/main.js'))return s;
 const a=s.indexOf('function enterRegion(id)'),b=s.indexOf('function disposeLot',a);if(a<0||b<0)throw new Error('enterRegion profiling contract changed');
 let region=s.slice(a,b);
 const wrap=(code,name)=>{if(!region.includes(code))throw new Error('profile call missing: '+code);region=region.replace(code,`__queueMeasure(${JSON.stringify(name)},()=>${code})`);};
 wrap('active.build()','lot-geometry');
 wrap('lighting.attach(lot,active.id)','lighting-field');
 wrap('createFurnitureInteractions(lot,id,{curtains:saved.curtains,onCurtainChange:()=>save()})','furniture');
 wrap('buildPlayer()','player-character');wrap('configureNPCs()','npc-characters');
 wrap('installAutomaticDoors()','doors');wrap('new THREE.Box3().setFromObject(lot.group)','scene-bounds');
 wrap('restoreWorldContinuity(checkpoint)','restore-save-and-paths');
 // Every top-level configuration call receives its own timing, without nested rewrites.
 region=region.replace(/(?<![\w.])(configure\w+)\(\);/g,(call,name)=>`__queueMeasure('${name}',()=>${name}());`);
 wrap('renderStations()','station-ui');wrap('updateCamera(1,true)','initial-camera');
 s=s.slice(0,a)+region+s.slice(b);return s;
}
if(enabled)process.on('exit',()=>console.log('LOAD_TOTALS',JSON.stringify(Object.fromEntries([...totals].map(([k,v])=>[k,{calls:v.calls,ms:+v.ms.toFixed(3)}])))));
module.exports={measure,asyncMeasure,source};
