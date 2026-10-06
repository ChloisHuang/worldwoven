import assert from 'node:assert/strict';
import {ARCHIVE_BOOKS,ARCHIVE_HOME,archiveContract,archiveProof} from '../source/game/china-archive-catalogue.js';
import {createArchiveAccount} from '../source/game/china-archive-account.js';
import {createArchiveSlot} from '../source/game/china-archive-role.js';
import {createArchiveInspection} from '../source/game/china-archive-inspection.js';
import {createNPCGuestAccounts} from '../source/game/npc-guest-accounts.js';
const proof=(day=0,id='cn-rest',rev=0)=>archiveProof(archiveContract(day,id,rev));
let funds=null,world=null,saveOK=true;
const account=createArchiveAccount({saveState:(s,r,patch)=>{if(!saveOK)return false;funds=s;if(patch.chinaArchiveInspection)world=patch.chinaArchiveInspection;return true;}});
assert.equal(account.account('cn-rest').bank,0);
for(const mutate of[p=>p.steps.pop(),p=>p.steps[0].checkedSeconds=1.99,p=>p.steps[0].tidiedSeconds=.99,p=>p.steps[2].returned=false,p=>p.steps[0].bookId='cn-archive-volume-99',p=>p.bookIds.reverse(),p=>p.returnedHome=false,p=>p.actorId='player',p=>p.orderId='cn-edict-east-shore:0']){const p=proof();mutate(p);assert(!account.settle(p).ok);}
const n={station:{id:'cn-rest'},alive:true,root:{position:{x:ARCHIVE_HOME[0],y:ARCHIVE_HOME[1],z:ARCHIVE_HOME[2]}}};
let day=0,assignment={status:'npc',actor:n,alive:true,available:true,holderId:'cn-rest',revision:0},control=true,contact=false,catalogue=true,missing=false;
let observedWork=0,travelCalls=0;
// Deliberately bounded adapter doubles: this test is NOT world collision or rig QA.
const books={restore(){},completeCatalogue:()=>catalogue,exists:()=>!missing,atHome:()=>true,allReturned:()=>true,contact:()=>contact,replace:()=>true};
const args={resolveAssignment:()=>assignment,getDay:()=>day,getActor:id=>id==='cn-rest'?n:null,canControl:()=>control,books,economy:account,
 travel(n,p,dt){travelCalls++;const d=Math.hypot(p[0]-n.root.position.x,p[2]-n.root.position.z),r=Math.min(1,dt*3/(d||1));n.root.position.x+=(p[0]-n.root.position.x)*r;n.root.position.z+=(p[2]-n.root.position.z)*r;},
 pose(n,t,work){if(work)observedWork++;},saveState:s=>{if(!saveOK)return false;world=s;return true;}};
let c=createArchiveInspection(args),t=0;
const tick=(input={})=>{t+=.1;c.update(.1,t,input);};
const until=(f,max=8000)=>{for(let i=0;i<max&&!f();i++)tick();assert(f(),JSON.stringify(c.state()));};
catalogue=false;tick();assert.equal(c.state().order,null);catalogue=true;saveOK=false;tick();assert.equal(c.state().lastIssuedDay,-1);saveOK=true;tick();assert.equal(c.state().order.contract.amount,8);
until(()=>c.state().order.stage==='check');for(let i=0;i<40;i++)tick();assert.equal(c.state().order.seconds,0,'no actual contact means no work');contact=true;
for(const block of['dead','revision','busy','missing','conversation','reading']){const before=c.snapshot();if(block==='dead')n.alive=false;if(block==='revision')assignment.revision=1;if(block==='busy')control=false;if(block==='missing')missing=true;for(let i=0;i<30;i++)tick(block==='conversation'?{conversationActorId:'cn-rest'}:block==='reading'?{performing:'cn-rest'}:{});assert.deepEqual(c.snapshot(),before,block);n.alive=true;assignment.revision=0;control=true;missing=false;}
assert(!c.handoffBoundary().ok);tick();const partial=c.snapshot();c.dispose();c=createArchiveInspection({...args,saved:partial});assert.deepEqual(c.snapshot(),partial);
const corrupt=structuredClone(partial);corrupt.order.completed=['cn-archive-volume-6'];assert(!c.restore(corrupt));assert(createArchiveInspection({...args,saved:corrupt}).loadError);
until(()=>c.state().order.stage==='settle');assert.equal(account.account('cn-rest').bank,0);assert(Math.hypot(n.root.position.x-ARCHIVE_HOME[0],n.root.position.z-ARCHIVE_HOME[2])<.15);
saveOK=false;tick();assert.equal(account.account('cn-rest').bank,0);assert.equal(c.state().order.stage,'settle');saveOK=true;tick();assert.equal(account.account('cn-rest').bank,8);assert.equal(world.order,null);assert.equal(funds.receipts.length,1);assert(observedWork>=180);assert(travelCalls>0);
for(let i=0;i<100;i++)tick();assert.equal(c.state().order,null);assert.equal(funds.receipts.length,1);assert(account.settle(proof()).replayed);assert(!account.settle(proof(0,'cn-other-reader',1)).ok);
const restored=createArchiveAccount({saved:funds});assert.equal(restored.loadError,null);assert.deepEqual(restored.snapshot(),funds);
const guest=createNPCGuestAccounts([{id:'china-archive-accounts',economy:account}],{saveState:()=>true});
const payment=account.prepareMealPayment({actorId:'cn-rest',orderId:'cn-tavern-order-1',amount:6});assert(payment.ok&&payment.commit().ok);assert.equal(guest.account('cn-rest').bank,2);
const refund=account.prepareMealRefund({actorId:'cn-rest',orderId:'cn-tavern-order-1',amount:6});assert(refund.ok&&refund.commit().ok);assert.equal(guest.account('cn-rest').bank,8);assert(createArchiveAccount({saved:funds}).loadError===null);
const bad=structuredClone(funds);bad.receipts[0].evidence.steps[0].checkedSeconds=0;const rejected=createArchiveAccount({saved:bad});assert(rejected.loadError);assert.deepEqual(rejected.snapshot(),bad);assert.equal(rejected.account('cn-rest'),null);
// No accumulated offline jobs. Only the presently observed new day gets a job.
day=9;tick();assert.equal(c.state().order.contract.day,9);day=10;tick();assert.equal(c.state().order.contract.day,9);until(()=>c.state().order===null);assert.equal(funds.receipts.length,2);assert.equal(account.account('cn-rest').bank,16);
let release=false;const slot=createArchiveSlot({resolveActor:id=>id==='cn-rest'?n:null,canAssign:()=>true,canRelease:()=>release,saveState:()=>true});assert.equal(slot.resolve().holderId,'cn-rest');assert(!slot.assign('player').ok);assert(!slot.assign(null).ok);release=true;assert(slot.assign(null).ok);assert.equal(slot.resolve().status,'vacant');
console.log('PASS dormant archive six-volume contract, observed-contact gates, role pause, saved partial, unique pay retry, actual return gate, original-source meal/refund, strict corruption, no offline catch-up. Navigation/contact doubles only; no main, needs or production physical claims.');
