// Regressions: competing services used to overwrite E/touch actions, counter
// badges bypassed one chooser, and old menu clicks could outlive their target.
import assert from 'node:assert/strict';
import {nearbyInteractions,groupInteractions,createServiceMenuIntents} from '../source/game/player-interaction-intents.js';
import {createContextualActionMenu} from '../source/game/contextual-action-menu.js';
const position={x:0,y:0,z:0},at=(id,extra={})=>({id,name:id,action:id,position:[0,0,1],...extra});
const actions=[at('food',{targetKey:'host',targetName:'许安'}),at('stay',{targetKey:'host',targetName:'许安'}),at('chat',{social:true,targetKey:'host',targetName:'许安'}),at('far',{position:[0,0,9]}),at('upstairs',{position:[0,4,0]}),null];
let rays=0;const near=nearbyInteractions(actions,position,()=>{rays++;return true;});assert.equal(rays,1,'same counter visibility is evaluated once');assert.equal(near.length,3);assert.equal(groupInteractions(near).length,1);assert.equal(nearbyInteractions(actions,position,()=>false).length,0,'occluded services are absent');
assert.equal(nearbyInteractions([actions[0],actions[0]],position).length,1,'shared and legacy providers cannot duplicate identical intent');
class Element{
 constructor(tag){this.tagName=tag;this.children=[];this.attrs={};this.dataset={};this.hidden=false;this.listeners={};this.scrollTop=0;this.rebuilds=0;}
 append(...nodes){this.children.push(...nodes);}replaceChildren(...nodes){this.rebuilds++;this.children=nodes;}setAttribute(k,v){this.attrs[k]=String(v);}getAttribute(k){return this.attrs[k];}addEventListener(k,fn){this.listeners[k]=fn;}showModal(){this.open=true;}close(){this.open=false;}remove(){}focus(){doc.activeElement=this;}
}
const doc={body:new Element('body'),createElement:tag=>new Element(tag)},button=new Element('button'),selected=[];
const menu=createContextualActionMenu({button,document:doc,onSelect:item=>selected.push(item.id)}),dialog=doc.body.children[0],list=dialog.children[1];
menu.update([]);assert(button.hidden);assert.equal(menu.activate(),false);
menu.update([at('seat',{furniture:true,kind:'seat',action:'坐下'})]);assert.equal(button.dataset.actionIcon,'chair');assert(button.attrs['aria-label'].includes('坐下'));assert(!button.innerHTML.includes('坐下'),'icon has no long visible label');menu.activate();assert.deepEqual(selected,['seat']);menu.activate();assert.deepEqual(selected,['seat'],'double click consumes one action');
menu.update([actions[2]]);assert.equal(button.dataset.actionIcon,'chat');menu.update([actions[0]]);assert.equal(button.dataset.actionIcon,'hand');
menu.update(near);assert.equal(button.dataset.actionIcon,'more');menu.activate();assert(dialog.open);assert.equal(selected.length,1,'opening chooser does not execute/charge');assert.equal(list.children[0].children.length,4,'all three grouped actions visible');const row=list.children[0].children[1],rebuilds=list.rebuilds;list.scrollTop=67;for(let i=0;i<30;i++)menu.update(near);assert.equal(list.rebuilds,rebuilds,'unchanged frames keep actual scroll DOM');assert.equal(list.scrollTop,67);
menu.update(near.slice(1));row.onclick();assert.equal(selected.length,1,'detached stale row cannot execute');dialog.listeners.cancel({preventDefault(){}});assert(!dialog.open);menu.update(near);menu.activate();list.children[0].children[1].onclick();assert.equal(selected.at(-1),'food','reopened chooser works');
menu.update(near);menu.activate();menu.update([]);assert(!dialog.open);assert(button.hidden,'lost range closes chooser');
let revision=1,available=true,opens=0;const services=createServiceMenuIntents();services.register('food',{target:()=>available?at('host',{intentKey:revision}):null,open:()=>{opens++;}});const old=services.intent('food');assert.equal(opens,0);revision++;assert.equal(services.resolveIntent(old),null);assert.equal(services.executeIntent(old),false);assert.equal(opens,0);assert(services.executeIntent(services.intent('food')));assert.equal(opens,1);available=false;assert.equal(services.candidates().length,0);services.clear();assert.equal(services.executeIntent(old),false);
console.log('PASS contextual menu: shared near/floor/occlusion pass, all grouped actions, zero/single/multiple icons, stable DOM, stale/double click/cancel and live service identity');
