import assert from 'node:assert/strict';
import {canTraverse} from '../source/game/navigation.js';

// Reproduce the palace's fresh person/door list without rebuilding static
// geometry. Compare the previous concat path, including moving/removing a body.
const walls=[{minX:2,maxX:2.2,minZ:-4,maxZ:1,minY:0,maxY:3}];
const surfaces=[{minX:-5,maxX:5,minZ:-5,maxZ:5,y:0},{minX:-2,maxX:2,minZ:2,maxZ:4,y:0,axis:'z',endY:1}];
const options={surfaces,legacyGround:false,bounds:{minX:-5,maxX:5,minZ:-5,maxZ:5},radius:.25,bodyHeight:1.95,maxStep:.4};
const person={minX:.9,maxX:1.4,minZ:1.75,maxZ:2.3,minY:0,maxY:1.95};
const from={x:0,y:0,z:1.6},to={x:3,y:0,z:1.6};
assert.equal(canTraverse(from,to,walls,options),true);
assert.equal(canTraverse(from,to,walls,options,[person]),false,'live person blocks next query');
person.minZ=3;person.maxZ=3.5;
assert.equal(canTraverse(from,to,walls,options,[person]),true,'moved person immediately clears');
assert.equal(canTraverse(from,to,walls,options,[]),true,'removed blocker is not retained');
let seed=921;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};let cases=0;
for(const o of [options,{...options,multilevel:false}])for(let i=0;i<240;i++){
 const start={x:random()*7-3.5,y:0,z:random()*4-2},end={x:random()*7-3.5,y:0,z:random()*4-2};
 const x=random()*6-3,z=random()*5-2.5,extra=[{minX:x,maxX:x+.4,minZ:z,maxZ:z+.4,minY:i%3===0?3:0,maxY:i%3===0?5:2}];
 assert.equal(canTraverse(start,end,walls,o,extra),canTraverse(start,end,walls.concat(extra),{...o}),`same live collision result ${i}`);cases++;
}
console.log(JSON.stringify({status:'PASS',cases,checks:['static wall','live person/door update','removal invalidation','height separation','multilevel and flat concat equivalence']}));
