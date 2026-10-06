// Test the new financial boundary, not a frame-perfect copy of scene behavior:
// actual seat assignment, finite source, atomic failures and durable receipts.
import assert from 'node:assert/strict';
import {createCurrencyLedger} from '../source/game/currency-ledger.js';
import {createJapanStaffPayroll,japanStaffCoverage,JAPAN_STAFF_CAPITAL} from '../source/game/japan-staff-payroll.js';
const clone=structuredClone,full=[{actorId:'jp-sushi',slot:'kitchen'},{actorId:'jp-ramen',slot:'tableService'}];
const own=id=>id==='jp-sushi'?'kitchen':'tableService';
function worker(id,patch={}){return {id,position:[0,0,0],idleTarget:[0,0,0],canWork:true,task:{idle:true,arrived:true,to:[0,0,0]},...patch};}
const workers=[worker('jp-sushi'),worker('jp-ramen')];
assert.deepEqual(japanStaffCoverage({workers}),full);
assert.deepEqual(japanStaffCoverage({workers,duties:{kitchen:'active'}}),[full[1]]);
assert.deepEqual(japanStaffCoverage({workers,duties:{tableService:'paused'}}),full);
assert.deepEqual(japanStaffCoverage({workers,duties:{kitchen:'draining'}}),[full[1]]);
for(const patch of [{position:[0,3.8,0]},{position:[1,0,0]},{paused:true},{mounted:true},{heldMeeting:true},{cooldown:true},{task:{idle:true,arrived:true,to:[0,0,0],kitchenMeeting:true}}])assert.deepEqual(japanStaffCoverage({workers:[worker('jp-sushi',patch)]}),[]);
const job=(id,kind='cook',patch={})=>worker(id,{task:{orderJobId:id+':order'},claim:{id:id+':order',workerId:id,kind},onTaskRoute:true,...patch});
assert.deepEqual(japanStaffCoverage({workers:[job('jp-sushi','cook',{canWork:false})],rotation:{id:'jp-sushi',phase:'draining'},duties:{kitchen:'draining'}}),[full[0]],'Old real task drains while canWork is false');
assert.deepEqual(japanStaffCoverage({workers:[job('jp-sushi','cook',{onTaskRoute:false})]}),[],'A stale off-route claim does not earn');
assert.deepEqual(japanStaffCoverage({workers:[job('jp-sushi'),job('jp-ramen')]}),[full[0]],'Same seat cannot earn twice');
assert.deepEqual(japanStaffCoverage({workers:[worker('jp-sushi'),job('jp-ramen')]}),[{actorId:'jp-ramen',slot:'kitchen'}],'A real guest cook takes priority over an idle seat owner');
assert.deepEqual(japanStaffCoverage({workers:[job('jp-ramen','serve',{position:[1,3.8,2]})]}),[full[1]],'Original upstairs serving route is still duty');
const rotation={id:'jp-sushi',reliefId:'jp-ramen',phase:'meal',retireReady:true,reliefReady:true,npcReliefReady:true,externalCoverage:false};
assert.deepEqual(japanStaffCoverage({workers,rotation}),[full[1]],'One worker covering both never stacks rates');
assert.deepEqual(japanStaffCoverage({workers,rotation,duties:{tableService:'active'}}),[{actorId:'jp-ramen',slot:'kitchen'}]);
for(const patch of [{phase:'handoff'},{npcReliefReady:false},{externalCoverage:true},{retireReady:false}])assert.deepEqual(japanStaffCoverage({workers,rotation:{...rotation,...patch},duties:{tableService:'active'}}),[],'Relief requires the original completed NPC handoff');

function fixture(){
 let seconds=(1440+360-600)/.7,durable,reject=null,writes=0;
 const clock=()=>({seconds,day:Math.floor((600+seconds*.7)/1440),hour:(600+seconds*.7)%1440/60});
 const player=createCurrencyLedger({getClock:clock,saveState:()=>true});
 assert(player.creditWageToBank({amount:2000,receiptId:'player-earned',currency:'japan',roleId:'test-role',slotId:'test-seat',day:1}).ok);
 assert(player.withdraw(2000,'cash-for-services','japan').ok);
 function receipt(id,amount=6,currency='japan',finish='settle'){assert(player.reserve(amount,id,currency).ok);if(finish)assert(player[finish](id).ok);}
 receipt('jp-dining-7-1');
 const config={playerLedger:player,getClock:clock,saveState:state=>{writes++;if(reject==='throw')throw Error('quota');if(reject==='false')return false;if(reject==='promise')return Promise.reject(Error('offline'));durable=clone(state);}};
 let payroll=createJapanStaffPayroll(config);assert.equal(payroll.loadError,null);assert(payroll.flush().ok);
 const tick=(dt=.25,coverage=full)=>{seconds+=dt;return payroll.tick(dt,coverage);};
 const until=(day,hour,coverage=full)=>{const end=(day*1440+hour*60-600)/.7;while(seconds<end-1e-7)tick(Math.min(.25,end-seconds),coverage);};
 return {player,receipt,clock,tick,until,get payroll(){return payroll;},get durable(){return durable;},get writes(){return writes;},reject:value=>{reject=value;},jump(day,hour){seconds=(day*1440+hour*60-600)/.7;},reload(){payroll.dispose();payroll=createJapanStaffPayroll({...config,saved:durable});return payroll;},restore(saved){return createJapanStaffPayroll({...config,saved});}};
}
const f=fixture();
assert.equal(f.payroll.state().till,JAPAN_STAFF_CAPITAL.amount);
assert.equal(f.payroll.account('jp-sushi').bank,0,'Opening capital is not an NPC gift');
assert.equal(f.payroll.state().income.length,0,'Already settled historical receipts are not backfilled');
f.until(1,12,[full[0]]);f.until(1,18,[{actorId:'jp-sushi',slot:'tableService'}]);
assert.equal(f.payroll.account('jp-sushi').bank,16,'Half actual cook, half actual serving: one weighted invoice');
assert.equal(f.payroll.account('jp-ramen').bank,0);
assert.equal(f.payroll.state().invoices.length,1);
assert.equal(f.payroll.state().till,208);
assert(f.reload().loadError===null);f.tick(.25,[]);assert.equal(f.payroll.account('jp-sushi').bank,16,'Reload does not repay the day');
f.until(2,6,[]);f.until(2,18);assert.equal(f.payroll.account('jp-sushi').bank,34);assert.equal(f.payroll.account('jp-ramen').bank,14);
f.until(3,6,[]);f.until(3,12);f.payroll.flush();const earned=f.payroll.state().invoices.find(r=>r.actorId==='jp-sushi'&&r.day===3).seconds.kitchen;
f.jump(4,12);f.reload();f.tick(.25,[]);assert.equal(f.payroll.state().invoices.find(r=>r.actorId==='jp-sushi'&&r.day===3).seconds.kitchen,earned,'No unloaded hours or missing day backfill');
assert.equal(f.payroll.state().invoices.filter(r=>r.day===4).length,0);

const sources=fixture();
sources.receipt('jp-dining-7-22',6,'japan',null);sources.tick(.25,[]);assert.equal(sources.payroll.state().income.length,0);
assert(sources.player.refund('jp-dining-7-22').ok);sources.tick(.25,[]);assert.equal(sources.payroll.state().till,224);
sources.receipt('jp-performance-7-1-23:act',12);sources.receipt('jp-performance-7-1-23:drink',4);sources.tick(.25,[]);
assert.equal(sources.payroll.state().till,240);assert.equal(sources.payroll.state().income.length,2);
assert(sources.player.settle('jp-performance-7-1-23:act').replayed);sources.tick(.25,[]);sources.reload();assert.equal(sources.payroll.state().till,240);
assert(sources.player.earn(20,'old-copper-funds').ok);sources.receipt('jp-dining-7-24',6,'copper');sources.receipt('unrelated-japan-25',6);sources.tick(.25,[]);assert.equal(sources.payroll.state().till,240,'Old copper and unrelated services are not bathhouse revenue');

for(const mode of ['false','throw','promise']){
 const bad=fixture();bad.until(1,17.99);bad.reject(mode);bad.until(1,18);
 assert.equal(bad.payroll.account('jp-sushi').bank,0);assert.equal(bad.payroll.account('jp-ramen').bank,0);assert.equal(bad.payroll.state().till,224);assert.equal(bad.payroll.state().arrears.length,2);
 bad.reject(null);assert(bad.payroll.flush().ok);assert.equal(bad.payroll.account('jp-sushi').bank,18);assert.equal(bad.payroll.account('jp-ramen').bank,14);
 bad.reload();assert(bad.payroll.flush().ok);assert.equal(bad.payroll.account('jp-sushi').bank,18);
}
const retry=fixture();retry.reject('false');retry.receipt('jp-dining-7-80');retry.tick(.1,[]);const attempts=retry.writes;for(let i=0;i<50;i++)retry.tick(.01,[]);assert.equal(retry.writes,attempts,'A failed full-world save is not retried every frame');retry.reject(null);assert(retry.payroll.flush().ok);
await Promise.resolve();
const debt=fixture();
for(let day=1;day<=8;day++){debt.until(day,6,[]);debt.until(day,18);}
assert.equal(debt.payroll.state().till,0);assert.equal(debt.payroll.state().arrears.length,2);assert.equal(debt.payroll.state().invoices.filter(r=>r.paid).length,14);
assert.equal(debt.payroll.state().invoices.filter(r=>r.day===8&&r.paid).length,0);
const initialCapital=debt.payroll.state().capital;
debt.receipt('jp-dining-7-60',14);debt.tick(.25,[]);assert.equal(debt.payroll.state().arrears.length,1,'Fixed day/actor FIFO pays Daichi first');assert.equal(debt.payroll.state().arrears[0].actorId,'jp-sushi');
debt.receipt('jp-performance-7-2-61:act',17);debt.tick(.25,[]);assert.equal(debt.payroll.state().till,17);assert.equal(debt.payroll.state().arrears.length,1);
debt.reject('false');debt.receipt('jp-performance-7-2-61:drink',1);debt.tick(.25,[]);assert.equal(debt.payroll.state().till,17);assert.equal(debt.payroll.state().arrears.length,1,'Failed source import cannot pay debt');
debt.reject(null);debt.reload();assert(debt.payroll.flush().ok);assert.equal(debt.payroll.state().till,0);assert.equal(debt.payroll.state().arrears.length,0);assert.deepEqual(debt.payroll.state().capital,initialCapital);
const future=clone(sources.durable);const futureOwner=createCurrencyLedger({saved:future.accounts['jp-sushi'],getClock:()=>({day:sources.clock().day+3}),saveState:state=>{future.accounts['jp-sushi']=state;}});assert(futureOwner.observeDay().ok);assert.equal(sources.restore(future).loadError,'invalid-japan-payroll','Owner interest cannot run ahead of the shared world day');
const restored=debt.durable;assert.equal(debt.restore(restored).loadError,null);
for(const corrupt of [s=>{s.till++;},s=>{s.income[0].amount++;},s=>{s.invoices[0].seconds.kitchen+=1000;},s=>{s.invoices[0].paid=false;},s=>{s.accounts.bogus=s.accounts['jp-sushi'];delete s.accounts['jp-sushi'];}]){const changed=clone(restored);corrupt(changed);assert.equal(debt.restore(changed).loadError,'invalid-japan-payroll');}
console.log('PASS actual seat/rate allocation, paid takeover, real handoff/route, continuous hours, weighted day salary, reload/no backfill, historical high water, settled-only source, bank/save atomicity and FIFO arrears funded by future receipts');
