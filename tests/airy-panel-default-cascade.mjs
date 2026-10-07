// Reproduces the T05 shared-style reinsertion defect without a CSS/browser shim.
// This narrowly checks the real selectors' cascade priority and defaults. Pixel
// layout, scrolling gestures and iOS viewport behavior need browser/device QA.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {AIRY_PANEL_STYLE,createAiryPanelParts} from '../source/game/airy-panel.js';

const rules=css=>Array.from(css.matchAll(/([^{}]+)\{([^{}]*)\}/g),m=>({selector:m[1].trim(),body:m[2]}));
const property=(rule,name)=>rule.body.match(new RegExp('(?:^|;)'+name+':([^;]+)'))?.[1];
const source=file=>readFileSync(new URL('../source/game/'+file,import.meta.url),'utf8');
const exactRule=(text,selector)=>{
 const escaped=selector.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const match=text.match(new RegExp(escaped+'\\{([^{}]+)\\}'));
 assert(match,'Missing real style: '+selector);return {selector,body:match[1]};
};
// Only this finite selector subset is used below: classes, types, descendants,
// direct children, and :where(). Do not pretend this is a general CSS parser.
const priority=selector=>{
 const weighted=selector.replace(/:where\([^()]*\)/g,'');
 assert(!/[#:[\],+~]/.test(weighted),'Unexpected selector form: '+selector);
 return [(weighted.match(/\.[\w-]+/g)||[]).length,(weighted.replace(/\.[\w-]+/g,' ').match(/[a-zA-Z][\w-]*/g)||[]).length];
};
const compare=(a,b)=>priority(a)[0]-priority(b)[0]||priority(a)[1]-priority(b)[1];
const winner=(candidates,name)=>candidates.reduce((best,rule)=>property(rule,name)!==undefined&&(!best||compare(rule.selector,best.selector)>=0)?rule:best,null);
const shared=rules(AIRY_PANEL_STYLE),widthRules=shared.filter(r=>property(r,'width')!==undefined),overflowRules=shared.filter(r=>r.selector.includes('ww-airy-panel-body')&&property(r,'overflow')!==undefined);
assert.equal(widthRules.length,1);assert.equal(property(widthRules[0],'width'),'100%');
assert.equal(overflowRules.length,1);assert.equal(property(overflowRules[0],'overflow'),'auto');

const localWidths=[
 ['france-meal-ui.js','.fr-meal-actions button'],
 ['egypt-meal-ui.js','.eg-meal-actions button'],
 ['japan-player-service-ui.js','.jp-service-actions button'],
 ['japan-performance-ui.js','.jp-performance-actions button'],
 ['china-tavern-salon-ui.js','.cn-salon-actions button'],
 ['china-tavern-property-ui.js','.cn-property-action-row button'],
 ['china-tavern-meal-ui.js','.cn-meal-dialog .cn-meal-actions button'],
 ['china-tavern-lodging-ui.js','.cn-inn-dialog .cn-inn-actions>button'],
 ['study-theme.js','.study-dialog .study-actions button'],
 ['china-consort-petition-ui.js','.cn-consort-dialog .cn-consort-actions button'],
];
for(const [file,selector]of localWidths){
 const rule=exactRule(source(file),selector);assert.equal(property(rule,'width'),'auto');
 assert(compare(rule.selector,widthRules[0].selector)>0,file+' must beat a later shared width default');
 for(const order of [[...widthRules,rule],[rule,...widthRules],[...widthRules,rule,...widthRules,...widthRules]])assert.equal(property(winner(order,'width'),'width'),'auto',file+' keeps its designed footer for every injection order');
}
// Full-width default consumers remain unchanged: China/France labor and career
// have full-width primary rules; plain career/footer and conversation cancel use
// this fallback. Property is covered above, including its nested action row.
assert.equal(property(winner([...widthRules,...widthRules],'width'),'width'),'100%');
for(const [file,selector]of [
 ['china-tavern-labor.js','.cn-labor-dialog.ww-airy-theme .cn-labor-primary'],
 ['france-gardener-labor.js','.fr-labor-dialog.ww-airy-theme .fr-labor-primary'],
 ['career-handbook.js','.career-current-action'],
]){
 const rule=exactRule(source(file),selector);assert.equal(property(rule,'width'),'100%');
 assert.equal(property(winner([rule,...widthRules],'width'),'width'),'100%');
}

const localOverflow=[
 ['france-meal-ui.js','.fr-meal-content'],
 ['china-tavern-meal-ui.js','.cn-meal-content'],
 ['japan-player-service-ui.js','.jp-service-content'],
 ['japan-performance-ui.js','.jp-performance-content'],
 ['china-tavern-salon-ui.js','.cn-salon-content'],
 ['china-tavern-property-ui.js','.cn-property-content'],
 ['china-tavern-labor.js','.cn-labor-content'],
 ['france-gardener-labor.js','.fr-labor-content'],
 ['study-theme.js','.study-dialog .study-content'],
];
for(const [file,selector]of localOverflow){
 const rule=exactRule(source(file),selector);assert.equal(property(rule,'overflow'),'hidden');
 assert(compare(rule.selector,overflowRules[0].selector)>0,file+' keeps its column scroll owners after shared reinsertion');
 for(const order of [[...overflowRules,rule],[rule,...overflowRules],[rule,...overflowRules,...overflowRules]])assert.equal(property(winner(order,'overflow'),'overflow'),'hidden');
 // Narrow/portrait variants retain their own whole-body scroll policy.
 const portrait=rules(source(file)).find(r=>r.selector===selector&&property(r,'overflow')==='auto');
 assert(portrait,file+' has a portrait body scroll owner');
 assert.equal(property(winner([portrait,...overflowRules],'overflow'),'overflow'),'auto');
}
assert.equal(property(exactRule(source('egypt-meal-ui.js'),'.eg-meal-content'),'overflow'),'auto','Egypt keeps its original whole-body scroller');
const bodyRule=shared.find(r=>property(r,'min-height')==='0');
assert.equal(property(bodyRule,'flex'),'1 1 auto');
assert.equal(property(exactRule(AIRY_PANEL_STYLE,'.ww-airy-panel-actions'),'flex'),'0 0 auto','footer never steals shrinkable body space');
assert.equal(property(exactRule(AIRY_PANEL_STYLE,'.ww-airy-panel-actions:empty'),'display'),'none');
const parts=createAiryPanelParts({createElement:tag=>({tag})});
assert.deepEqual(Object.fromEntries(Object.entries(parts).map(([key,node])=>[key,[node.tag,node.className]])),{
 header:['header','ww-airy-panel-heading'],body:['div','ww-airy-panel-body'],actions:['footer','ww-airy-panel-actions'],
});
console.log('PASS Airy shared defaults: 10 footer overrides, 9 landscape/portrait scroll policies, repeated/reversed style insertion, full-width fallback and non-shrinking footer anatomy');
