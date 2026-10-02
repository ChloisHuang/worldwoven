// Same dependency-free VM module loading pattern as the existing regression suite.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
exports.createBrowserModuleLoader=function(source){
 const root=path.resolve(source),cache=new Map();
 function moduleAt(file){file=path.resolve(file.split('?')[0]);if(cache.has(file))return cache.get(file);const m=new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{identifier:file});cache.set(file,m);return m;}
 const link=(specifier,parent)=>moduleAt(specifier==='three'?path.join(root,'vendor/three/build/three.module.js'):path.resolve(path.dirname(parent.identifier),specifier.split('?')[0]));
 return async function load(relative){const m=moduleAt(path.join(root,relative));if(m.status==='unlinked')await m.link(link);if(m.status==='linked')await m.evaluate();return m.namespace;};
};
