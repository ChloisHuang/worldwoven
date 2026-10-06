// Actual player sharing and exact berth continuity, including an Egypt roundtrip.
// Actual Three geometry, door/navigation and production main; simulated DOM.
const fs=require('node:fs'),vm=require('node:vm');let harness=fs.readFileSync('tests/fixtures/hotfix-input-harness.cjs','utf8');
const extras=`
export function continuityStep(dt){elapsed+=dt;advanceWorldClock(dt);updateAutomaticDoors(dt);updatePlayer(dt,elapsed);chinaClinic?.update(dt,elapsed,{player,position:player.root.position,facilityId:seated?.id||null});updateGameHealth(dt);}
export function continuityProbe(){return {player,npcs,lot,furniture,chinaClinic,navOptions,path,actionTime};}
export {save,enterRegion,requestFurniture,requestStationIntent,blocked};`;
harness=harness.replace("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),","new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?"+JSON.stringify(extras)+":''),");
harness=harness.replace('add(...e){this.append(...e)}','prepend(...e){this.children.unshift(...e)}add(...e){this.append(...e)}');
harness=harness.replace('vm.createContext({console,','vm.createContext({URL,console,').replace('{identifier:file,context}','{identifier:file,context,initializeImportMeta(meta){meta.url=require("node:url").pathToFileURL(file).href;}}').replace('const document={body:',"const document={head:new E('head'),body:");
const start=harness.indexOf('const report=[];for(let round=0;'),end=harness.indexOf('\nconsole.log(JSON.stringify(',start);
const body=String.raw`
const T=three.namespace,api=main.namespace;api.enterRegion('china');let r=api.continuityProbe();const bed=r.furniture.items.find(s=>s.id==='cn-official-bed-gu');
const first=r.furniture.resolveBed(bed,'test-sleeper');r.furniture.occupyBed(first,'test-sleeper');r.player.root.position.set(...bed.position);api.requestFurniture(bed);
const frame=()=>{now+=1000/15;api.continuityStep(1/15);};for(let i=0;i<180&&!state().seated;i++)frame();assert.equal(state().seated,bed.id);assert.equal(state().seatedBerthId,bed.berths[1].berthId);assert.equal(r.furniture.facilities.reservation(bed.id,'test-sleeper').seatId,first.berthId);assert.equal(r.furniture.resolveBed(bed,'third'),null);r.furniture.releaseActor('third');r.furniture.releaseActor('test-sleeper');
api.save();const checkpoint=JSON.parse(storage['worlds-days-v1']).worldContinuity.regions.china;assert.equal(checkpoint.activity.seatedBerthId,bed.berths[1].berthId);
api.enterRegion('egypt');api.enterRegion('china');r=api.continuityProbe();assert.equal(state().seated,bed.id);assert.equal(state().seatedBerthId,bed.berths[1].berthId);assert.equal(r.furniture.facilities.reservation(bed.id,'player').seatId,bed.berths[1].berthId);
api.requestFurniture(r.furniture.items.find(i=>i.id===bed.id));for(let i=0;i<60&&state().seated;i++)frame();assert.equal(state().seated,null);assert.equal(r.furniture.facilities.reservation(bed.id,'player'),null);
console.log('PASS actual main double-bed second berth, no eviction, third refusal, country roundtrip exact berth, independent get-up');const report=[];
`;
harness=harness.slice(0,start)+body+harness.slice(end);harness=harness.replace(/console.log\(JSON.stringify\(\{status:'PASS',scope:'Production controller[\s\S]*?\},null,2\)\);/,'');new vm.Script(harness,{filename:'world-continuity-inherited.cjs'}).runInNewContext({URL,require,console,process,Buffer,__dirname:process.cwd()+'/tests',__filename});
