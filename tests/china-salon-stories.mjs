// ST03's per-artist causality, receipt gates and failed-save replay are a
// durable logic regression. This does not claim browser, route or art QA.
import assert from 'node:assert/strict';
import {createGameCurrencyLedger} from '../source/game/currency-ledger.js';
import {createChinaSalonEconomy} from '../source/game/china-salon-economy.js';
import {SALON_ARTISTS} from '../source/game/china-tavern-salon-artists.js';
import {createChinaSalonStories,SALON_STORY_DEFINITIONS} from '../source/game/china-salon-stories.js';
const copy=value=>JSON.parse(JSON.stringify(value));
function fixture(input){
 const saved=copy(input||{copperLedger:{version:1,cash:10000,bank:0,accountOpened:false,nextTransaction:1,transactions:[]}});let economy,proof,serial=100,fail=false,storyWrites=0,reads=0,relation=0,stories;
 const ledger=createGameCurrencyLedger({saved,storage:{setItem(){return true;}},transactionParticipant:tx=>tx.action==='settle'?economy.prepareIncome(tx,proof):null});
 economy=createChinaSalonEconomy({saved:saved.chinaSalonEconomy,copperLedger:ledger});
 const options=()=>({saved:saved.chinaSalonStories,getReceipts:()=>{reads++;return economy.snapshot().receipts;},getRevision:()=>economy.snapshot().revision,getRelationship:()=>relation,saveState:next=>{storyWrites++;if(fail)return false;saved.chinaSalonStories=copy(next);return true;}});
 stories=createChinaSalonStories(options());
 function reserve(artist){const id=`cn-salon-1-${++serial}`,fee=100;assert(ledger.reserve(fee,id).ok);proof={id,actorId:artist.id,activity:artist.activity,fee,completed:false,incomePolicy:economy.policy()};return id;}
 function finish(artist){const id=reserve(artist);proof.completed=true;assert(ledger.settle(id).ok);return id;}
 return {saved,ledger,economy,finish,reserve,rejectIncomplete(){return ledger.settle(proof.id);},get stories(){return stories;},reload(){stories=createChinaSalonStories(options());assert.equal(stories.loadError,null);return stories;},get reads(){return reads;},get writes(){return storyWrites;},set fail(value){fail=value;},set relation(value){relation=value;}};
}
const allNames=new Set(),allRepertoires=new Set();
for(const artist of SALON_ARTISTS){
 const definition=SALON_STORY_DEFINITIONS[artist.id];assert.equal(definition.stages.length,3);allNames.add(definition.title);
 // Every binary decision of every artist is exercised, with subsequent real
 // sessions separating the decisions. This covers the 8 authored paths each.
 for(let path=0;path<8;path++){
  const f=fixture(),cash=f.ledger.balances().copper.cash;
  assert.equal(f.stories.view(artist.id).offer,null);assert.equal(f.stories.profile(artist.id).artLevel,0);
  assert.equal(f.stories.choose(artist.id,definition.stages[0].choices[0].id).ok,false);
  const cancelled=f.reserve(artist);assert.equal(f.rejectIncomplete().ok,false,'unperformed settlement is rejected by actual economy');assert.equal(f.stories.view(artist.id).offer,null);assert(f.ledger.refund(cancelled).ok);assert.equal(f.economy.snapshot().receipts.length,0);
  for(let stage=0;stage<3;stage++){
   const sessionId=f.finish(artist),view=f.stories.view(artist.id),choice=definition.stages[stage].choices[(path>>stage)&1],before=f.stories.profile(artist.id),balance=f.economy.account(artist.id).bank;
   assert.equal(view.stage,stage);assert.equal(view.offer.evidence.sessionId,sessionId);assert.equal(view.offer.choices.length,2);
   assert.equal(f.stories.choose(artist.id,choice.id,{offerId:'stale'}).code,'stale-story-offer');
   if(stage===1)assert(view.offer.text.includes(before.repertoire),'next chapter remembers the actually selected branch');
   const result=f.stories.choose(artist.id,choice.id,{offerId:view.offer.id});assert(result.ok);assert.equal(result.profile.artLevel,before.artLevel,'planning a new program alone cannot create skill');
   assert.equal(f.stories.profile(artist.id).positiveReviews,stage<1?0:((path>>1)&1)?0:1);
   assert.equal(f.stories.profile(artist.id).negativeReviews,stage<1?0:((path>>1)&1)?1:0);
   assert.equal(f.economy.account(artist.id).bank,balance,'story dialogue never moves money');
   const writes=f.writes;assert(f.stories.choose(artist.id,choice.id,{offerId:view.offer.id}).replayed);assert.equal(f.writes,writes);
   assert.equal(f.stories.view(artist.id).offer,null,'a new chapter requires work after this choice, not replaying its receipt');
   const profile=f.stories.profile(artist.id);assert(profile.serviceContent.length>20);assert(profile.repertoire.length>0);assert(profile.relationshipDelta>0);assert(profile.contentWeight>=0&&profile.contentWeight<=1);
   assert.equal(f.stories.profile(artist.id,{customerId:'cn-court-minister'}).relationshipDelta,0,'personal preference does not become a relationship with another patron');
   assert(!f.stories.profile(artist.id,{customerId:'cn-court-minister'}).serviceContent.includes('上回'));assert.equal(f.stories.profile(artist.id,{customerId:'cn-court-minister'}).contentWeight,.15,'an unrelated patron is not charged for the player-only repertoire');
   assert.deepEqual(f.reload().profile(artist.id),profile,'reload preserves branch and derived consequences exactly');
  }
  const view=f.stories.view(artist.id);assert(view.completed);assert.equal(view.history.length,3);assert.equal(view.profile.completedServices,3);assert.equal(view.profile.earned,150);assert.equal(f.ledger.balances().copper.cash,cash-300);
  allRepertoires.add(view.profile.repertoire);const old=view.profile.artLevel;f.finish(artist);assert(f.stories.profile(artist.id).artLevel>old,'actually performing selected final program matures its skill');
 }
}
assert.equal(allNames.size,4);assert.equal(allRepertoires.size,8);
console.log('PASS four authored artists, all 32 three-chapter paths: distinct programs, actual practice, honest reviews, differing preferences and lasting repertoire');
{
 const f=fixture(),artist=SALON_ARTISTS[0];f.finish(artist);f.finish(artist);f.finish(artist);let view=f.stories.view(artist.id);const selected=view.offer.choices[0];
 f.fail=true;const before=f.stories.snapshot();assert.equal(f.stories.choose(artist.id,selected.id,{offerId:view.offer.id}).code,'story-save-failed');assert.deepEqual(f.stories.snapshot(),before);assert.deepEqual(f.reload().snapshot(),before);
 f.fail=false;assert(f.stories.choose(artist.id,selected.id,{offerId:view.offer.id}).ok);assert.equal(f.stories.view(artist.id).offer,null,'old three receipts cannot claim work after the chosen new program');f.finish(artist);assert(f.stories.view(artist.id).offer);
 f.relation=-.6;view=f.stories.view(artist.id);assert.equal(view.offer,null);assert.match(view.need,/不愿/);assert.equal(f.stories.choose(artist.id,SALON_STORY_DEFINITIONS[artist.id].stages[1].choices[0].id).ok,false);f.relation=0;
 assert.equal(f.stories.choose(artist.id,SALON_STORY_DEFINITIONS[artist.id].stages[1].choices[0].id,{customerId:'cn-court-minister'}).code,'story-player-choice-only');
 const reads=f.reads;for(let i=0;i<30;i++)for(const a of SALON_ARTISTS){f.stories.view(a.id);f.stories.profile(a.id);}assert.equal(f.reads,reads,'unchanged revision reuses receipt validation');
 const corrupt=copy(f.saved.chinaSalonStories);corrupt.journal[0].sessionId='cn-salon-1-999';const bad=createChinaSalonStories({saved:corrupt,getReceipts:()=>f.economy.snapshot().receipts});assert.equal(bad.loadError,'unverified-story-choice');assert.equal(bad.profile(artist.id),null);assert.deepEqual(bad.snapshot(),corrupt,'failed restore does not silently overwrite original evidence');
 const changed=copy(f.saved.chinaSalonStories);changed.journal[0].actorId=SALON_ARTISTS[1].id;assert(createChinaSalonStories({saved:changed,getReceipts:()=>f.economy.snapshot().receipts}).loadError);
 const missing=createChinaSalonStories({saved:f.saved.chinaSalonStories,getReceipts:()=>[]});assert(missing.loadError);assert.equal(missing.choose(artist.id,selected.id).ok,false);
}
console.log('PASS failed saves/retry/reload, receipt cutoffs, duplicate/stale choices, per-person isolation, negative relation refusal, corrupt evidence, cached unchanged reads');

assert.equal(createChinaSalonStories().view('__proto__'),null);assert.equal(createChinaSalonStories().choose('toString','unknown').ok,false);
