// CR04 UI regression: a menu intent must never silently complete a physical
// plot, act on a replacement case, or turn dismissal into abandonment. This
// simulated DOM covers those state boundaries; it is not browser visual QA.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createPalaceUsurpationUI} from '../source/game/palace-usurpation-ui.js';

class Element{
 constructor(tag,doc){this.tag=tag;this.tagName=tag.toUpperCase();this.doc=doc;this.children=[];this.attrs={};this.listeners={};this.className='';this._text='';this.isConnected=true;this.scrollTop=0;this.scrollLeft=0;}
 set textContent(value){this._text=String(value);this.children=[];}
 get textContent(){return this._text+this.children.map(child=>child.textContent).join('');}
 set innerHTML(_value){throw new Error('User-facing content must use textContent');}
 append(...children){this.children.push(...children);}
 replaceChildren(...children){this._text='';this.children=children;}
 setAttribute(key,value){this.attrs[key]=String(value);}
 getAttribute(key){return this.attrs[key]??null;}
 addEventListener(key,handler){(this.listeners[key]??=[]).push(handler);}
 fire(key,event={}){for(const listener of this.listeners[key]||[])listener(event);}
 showModal(){this.open=true;}
 close(){this.open=false;this.fire('close');}
 focus(){this.doc.activeElement=this;}
 remove(){this.isConnected=false;}
}
function document(){const doc={};doc.createElement=tag=>new Element(tag,doc);doc.head=doc.createElement('head');doc.body=doc.createElement('body');return doc;}
const walk=root=>[root,...root.children.flatMap(walk)];
const find=(root,id)=>walk(root).find(node=>node.attrs['data-usurpation-action']===id);
const part=(root,key)=>walk(root).find(node=>node.attrs['data-panel-key']===key);
const action=(id,kind,extra={})=>({id,kind,caseId:'palace-usurpation-1',revision:4,label:({begin:'开始本案筹谋','select-route':'选入此筹备',pledge:'前往当面商议',prepare:'前往准备虚构剧情道具',resolve:'前往现场对峙',investiture:'前往宣读登位文书',abandon:'放弃这次筹谋','cancel-current':'停止当前动作'})[kind],enabled:true,...extra});
function view(extra={}){
 return {version:1,revision:4,visible:true,caseId:'palace-usurpation-1',stage:'planning',title:'篡位',summary:'沿用本案，筹备军权与宫廷联合。',selectedRoutes:['guard'],
  conditions:[{id:'adult',label:'本人已成年',met:true},{id:'handoff',label:'原职已安全交接',met:false}],
  routes:[{id:'intrigue',label:'宫廷阴谋',selected:false,prepared:false,enabled:true,requirements:[{id:'access',label:'取得宫廷接触机会',met:true}]},{id:'guard',label:'掌握军权',selected:true,prepared:true,enabled:true,requirements:[{id:'duty',label:'完成守卫履职',met:true}]},{id:'abdication',label:'联合逼退',selected:false,prepared:false,enabled:true,requirements:[{id:'people',label:'关键人物已同意',met:false}]}],
  people:[{id:'cn-official-personnel',name:'陆谦',roleId:'official',circleId:'court',status:'accepted',canAsk:false},{id:'cn-guard',name:'秦峥',roleId:'guard',circleId:'military',status:'not-asked',canAsk:true}],
  steps:[{id:'prepare',label:'组合本案筹备',status:'completed'},{id:'confront',label:'现场对峙',status:'pending'},{id:'read',label:'宣读登位文书',status:'pending'}],
  actions:[action('route-intrigue','select-route',{routeId:'intrigue'}),action('route-guard','select-route',{routeId:'guard'}),action('route-abdication','select-route',{routeId:'abdication'}),action('pledge-guard','pledge',{actorId:'cn-guard'}),action('prepare-intrigue','prepare',{routeId:'intrigue',preparationKind:'intrigue'}),action('abandon','abandon')],
  blockers:['先办妥原职交接'],outcome:null,office:{actorId:'cn-emperor',revision:1},history:[],cooldownLabel:null,...extra};
}
function fixture(initial=view()){
 const f={doc:document(),view:structuredClone(initial),calls:[],events:[],reads:0,handler:null};
 f.ui=createPalaceUsurpationUI({document:f.doc,getView:()=>{f.reads++;if(f.readError)throw new Error('unavailable');return f.view;},onAction:intent=>{f.calls.push(structuredClone(intent));return f.handler?.(intent);},onOpen:()=>f.events.push('open'),onClose:reason=>f.events.push(`close:${reason}`)});
 f.dialog=f.doc.body.children.find(node=>node.tag==='dialog');return f;
}
const esc=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const html=element=>`<${element.tag}${element.className?` class="${esc(element.className)}"`:''}${element.open?' open':''}${element.disabled?' disabled':''}${Object.entries(element.attrs).map(([key,value])=>` ${key}="${esc(value)}"`).join('')}>${element.tag==='style'?element._text:esc(element._text)}${element.children.map(html).join('')}</${element.tag}>`;
function exportState(name,f){
 if(!process.env.WW_USURPATION_UI_EXPORT)return;
 fs.mkdirSync(process.env.WW_USURPATION_UI_EXPORT,{recursive:true});
 fs.writeFileSync(`${process.env.WW_USURPATION_UI_EXPORT}/${name}.html`,`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${fs.readFileSync(new URL('../source/game/game.css',import.meta.url),'utf8')}</style>${f.doc.head.children.map(html).join('')}</head><body style="background:#84a6a0">${html(f.dialog)}</body></html>`);
}

// Every game state has a player-facing name. Hidden support/probability fields
// must never be rendered, even if a host accidentally retains them in its view.
{
 const cases=[['locked','尚未解锁'],['available','可开始筹备'],['planning','筹备中'],['ready-for-investiture','待宣读'],['failed','失败冷却'],['invested','已登位'],['abandoned','已放弃本案']];
 for(const [stage,label]of cases){
  const f=fixture(view({stage,actions:[],support:98765,roll:.1234,probability:.9876,cooldownLabel:stage==='failed'?'第8日可再筹谋':null}));const original=structuredClone(f.view);
  f.ui.open();assert(f.dialog.textContent.includes(stage==='invested'?'宫廷事务':'筹谋帝位'));assert(f.dialog.textContent.includes(label));assert.equal(f.dialog.attrs['data-usurpation-stage'],stage);
  assert(!/98765|0\.1234|0\.9876|支持值|成功率|票数|revision|cn-official/.test(f.dialog.textContent));assert.deepEqual(f.view,original);assert.equal(f.calls.length,0);
  if(stage==='failed')assert(f.dialog.textContent.includes('第8日可再筹谋'));
  exportState(stage,f);f.ui.dispose();
 }
 const f=fixture(view({actions:[action('resolve','resolve')]}));f.ui.open();assert(f.dialog.textContent.includes('可对峙'));assert(f.dialog.textContent.includes('现场进行'));f.ui.dispose();
}

// Investiture switches this same panel to actual sovereign duties. Stale plot
// fields cannot suggest renewed pledges or preparation, and each duty keeps its
// original pending-item identity for main's live, physical-action validation.
{
 const kinds=['court-approve','court-inquire','court-defer','edict-approve','duty-travel'];
 const f=fixture(view({stage:'invested',title:'<img src=x onerror=alert(1)>',summary:'今日朝会正在等候御批。',office:{actorId:'player',revision:2},
  steps:[{id:'court',label:'本次朝会奏报',status:'pending'},{id:'edict',label:'同号任命文书御批',status:'ready'}],
  actions:[...kinds.map((kind,index)=>action(`duty-${index}`,kind,{label:['准奏','当面问询','暂缓再议','阅批原文书','前往当前帝务现场'][index],routeId:`pending-item-${index}`})),action('stale-route','select-route',{routeId:'intrigue'}),action('stale-abandon','abandon')],
  blockers:[],history:[{caseId:'palace-usurpation-1',stage:'invested',label:'本案已宣读登位'}],cooldownLabel:'过时筹谋冷却',outcome:{summary:'过时筹谋结果'}}));
 const original=structuredClone(f.view);f.ui.open();assert.equal(f.dialog.attrs['aria-label'],'宫廷事务');assert(f.dialog.textContent.includes('当前帝务'));assert(f.dialog.textContent.includes('本次朝会奏报 · 待处理'));assert(f.dialog.textContent.includes('本案已宣读登位'));
 assert(!/筹谋条件|尚无人物明确同意|同一筹谋|当面商议与本人答复|已存准备|过时筹谋|<img/.test(f.dialog.textContent));assert(!part(f.dialog,'usurpation-consenters'));assert(!find(f.dialog,'stale-route'));assert(!find(f.dialog,'stale-abandon'));
 for(const [index,kind]of kinds.entries()){find(f.dialog,`duty-${index}`).onclick();assert.deepEqual(f.calls.at(-1),{id:`duty-${index}`,kind,caseId:'palace-usurpation-1',revision:4,routeId:`pending-item-${index}`});}
 assert.deepEqual(f.view,original);exportState('invested-duties',f);f.ui.dispose();
}

// A locked projection does not accidentally surface routes, people or actions
// from stale host data. It remains dismissible and never writes a case.
{
 const f=fixture(view({visible:false,stage:'locked',summary:'当前尚未解锁。'}));f.ui.open();
 assert(f.dialog.textContent.includes('尚未解锁'));assert(!f.dialog.textContent.includes('陆谦'));assert(!find(f.dialog,'prepare-intrigue'));assert(!find(f.dialog,'abandon'));
 assert(find(f.dialog,'dismiss'));find(f.dialog,'dismiss').onclick();assert.equal(f.calls.length,0);f.ui.dispose();
}

// Choosing a different preparation is the original case's one intent. Opening,
// refreshing and clicking cannot locally grant preparation, support or office.
{
 const f=fixture();f.ui.open();const original=structuredClone(f.view),old=find(f.dialog,'route-intrigue');
 assert(part(f.dialog,'usurpation-consenters').textContent.includes('陆谦'));assert(!part(f.dialog,'usurpation-consenters').textContent.includes('秦峥'));
 assert.equal(find(f.dialog,'route-guard').attrs['aria-pressed'],'true');
 f.handler=()=>old.onclick();old.onclick();old.onclick();
 assert.deepEqual(f.calls,[{id:'route-intrigue',kind:'select-route',caseId:'palace-usurpation-1',revision:4,routeId:'intrigue'}]);assert.deepEqual(f.view,original);
 f.handler=null;find(f.dialog,'prepare-intrigue').onclick();assert.equal(f.calls.at(-1).preparationKind,'intrigue');assert.deepEqual(f.view,original);
 assert(f.dialog.textContent.includes('虚构宫廷剧情'));assert(f.dialog.textContent.includes('失败并进入冷却'));f.ui.dispose();
}

// Both an unrefreshed newer case and a revised same case reject old intents.
// A discarded DOM control also cannot act on a later mount of that same case.
{
 const f=fixture();f.ui.open();const old=find(f.dialog,'pledge-guard');
 f.view=view({caseId:'palace-usurpation-2',revision:5,actions:[action('pledge-guard','pledge',{caseId:'palace-usurpation-2',revision:5,actorId:'cn-guard'})]});
 old.onclick();assert.equal(f.calls.length,0);assert(f.dialog.textContent.includes('筹谋已有变化'));
 const revised=find(f.dialog,'pledge-guard');f.view.revision=6;f.view.actions[0].revision=6;revised.onclick();assert.equal(f.calls.length,0);
 const remounted=find(f.dialog,'pledge-guard');f.ui.close();f.ui.open();remounted.onclick();assert.equal(f.calls.length,0);
 find(f.dialog,'pledge-guard').onclick();assert.deepEqual(f.calls[0],{id:'pledge-guard',kind:'pledge',caseId:'palace-usurpation-2',revision:6,actorId:'cn-guard'});f.ui.dispose();
}

// An action becoming unavailable without a ledger revision is also checked at
// click time; a forged/missing revision cannot be dispatched through the UI.
{
 const f=fixture();f.ui.open();const old=find(f.dialog,'prepare-intrigue');f.view.actions.find(row=>row.id==='prepare-intrigue').enabled=false;old.onclick();assert.equal(f.calls.length,0);
 assert(find(f.dialog,'prepare-intrigue').disabled);find(f.dialog,'prepare-intrigue').onclick();assert.equal(f.calls.length,0);
 f.view=view({actions:[action('wrong','resolve',{revision:3})]});f.ui.update();assert(find(f.dialog,'wrong').disabled);find(f.dialog,'wrong').onclick();assert.equal(f.calls.length,0);f.ui.dispose();
}

// Retaining and mutating a view object cannot retarget an already-rendered
// person's button, even if the host forgot to advance its revision.
{
 const f=fixture();f.ui.open();const old=find(f.dialog,'pledge-guard');f.view.actions.find(row=>row.id==='pledge-guard').actorId='someone-else';old.onclick();assert.equal(f.calls.length,0);f.ui.dispose();
}

// Actual core blocker codes stay inside the adapter, with qualitative game
// guidance in the menu instead of internal codes or numerical support targets.
{
 const f=fixture(view({blockers:['support-not-established','unknown-internal-code'],actions:[action('resolve','resolve',{enabled:false,reason:'select-a-route'})]}));f.ui.open();
 assert(f.dialog.textContent.includes('不同圈层的认可'));assert(f.dialog.textContent.includes('先为本案选择筹备方向'));assert(!/support-not-established|unknown-internal-code|select-a-route/.test(f.dialog.textContent));f.ui.dispose();
}

// Start is permitted only with the core's null case identity. People, steps and
// currently disabled requirements remain descriptive, never local mutations.
{
 const f=fixture(view({caseId:null,stage:'available',actions:[action('begin','begin',{caseId:null})]}));f.ui.open();find(f.dialog,'begin').onclick();
 assert.deepEqual(f.calls,[{id:'begin',kind:'begin',caseId:null,revision:4}]);assert.equal(f.view.caseId,null);f.ui.dispose();
}

// Close/Escape/external dismissal have no game action; current-action cancel is
// a distinct, guarded host intent which preserves the same active case.
{
 const f=fixture(view({actions:[action('cancel','cancel-current'),action('abandon','abandon')]}));f.ui.open();const original=structuredClone(f.view);
 find(f.dialog,'cancel').onclick();assert.deepEqual(f.calls,[{id:'cancel',kind:'cancel-current',caseId:'palace-usurpation-1',revision:4}]);assert.deepEqual(f.view,original);
 let prevented=false;f.dialog.fire('cancel',{preventDefault(){prevented=true;}});assert(prevented);assert(!f.ui.isOpen());assert.equal(f.calls.length,1);
 f.ui.open();f.dialog.close();assert(!f.ui.isOpen());assert.equal(f.calls.length,1);
 f.ui.open();find(f.dialog,'close').onclick();assert(!f.ui.isOpen());assert.equal(f.calls.length,1);assert.equal(f.events.filter(event=>event==='close:close').length,3);f.ui.dispose();
}

// Abandonment requires its own two-step choice. Keeping/closing a confirmation
// preserves the case, and a stale confirmation cannot abandon its replacement.
{
 const f=fixture();f.ui.open();find(f.dialog,'abandon').onclick();assert.equal(f.calls.length,0);assert(find(f.dialog,'confirm-abandon'));
 find(f.dialog,'keep-case').onclick();assert.equal(f.calls.length,0);assert(!find(f.dialog,'confirm-abandon'));
 find(f.dialog,'abandon').onclick();const old=find(f.dialog,'confirm-abandon');f.ui.close();f.ui.open();old.onclick();assert.equal(f.calls.length,0);assert(!find(f.dialog,'confirm-abandon'));
 find(f.dialog,'abandon').onclick();const outdated=find(f.dialog,'confirm-abandon');f.view.revision++;for(const row of f.view.actions)row.revision++;outdated.onclick();assert.equal(f.calls.length,0);
 find(f.dialog,'abandon').onclick();find(f.dialog,'confirm-abandon').onclick();assert.deepEqual(f.calls,[{id:'abandon',kind:'abandon',caseId:'palace-usurpation-1',revision:5,confirmed:true}]);assert.equal(f.view.stage,'planning');f.ui.dispose();
}

// Failed saves keep the original case and allow a fresh explicit retry. Names,
// source feedback and outcome text cannot insert HTML or expose stack traces.
{
 const injection='<img src=x onerror=alert(1)>',f=fixture(view({people:[{id:'guard',name:injection,status:'accepted'}],outcome:{code:'pending',summary:'记录 <b>仍保留</b>'}}));
 f.handler=()=>({ok:false,code:'save-failed'});f.ui.open();find(f.dialog,'prepare-intrigue').onclick();assert(f.dialog.textContent.includes('这一步尚未保存'));assert.equal(f.view.stage,'planning');
 assert(f.dialog.textContent.includes(injection));assert(f.dialog.textContent.includes('记录 <b>仍保留</b>'));assert(!walk(f.dialog).some(node=>['img','script','b'].includes(node.tag)));
 f.handler=()=>({ok:false,message:'无法保存 <script>恶意文字</script>'});find(f.dialog,'prepare-intrigue').onclick();assert(f.dialog.textContent.includes('无法保存 <script>恶意文字</script>'));assert.equal(f.calls.length,2);
 f.handler=()=>{throw new Error('private stack');};find(f.dialog,'prepare-intrigue').onclick();assert(!f.dialog.textContent.includes('private stack'));assert(f.dialog.textContent.includes('这一步暂未完成'));f.ui.dispose();
}

// Closed frames do not read the service. Unchanged frames preserve the mounted
// DOM; real changes restore the body's scroll, expanded details and focus.
{
 const f=fixture();for(let i=0;i<12;i++)f.ui.update();assert.equal(f.reads,0);f.ui.open();
 const originalBody=part(f.dialog,'usurpation-body'),details=part(f.dialog,'usurpation-people');originalBody.scrollTop=92;details.open=true;find(f.dialog,'route-guard').focus();
 f.ui.update();assert.equal(part(f.dialog,'usurpation-body'),originalBody);
 f.view.summary='准备仍保留，继续同号筹谋。';f.ui.update();assert.equal(part(f.dialog,'usurpation-body').scrollTop,92);assert(part(f.dialog,'usurpation-people').open);assert.equal(f.doc.activeElement,find(f.dialog,'route-guard'));
 f.ui.close();const reads=f.reads;for(let i=0;i<12;i++)f.ui.update();assert.equal(f.reads,reads);f.ui.dispose();
}

// Missing live state prevents writes but leaves a close control. A long error
// remains in the existing scroller instead of expanding the fixed footer.
{
 const f=fixture();f.readError=true;f.ui.open();assert(f.dialog.textContent.includes('筹谋记录暂时无法核对'));assert(!find(f.dialog,'prepare-intrigue'));assert(find(f.dialog,'dismiss'));
 f.readError=false;f.view.lastError='原筹谋仍保留，请稍后重试。\n'.repeat(80);f.ui.update();const error=walk(f.dialog).find(node=>node.attrs.role==='alert');assert.equal(error.textContent,f.view.lastError);assert(walk(part(f.dialog,'usurpation-body')).includes(error));exportState('long-error',f);
 const css=f.doc.head.children.find(node=>node.tag==='style').textContent;assert(css.includes('var(--ww-ui-width'));assert(css.includes('var(--ww-ui-height'));assert(!css.includes('travel-journey'));
 assert.match(css,/\.ww-usurpation-dialog \.ww-usurpation-body\{[^}]*min-height:0;overflow:auto/);assert.match(css,/\.ww-usurpation-dialog \.ww-usurpation-actions\{[^}]*flex:0 0 auto/);f.ui.dispose();
}

// A pending host navigation cannot be duplicated. Its late error cannot reopen
// a dismissed panel or leak into a newer visit or a different task.
{
 const f=fixture();let resolve;f.handler=()=>new Promise(done=>{resolve=done;});f.ui.open();const control=find(f.dialog,'prepare-intrigue');control.onclick();control.onclick();assert.equal(f.calls.length,1);assert(find(f.dialog,'prepare-intrigue').disabled);
 f.ui.close();f.ui.open();assert(find(f.dialog,'prepare-intrigue').disabled);resolve({ok:false,code:'save-failed'});await Promise.resolve();assert(f.ui.isOpen());assert(!f.dialog.textContent.includes('这一步尚未保存'));assert(!find(f.dialog,'prepare-intrigue').disabled);
 find(f.dialog,'prepare-intrigue').onclick();f.ui.close();const reads=f.reads;resolve({ok:false,code:'save-failed'});await Promise.resolve();assert(!f.ui.isOpen());assert.equal(f.reads,reads);
 f.ui.open();find(f.dialog,'prepare-intrigue').onclick();f.view=view({caseId:'new-case',revision:8,actions:[action('resolve','resolve',{caseId:'new-case',revision:8})]});f.ui.update();resolve({ok:false,code:'save-failed'});await Promise.resolve();assert(!f.dialog.textContent.includes('这一步尚未保存'));assert(find(f.dialog,'resolve'));f.ui.dispose();
}

// Destroyed controls remain inert and disposal removes both native resources.
{
 const f=fixture();f.ui.open();const old=find(f.dialog,'prepare-intrigue'),style=f.doc.head.children[0];f.ui.dispose();old.onclick();assert.equal(f.calls.length,0);assert(!f.ui.open());assert(!f.dialog.isConnected);assert(!style.isConnected);assert.equal(f.events.filter(event=>event==='close:dispose').length,1);
}

console.log('PASS CR04 plot UI: qualitative states, same-case route intents, named consent, physical-action boundaries, close/cancel/confirmed abandonment, stale/reentrant/repeated callbacks, save failures, async dismissal, inert closed updates and scroll/focus preservation. Simulated DOM, not browser or iOS visual acceptance.');
