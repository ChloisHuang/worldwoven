import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const base=path.resolve('source'),cache=new Map();
function mod(file){file=path.resolve(file.split('?')[0]);if(!cache.has(file))cache.set(file,new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{identifier:file}));return cache.get(file);}
const link=(name,parent)=>mod(name==='three'?base+'/vendor/three/build/three.module.js':path.resolve(path.dirname(parent.identifier),name));
async function load(name){const m=mod(base+'/'+name);if(m.status==='unlinked')await m.link(link);if(m.status==='linked')await m.evaluate();return m.namespace;}
const THREE=await load('vendor/three/build/three.module.js'),{createGuestFuton}=await load('game/japan-futon.js'),{createJapanServiceProps}=await load('game/japan-service-props.js'),{createJapanServiceOrders}=await load('game/japan-service-orders.js');
const parent=new THREE.Group(),futon=createGuestFuton();futon.position.set(4.4,7.6,-11.6);parent.add(futon);const quilt=futon.getObjectByName('Soft rectangular indigo quilt').parent,props=createJapanServiceProps(parent),actors=new Map();
const state=bedding=>({visits:[],items:[],linens:[],bedding});
const board=createJapanServiceOrders(),original=board.bedding.state();props.update(state(original),actors);assert(quilt.visible);const live=parent.getObjectByName('Bathhouse live service objects');assert(live.getObjectByName('jp-bedding-1'));assert(live.getObjectByName('jp-bedding-2'));
const wash=structuredClone(original);wash.sets[0].stage='collected';wash.sets[0].carryOwner='player';props.update(state(wash),actors);assert.equal(quilt.visible,false);assert.equal(live.getObjectByName('jp-bedding-1').visible,false,'missing actor never teleports carried cover');
for(const bad of [{version:1,sets:{bad:true}},{version:99,sets:null},false]){
 const saved=board.state();saved.bedding=bad;const corrupt=createJapanServiceOrders({saved});assert.deepEqual(corrupt.state().bedding,bad);
 props.update(state(corrupt.bedding.state()),actors);assert(quilt.visible,'quarantine keeps original usable futon');assert.equal(live.getObjectByName('jp-bedding-1'),undefined,'quarantine renders no fictional initialized stock');
 props.update(state(bad),actors);assert(quilt.visible,'defensive raw malformed payload does not crash rendering');
}
props.dispose();assert(quilt.visible);assert.equal(parent.getObjectByName('Bathhouse live service objects'),undefined);
console.log('PASS actual Three futon/finite props identity, no missing-carrier teleport, corrupted raw save preservation with safe normalized rendering, disposal restores original quilt');
