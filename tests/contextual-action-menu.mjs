// Regressions: competing services used to overwrite E/touch actions, counter
// badges bypassed one chooser, and old menu clicks could outlive their target.
import assert from 'node:assert/strict';
import {nearbyInteractions,groupInteractions,createServiceMenuIntents,uniqueInteractionActions,currentInteractionIntent,nearbyInteraction} from '../source/game/player-interaction-intents.js';
import {createContextualActionMenu} from '../source/game/contextual-action-menu.js';
const position={x:0,y:0,z:0},at=(id,extra={})=>({id,name:id,action:id,position:[0,0,1],...extra});
const actions=[at('food',{targetKey:'host',targetName:'许安'}),at('stay',{targetKey:'host',targetName:'许安'}),at('chat',{social:true,targetKey:'host',targetName:'许安'}),at('far',{position:[0,0,9]}),at('upstairs',{position:[0,4,0]}),null];
let rays=0;const near=nearbyInteractions(actions,position,()=>{rays++;return true;});assert.equal(rays,1,'same counter visibility is evaluated once');assert.equal(near.length,3);assert.equal(groupInteractions(near).length,1);assert.equal(nearbyInteractions(actions,position,()=>false).length,0,'occluded services are absent');
assert.equal(uniqueInteractionActions([at('current',{actionKey:'dining'}),at('legacy',{actionKey:'dining'})]).length,1,'equivalent dining entries do not create a fake multiple choice');
assert.equal(nearbyInteractions([actions[0],actions[0]],position).length,1,'shared and legacy providers cannot duplicate identical intent');
class Element{
 constructor(tag){this.tagName=tag;this.children=[];this.attrs={};this.dataset={};this.hidden=false;this.listeners={};this.scrollTop=0;this.rebuilds=0;this.parentNode=null;this.focusCalls=0;}
 get isConnected(){return this===doc.body||!!this.parentNode?.isConnected;}
 contains(node){return !!node&&(node===this||this.children.some(child=>child.contains(node)));}
 append(...nodes){for(const node of nodes){node.remove();node.parentNode=this;this.children.push(node);}}
 replaceChildren(...nodes){this.rebuilds++;for(const child of [...this.children])child.remove();this.append(...nodes);}
 setAttribute(k,v){this.attrs[k]=String(v);}getAttribute(k){return this.attrs[k];}addEventListener(k,fn){this.listeners[k]=fn;}showModal(){this.open=true;}
 close(){this.open=false;if(this.contains(doc.activeElement))doc.activeElement=doc.body;}
 remove(){if(this.contains(doc.activeElement))doc.activeElement=doc.body;if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(child=>child!==this);this.parentNode=null;}
 focus(options){this.focusCalls++;if(!this.isConnected)return;for(let node=this;node;node=node.parentNode)if(node.tagName==='dialog'&&!node.open)return;doc.activeElement=this;this.focusOptions=options;}

}
const doc={body:new Element('body'),createElement:tag=>new Element(tag)},button=new Element('button'),selected=[];
const menu=createContextualActionMenu({button,document:doc,onSelect:item=>selected.push(item.id)}),dialog=doc.body.children[0],list=dialog.children[1];
menu.update([]);assert(button.hidden);assert.equal(menu.activate(),false);
menu.update([at('seat',{furniture:true,kind:'seat',action:'坐下'})]);assert.equal(button.dataset.actionIcon,'chair');assert(button.attrs['aria-label'].includes('坐下'));assert(!button.innerHTML.includes('坐下'),'icon has no long visible label');menu.activate();assert.deepEqual(selected,['seat']);menu.activate();assert.deepEqual(selected,['seat'],'double click consumes one action');
menu.update([actions[2]]);assert.equal(button.dataset.actionIcon,'chat');menu.update([actions[0]]);assert.equal(button.dataset.actionIcon,'hand');
menu.update(near);assert.equal(button.dataset.actionIcon,'more');menu.activate();assert(dialog.open);assert.equal(selected.length,1,'opening chooser does not execute/charge');assert.equal(list.children[0].children.length,4,'all three grouped actions visible');const row=list.children[0].children[1],rebuilds=list.rebuilds;list.scrollTop=67;for(let i=0;i<30;i++)menu.update(near);assert.equal(list.rebuilds,rebuilds,'unchanged frames keep actual scroll DOM');assert.equal(list.scrollTop,67);menu.update([...near].reverse());assert.equal(list.rebuilds,rebuilds,'nearby actor distance changes do not reorder an open chooser');
menu.update(near.slice(1));row.onclick();assert.equal(selected.length,1,'detached stale row cannot execute');dialog.listeners.cancel({preventDefault(){}});assert(!dialog.open);menu.update(near);menu.activate();list.children[0].children[1].onclick();assert.equal(selected.at(-1),'food','reopened chooser works');
menu.update(near);menu.activate();menu.update([]);assert(!dialog.open);assert(button.hidden,'lost range closes chooser');
// A real browser cannot focus detached rows. Refresh must attach every group
// first, then restore the surviving action without scrolling or grabbing focus.
menu.update(near);menu.activate();const oldFocused=list.children[0].children[2];oldFocused.focus();assert.equal(doc.activeElement,oldFocused);list.scrollTop=53;
menu.update([...near,at('other',{targetKey:'other'})]);const restored=list.children[0].children[2];assert.notEqual(restored,oldFocused);assert(restored.isConnected);assert.equal(doc.activeElement,restored,'surviving action regains focus after its new row is attached');assert.deepEqual(restored.focusOptions,{preventScroll:true});assert.equal(list.scrollTop,53);
menu.update([near[0],near[2]]);assert.equal(doc.activeElement,doc.body,'disappearing action does not focus another row');assert(list.children[0].children.slice(1).every(row=>row.focusCalls===0),'no fallback steals focus');
const outside=new Element('button');doc.body.append(outside);list.children[0].children[1].focus();dialog.listeners.cancel({preventDefault(){}});outside.focus();menu.update(near);assert.equal(doc.activeElement,outside,'updates after cancel preserve outside focus');menu.activate();assert.equal(doc.activeElement,outside,'reopening never restores a cancelled action before showModal');assert(list.children[0].children.slice(1).every(row=>row.focusCalls===0));menu.close();
let revision=1,available=true,opens=0;const services=createServiceMenuIntents();services.register('food',{target:()=>available?at('host',{intentKey:revision}):null,open:()=>{opens++;}});const old=services.intent('food');assert.equal(opens,0);revision++;assert.equal(services.resolveIntent(old),null);assert.equal(services.executeIntent(old),false);assert.equal(opens,0);assert(services.executeIntent(services.intent('food')));assert.equal(opens,1);available=false;assert.equal(services.candidates().length,0);services.clear();assert.equal(services.executeIntent(old),false);
console.log('PASS contextual menu: shared near/floor/occlusion pass, all grouped actions, zero/single/multiple icons, stable DOM, stale/double click/cancel and live service identity');

// Exercise the production registry/mapping without constructing unrelated lots.
const fs=await import('node:fs'),vm=await import('node:vm'),source=fs.readFileSync(new URL('../source/game/main.js',import.meta.url),'utf8');
let visit=false,performanceActive=false,nearWork=false;const opened=[];
const adapters={serviceMenus:createServiceMenuIntents(),lot:{stations:[at('jp-performance-reception'),at('jp-welcome')]},player:{root:{position:{toArray:()=>[4,0,4]}}},chinaTavernUI:null,chinaLodgingUI:null,chinaSalonUI:null,franceLabor:{active:()=>true,menuContext:()=>({available:nearWork}),open:()=>opened.push('france-work')},japanServiceUI:{hasVisit:()=>visit,open:()=>opened.push('japan-service')},japanPerformanceUI:{open:()=>opened.push('japan-performance')},japanPerformance:{active:()=>performanceActive}};
vm.createContext(adapters);vm.runInContext(source.slice(source.indexOf('function configureContextualServices()'),source.indexOf('function currentControl()')),adapters);adapters.configureContextualServices();
const menus=adapters.serviceMenus;assert.equal(menus.intent('japan-visit'),null);assert(menus.executeIntent(menus.intent('japan-performance')));assert.deepEqual(opened,['japan-performance']);visit=true;assert(menus.executeIntent(menus.intent('japan-visit')));assert.equal(opened.at(-1),'japan-service');
const mapped=items=>uniqueInteractionActions(items.map(item=>adapters.contextualTarget(item)));
assert.equal(mapped([at('jp-player-service',{playerService:true,serviceStep:{kind:'wait'}}),menus.intent('japan-visit'),at('jp-welcome')]).length,1,'same active Japanese service panel has one entry');
assert.equal(mapped([at('jp-player-service',{playerService:true,serviceStep:{kind:'wash'}}),menus.intent('japan-visit')]).length,2,'real washing and visit management remain distinct');
visit=false;assert.equal(mapped([at('jp-dining-sushi',{playerService:true,serviceStep:{kind:'dining-panel'}}),at('jp-sushi')]).length,1,'duplicate sushi station and service shortcut collapse');
assert.equal(mapped([at('france-tea-service',{franceTea:true}),at('france-cafe')]).length,1,'French tea action keeps its real live stage');assert.equal(menus.intent('france-labor'),null);nearWork=true;assert(menus.intent('france-labor').continuation);assert(menus.executeIntent(menus.intent('france-labor')));assert.equal(opened.at(-1),'france-work');nearWork=false;assert.equal(menus.intent('france-labor'),null);
console.log('PASS production menu adapters: exact Japan/France panel dispatch, genuine actions retained, duplicate shortcuts collapsed, active work entry follows cached eligibility');

// The live stage can advance after the last rendered frame. Existing dynamic
// service actions must reject that stale choice before any side effect.
let liveTea=at('tea',{action:'取消下午茶'}),liveJapan=at('jp-live',{action:'清洗',serviceIntent:{id:'wash',provider:'japan-player-service',intentKey:'new'}}),liveCharm=at('charm',{action:'挂回'});const effects=[];
const dispatch={roofShown:false,interactionMenuOpen:()=>false,player:{root:{position}},nearbyInteraction,nearbyInteractionClear:()=>true,currentInteractionIntent,activeDailyToilet:()=>null,chinaLabor:null,chinaCareer:null,chinaGuardEmployment:null,franceLabor:null,franceTeaEmployment:null,francePastryEmployment:null,bathTransition:null,npcSocial:null,seated:null,performing:null,pendingInteraction:null,path:[],targetStation:null,keys:new Set(),joy:{},$:()=>({style:{}}),franceTea:{target:()=>liveTea,interact:()=>effects.push('tea')},japanServiceUI:{target:()=>liveJapan,interact:()=>effects.push('japan')},japanWeatherCharms:{target:()=>liveCharm,interact:()=>effects.push('charm')}};
vm.createContext(dispatch);vm.runInContext(source.slice(source.indexOf('function executeNearbyAction('),source.indexOf('\n\nfunction startInteraction')),dispatch);
dispatch.executeNearbyAction({...liveTea,franceTea:true,action:'请玛农准备下午茶'});dispatch.executeNearbyAction({...liveJapan,playerService:true,serviceIntent:{...liveJapan.serviceIntent,intentKey:'old'}});dispatch.executeNearbyAction({...liveCharm,weatherCharm:true,action:'拿起'});assert.equal(effects.length,0,'stale stage/visit/held-object actions cannot execute');
dispatch.executeNearbyAction({...liveTea,franceTea:true});dispatch.executeNearbyAction({...liveJapan,playerService:true});dispatch.executeNearbyAction({...liveCharm,weatherCharm:true});assert.deepEqual(effects,['tea','japan','charm']);
console.log('PASS production execution guards: France/Japan/weather actions revalidate live stage and intent before dispatch');
