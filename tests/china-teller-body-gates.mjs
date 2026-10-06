import assert from 'node:assert/strict';
import {createChinaTellerService} from '../source/game/china-teller-service.js';
import {createCurrencyLedger} from '../source/game/currency-ledger.js';
const id='cn-money-house-teller',n={station:{id},alive:true,root:{position:{x:-21,y:.215,z:-28.25},rotation:{y:0}},route:[],walking:false};
let holder=id,revision=0,qualifications=0,poses=0,open=true,payments=0,service;
const ledger=createCurrencyLedger({saveState:()=>true});
service=createChinaTellerService({npcs:[n],lot:{tellerTools:{pose:()=>poses++,contact:()=>true}},getAssignment:()=>({holderId:holder,revision,loadError:null}),resolveAssignment:()=>({holderId:holder,revision,actor:holder?n:null,status:holder?(n.alive?'npc':'inactive'):'vacant',alive:n.alive,available:true}),getDay:()=>0,getLedger:()=>ledger,
 canControl:actor=>{qualifications++;assert.equal(service.counterBinding().actor,actor,'other employer owns may query bank identity without recursion');return actor.alive;},isCounterOpen:()=>open,isPersonalBusy:()=>false,poseContext:()=>({}),getPlayer:()=>null,economy:{settle:()=>{payments++;return {ok:true};}},saveState:()=>true});
const binding=service.counterBinding();assert.equal(binding.actor,n);assert.equal(qualifications,0,'identity query must not run full role qualification');assert(binding.available);assert.equal(qualifications,1);
for(let i=0;i<40;i++)service.update(.1,i*.1);assert.equal(service.snapshot().order,null);assert.equal(payments,0,'a player-open counter must not start autonomous work or take leave');assert.equal(n.root.position.x,-21);
n.alive=false;const before=poses;service.update(.1,5);assert.equal(poses,before,'dead holder receives no pose/movement');assert(!service.counterBinding().available);
holder=null;assert.equal(service.counterBinding().actor,null);assert(!service.counterBinding().available);assert.equal(payments,0);
console.log('PASS teller body gates: cheap identity without recursive qualification, existing player business blocks autonomous work, dead/vacant fail closed');
