// Reuse the same real-main VM/DOM harness as the aggregate controller suite.
const fs=require('fs'),path=require('path'),vm=require('vm');
if(!process.argv[2]){const {spawnSync}=require('child_process');const results=[];for(const id of['china','france','japan','egypt']){const r=spawnSync(process.execPath,['--experimental-vm-modules',__filename,id],{encoding:'utf8',maxBuffer:8*1024*1024});if(r.status!==0){console.error(r.stderr);process.exit(r.status||1);}results.push(JSON.parse(r.stdout));}console.log(JSON.stringify({status:'PASS',regions:results},null,2));process.exit(0);}
let harness=fs.readFileSync(path.join(__dirname,'game-controller.cjs'),'utf8');
const begin=harness.indexOf('const report=[];for(let round=0;'),end=harness.indexOf('\nconsole.log(JSON.stringify(',begin);
const body=`const report=[];const drain=()=>{let frames=0;while(state().pathLength&&frames<18000){tick(30);frames+=30;}assert.equal(state().pathLength,0);tick(2);return frames;};
for(const id of ['china','france','japan','egypt'].filter(id=>!process.argv[2]||process.argv[2]===id)){
 all.find(e=>e.dataset.region===id).onclick();ids.travel.onclick();tick(3);const items=state().furniture.items.filter(i=>i.kind==='bed'||i.kind==='bath');ids['return-world'].onclick();
 for(const item of items){ids.travel.onclick();tick(3);ids['daybook-furniture'].onclick();const button=ids['furniture-list'].children.find(b=>b.dataset.furnitureId===item.id);button.onclick();assert(state().pendingInteraction,item.id+' spawn list request walks first');const frames=drain();assert.equal(state().seated,item.id,item.id+' controller arrives and poses '+JSON.stringify({state:state(),toast:ids.toast.textContent}));assert.equal(state().playerPose.action,item.kind==='bed'?'lie-rest':'bathe');ids['touch-action'].onclick();assert.equal(state().seated,null);ids['return-world'].onclick();assert.equal(state().characterResources.activeReferences,0);report.push({region:id,id:item.id,frames,spawnToPose:true,clearExit:true,cleanup:true});}
}
`;
harness=harness.slice(0,begin)+body+harness.slice(end);harness=harness.replace("totalActivityPaths:report.reduce((n,r)=>n+r.stations,0),",'');
const script=new vm.Script(harness,{filename:path.join(__dirname,'furniture-controller-harness.cjs')});script.runInNewContext({require,console,process,Buffer,__dirname,__filename});
