// Focused regressions for object-owned actions: mixed-object choices, walking
// actor retargeting, stale clicks, and icons hidden beneath names or HUD chrome.
// Real Three.js projection is exercised without constructing a renderer/GPU.
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import * as THREE from '../source/vendor/three/build/three.module.js';
import {createObjectActionMenu} from '../source/game/object-action-menu.js';
import {interactionIdentity} from '../source/game/player-interaction-intents.js';

class Element {
 constructor(tag,doc){this.tagName=tag;this.ownerDocument=doc;this.children=[];this.attrs={};this.dataset={};this.style={};this.hidden=false;this.listeners=new Map();this.scrollTop=0;this.rebuilds=0;this.parentNode=null;this.focusCalls=0;}
 get isConnected(){return this===this.ownerDocument.body||!!this.parentNode?.isConnected;}
 contains(node){return !!node&&(node===this||this.children.some(child=>child.contains(node)));}
 append(...nodes){for(const node of nodes){node.remove();node.parentNode=this;this.children.push(node);}}
 replaceChildren(...nodes){this.rebuilds++;for(const child of [...this.children])child.remove();this.append(...nodes);}
 setAttribute(key,value){this.attrs[key]=String(value);}
 getAttribute(key){return this.attrs[key];}
 addEventListener(name,callback){if(!this.listeners.has(name))this.listeners.set(name,new Set());this.listeners.get(name).add(callback);}
 removeEventListener(name,callback){this.listeners.get(name)?.delete(callback);}
 dispatch(name,event={}){for(const callback of this.listeners.get(name)||[])callback(event);}
 showModal(){this.open=true;}
 close(){this.open=false;if(this.contains(this.ownerDocument.activeElement))this.ownerDocument.activeElement=this.ownerDocument.body;}
 remove(){if(this.contains(this.ownerDocument.activeElement))this.ownerDocument.activeElement=this.ownerDocument.body;if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(child=>child!==this);this.parentNode=null;}
 focus(options){this.focusCalls++;if(!this.isConnected)return;for(let node=this;node;node=node.parentNode)if(node.hidden||node.tagName==='dialog'&&!node.open)return;this.ownerDocument.activeElement=this;this.focusOptions=options;}
}

const anchor=(id,point=[0,0,0],extra={})=>({id,kind:'hand',point,...extra});
const action=(id,target,extra={})=>({id,name:id,action:id,position:target.point||target.actor.root.position.toArray(),anchor:target,...extra});
const actor=id=>({station:{id,npcName:id},root:new THREE.Object3D()});
function harness({frame={left:24,top:32,right:776,bottom:568},hud=[],maxTargets=8}={}){
 const doc={createElement:tag=>new Element(tag,doc),listeners:new Map()};
 doc.addEventListener=Element.prototype.addEventListener;doc.removeEventListener=Element.prototype.removeEventListener;doc.dispatch=Element.prototype.dispatch;
 doc.body=new Element('body',doc);doc.activeElement=doc.body;
 const root=doc.createElement('div'),button=doc.createElement('button');doc.body.append(root,button);
 const camera=new THREE.OrthographicCamera(-4,4,3,-3,.1,100);camera.position.set(0,0,10);camera.lookAt(0,0,0);camera.updateMatrixWorld();
 const player=new THREE.Vector3(),selected=[],validated=[];let allow=true,opens=0,closes=0;
 const projectAnchor=(target,item)=>{
  const point=target.actor?target.actor.root.position.clone():new THREE.Vector3().fromArray(target.point);
  if(target.occluded||Math.abs(point.y-player.y)>.65||Math.hypot(point.x-player.x,point.z-player.z)>(item.interactionRadius??2.8))return null;
  point.project(camera);if(Math.abs(point.x)>=1||Math.abs(point.y)>=1||point.z<=-1||point.z>=1)return null;
  return {x:(point.x*.5+.5)*800,y:(-.5*point.y+.5)*600,visible:true,nameRect:target.nameRect};
 };
 const menu=createObjectActionMenu({button,root,document:doc,maxTargets,resolveAnchor:item=>item.anchor,projectAnchor,validate:(item,target)=>{validated.push({item,target});return allow&&!!projectAnchor(target,item)?.visible;},layout:{frame:()=>frame,rects:()=>hud},onSelect:item=>{selected.push(item);return true;},onOpen:()=>opens++,onClose:()=>closes++});
 const layer=root.children[0],popover=layer.children[0],list=popover.children[1],controls=doc.body.children.find(el=>el.tagName==='dialog');
 const update=(items,options)=>{menu.update(items,options);menu.project();};
 return {menu,doc,button,layer,popover,list,controls,camera,player,selected,validated,frame,hud,update,setAllowed:value=>{allow=value;},counts:()=>({opens,closes})};
}
const rowIds=list=>list.children.map(row=>row.getAttribute('data-context-action'));
const iconRect=record=>({left:parseFloat(record.button.style.left)-22,right:parseFloat(record.button.style.left)+22,top:parseFloat(record.button.style.top)-22,bottom:parseFloat(record.button.style.top)+22});
const intersects=(a,b,gap=0)=>a.left<b.right+gap&&a.right>b.left-gap&&a.top<b.bottom+gap&&a.bottom>b.top-gap;
const inFrame=(rect,frame)=>rect.left>=frame.left&&rect.right<=frame.right&&rect.top>=frame.top&&rect.bottom<=frame.bottom;

test('each object owns its actions and an actor combines only its service and social rows',()=>{
 const h=harness(),host=actor('host'),hostTarget=anchor('actor:host',null,{kind:'chat',actor:host}),desk=anchor('desk',[-1.5,0,0]);
 const meal=action('meal',hostTarget,{provider:'service-menu',action:'点餐'}),chat=action('chat',hostTarget,{social:true,actor:host,action:'交谈'}),read=action('read',desk,{action:'阅读'});
 h.update([meal,read,chat]);assert.equal(h.menu.targets().length,2);assert(h.menu.targets().every(record=>!record.button.hidden));assert(h.button.hidden,'object actions never duplicate the bottom control button');
 assert(h.menu.activateTarget(hostTarget.id));assert(h.menu.isOpen());assert.equal(h.selected.length,0,'opening a chooser has no service side effects');
 assert.deepEqual(rowIds(h.list),[interactionIdentity(meal),interactionIdentity(chat)]);assert.equal(h.popover.children[0].children[0].textContent,'host');assert(!rowIds(h.list).includes(interactionIdentity(read)));
 assert(h.menu.targets().every(record=>record.button.hidden),'an open chooser hides competing object icons');
 h.list.children[1].onclick();assert.deepEqual(h.selected,[chat]);assert.equal(h.selected[0].actor,host);assert(!h.menu.isOpen());h.menu.dispose();
});

test('one action selects directly, revalidates, and consumes repeated clicks',()=>{
 const h=harness(),target=anchor('book'),read=action('read',target);h.update([read]);const record=h.menu.targets()[0],button=record.button;
 h.setAllowed(false);button.onclick();assert.equal(h.selected.length,0,'a rejected live validation cannot dispatch');h.setAllowed(true);
 button.onclick();assert.deepEqual(h.selected,[read]);assert(!h.menu.isOpen());assert(button.hidden);button.onclick();h.menu.activateTarget(target.id);assert.equal(h.selected.length,1,'both old-button and repeated target activation are consumed');
 h.update([read]);assert(h.menu.activateTarget(target.id));assert.equal(h.selected.length,2,'a new update can deliberately offer the action again');h.menu.dispose();
});

test('movement and unchanged updates preserve chooser DOM, scroll, focus, and actor identity',()=>{
 const h=harness(),host=actor('walker'),target=anchor('actor:walker',null,{actor:host,kind:'chat'}),meal=action('meal',target),chat=action('chat',target,{social:true,actor:host});
 h.update([meal,chat]);h.menu.activateTarget(target.id);const record=h.menu.targets()[0],button=record.button,rows=[...h.list.children],rebuilds=h.list.rebuilds,startLeft=button.style.left;
 rows[1].focus();h.list.scrollTop=63;
 for(let i=0;i<20;i++){host.root.position.x=(i+1)*.02;h.update([{...meal},{...chat}]);}
 assert.equal(h.menu.targets()[0],record);assert.equal(record.button,button);assert.equal(record.anchor.actor,host);assert.notEqual(button.style.left,startLeft,'real Three.js projection follows the live actor');
 assert.equal(h.list.rebuilds,rebuilds);assert.deepEqual(h.list.children,rows);assert.equal(h.list.scrollTop,63);assert.equal(h.doc.activeElement,rows[1]);
 h.update([chat,meal]);assert.equal(h.list.rebuilds,rebuilds,'distance/provider order changes keep existing open rows stable');assert.deepEqual(h.list.children,rows);
 rows[1].onclick();assert.equal(h.selected[0].actor,host);assert.equal(h.validated.at(-1).target.actor,host);h.menu.dispose();
});

for(const reason of ['offscreen','floor','distance','occlusion'])test(`${reason} projection removes all clickable actions and closes the affected chooser`,()=>{
 const h=harness(),host=actor('walker'),target=anchor('actor:walker',null,{actor:host}),first=action('service',target),second=action('chat',target,{social:true,actor:host});h.update([first,second]);
 const oldButton=h.menu.targets()[0].button;h.menu.activateTarget(target.id);const oldRow=h.list.children[0];
 if(reason==='offscreen'){h.camera.position.x=12;h.camera.lookAt(12,0,0);h.camera.updateMatrixWorld();}
 if(reason==='floor')host.root.position.y=1;
 if(reason==='distance')host.root.position.z=4;
 if(reason==='occlusion')target.occluded=true;
 h.menu.project();assert(oldButton.hidden);assert(!h.menu.targets()[0].visible);assert(!h.menu.isOpen());assert(h.popover.hidden);oldButton.onclick();oldRow.onclick();assert.equal(h.selected.length,0);assert.equal(h.menu.activateTarget(target.id),false);h.menu.dispose();
});

test('an actor moving after projection is validated against that same actor before dispatch',()=>{
 const h=harness(),host=actor('walker'),target=anchor('actor:walker',null,{actor:host}),chat=action('chat',target,{social:true,actor:host});h.update([chat]);
 const record=h.menu.targets()[0];host.root.position.z=4;record.button.onclick();assert.equal(h.selected.length,0,'old visible position cannot authorize an out-of-range action');assert.equal(h.validated[0].target.actor,host);
 host.root.position.z=.4;record.button.onclick();assert.equal(h.selected[0],chat);assert.equal(h.selected[0].actor,host);h.menu.dispose();
});

test('stale intent rows, disabled rows, cancel/reopen, and removed objects cannot dispatch old callbacks',()=>{
 const h=harness(),target=anchor('counter'),old=action('meal',target,{provider:'service',intentKey:'old'}),chat=action('chat',target);h.update([old,chat]);h.menu.activateTarget(target.id);const stale=h.list.children[0];
 const live={...old,intentKey:'new'};h.update([live,chat]);stale.onclick();assert.equal(h.selected.length,0);const disabled=h.list.children.find(row=>row.getAttribute('data-context-action')===interactionIdentity(live));disabled.disabled=true;disabled.onclick();assert.equal(h.selected.length,0);disabled.disabled=false;
 let prevented=false;h.doc.dispatch('keydown',{code:'Escape',preventDefault(){prevented=true;},stopPropagation(){}});assert(prevented);assert(!h.menu.isOpen());disabled.onclick();assert.equal(h.selected.length,0);
 h.menu.project();h.menu.activateTarget(target.id);assert(!h.popover.hidden);assert.equal(h.selected.length,0);disabled.onclick();assert.equal(h.selected.length,0,'a cancelled row stays stale after reopen');
 const reopened=h.list.children.find(row=>row.getAttribute('data-context-action')===interactionIdentity(live));reopened.onclick();reopened.onclick();assert.deepEqual(h.selected,[live]);
 h.update([live,chat]);h.menu.activateTarget(target.id);const removedRow=h.list.children[0],removedButton=h.menu.targets()[0].button;h.update([]);assert(!h.menu.isOpen());assert(!removedButton.isConnected);removedRow.onclick();removedButton.onclick();assert.deepEqual(h.selected,[live]);h.menu.dispose();
});

test('Escape dismisses only the object chooser before the production window handler',()=>{
 const h=harness(),target=anchor('counter');h.update([action('one',target),action('two',target)]);h.menu.activateTarget(target.id);
 const source=fs.readFileSync(new URL('../source/game/main.js',import.meta.url),'utf8'),start=source.indexOf("addEventListener('keydown',e=>{if(interactionMenuOpen())return;");
 assert(start>=0,'extract the actual game keyboard handler');const end=source.indexOf("addEventListener('keyup'",start);assert(end>start);
 let windowKeydown,left=0,cancelled=0;const context={addEventListener:(type,handler)=>{if(type==='keydown')windowKeydown=handler;},interactionMenuOpen:()=>h.menu.isOpen(),mode:'lot',keys:new Set(),leaveLot:()=>left++,cancelAction:()=>cancelled++,path:[],targetStation:null};
 for(const name of ['pendingStand','performing','pendingInteraction','seated','bathTransition','npcSocial','japanPlayerService','egyptTableServiceEmployment','egyptKitchenEmployment','japanTableServiceEmployment','japanKitchenEmployment','japanBathMixingEmployment','japanBathDeliveryEmployment','japanWomenBathDeliveryEmployment','japanReceptionEmployment','chinaSalon','chinaCareer'])context[name]=null;
 vm.runInNewContext(source.slice(start,end),context);
 const escape=()=>{const event={code:'Escape',defaultPrevented:false,cancelBubble:false,preventDefault(){this.defaultPrevented=true;},stopPropagation(){this.cancelBubble=true;}};h.doc.dispatch('keydown',event);if(!event.cancelBubble)windowKeydown(event);return event;};
 const first=escape();assert(!h.menu.isOpen());assert(first.defaultPrevented);assert.equal(left,0,'closing the chooser must not also leave the country');assert.equal(cancelled,0,'closing the chooser cannot cancel a game action');
 escape();assert.equal(left,1,'a later Escape retains the ordinary leave-country control');h.menu.dispose();assert.equal(h.doc.listeners.get('keydown').size,0,'disposed menus release their document listener');
});

test('seat entry and standing stay hidden while cancel, bed exit, and continuation remain controls',()=>{
 const h=harness(),seatTarget=anchor('seat'),chair=action('sit',seatTarget,{furniture:true,kind:'seat'}),stand={id:'stand',action:'站起来',contextControl:true,menuHidden:true};
 h.update([chair,stand]);assert.equal(h.menu.targets().length,0);assert(h.button.hidden);assert.equal(h.menu.activate(),false);
 for(const control of [{id:'cancel',action:'取消前往',contextControl:true},{id:'bed-exit',action:'起床',contextControl:true},{id:'work',action:'继续工作',continuation:true},{id:'visit-stop',action:'结束招待',playerService:true,serviceStep:{kind:'stop'}}]){
  h.update([chair,stand,control]);assert.equal(h.menu.targets().length,0);assert(!h.button.hidden);assert(h.menu.activate());assert.equal(h.selected.at(-1),control);assert(h.button.hidden);
 }
 const cancel={id:'cancel',action:'取消前往',contextControl:true},bed={id:'bed-exit',action:'起床',contextControl:true};h.update([cancel,bed,chair,stand]);h.menu.activate();assert(h.controls.open);assert.equal(h.menu.targets().length,0);h.menu.close();assert(!h.controls.open);h.menu.dispose();
});

test('safe-frame edges and HUD rectangles never leave an overlapping clickable icon',()=>{
 const h=harness({frame:{left:190,top:240,right:610,bottom:370},hud:[{left:390,top:280,right:414,bottom:320}]}),center=anchor('center'),edge=anchor('edge',[-2,0,0]);h.update([action('center',center),action('edge',edge)]);
 for(const record of h.menu.targets()){assert(record.visible,'a nearby safe alternate position is used');const rect=iconRect(record);assert(inFrame(rect,h.frame));assert(h.hud.every(block=>!intersects(rect,block,4)));}
 assert(!intersects(iconRect(h.menu.targets()[0]),iconRect(h.menu.targets()[1]),4));
 h.hud.push({...h.frame});h.menu.project();assert(h.menu.targets().every(record=>record.button.hidden&&!record.visible));assert.equal(h.menu.activate(),false);assert.equal(h.selected.length,0);h.menu.dispose();
});

test('a visible actor has a clickable icon outside its name and the chooser fits the safe frame',()=>{
 const h=harness(),host=actor('named'),nameRect={left:370,top:278,right:430,bottom:318},target=anchor('actor:named',null,{actor:host,nameRect,kind:'chat'});h.update([action('service',target),action('chat',target,{social:true,actor:host})]);
 const record=h.menu.targets()[0];assert(record.visible,'both name-adjacent placement candidates must not be rejected for insufficient spacing');assert(!record.button.hidden);assert(!intersects(iconRect(record),nameRect,4));assert(inFrame(iconRect(record),h.frame));
 h.menu.activateTarget(target.id);assert(h.menu.isOpen());const rect={left:parseFloat(h.popover.style.left),top:parseFloat(h.popover.style.top)};rect.right=rect.left+parseFloat(h.popover.style.width);rect.bottom=rect.top+Math.min(52+2*46,parseFloat(h.popover.style.maxHeight));assert(inFrame(rect,h.frame));h.menu.dispose();
});

test('an open chooser uses the clear side of its object instead of covering HUD controls',()=>{
 const hud=[{left:600,top:200,right:770,bottom:400}],h=harness({hud}),target=anchor('counter');h.update([action('one',target),action('two',target)]);h.menu.activateTarget(target.id);
 const rect={left:parseFloat(h.popover.style.left),top:parseFloat(h.popover.style.top)};rect.right=rect.left+parseFloat(h.popover.style.width);rect.bottom=rect.top+Math.min(52+2*46,parseFloat(h.popover.style.maxHeight));
 assert(inFrame(rect,h.frame));assert(hud.every(block=>!intersects(rect,block,4)),'the available placement opposite the HUD is selected');assert.equal(h.selected.length,0);h.menu.dispose();
});

test('suppression closes object choices and cannot be bypassed by old buttons',()=>{
 const h=harness(),target=anchor('counter'),items=[action('one',target),action('two',target)];h.update(items);const record=h.menu.targets()[0];h.menu.activateTarget(target.id);const row=h.list.children[0];h.update(items,{hidden:true});
 assert(!h.menu.isOpen());assert(record.button.hidden);assert(h.button.hidden);row.onclick();record.button.onclick();assert.equal(h.selected.length,0);h.update(items);assert(!record.button.hidden);assert(h.menu.activateTarget(target.id));h.popover.children[0].children[1].onclick();assert(!h.menu.isOpen());h.menu.dispose();assert(!h.layer.isConnected);assert(!h.controls.isConnected);
});

for(const [width,height] of [[852,393],[844,390]])test(`short landscape ${width}×${height}: host chooser finds the clear HUD gap after adjacent placements fail`,()=>{
 const hud=[{left:24,top:70,right:340,bottom:220},{left:600,top:70,right:width-24,bottom:220},{left:24,top:250,right:160,bottom:height-28},{left:610,top:300,right:width-24,bottom:height-12}];
 const h=harness({frame:{left:12,top:12,right:width-12,bottom:height-12},hud}),target=anchor('counter');h.update(['work','labor','property','stay','meal'].map(id=>action(id,target)));
 const record=h.menu.targets()[0];assert(record.visible);record.button.onclick();assert(h.menu.isOpen(),'tapping a visible host hand must not silently open then close');
 const rect={left:parseFloat(h.popover.style.left),top:parseFloat(h.popover.style.top)};rect.right=rect.left+parseFloat(h.popover.style.width);rect.bottom=rect.top+parseFloat(h.popover.style.maxHeight);
 assert(inFrame(rect,h.frame));assert(hud.every(block=>!intersects(rect,block,4)),'compact scrollable chooser preserves every HUD hit area');
 h.list.children[0].onclick();assert.equal(h.selected[0].id,'work');assert(!h.menu.isOpen());h.menu.dispose();
});
