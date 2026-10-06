import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createNPCPersonalTrip} from '../source/game/npc-personal-trip.js';
function fixture(saved){
 const n={station:{id:'cn-cooking'},alive:true,root:{position:{x:0,y:0,z:0}}};let persisted,fail=false,controlled=true,drained=false,income=false,registered=false,lease=null,mounted=false,wantMeal=true,wantToilet=true,off=false,paid=0,finished=0,refunds=0;
 const needs={has:()=>registered,register:()=>{registered=true;return true;},status:()=>registered?{seekMeal:wantMeal,seekToilet:wantToilet}:null};
 const tavern={publicToiletRoute:()=>[[2,0,0],[2,4,0]],registerGuestPerson:()=>true,requestGuestMeal:()=>{if(lease)return false;paid++;lease={actorId:n.station.id};return true;},guestMeal:()=>lease,cancelGuestMeal:()=>{refunds++;lease=null;return true;}};
 const toilet={publicIntent:()=>({position:[3,4,0]}),publicAvailable:()=>true,requestPublicActor:()=>{mounted=true;return true;},ownsActor:()=>mounted,updateActor:()=>{},actorPose:()=>mounted?{action:'toilet'}:null,abandonActor:()=>{mounted=false;return true;}};
 const api=createNPCPersonalTrip({saved,getCandidates:()=>[n],getActor:()=>n,canStart:()=>true,canControl:()=>controlled,canDepart:()=>drained,getReturnTarget:()=>[off?5:0,0,0],getExitRoute:()=>[[1,0,0]],getReturnRoute:()=>[[off?5:0,0,0]],economy:{hasIncome:()=>income,account:()=>({cash:0,bank:12})},sharedNeeds:needs,getTavern:()=>tavern,getToilet:()=>toilet,travel:(actor,p)=>{Object.assign(actor.root.position,{x:p[0],y:p[1],z:p[2]});return true;},pose:()=>{},resetRoute:()=>{},saveState:s=>{if(fail)return false;persisted=structuredClone(s);return true;}});
 return {api,n,get saved(){return persisted;},tick:(count=1)=>{for(let i=0;i<count;i++)api.update(1,0);},set(values){if('fail'in values)fail=values.fail;if('controlled'in values)controlled=values.controlled;if('drained'in values)drained=values.drained;if('income'in values)income=values.income;if('off'in values)off=values.off;},eat(){lease=null;wantMeal=false;finished++;},toiletDone(){mounted=false;wantToilet=false;},get counts(){return {paid,finished,refunds,registered};}};
}
test('no enrollment before wages, drains original job, paid lease only once, real toilet ownership then current off-duty return',()=>{
 const f=fixture();f.tick(3);assert.equal(f.counts.registered,false);assert.equal(f.api.state(),null);f.set({income:true});f.tick();assert.equal(f.api.state().phase,'draining');assert.equal(f.counts.paid,0);f.set({drained:true});f.tick();assert.equal(f.api.state().phase,'meal');assert.equal(f.counts.paid,1);f.tick(4);assert.equal(f.counts.paid,1);f.eat();f.tick(5);assert.equal(f.api.state().phase,'toilet');f.set({off:true});f.toiletDone();f.tick(6);assert.equal(f.api.state(),null);assert.equal(f.n.root.position.x,5);
});
test('failed drain save is retried, restored interrupted toilet gives no completion, control loss cancels own lease',()=>{
 const f=fixture();f.set({income:true,fail:true});f.tick();assert.equal(f.api.state(),null);f.set({fail:false,drained:true});f.tick();assert.equal(f.api.state().phase,'meal');f.set({controlled:false});f.tick();assert.equal(f.api.state(),null);assert.equal(f.counts.refunds,1);assert.equal(f.counts.finished,0);
 const g=fixture({version:1,task:{actorId:'cn-cooking',phase:'toilet',meal:false,path:[],index:0}});g.tick();assert.equal(g.api.state().phase,'return');assert.equal(g.counts.finished,0);
});
