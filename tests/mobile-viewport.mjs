import assert from 'node:assert/strict';
import fs from 'node:fs';
import {mobileViewportGeometry,mountMobileViewport,createMobileViewportHost} from '../source/game/mobile-viewport.js';
const portrait={left:0,top:0,width:393,height:852};
assert.deepEqual(mobileViewportGeometry(portrait,portrait,{top:59,bottom:34}),{width:852,height:393,left:393,top:0,rotation:90,safe:{left:59,top:0,right:34,bottom:0}});
const landscape={left:0,top:0,width:852,height:393};
assert.deepEqual(mobileViewportGeometry(landscape,landscape,{left:59,bottom:21}),{width:852,height:393,left:0,top:0,rotation:0,safe:{left:59,top:0,right:0,bottom:21}});
const bars=mobileViewportGeometry(portrait,{left:0,top:50,width:393,height:650},{top:59,bottom:34});
assert.deepEqual(bars,{width:650,height:393,left:393,top:50,rotation:90,safe:{left:9,top:0,right:0,bottom:0}});
const keyboard=mobileViewportGeometry(portrait,{left:0,top:59,width:393,height:460},{top:59,bottom:34},true);
assert.equal(keyboard.rotation,90);assert.equal(keyboard.width,460);assert.deepEqual(keyboard.safe,{left:0,top:0,right:0,bottom:0});
function fixture(coarse=true){
 const events={},posts=[],properties={};let sourceAssignments=0;
 const frame={dataset:{},style:{},setAttribute(){},addEventListener(type,fn){events['frame:'+type]=fn;},contentWindow:{postMessage(...args){posts.push(args);}},set src(value){this.url=value;sourceAssignments++;}};
 const doc={documentElement:{clientWidth:393,clientHeight:852,dataset:{},style:{setProperty(k,v){properties[k]=v;}}},body:{replaceChildren(child){assert.equal(child,frame);}},createElement(tag){assert.equal(tag,'iframe');return frame;},addEventListener(type,fn){events['document:'+type]=fn;}};
 const view={document:doc,location:{href:'https://example.com/game/?character-preview=1#china',origin:'https://example.com'},visualViewport:{offsetLeft:0,offsetTop:0,width:393,height:852,addEventListener(type,fn){events['visual:'+type]=fn;}},getComputedStyle(){return {getPropertyValue:k=>k==='--ww-safe-top'?'59px':k==='--ww-safe-bottom'?'34px':'0px'};},matchMedia(){return {matches:coarse};},addEventListener(type,fn){events[type]=fn;}};
 return {view,doc,frame,events,posts,properties,sources:()=>sourceAssignments};
}
const desktop=fixture(false);assert.equal(mountMobileViewport(desktop.view),false);assert.equal(desktop.sources(),0,'desktop boots directly');
const f=fixture();assert.equal(mountMobileViewport(f.view),true);assert.equal(f.sources(),1);assert.equal(f.frame.url,f.view.location.href,'same origin, original preview query and hash');assert.equal(f.frame.style.transform,'rotate(90deg)');
f.doc.documentElement.clientWidth=852;f.doc.documentElement.clientHeight=393;Object.assign(f.view.visualViewport,{width:852,height:393});f.events.resize();assert.equal(f.frame.style.transform,'rotate(0deg)');assert.equal(f.sources(),1,'orientation never navigates/recreates the world');
Object.assign(f.doc.documentElement,{clientWidth:393,clientHeight:852});Object.assign(f.view.visualViewport,{width:393,height:852});f.events.resize();f.events.message({origin:f.view.location.origin,source:f.frame.contentWindow,data:{kind:'worldwoven-editing',active:true}});Object.assign(f.doc.documentElement,{clientHeight:300});Object.assign(f.view.visualViewport,{height:300});f.events.resize();assert.equal(f.frame.style.transform,'rotate(90deg)','keyboard does not change physical orientation');assert.equal(f.sources(),1);
const child=fixture();child.view.frameElement=f.frame;child.view.parent={};let resizeCount=0;child.view.dispatchEvent=()=>resizeCount++;
assert.equal(mountMobileViewport(child.view),false,'inner boots normal game without iframe recursion');assert.equal(child.doc.documentElement.dataset.mobileGame,'inner');assert.equal(child.properties['--ww-safe-left'],'59px');assert.equal(child.sources(),0);
child.events.message({origin:'https://hostile.invalid',source:child.view.parent,data:{kind:'worldwoven-viewport'}});assert.equal(resizeCount,0);
child.events.message({origin:child.view.location.origin,source:child.view.parent,data:{kind:'worldwoven-viewport'}});assert.equal(resizeCount,1);
const entry=fs.readFileSync('source/game/entry.js','utf8');assert(entry.includes('if(!mountMobileViewport())try{'),'normal main executes exactly once inside mobile viewport');
assert(!fs.readFileSync('source/game/index.html','utf8').includes('请将手机横放'),'obsolete physical rotation demand removed');
console.log('PASS mobile viewport: safe-axis mapping, browser-bar intersection, desktop, persistent resize, keyboard orientation, child guard and origin checks');
