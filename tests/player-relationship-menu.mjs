import assert from 'node:assert/strict';
import {test} from 'node:test';
import {PLAYER_CONVERSATION_TOPICS} from '../source/game/player-conversation-ledger.js';
import {RELATIONSHIP_INTERACTIONS} from '../source/game/relationship-interactions.js';
import {conversationTopicLabel} from '../source/game/npc-social.js';
import {createPlayerConversationUI} from '../source/game/player-conversation-ui.js';
class E{constructor(tag){this.tagName=tag;this.children=[];this.attrs={};this.open=false;}append(...els){this.children.push(...els);}replaceChildren(...els){this.children=[...els];}setAttribute(k,v){this.attrs[k]=v;}addEventListener(k,f){this[k]=f;}showModal(){this.open=true;}close(){this.open=false;}remove(){} }
const all=e=>[e,...e.children.flatMap(all)];
function setup({privateAvailable=true,offeredTopicId=null,available=null,country='china',pending=false}={}){
 const choices=[],doc={head:new E('head'),body:new E('body'),createElement:t=>new E(t)};let state=null;
 const social={begin:()=>state={id:'resident-1',name:'明月',stage:'choosing',reply:'记得上次一起聊书。',offeredTopicId},state:()=>state,pending:()=>pending,relationship:()=>({stage:'affection',privatePlaceAvailable:privateAvailable}),topics:()=>available||[{id:'work',label:'工作'},{id:'art',label:'书画'},{id:'rest',label:'休息'},{id:'gratitude',label:'认真道谢'},...(privateAvailable?[{id:'private-company',label:'询问是否愿意私下亲近',private:true}]:[])],choose:(id,options)=>{choices.push({id,...options});state.stage=id==='private-company'&&!options.explicitConsent?'awaiting-consent':'talking';},end:()=>{state=null;}};
 const ui=createPlayerConversationUI({getSocial:()=>social,getCountry:()=>country,document:doc}),dialog=doc.body.children[0];
 return {ui,dialog,choices,social,find:id=>all(dialog).find(e=>e.attrs['data-conversation-topic']===id),texts:()=>all(dialog).map(e=>e.textContent||'').join(' ')};
}
test('only runtime-unlocked topics appear; original topic selectors remain; no private action when place unavailable',()=>{const f=setup({privateAvailable:false});assert(f.ui.open({}));for(const id of ['work','art','rest','gratitude'])assert(f.find(id));assert(!f.find('private-company'));assert(!f.find('confide'));assert.match(f.texts(),/互有好感/);assert.match(f.texts(),/上次一起聊书/);assert.match(f.texts(),/没有.*私密空间/);f.ui.dispose();});
test('private offer receives NPC response before current occasion confirmation; cancellation creates no consent',()=>{const f=setup();f.ui.open({});f.find('private-company').onclick();assert(f.ui.isOpen());f.ui.update();assert(f.ui.isOpen());assert.deepEqual(f.choices,[{id:'private-company',initiator:'player'}]);assert.match(f.texts(),/现在与明月/);assert.match(f.texts(),/双方都可以拒绝/);assert.match(f.texts(),/撤回/);f.ui.close();assert.equal(f.choices.length,1);assert.equal(f.social.state(),null);});
test('fresh private confirmation is explicit and stale clicks cannot replay it',()=>{const f=setup();f.ui.open({});f.find('private-company').onclick();const confirm=f.find('private-company');assert.equal(confirm.attrs['data-conversation-consent'],'current-occasion');confirm.onclick();assert.deepEqual(f.choices[1],{id:'private-company',initiator:'player',explicitConsent:true});assert(!f.ui.isOpen());confirm.onclick();assert.equal(f.choices.length,2);});
test('NPC invitation acceptance marks NPC initiator without automatic consent; decline records no choice',()=>{const f=setup({offeredTopicId:'private-company'});f.ui.openInvitation({},'private-company');f.find('private-company').onclick();assert.deepEqual(f.choices,[{id:'private-company',initiator:'npc'}]);assert(f.ui.isOpen());f.ui.close();const g=setup({offeredTopicId:'gratitude'});g.ui.openInvitation({},'gratitude');g.ui.close();assert.equal(g.choices.length,0);});
test('choosing another topic from an invitation is player initiated',()=>{const f=setup({offeredTopicId:'gratitude'});f.ui.openInvitation({},'gratitude');f.find('work').onclick();assert.equal(f.choices[0].initiator,'player');});

// UI grouping must never become an unlock list or discard a new runtime action.
test('all runtime choices remain available exactly once, grouped by meaning across country labels',()=>{
 const available=[...PLAYER_CONVERSATION_TOPICS,...RELATIONSHIP_INTERACTIONS,{id:'future-topic',label:'运行时提供的新话题'}];
 for(const country of ['china','japan','egypt','france']){
  const f=setup({available,country});f.ui.open({station:{npcLabel:'原岗位'}});
  const choices=all(f.dialog).filter(e=>e.attrs['data-conversation-topic']);
  assert.deepEqual(choices.map(e=>e.attrs['data-conversation-topic']).sort(),available.map(t=>t.id).sort());
  for(const topic of PLAYER_CONVERSATION_TOPICS)assert.equal(f.find(topic.id).children[0].children[0].textContent,conversationTopicLabel(topic.id,country));
  const groups=all(f.dialog).filter(e=>e.attrs['data-conversation-group']);
  assert.deepEqual(groups.map(e=>e.attrs['data-conversation-group']),['everyday','care','connection','boundaries','company','other']);
  for(const [group,id] of [['care','trade-advice'],['boundaries','boundary'],['connection','shared-memory'],['company','private-company']])assert(all(groups.find(e=>e.attrs['data-conversation-group']===group)).includes(f.find(id)));
  assert.match(f.texts(),/原岗位/);assert.match(f.texts(),/当次愿意/);assert.match(f.texts(),/不代表对方一定支持/);f.ui.dispose();
 }
});
test('an existing invitation is the first distinct choice and is never duplicated in other groups',()=>{
 const f=setup({available:[...PLAYER_CONVERSATION_TOPICS,...RELATIONSHIP_INTERACTIONS],offeredTopicId:'shared-memory'});f.ui.openInvitation({},'shared-memory');
 const sections=all(f.dialog).filter(e=>e.attrs['data-conversation-group']),choices=all(f.dialog).filter(e=>e.attrs['data-conversation-topic']);
 assert.equal(sections[0].attrs['data-conversation-group'],'invitation');assert.equal(choices[0].attrs['data-conversation-topic'],'shared-memory');assert.equal(choices.filter(e=>e.attrs['data-conversation-topic']==='shared-memory').length,1);
 assert.match(f.texts(),/回应邀请：回忆上次相处/);f.find('shared-memory').onclick();assert.deepEqual(f.choices,[{id:'shared-memory',initiator:'npc'}]);
});
test('pending persistence presents only the existing retry, never normal topic choices',()=>{
 const f=setup({pending:true});f.ui.open({});assert.match(f.texts(),/补记刚才的交谈/);assert.equal(all(f.dialog).filter(e=>e.attrs['data-conversation-topic']).length,0);f.ui.dispose();
});
