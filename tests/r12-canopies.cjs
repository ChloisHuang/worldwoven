// Independent CPU/DOM controller review; uses actual event handlers, not start/request hooks.
const fs=require('fs'),path=require('path'),vm=require('vm');
let harness=fs.readFileSync(path.join(__dirname,'fixtures','hotfix-input-harness.cjs'),'utf8');
harness=harness.replace("const root=path.resolve('source')","const root=path.resolve(process.env.SOURCE_ROOT||'source')");
harness=harness.replace("new vm.SourceTextModule(fs.readFileSync(file,'utf8'),", "new vm.SourceTextModule(fs.readFileSync(file,'utf8')+(file.endsWith('/game/main.js')?`\\nexport function inputReview(){return {player,furniture,lot,camera,cameraSolids,npcs,navOptions,nearest,seated,joy,keys,automaticDoors};} export {blocked,updateFurnitureLabels};`:''),");
harness=harness.replace("stamps:{},outfit:0,appearance:","stamps:{},outfit:0,curtains:{japan:false},appearance:");
const begin=harness.indexOf('const report=[];for(let round=0;'),end=harness.indexOf('\nconsole.log(JSON.stringify(',begin);
const body=String.raw`
const T=three.namespace,review=()=>main.namespace.inputReview(),step=()=>{now+=100;raf();};const report=[];
for(const id of['japan','china']){
 all.find(e=>e.dataset.region===id).onclick();ids.travel.onclick();step();const r=review(),canopy=r.furniture.items.find(i=>i.kind==='canopy'),bed=r.furniture.items.find(i=>i.kind==='bed');
 if(id==='japan'){assert(!canopy);assert.equal(r.furniture.cloth,null);assert.equal(r.furniture.state().curtainsOpen,null);assert(!ids['furniture-list'].children.some(b=>b.dataset.furniture==='canopy'));assert(!ids['furniture-labels'].children.some(b=>b.dataset.furniture==='canopy'));const names=[];r.lot.group.traverse(o=>names.push(o.name));assert(!names.some(n=>/operable gauze|Bamboo sleeping-canopy|Translucent pleated/.test(n)));assert.equal(JSON.parse(storage['worlds-days-v1']).curtains?.japan,undefined);}
 else{const m=r.furniture.cloth.material;assert(m.transparent&&m.opacity>0&&m.opacity<.5);assert(m.color.r>m.color.g*3&&m.color.r>m.color.b*3,'red gauze');}
 for(const stateName of(id==='china'?['closed','open']:['removed'])){
  if(canopy){review().player.root.position.set(...canopy.position);ids['furniture-list'].children.find(b=>b.dataset.furnitureId===canopy.id).onclick();step();assert.equal(r.furniture.state().curtainsOpen,stateName==='open');}
  review().player.root.position.set(...bed.position);ids['furniture-list'].children.find(b=>b.dataset.furnitureId===bed.id).onclick();step();assert.equal(state().playerPose.action,'lie-rest');assert(state().playerPose.lieContact);assert(Math.abs(state().playerPose.lieContact.hip.gap)<.03);ids['touch-action'].onclick();assert.equal(state().seated,null);report.push({id,curtain:stateName,lie:true,exit:true});
 }
 ids['return-world'].onclick();assert.equal(state().characterResources.activeReferences,0);
}
`;
harness=harness.slice(0,begin)+body+harness.slice(end);harness=harness.replace("totalActivityPaths:report.reduce((n,r)=>n+r.stations,0),",'');
new vm.Script(harness,{filename:path.join(__dirname,'independent-input-review-harness.cjs')}).runInNewContext({require,console,process,Buffer,__dirname,__filename});
