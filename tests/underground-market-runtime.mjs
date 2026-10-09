import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameCurrencyLedger} from '../source/game/currency-ledger.js';
import {createUndergroundMarketLedger} from '../source/game/underground-market-ledger.js';
import {createUndergroundMarketRuntime,MARKET_MERCHANT_ID} from '../source/game/underground-market-runtime.js';
import {resetSocialHolds,socialHoldOwner,holdSocialActors} from '../source/game/npc-social-ownership.js';
// Explicitly staged close-up actors exercise adapter contracts, not natural travel.
function fixture(saved={}){
 resetSocialHolds();let rt,eco,ok=true,canBorrow=true,visible=true,paused=false,available=true,pursuit=false,clock=0;
 const messages=[],actor=(id,z)=>({station:{id,npcName:id},root:{position:{x:0,y:0,z,toArray(){return[this.x,this.y,this.z];}},rotation:{y:0}},route:[],alive:true,animate(){}});
 const p=actor('player',1.5),n=actor(MARKET_MERCHANT_ID,0),place={merchant:{position:[0,0,0]},interaction:{position:[0,0,1.5]},setStock(){}};
 const storage={setItem(k,v){if(!ok)return false;Object.assign(saved,JSON.parse(v));return true;}};
 const money=createGameCurrencyLedger({saved,storage,transactionParticipant:tx=>eco?.prepareCurrencyCommit(tx)});
 if(!saved.copperLedger)assert(money.earn(40,'runtime-fixture-existing-wages').ok);
 const persist=(key,x)=>{if(!ok)return false;saved[key]=structuredClone(x);return true;};
 eco=createUndergroundMarketLedger({saved:saved.undergroundMarket,copperLedger:money,saveState:s=>persist('undergroundMarket',s),verifyAction:x=>rt.verifyAction(x)});
 rt=createUndergroundMarketRuntime({lot:{blackMarket:place},getActors:()=>[p,n],getPlayer:()=>p,economy:eco,getCrime:()=>({model:{status:()=>({detained:false,status:pursuit?'pursuit':'clear'})},status:()=>({heldItems:[]})}),canBorrow:()=>canBorrow,canContinue:()=>available,playerAvailable:()=>available,canSee:()=>visible,planPath:()=>[],moveActor(){},doors:{},poseContext:()=>({}),stopPlayer(){},saveState:s=>persist('undergroundMarketSession',s),saved:saved.undergroundMarketSession,notify:m=>messages.push(m),isPaused:()=>paused});
 const step=(seconds=.1)=>{for(let i=0;i<Math.ceil(seconds/.1);i++){clock+=.1;rt.update(.1,clock);}};
 const select=(kind,id)=>{const x=rt.choices().find(c=>c.kind===kind&&(!id||c.itemId===id));assert(x,`missing ${kind}`);return rt.interact(x);};
 return {rt,eco,money,p,n,saved,messages,step,select,setSave:x=>ok=x,setBorrow:x=>canBorrow=x,setSight:x=>visible=x,setPaused:x=>paused=x,setAvailable:x=>available=x,setPursuit:x=>pursuit=x};
}
const book='cn-market-old-book-1',paper='cn-market-old-paper-1';
function open(f){assert(f.rt.invite());f.step();assert.equal(f.rt.state().session.stage,'open');}
test('same original idle merchant is leased, finite trade requires two real seconds and actual counter proximity',()=>{
 const f=fixture();f.setBorrow(false);assert(f.rt.invite());assert.equal(f.rt.state().session.stage,'waiting');assert.equal(socialHoldOwner(MARKET_MERCHANT_ID),null);f.setBorrow(true);f.step();assert.equal(f.rt.state().session.stage,'open');assert.equal(socialHoldOwner(MARKET_MERCHANT_ID),'underground-market:china');assert(f.select('buy',book));f.step(1);assert.equal(f.money.balances().copper.cash,40);f.step(1.2);assert.equal(f.money.balances().copper.cash,34);assert.equal(f.eco.view().merchantCash,6);assert.equal(f.eco.view().inventory[0].id,book);assert(f.select('sell',book));f.step(2.1);assert.equal(f.money.balances().copper.cash,37);assert.equal(f.eco.view().merchantCash,3);assert.equal(f.eco.view().items.length,5);f.rt.dispose();assert.equal(socialHoldOwner(MARKET_MERCHANT_ID),null);
});
test('walking away, cancel and lost sight never create early transfers; unchanged identity cannot be replaced',()=>{
 const f=fixture();open(f);assert(f.select('buy',book));f.step(.5);f.p.root.position.x=1;f.step();assert.equal(f.rt.activeAction(),null);assert.equal(f.money.balances().copper.cash,40);f.p.root.position.x=0;assert(f.select('buy',book));assert(f.rt.cancelAction());f.step(3);assert.equal(f.eco.view().merchantCash,0);assert(f.select('buy',book));f.setSight(false);f.step();assert.equal(f.rt.activeAction(),null);f.n.lifeId='replacement';f.step();assert.equal(f.rt.state().session,null);assert.equal(f.rt.invite(),false);f.rt.dispose();
});
test('work is backed by finite merchant copper, takes eight seconds, consumes one old paper and survives reload without offline work',()=>{
 let f=fixture();open(f);assert.equal(f.select('work',paper),false);assert.equal(f.eco.view().merchantCash,0);assert(f.select('buy',book));f.step(2.1);assert(f.select('work',paper));f.step(3);assert.equal(f.eco.view().active.kind,'work');const saved=structuredClone(f.saved);f.rt.dispose();f=fixture(saved);assert(f.rt.activeAction().elapsed<8);f.step(4);assert.equal(f.eco.view().items.find(i=>i.id===paper).kind,'old-paper');f.step(8-f.rt.activeAction().elapsed+.2);assert.equal(f.eco.view().items.find(i=>i.id===paper).kind,'writing-paper');assert.equal(f.money.balances().copper.cash,36);assert.equal(f.eco.view().merchantCash,4);f.step(5);assert.equal(f.money.balances().copper.cash,36);f.rt.dispose();
});
test('cancelled work returns the reserved cash and retained material; storage failure cannot hand over goods',()=>{
 const f=fixture();open(f);assert(f.select('buy',book));f.step(2.1);assert(f.select('work',paper));f.step(2);assert(f.rt.cancelAction());assert.equal(f.eco.view().active,null);assert.equal(f.eco.view().items.find(i=>i.id===paper).kind,'old-paper');assert(f.select('sell',book));f.setSave(false);f.step(2.1);assert.equal(f.money.balances().copper.cash,34);assert.equal(f.eco.view().inventory[0].id,book);f.setSave(true);f.step(.2);f.rt.dispose();
});
test('read-only menu interruption cancels uncompleted work and releases temporary ownership on unavailability',()=>{
 const f=fixture();open(f);assert(f.select('buy',book));f.setPaused(true);f.step(2.1);assert.equal(f.money.balances().copper.cash,40);assert.equal(f.rt.activeAction(),null);f.setAvailable(false);f.step();assert.equal(f.rt.state().session,null);assert.equal(socialHoldOwner(MARKET_MERCHANT_ID),null);f.rt.dispose();
});

test('patrol ownership is yielded immediately even when session save fails, without spending protected wages',()=>{
 const f=fixture();open(f);assert(f.select('buy',book));f.step(2.1);assert(f.select('work',paper));f.step(.5);f.setSave(false);f.setPursuit(true);f.step();assert.equal(socialHoldOwner(MARKET_MERCHANT_ID),null);assert.equal(f.rt.owns(f.n),false);assert.equal(f.money.balances().copper.cash,34);assert.equal(f.eco.view().active.kind,'work');f.setPursuit(false);f.step();assert.equal(socialHoldOwner(MARKET_MERCHANT_ID),null);assert(holdSocialActors([MARKET_MERCHANT_ID],'crime:china'));f.n.route=[{x:9,y:0,z:9}];f.setSave(true);f.step();assert.equal(f.rt.state().session,null);assert.equal(f.eco.view().active,null);assert.equal(f.eco.view().items.find(i=>i.id===paper).kind,'old-paper');assert.deepEqual(f.n.route,[{x:9,y:0,z:9}]);assert.equal(socialHoldOwner(MARKET_MERCHANT_ID),'crime:china');f.rt.dispose();
});
