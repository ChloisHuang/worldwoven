// Cheap DOM regression: original evidence must remain read-only, and stale or
// closed callbacks must never enqueue physical actions or duplicate reviews.
import assert from 'node:assert/strict';
import {createChinaCriminalCasePanel} from '../source/game/china-criminal-case-panel.js';
class Element {
 constructor(tag,doc){this.tagName=tag.toUpperCase();this.doc=doc;this.children=[];this.attrs={};this.className='';this.textContent='';this.open=false;this.events={};this.scrollTop=0;}
 get attributes(){return Object.entries(this.attrs).map(([name,value])=>({name,value}));}
 append(...nodes){for(const node of nodes){node.parent=this;this.children.push(node);}}
 replaceChildren(...nodes){this.children=[];this.append(...nodes);}
 setAttribute(k,v){this.attrs[k]=String(v);} getAttribute(k){return this.attrs[k]||null;}
 addEventListener(k,fn){this.events[k]=fn;} showModal(){this.open=true;}
 close(){this.open=false;this.events.close?.();} focus(){this.doc.activeElement=this;}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);}
 set innerHTML(_){throw new Error('Dynamic HTML is not allowed');}
}
const doc={createElement(tag){return new Element(tag,this);}};doc.body=doc.createElement('body');doc.head=doc.createElement('head');
const all=n=>[n,...n.children.flatMap(all)],text=()=>all(doc.body).map(n=>n.textContent).join('\n');
const find=predicate=>all(doc.body).find(predicate),action=()=>find(n=>n.attrs['data-panel-key']==='criminal-action-real-1');
let cases=[],available=true,revision=0,closed=0;const sent=[];
const panel=createChinaCriminalCasePanel({document:doc,getCases:()=>structuredClone(cases),getIntent:id=>available?{id,intentKey:`${id}:${revision}`,action:'继续原案'}:null,nameOf:id=>({suspect:'原涉事人',victim:'原受害人'})[id]||id,onClose:()=>closed++,onAction:intent=>{assert.equal(panel.isOpen(),false,'close before navigation');sent.push(intent);}});
assert(panel.open());assert(text().includes('没有可核验的真实原案'));assert(text().includes('正二品'));assert(text().includes('168文'));assert(!action());
cases=[{id:'real-1',number:1,kind:'theft',stage:'intake',source:{subjectId:'suspect',victimId:'victim',evidence:['<img src=x onerror=alert(1)>','已存原事件记录']},outcome:null,stale:false}];const original=structuredClone(cases);
panel.refresh();assert(text().includes('原涉事人'));assert(text().includes('<img src=x onerror=alert(1)>'));assert(text().includes('不能仅凭陈述认定有罪'));assert.deepEqual(cases,original);
const first=action();assert(first);revision++;first.onclick();assert.equal(sent.length,1);assert.equal(sent[0].intentKey,'real-1:1');assert.equal(closed,1);first.onclick();assert.equal(sent.length,1);
panel.open();const stale=action();cases[0].stage='scene';panel.refresh();stale.onclick();assert.equal(sent.length,1,'refreshed callbacks rejected');
const scene=action();cases[0].stage='witness';scene.onclick();assert.equal(sent.length,1,'unrefreshed stage changes rejected');assert(text().includes('当面询证'));
const body=find(n=>n.className==='ww-airy-panel-body'),details=find(n=>n.tagName==='DETAILS');body.scrollTop=95;details.open=true;action().focus();
panel.refresh();assert.equal(find(n=>n.className==='ww-airy-panel-body'),body,'unchanged state keeps DOM');
cases[0].stale=true;panel.refresh();assert.equal(find(n=>n.className==='ww-airy-panel-body').scrollTop,95);assert(find(n=>n.tagName==='DETAILS').open);assert(text().includes('原事件状态已变化'));
cases[0].stage='review';available=false;panel.refresh();assert(action().disabled);assert(text().includes('本人当前无法接待'));action().onclick();assert.equal(sent.length,1);
available=true;panel.refresh();const review=action();available=false;review.onclick();assert(panel.isOpen());assert.equal(sent.length,1,'live unavailable reviewer blocks callback');
for(const [outcome,label] of [['evidence-corroborated','原据相互印证'],['insufficient-evidence','证据不足'],['sentence-already-served','原处罚已执行完毕'],['source-closed','原事件已结束'],['new-outcome','复核结论待核对']]){cases[0].outcome=outcome;panel.refresh();assert(text().includes(label));}
cases[0].source.number=7;delete cases[0].number;cases[0].source.kind='harm';delete cases[0].kind;cases[0].source.evidence=[{kind:'sight',witnessId:'victim',witnessKey:'internal-body-key',deliveredTo:['cn-guard']}];cases[0].outcome={code:'reviewed-referral',recordedStatement:true};panel.refresh();assert(text().includes('第7号'));assert(text().includes('伤人原案'));assert(text().includes('现场目击记录'));assert(text().includes('不是新增证言'));assert(!text().includes('internal-body-key'));assert(!text().includes('cn-guard'));
cases[0].stage='archive';available=true;panel.refresh();assert(action());cases[0].stage='archived';panel.refresh();assert(!action());assert(text().includes('已归档'));
const dialog=find(n=>n.tagName==='DIALOG');let prevented=false;dialog.events.cancel({preventDefault(){prevented=true;}});assert(prevented);assert(!panel.isOpen());assert.equal(closed,2);panel.close();assert.equal(closed,2);
panel.open();panel.dispose();assert.equal(closed,3);assert.equal(doc.body.children.length,0);assert.equal(doc.head.children.length,0);assert(!panel.open());
console.log('PASS criminal original-case panel: no fabricated cases, source-safe text, fixed original rank/pay, all stages/outcomes, live intents, unavailable reviewer, stale/closed guards, view preservation, native cancel/dispose');
