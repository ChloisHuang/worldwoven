// Compare only the changed pure ray/box routine with its pre-optimization source.
// No renderer, full scene, saved game, network access or source mutation.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),cp=require('node:child_process');
const file='source/game/night-lighting.js',base=cp.execFileSync('git',['show','a8b026a:'+file],{encoding:'utf8'}),current=fs.readFileSync(file,'utf8');
function compile(s,rollover=false){s=s.slice(s.indexOf('function makeFieldOcclusion('),s.indexOf('function buildFixtureField('));if(rollover)s=s.replace('let stamp=0','let stamp=4294967294');return vm.runInNewContext('('+s+')');}
let seed=4982;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const boxes=[{minX:-.1,maxX:.1,minZ:-12,maxZ:12,minY:-1,maxY:8},{minX:-4,maxX:4,minZ:-4,maxZ:4,minY:4,maxY:4.2},{minX:2,maxX:3,minZ:2,maxZ:3,minY:0,maxY:3},{minX:NaN,maxX:1,minZ:0,maxZ:1}];
for(let i=0;i<70;i++){const x=rnd()*40-20,z=rnd()*40-20,y=rnd()*10;boxes.push({minX:x,maxX:x+.1+rnd()*10,minZ:z,maxZ:z+.1+rnd()*10,...(i%5?{minY:y,maxY:y+.1+rnd()*4}:{})});}
const lot={cameraColliders:boxes},before=JSON.stringify(lot),old=compile(base)(lot),next=compile(current)(lot),rollover=compile(current,true)(lot);let blocked=0;
for(let i=0;i<12000;i++){
 const p={x:rnd()*50-25,y:rnd()*15-2,z:rnd()*50-25},q={x:rnd()*50-25,y:rnd()*15-2,z:rnd()*50-25};
 // Parallel axes, short rays, negative coordinates, duplicate bucket hits,
 // wall/floor boundaries, compact-emitter exemption and uint32 stamp wrap.
 if(i%3===0)q.x=p.x;if(i%5===0)q.z=p.z;if(i%7===0)q.y=p.y;
 if(i%11===0)Object.assign(q,{x:p.x+.1,y:p.y,z:p.z});
 if(i%13===0)Object.assign(q,{x:2.5,y:2,z:2.5});
 if(i%17===0)Object.assign(p,{x:-.1,y:4,z:4});
 const f={position:q},expected=old(p,f);blocked+=expected;assert.equal(next(p,f),expected,'ray '+i);assert.equal(rollover(p,f),expected,'wrap ray '+i);
}
assert.equal(JSON.stringify(lot),before,'input colliders are immutable');
console.log(JSON.stringify({status:'PASS',rays:12000,blocked,checks:['identical occlusion','parallel and short rays','walls and floors','compact emitter exemption','stamp rollover','input immutability'],baseline:'a8b026a'}));
