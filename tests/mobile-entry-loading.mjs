// Execute the actual boot entry with only renderer/model imports stubbed. This
// catches double-world boots and loss of preview isolation in the mobile shell.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const root=path.resolve('source/game');
async function boot({coarse=false,embedded=false,preview=false}={}){
 const requested=[],styles={},elements=new Map();let frames=0;
 const frame={dataset:{mobileGame:'worldwoven-mobile-game',mobileGeometry:JSON.stringify({rotation:90,safe:{left:59,top:0,right:34,bottom:0}})},style:{},setAttribute(){},addEventListener(){},contentWindow:{postMessage(){}}};
 const location={origin:'https://example.com',href:'https://example.com/game/'+(preview?'?character-preview=1':''),search:preview?'?character-preview=1':''};
 const document={documentElement:{dataset:{},clientWidth:393,clientHeight:852,style:{setProperty(k,v){styles[k]=v;}}},body:{replaceChildren(){}},addEventListener(){},getElementById(id){if(!elements.has(id))elements.set(id,{querySelector:()=>({})});return elements.get(id);},createElement(){frames++;return frame;}};
 const window={document,location,frameElement:embedded?frame:null,parent:{},matchMedia:()=>({matches:coarse}),getComputedStyle:()=>({getPropertyValue:()=> '0px'}),addEventListener(){}};
 const context=vm.createContext({window,document,location,URL,Event}),modules=new Map();
 function load(file){
  if(modules.has(file))return modules.get(file);
  const module=new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{context,identifier:file,importModuleDynamically:async spec=>{
   requested.push(spec);assert(['./main.js','./character-live-entry.js','./character-preview-entry.js'].includes(spec));
   const stub=new vm.SyntheticModule([],()=>{},{context});await stub.link(()=>{});await stub.evaluate();return stub;
  }});modules.set(file,module);return module;
 }
 const entry=load(path.join(root,'entry.js'));await entry.link((spec,reference)=>load(path.resolve(path.dirname(reference.identifier),spec)));await entry.evaluate();
 return {requested,frames,styles};
}
assert.deepEqual((await boot()).requested,['./character-live-entry.js','./main.js']);
for(const preview of [false,true]){const host=await boot({coarse:true,preview});assert.equal(host.frames,1);assert.deepEqual(host.requested,[],'mobile outer document starts no models or world');const child=await boot({coarse:true,embedded:true,preview});assert.equal(child.frames,0,'embedded document cannot recurse');assert.deepEqual(child.requested,[preview?'./character-preview-entry.js':'./character-live-entry.js','./main.js']);assert.equal(child.styles['--ww-safe-left'],'59px');}
console.log('PASS actual entry: desktop boots once; mobile shell boots no world; embedded live/preview boot exactly once with mapped safe area');
