// Lightweight fixture-only contract check: does not import Three or game modules.
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
let s=require('./bounded-dom.cjs')(fs.readFileSync('tests/fixtures/hotfix-input-harness.cjs','utf8'));
s=s.slice(0,s.indexOf('const legacyIdentity='));
s=s.replace("const vm=require('vm'),fs=require('fs'),path=require('path'),assert=require('assert');",'');
s+=`const parent=document.body,a=document.createElement('div'),b=document.createElement('span');a.className='probe';b.className='child';a.append(b);assert(!all.find(e=>e===a));parent.append(a);assert.equal(document.querySelectorAll('.probe').length,1);a.remove();assert(!all.find(e=>e===a));assert.equal(b.parent,a);parent.append(a);assert(all.find(e=>e===b));a.replaceChildren();assert.equal(b.parent,null);assert(!all.find(e=>e===b));a.append(b);a.innerHTML='';assert.equal(b.parent,null);assert(!all.find(e=>e===b));parent.append(document.createTextNode('text'));assert.equal(document.querySelectorAll('.probe').length,1);for(let i=0;i<10000;i++){const e=document.createElement('div');parent.append(e);e.remove();}assert.equal(all.filter(e=>e===a).length,1);console.log('PASS attached DOM contract, selectors, text nodes, 10000 removals');`;
vm.runInNewContext(s,{fs,path,require,assert,console,process});
