import assert from 'node:assert/strict';
import {createNPCPieceworkAccount} from '../source/game/npc-piecework-account.js';
import {PALACE_TEA_ROLE as role} from '../source/game/china-palace-tea-role.js';
import {createPalaceTeaOrders,PALACE_TEA_STEPS} from '../source/game/china-palace-tea-orders.js';
const namespace='chinaTeaAccounts';let persisted,saveOK=true;
const make=saved=>createNPCPieceworkAccount({role,namespace,proofKind:'npc-palace-tea-piecework',saved,saveState:(money,receipt,world)=>{if(!saveOK)return false;persisted={...structuredClone(world),[namespace]:structuredClone(money)};return true;}});
const account=make(),orders=createPalaceTeaOrders({saveState:()=>true});
assert.equal(account.account('cn-tea').bank,0);assert(!account.hasIncome('cn-tea'));
function job(day,actorId='cn-tea'){
 const order=orders.request({day,actorId,guestId:'cn-consort-yue',holderRevision:0,visitId:'visit-'+day,arrived:true,guestAsked:true,hostAccepted:true}).order;
 const evidence={requestId:order.id,actorId,guestId:order.guestId,holderRevision:0,visitId:order.visitId,cupId:order.cupId,trayId:order.trayId,observed:true};
 for(const stage of PALACE_TEA_STEPS.slice(1,-1))assert(orders.advance({...evidence,stage}).ok);
 return orders.prepareCompletion(evidence);
}
const completion=job(0),proof=completion.proof;
for(const mutate of [p=>p.actorId='player',p=>p.guestId='cn-emperor',p=>p.holderRevision=-1,p=>p.visitId='',p=>p.cupId='decoration',p=>p.day=1,p=>p.steps.pop(),p=>p.steps[1]='conversation',p=>p.amount=9,p=>p.extra=true,p=>p.contractVersion=0]){const bad=structuredClone(proof);mutate(bad);assert(!account.settle(bad).ok);}
saveOK=false;assert(!completion.commit((state,p)=>account.settle(p,{chinaTeaOrders:state})).ok);assert.equal(account.account('cn-tea').bank,0);assert.equal(orders.active().stage,'retrieved');saveOK=true;
assert(completion.commit((state,p)=>account.settle(p,{chinaTeaOrders:state})).ok);assert.equal(account.account('cn-tea').bank,8);assert.equal(persisted.chinaTeaOrders.orders[0].stage,'cleared');assert.equal(persisted.chinaTeaAccounts.accounts['cn-tea'].bank,8);
assert(account.settle(proof).replayed);assert(!account.settle({...proof,actorId:'cn-new-host',holderRevision:1}).ok);
const meal={actorId:'cn-tea',orderId:'cn-tavern-order-1',amount:6};assert(account.prepareMealPayment(meal).commit().ok);assert.equal(account.account('cn-tea').bank,2);assert(account.prepareMealRefund(meal).commit().ok);assert.equal(account.account('cn-tea').bank,8);assert(account.prepareMealRefund(meal).commit().replayed);assert.equal(account.account('cn-tea').bank,8);
const restored=make(account.snapshot());assert.equal(restored.loadError,null);assert.equal(restored.account('cn-tea').bank,8);assert(restored.settle(proof).replayed);
const bad=account.snapshot();bad.receipts[0].evidence.cupId='other';const broken=make(bad);assert(broken.loadError);assert.deepEqual(broken.snapshot(),bad);assert.equal(broken.account('cn-tea'),null);
const replacement=job(1,'cn-new-host');assert(replacement.commit((state,p)=>account.settle(p,{chinaTeaOrders:state})).ok);assert.equal(account.account('cn-new-host').bank,8);assert.equal(account.account('cn-tea').bank,8);
console.log('PASS exact tea proof, atomic original completion/pay, replay and replacement conflict, personal meal/refund, strict saved evidence');
