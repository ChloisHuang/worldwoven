// Original routine and actual Three geometry; straight-path fixture isolates
// observed work and range objects. This is not a main/navigation/browser test.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const context=vm.createContext({console,structuredClone,Float32Array,Uint8Array}),cache=new Map(),root=path.resolve('source');
function mod(file){if(cache.has(file))return cache.get(file);const m=new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{context,identifier:file});cache.set(file,m);return m;}
const linker=(s,m)=>mod(s==='three'?path.join(root,'vendor/three/build/three.module.js'):path.resolve(path.dirname(m.identifier),s));
(async()=>{
 const module=mod(path.join(root,'game/china-archery-routine.js'));await module.link(linker);await module.evaluate();const T=cache.get(path.join(root,'vendor/three/build/three.module.js')).namespace;
 const guards=['cn-archery','cn-range-warden'].map((id,i)=>{const root=new T.Group();root.position.set(-17.65,.13,18.45+i*1.35);const hands=[new T.Group(),new T.Group()];root.add(...hands);root.userData.hands=hands;root.userData.jinyiCostume={dispose(){}};return {station:{id},root,route:[],locomotion:{walkSpeed:3},phase:0,animate(){}};});
 const routine=module.namespace.createChinaArcheryRoutine({npcs:guards,lot:{archery:{},group:new T.Group()},planPath:(from,to)=>[new T.Vector3(to.x,to.y,to.z)],moveActor:(actor,x,z)=>{actor.root.position.x+=x;actor.root.position.z+=z;},poseContext:()=>({}),resolveWardenAssignment:()=>({roleId:'cn-range-warden-duty',slotId:'cn-range-warden-duty-1',holderId:'cn-range-warden',revision:0,status:'npc',alive:true,available:true,actor:guards[1]})});

 const roleMod=mod(path.join(root,'game/china-range-warden-slot.js'));if(roleMod.status==='unlinked')await roleMod.link(linker);await roleMod.evaluate();
 const accountMod=mod(path.join(root,'game/npc-duty-account.js'));await accountMod.link(linker);await accountMod.evaluate();
 const ROLE=roleMod.namespace.RANGE_WARDEN_ROLE;
 const account=accountMod.namespace.createNPCDutyAccount({role:ROLE,namespace:'chinaRangeWardenAccounts',saveState:()=>true});
 let second=0,previous=0;const totals=[];
 // Real routine movements/observations, with a conservative 240 real-second
 // daily unpaid trip allowance after first earnings. Measured main absence
 // is223.8seconds, while daily food resets every2057.14seconds and costs6.
 // Straight authored paths omit collision traffic.
 for(let i=1;i<=24000;i++){
  second=i*.25;for(const n of guards)if(n.route[0])n.root.position.y=n.route[0].y;
  routine.update(.25,second,{position:{x:0,y:0,z:30}});
  // Obtain the exact routine's own sampled coverage by its dedicated adapter.
  const coverage=routine.wardenPatrolCoverage();
  const totalMinutes=600+second*.7,day=Math.floor(totalMinutes/1440),hour=totalMinutes%1440/60;
  const tripWindow=day>0&&hour>=10&&hour<12.8;
  account.observe({seconds:second,dt:.25,coverage:tripWindow?[]:coverage});
  if(i%20===0){account.checkpoint({day,hour});const amount=account.account('cn-range-warden').bank;if(amount!==previous){totals.push(amount-previous);previous=amount;}}
 }
 assert(totals.length>=3);assert(totals.every(n=>n>=6),JSON.stringify(totals));
 console.log(JSON.stringify({status:'PASS',scope:'Actual Three routine, straight paths; 240-second unpaid daily meal/toilet allowance, no collision/browser proof',dailyWages:totals}));
})().catch(e=>{console.error(e);process.exit(1)});
