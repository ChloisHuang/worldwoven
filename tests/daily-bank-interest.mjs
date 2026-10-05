// Daily-minimum accounting is shared by wages, cash/FX and ownership transfers.
// These checks target double-credit, late deposits, migration and atomic saves.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createCurrencyLedger, createGameCurrencyLedger} from '../source/game/currency-ledger.js';
import {createSimulationClock, GAME_MINUTES_PER_SECOND} from '../source/game/simulation-clock.js';
import {walletTransactionView} from '../source/game/wallet.js';
const copy = x => JSON.parse(JSON.stringify(x));
const legacy = (bank=0,cash=0) => ({version:1,cash,bank,accountOpened:bank>0,nextTransaction:1,transactions:[]});
const wage = (amount,receiptId='salary',currency='copper',day=0) => ({amount,receiptId,currency,roleId:'clerk',slotId:'one',day});
const rejected = (r,code) => {assert.equal(r.ok,false);assert.equal(r.code,code);};
function fixture({saved=legacy(),day=0}={}) {
  const clock={day},events=[],control={failure:null,writes:0,durable:copy(saved)};
  const ledger=createCurrencyLedger({saved,getClock:()=>clock,onTransaction:tx=>events.push(tx),saveState:next=>{
    control.writes++;
    if(control.failure==='throw')throw Error('quota');
    if(control.failure==='false')return false;
    if(control.failure==='promise')return Promise.reject(Error('offline'));
    control.durable=copy(next);
  }});
  return {ledger,clock,events,control};
}
const interest = ledger => ledger.history().filter(t=>t.action==='interest');

test('each currency earns floor(daily minimum / 100), with explicit bank receipts',()=>{
  const seed=createCurrencyLedger({saved:legacy(100),saveState:()=>{}});
  assert(seed.creditWageToBank(wage(250,'japan','japan')).ok);
  assert(seed.creditWageToBank(wage(99,'egypt','egypt')).ok);
  assert(seed.creditWageToBank(wage(199,'france','france')).ok);
  const f=fixture({saved:seed.state(),day:17});
  assert(f.ledger.observeDay().ok);assert.equal(interest(f.ledger).length,0);
  f.clock.day++;assert(f.ledger.observeDay().ok);
  assert.deepEqual(interest(f.ledger).map(t=>[t.currency,t.amount,t.principal,t.day]),[
    ['copper',1,100,17],['japan',2,250,17],['france',1,199,17],
  ]);
  assert.deepEqual(Object.values(f.ledger.balances()).map(b=>b.bank),[101,252,99,200]);
  assert.deepEqual(Object.values(f.ledger.balances()).map(b=>b.cash),[0,0,0,0]);
  for(const tx of interest(f.ledger)){
    assert.equal(tx.requestId,`bank-interest:17:${tx.currency}`);assert.equal(tx.bankDay,18);
    const view=walletTransactionView(tx);
    assert.equal(view.title,'每日利息');assert.match(view.detail,/日息1%/);assert.match(view.detail,/已到账银行/);
    assert.deepEqual(view.route,['interest','bank']);assert.equal(view.badge,`+${tx.amount} ${tx.currency==='copper'?'文':'券'}`);
  }
  assert.equal(fixture({saved:f.control.durable,day:18}).ledger.loadError,null);
});

test('a zero opening balance and same-day wages/deposits earn nothing until a full following day',()=>{
  const f=fixture();assert(f.ledger.observeDay().ok);
  assert(f.ledger.creditWageToBank(wage(250)).ok);
  assert(f.ledger.earn(750,'cash').ok);assert(f.ledger.deposit(750,'deposit').ok);
  assert.equal(f.ledger.state().interest.minimum.copper,0);
  f.clock.day=1;assert(f.ledger.observeDay().ok);
  assert.equal(f.ledger.state().bank,1000);assert.equal(interest(f.ledger).length,0);
  const loaded=fixture({saved:f.control.durable,day:1});assert.equal(loaded.ledger.loadError,null);
  assert(loaded.ledger.observeDay().replayed);
  loaded.clock.day=2;assert(loaded.ledger.observeDay().ok);
  assert.equal(loaded.ledger.state().bank,1010);assert.equal(interest(loaded.ledger)[0].amount,10);
  assert(loaded.ledger.observeDay().replayed);assert.equal(loaded.ledger.state().bank,1010);
});

test('withdrawal, cash FX, redeposit and wages cannot lift the lowest bank balance',()=>{
  const f=fixture({saved:legacy(1000,1000)});assert(f.ledger.observeDay().ok);
  assert(f.ledger.deposit(1000,'late-deposit').ok);assert.equal(f.ledger.state().interest.minimum.copper,1000);
  assert(f.ledger.withdraw(1750,'withdraw').ok);assert.equal(f.ledger.state().interest.minimum.copper,250);
  const q=f.ledger.quoteExchange({from:'copper',to:'japan',amount:500});assert(q.ok);
  assert(f.ledger.exchange({quote:q.quote,requestId:'exchange'}).ok);
  assert(f.ledger.openAccount('open-japan','japan').ok);assert(f.ledger.deposit(250,'jp-deposit','japan').ok);
  assert(f.ledger.deposit(1250,'return-copper').ok);
  assert(f.ledger.creditWageToBank(wage(500,'late-salary')).ok);
  assert.deepEqual(f.ledger.state().interest.minimum,{copper:250,japan:0,egypt:0,france:0});
  const loaded=fixture({saved:f.control.durable,day:0});assert.equal(loaded.ledger.loadError,null);
  loaded.clock.day=1;assert(loaded.ledger.observeDay().ok);
  assert.deepEqual(interest(loaded.ledger).map(t=>[t.currency,t.principal,t.amount]),[['copper',250,2]]);
  assert.equal(loaded.ledger.balances().japan.bank,250);
});

test('purchase/invest lower the minimum while sale/draw do not restore lost interest',()=>{
  const f=fixture({saved:legacy(1000)});assert(f.ledger.observeDay().ok);
  for(const [operation,amount,minimum] of [['purchase',300,700],['sale',350,700],['invest',600,450],['draw',100,450]]){
    assert(f.ledger.transferBusiness({operation,amount,receiptId:operation}).ok);
    assert.equal(f.ledger.state().interest.minimum.copper,minimum);
  }
  f.clock.day=1;assert(f.ledger.observeDay().ok);
  assert.equal(interest(f.ledger)[0].amount,4);assert.equal(f.ledger.state().bank,554);
  assert.equal(fixture({saved:f.control.durable,day:1}).ledger.loadError,null);
});

test('several actual simulated days settle in order and interest compounds only next day',()=>{
  const f=fixture({saved:legacy(10000),day:6});assert(f.ledger.observeDay().ok);
  f.clock.day=9;assert(f.ledger.observeDay().ok);
  assert.deepEqual(interest(f.ledger).map(t=>[t.day,t.principal,t.amount]),[[6,10000,100],[7,10100,101],[8,10201,102]]);
  assert.equal(f.ledger.state().bank,10303);
  const writes=f.control.writes;assert(f.ledger.observeDay().replayed);assert.equal(f.control.writes,writes);
  const loaded=fixture({saved:f.control.durable,day:9});assert.equal(loaded.ledger.loadError,null);
  for(let country=0;country<4;country++)assert(loaded.ledger.observeDay().replayed);
  assert.equal(loaded.events.length,0);assert.equal(loaded.control.writes,0);
  rejected(loaded.ledger.observeDay(8),'clock-reversed');assert.equal(loaded.ledger.state().bank,10303);
});

test('every new transaction synchronizes the shared day before changing balances',()=>{
  const f=fixture({saved:legacy(250,100)});assert(f.ledger.observeDay().ok);
  f.clock.day=1;assert(f.ledger.deposit(100,'at-midnight').ok);
  assert.equal(f.ledger.state().bank,352);assert.equal(f.ledger.state().interest.minimum.copper,252);
  assert.equal(f.control.writes,2,'daily boundary and cash transfer persisted once');
  assert.deepEqual(f.events.map(t=>t.action),['interest','deposit']);
  assert.equal(fixture({saved:f.control.durable,day:1}).ledger.loadError,null);
});

test('v1 and v2 pre-interest saves initialize today without retroactive credit',()=>{
  const old=createCurrencyLedger({saved:legacy(250),saveState:()=>{}});assert(old.creditWageToBank(wage(50)).ok);
  for(const saved of [legacy(250),old.state()]){
    const f=fixture({saved,day:876});assert.equal(f.control.writes,0);assert(f.ledger.observeDay().ok);
    const opening=f.ledger.state().bank;assert.equal(interest(f.ledger).length,0);
    assert.equal(f.ledger.state().interest.startDay,876);
    f.clock.day++;assert(f.ledger.observeDay().ok);assert.equal(f.ledger.state().bank,opening+Math.floor(opening/100));
    assert.equal(interest(f.ledger).length,1);
    assert.equal(fixture({saved:f.control.durable,day:877}).ledger.loadError,null);
  }
});

test('simulation clock, reload and real wall time never manufacture offline days',()=>{
  const midnight=(1440-600)/GAME_MINUTES_PER_SECOND;
  let clock=createSimulationClock({version:1,seconds:midnight-.1});
  const game={simulationClock:clock.snapshot(),copperLedger:legacy(250)};let stored;
  let ledger=createGameCurrencyLedger({saved:game,storage:{setItem:(k,v)=>{stored=v;}},getClock:()=>clock.state()});
  assert(ledger.observeDay().ok);
  const realNow=Date.now;Date.now=()=>realNow()+366*24*60*60*1000;
  try{
    const reload=JSON.parse(stored);clock=createSimulationClock(reload.simulationClock);
    ledger=createGameCurrencyLedger({saved:reload,storage:{setItem:(k,v)=>{stored=v;}},getClock:()=>clock.state()});
    assert(ledger.observeDay().replayed);assert.equal(ledger.state().bank,250);
    clock.advance(.2);reload.simulationClock=clock.snapshot();assert(ledger.observeDay().ok);
    assert.equal(ledger.state().bank,252);assert.equal(JSON.parse(stored).simulationClock.seconds,clock.state().seconds);
    assert.equal(interest(ledger).length,1);
  }finally{Date.now=realNow;}
});

test('failed writes roll back all currencies, daily cursor and events, then retry exactly once',async()=>{
  for(const failure of ['throw','false','promise']){
    const f=fixture({saved:legacy(10000)});assert(f.ledger.observeDay().ok);
    const before=f.ledger.state(),durable=copy(f.control.durable);f.clock.day=3;f.control.failure=failure;
    rejected(f.ledger.observeDay(),failure==='promise'?'async-save-unsupported':'save-failed');
    assert.deepEqual(f.ledger.state(),before);assert.deepEqual(f.control.durable,durable);assert.equal(f.events.length,0);
    f.control.failure=null;assert(f.ledger.observeDay().ok);assert.equal(f.ledger.state().bank,10303);
    assert.equal(f.events.length,3);assert.equal(fixture({saved:f.control.durable,day:3}).ledger.loadError,null);
    assert(f.ledger.observeDay().replayed);assert.equal(f.events.length,3);
  }
  await Promise.resolve();
});

test('pending daily interest and a business participant fail and commit as one game snapshot',()=>{
  const game={copperLedger:legacy(250),unrelated:'retained'},clock={day:0};let fail=false,prepared=0,committed=0,stored,writes=0;
  const events=[],ledger=createGameCurrencyLedger({saved:game,getClock:()=>clock,storage:{setItem:(k,v)=>{writes++;if(fail)return false;stored=v;}},onTransaction:tx=>events.push(tx),transactionParticipant:tx=>{
    prepared++;assert.equal(tx.action,'business');return {patch:{propertyReceipt:tx.requestId},committed:()=>committed++};
  }});
  assert(ledger.observeDay().ok);assert.equal(prepared,0,'initialization never calls a business participant');
  const before=copy(game),state=ledger.state();clock.day=1;fail=true;
  const request={operation:'purchase',amount:100,receiptId:'property:one'};
  rejected(ledger.transferBusiness(request),'save-failed');assert.deepEqual(game,before);assert.deepEqual(ledger.state(),state);
  assert.equal(committed,0);assert.equal(events.length,0);
  fail=false;assert(ledger.transferBusiness(request).ok);assert.equal(committed,1);assert.equal(ledger.state().bank,152);
  assert.equal(game.propertyReceipt,'property:one');assert.equal(JSON.parse(stored).copperLedger.interest.day,1);
  assert.equal(JSON.parse(stored).unrelated,'retained');assert.deepEqual(events.map(t=>t.action),['interest','business']);
  assert(ledger.transferBusiness(request).replayed);assert.equal(committed,1);assert.equal(writes,3);
});

test('first initialization save failure leaves legacy state intact and no phantom interest',()=>{
  const f=fixture({saved:legacy(250),day:5}),before=f.ledger.state();f.control.failure='false';
  rejected(f.ledger.observeDay(),'save-failed');assert.deepEqual(f.ledger.state(),before);
  f.control.failure=null;assert(f.ledger.observeDay().ok);assert.equal(f.ledger.state().bank,250);
  assert.equal(interest(f.ledger).length,0);
});

test('corrupt minima, missing/duplicated payouts, rate and principal lock the account',()=>{
  const f=fixture({saved:legacy(250,200)});assert(f.ledger.observeDay().ok);
  assert(f.ledger.deposit(100,'deposit').ok);f.clock.day=2;assert(f.ledger.observeDay().ok);
  for(const corrupt of [
    s=>s.interest.minimum.copper++,s=>s.interest.minimum.copper--,s=>s.interest.day++,
    s=>s.transactions.splice(1,1),s=>s.transactions.push(copy(s.transactions.at(-1))),
    s=>s.transactions[1].principal++,s=>s.transactions[1].ratePercent=2,s=>s.transactions[0].bankDay=1,
  ]){
    const saved=copy(f.control.durable);corrupt(saved);
    const broken=fixture({saved,day:2});assert.equal(broken.ledger.loadError,'invalid-saved-state');
    rejected(broken.ledger.observeDay(),'invalid-saved-state');assert.equal(broken.control.writes,0);assert.equal(broken.ledger.balances(),null);
  }
});

test('sub-unit interest produces no payment and long empty spans restore without invented receipts',()=>{
  const f=fixture({saved:legacy(99)});assert(f.ledger.observeDay().ok);f.clock.day=1000000;assert(f.ledger.observeDay().ok);
  assert.equal(interest(f.ledger).length,0);assert.equal(f.ledger.state().bank,99);
  assert.equal(fixture({saved:f.control.durable,day:1000000}).ledger.loadError,null);
});
