import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import {fixture} from './china-royal-kitchen.mjs';
import {ROYAL_KITCHEN_ROLE as R} from '../source/game/china-royal-kitchen-role.js';
import {createObjectInteractionAnchors} from '../source/game/object-interaction-anchors.js';
function anchors(f){f.jia.station.playerWorkTarget=[20,5,-6.7];const a=createObjectInteractionAnchors({actors:()=>[f.jia,f.guest,f.player],stations:()=>[f.jia.station],furniture:()=>[]});a.refresh();return a;}
test('royal current reviewer anchor/name/revision follows replacement, while the read-only registry remains a fixed counter',()=>{
 let holder={roleId:R.id,slotId:R.slotId,holderId:'cn-cooking',status:'npc',available:true,alive:true,revision:0};const f=fixture({}, {getHolder:()=>holder});f.jia.station.npcName='Jia';f.guest.station.npcName='新任厨役';const a=anchors(f);
 const old=f.employment.intent('formal-apply');assert.equal(old.npcName,'Jia');assert.equal(a.resolve(old).actor,f.jia);const counter=a.resolve(f.employment.intent('formal-view'));assert.equal(counter.id,'object:counter:cn-cooking');
 holder={...holder,holderId:f.guest.station.id,revision:1};assert.equal(f.service.reviewer(),null,'unbound replacement does not fall back to Jia');assert.equal(f.employment.intent('formal-apply'),null);assert.equal(f.employment.resolveIntent(old),null);assert.equal(f.employment.executeIntent(old),false);assert(f.service.rebind());
 const fresh=f.employment.intent('formal-apply');assert.equal(fresh.npcName,'新任厨役');assert.equal(a.resolve(fresh).actor,f.guest);assert.equal(f.employment.formal.role.employer,'新任厨役');assert.equal(a.resolve(f.employment.intent('formal-view')).id,counter.id);
 holder={...holder,revision:2};assert.equal(f.employment.resolveIntent(fresh),null,'same person, new holder revision rejects stale click');f.guest.alive=false;assert.equal(f.service.reviewer(),null);assert.equal(f.employment.intent('formal-apply'),null);assert.equal(a.resolve(f.employment.intent('formal-view')).id,counter.id);
 f.guest.alive=true;holder={...holder,holderId:null,status:'vacant',available:false};assert.equal(f.employment.intent('formal-review'),null);assert.equal(f.employment.intent('formal-apply'),null);assert.equal(f.employment.resolveIntent(fresh),null);assert.equal(a.resolve(f.employment.intent('formal-view')).id,counter.id);
});
test('player tenure keeps the real NPC helper; original work anchors and history stay independent',()=>{
 const f=fixture();f.jia.station.npcName='Jia';const a=anchors(f);f.hire();assert.equal(f.service.reviewer().actorId,'cn-cooking');const end=f.employment.intent('end-shift');assert.equal(a.resolve(end).actor,f.jia);assert.equal(end.npcName,'Jia');
 f.guest.mount=f.seat;assert(f.service.requestMeal({actorId:f.guest.station.id,seatId:f.seat.id}));const work=f.employment.intent('task');assert(work);assert.equal(a.resolve(work).kind,'hand');assert.equal(a.resolve(work).actor,undefined);const history=JSON.stringify(f.careers.state());f.jia.alive=false;assert.equal(f.employment.intent('end-shift'),null);assert.equal(f.employment.resolveIntent(end),null);assert.equal(f.employment.executeIntent(end),false);assert(f.employment.intent('cancel'),'safe cancellation is still available');assert.equal(a.resolve(f.employment.intent('cancel')),null,'no old helper fallback');assert.equal(JSON.stringify(f.careers.state()),history);
});
test('actual main hiring-context callback selects bound royal reviewer and no original-person fallback',()=>{
 const main=fs.readFileSync(new URL('../source/game/main.js',import.meta.url),'utf8'),start=main.indexOf('getHiringContext:role=>')+'getHiringContext:'.length,end=main.indexOf(',creditWageToBank,getClock',start);assert(start>20&&end>start);let person={actorId:'cn-replacement',name:'新任厨役',revision:2};const looked=[];
 const callback=new vm.Script('('+main.slice(start,end)+')').runInNewContext({chinaRoyalKitchen:{reviewer:()=>person},playerSocialContext:{profileFor:id=>{looked.push(id);return {traits:{quiet:.7},relations:{player:.4},opinions:{player:.5}};}},getNPCProfile:()=>({traits:{curiosity:.2}})});
 const result=callback(R);assert.deepEqual(looked,['cn-replacement']);assert.equal(result.recruiterTraits.quiet,.7);person=null;const absent=callback(R);assert.equal(absent.recruiterTraits,undefined);assert.deepEqual(looked,['cn-replacement']);
});
test('actual handbook royal recruitment and live cards use current helper, without rewriting career history',async()=>{
 const {createCareerHandbook}=await import('../source/game/career-handbook.js');const f=fixture();f.jia.station.npcName='新任厨役';f.meet();f.act('formal-apply');const before=JSON.stringify(f.careers.state());
 const element=tag=>({tag,children:[],attributes:{},textContent:'',open:false,hidden:false,setAttribute(k,v){this.attributes[k]=v;},append(...items){this.children.push(...items);},replaceChildren(...items){this.children=items;},showModal(){this.open=true;},close(){this.open=false;},addEventListener(){},remove(){}}),doc={head:element('head'),body:element('body'),createElement:element},all=e=>[e,...e.children.flatMap(all)];
 const ui=createCareerHandbook({careers:f.careers,copperLedger:f.bank,getClock:()=>f.clock,getService:id=>id===R.id?f.employment:null,getCountry:()=> 'china',getPlayer:()=>f.player,document:doc});ui.open({scope:'role',roleId:R.id});const text=all(doc.body).map(e=>e.textContent).join('\n');assert(text.includes('新任厨役'));assert(!text.includes('Jia'));assert.equal(JSON.stringify(f.careers.state()),before);ui.dispose();
});
