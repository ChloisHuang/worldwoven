// Targeted DOM/handler check for removing the obsolete 日常 / 家具 inventory HUD.
// No renderer or scene is initialized; furniture and need prompts remain live.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const main=fs.readFileSync(new URL('../source/game/main.js',import.meta.url),'utf8'),html=fs.readFileSync(new URL('../source/game/index.html',import.meta.url),'utf8'),css=fs.readFileSync(new URL('../source/game/game.css',import.meta.url),'utf8');
const obsolete=/daybook|discovery-count|activity-heading|station-list|furniture-list|interact-(button|title|npc)/;
for(const source of [html,main,css])assert(!obsolete.test(source),'retired HUD has no markup, CSS or runtime selectors at any viewport');
const element=()=>({children:[],dataset:{},style:{},attrs:{},hidden:false,append(node){this.children.push(node);node.parent=this;},remove(){if(this.parent)this.parent.children.splice(this.parent.children.indexOf(this),1);},setAttribute(k,v){this.attrs[k]=String(v);}});
const ids=Object.fromEntries([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>[m[1],element()]));
const fixtures=[['seat','坐下'],['bed','躺下'],['bath','泡澡'],['canopy','开合纱帐'],['wardrobe','换装']].map(([kind,action])=>({id:'test-'+kind,kind,action,name:kind,furniture:true}));
const requested=[],furnitureLabels=[];
const context=vm.createContext({console,document:{createElement:element},$:(id)=>{assert(ids[id],'real HTML has requested element '+id);return ids[id];},furniture:{items:fixtures,curtainLabel:()=> '拉开纱帐'},furnitureLabels,nearbyInteraction:()=>context.isNear,nearbyInteractionClear:()=>true,requestFurniture:item=>requested.push(item.id),player:{root:{position:{}}},isNear:true,selected:'china',enterRegion(){context.mode='lot';ids['lot-ui'].hidden=false;},leaveLot(){context.mode='globe';ids['lot-ui'].hidden=true;},mode:'globe',interactionMenuOpen:()=>context.menuOpen,menuOpen:false,nearest:null,doInteraction(){requested.push(context.nearest.id);},seated:null,pendingInteraction:null,performing:null,chinaMoneyHouse:null,japanServiceUI:null,npcSocial:{active:()=>false},furnitureExit:()=> '站起来'});
const take=(start,end)=>main.slice(main.indexOf(start),main.indexOf(end,main.indexOf(start)));
vm.runInContext(take('function furnitureAction(','function stationIntent(')+take('function renderStations(','function interactionMenuOpen(')+take("$('travel').onclick=","$('appearance-button').onclick="),context);
assert.equal(context.mode,'globe');assert(!ids['daybook-toggle']);assert(!ids['interact-button'],'duplicate bottom action removed');assert(!ids['interact-title'],'duplicate long action label removed');ids.travel.onclick();vm.runInContext('renderStations()',context);assert.equal(furnitureLabels.length,1,'only seat halos retain the legacy furniture labels');
for(const item of fixtures.filter(item=>item.kind==='seat')){const label=furnitureLabels.find(x=>x.item===item).label;label.onclick();assert.equal(requested.at(-1),item.id);assert(label.attrs['aria-label'].includes(item.name));}
context.isNear=false;const before=requested.length;furnitureLabels[0].label.onclick();assert.equal(requested.length,before,'far furniture label cannot submit');ids['return-world'].onclick();assert.equal(context.mode,'globe');assert(ids['lot-ui'].hidden);
// Production bath crossing still runs while the main player loop returns early.
// It must not touch the removed bottom button or replace the semantic SVG.
context.bathTransition={update:()=>({position:[0,0,0],yaw:0}),state:()=>({direction:'enter'}),done:false};context.characterPoseContext=()=>null;context.player={root:{position:{fromArray(){}},rotation:{}},animate(){}};ids['touch-action'].innerHTML='<svg></svg>';
vm.runInContext(take('function updateBathTransition(','function walkToFurniture('),context);vm.runInContext('updateBathTransition(.1,1)',context);assert.equal(ids['touch-action'].innerHTML,'<svg></svg>');assert(ids['player-state'].textContent.includes('慢慢入汤'));
// Evaluate the actual needs/health readout assignment with a live DOM target.
context.dailyNeeds={status:()=>({text:'有些饿了'})};context.gameHealth={text:()=> '需要休息'};vm.runInContext(take("const needText=dailyNeeds.status('player')",'\n'),context);assert.equal(ids['player-health'].textContent,'有些饿了 · 需要休息');assert(!ids['player-health'].hidden);
console.log('PASS HUD: retired inventory/bottom labels absent; nearby seat halos retain actions/range guards; live needs prompt retained. Context icon/chooser behavior covered by contextual-action-menu.mjs (DOM only).');

// Compact scene HUD and the shared ring replace the old debug and bar chrome.
const {setActionProgress,timedActionProgress,syncHudTools}=await import('../source/game/hud-controls.js');
for(const id of ['grid-toggle','zoom-in','zoom-out','camera-reset','interaction','activity-progress'])assert(!ids[id],id+' removed from product markup');
assert(!main.includes("$('grid-toggle')")&&!main.includes("$('zoom-in')")&&!main.includes("$('activity-progress')"));
assert.match(html,/aria-label="返回世界地图，选择其他国家"/);assert.match(html,/>俯瞰<\/span>/);
assert.match(main,/canvas\.addEventListener\('wheel'/);assert.match(main,/touches\.size===2/,'pinch input retained');
const ring=ids['touch-action'];ring.style.setProperty=(key,value)=>{ring.style[key]=value;};
const icon=ring.innerHTML;
for(const [value,expected]of [[0,'0'],[.55,'0.55'],[1.2,'1'],[-1,'0'],[NaN,''],[null,'']]){setActionProgress(ring,value);assert.equal(ring.dataset.actionProgress,expected);assert.equal(ring.innerHTML,icon,'progress never replaces semantic action icon');}
assert.equal(timedActionProgress(2,8),.25);assert.equal(timedActionProgress(2,0),null);
Object.assign(context,{setActionProgress,timedActionProgress,roofShown:false,chinaClinic:null,chinaArchery:null,chinaCareer:null,chinaLabor:null,franceLabor:null,japanPerformanceEmployment:null,activeDailyToilet:()=>null,actionTime:4,performing:{id:'read'},npcSocial:null});
vm.runInContext(take('function updateActionProgress(','function updatePlayer('),context);
const update=control=>context.updateActionProgress(control),control=intentKey=>({intentKey});
update(control('performing:read'));assert.equal(ring.dataset.actionProgress,'0.5');
context.chinaArchery={playerStatus:()=>({progress:.7})};update(control('performing:read'));assert.equal(ring.dataset.actionProgress,'0.7');context.chinaArchery=null;
context.npcSocial={state:()=>({stage:'talking',duration:2,total:5})};update(control('chat:neighbor'));assert.equal(ring.dataset.actionProgress,'0.4');
context.chinaLabor={view:()=>({progress:.6})};update(control('clean'));assert.equal(ring.dataset.actionProgress,'0.6');
context.activeDailyToilet=()=>({state:()=>({activity:{actorId:'player',stage:'using',progress:.3}})});update(control('toilet'));assert.equal(ring.dataset.actionProgress,'0.3');
context.activeDailyToilet=()=>({state:()=>({activity:{actorId:'player',stage:'waiting-privacy',progress:.3}})});update(control('toilet'));assert.equal(ring.dataset.actionProgress,'','waiting has no invented progress');
context.chinaCareer={isActing:()=>true,state:()=>({activity:'appointment',progress:.2})};update(control('work'));assert.equal(ring.dataset.actionProgress,'0.2');
context.chinaCareer={isActing:()=>true,state:()=>({activity:'review-wait',progress:.2})};update(control('work'));assert.equal(ring.dataset.actionProgress,'');
context.chinaCareer=null;context.franceLabor={isActing:()=>true,displayState:()=>({activity:'water',progress:.8})};update(control('work'));assert.equal(ring.dataset.actionProgress,'0.8');
context.franceLabor=null;context.japanPerformanceEmployment={isActing:()=>true,state:()=>({progressSeconds:2,progressTotal:8})};update(control('work'));assert.equal(ring.dataset.actionProgress,'0.25');
for(const state of [null,control('pending:go'),control('family-cancel'),control('crime-cancel')]){update(state);assert.equal(ring.dataset.actionProgress,'','cancel, completion, route and untimed controls reset');}
context.menuOpen=true;update(control('performing:read'));assert.equal(ring.dataset.actionProgress,'','read-only modal hides ring');context.menuOpen=false;
context.roofShown=true;update(control('performing:read'));assert.equal(ring.dataset.actionProgress,'','overview hides ring');
const tools=Object.fromEntries(['roof-toggle','light-toggle'].map(id=>[id,{...element(),lastElementChild:{},querySelector:()=>({})}]));
syncHudTools({getElementById:id=>tools[id]},{overview:true,night:true});assert.equal(tools['roof-toggle'].lastElementChild.textContent,'跟随');assert.equal(tools['light-toggle'].lastElementChild.textContent,'日景');assert.match(tools['light-toggle'].title,/不改变游戏时间/);
syncHudTools({getElementById:id=>tools[id]});assert.equal(tools['roof-toggle'].attrs['aria-pressed'],'false');assert.equal(tools['roof-toggle'].lastElementChild.textContent,'俯瞰');
console.log('PASS compact HUD: removed debug/camera/bar chrome; real shared ring wiring, bounded values, all original timers, cancellation/completion/modal/overview reset, touch labels and pinch/wheel retained. No browser layout claim.');
