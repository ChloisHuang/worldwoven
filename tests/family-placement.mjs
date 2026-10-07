import assert from 'node:assert/strict';
import {chooseFamilyPlacement,familyRoomContains} from '../source/game/family-placement.js';
const room={id:'guest',bounds:{minX:-26,maxX:-20.9,minZ:-12,maxZ:-1.4},floorY:.215},base={x:-23.5,y:.215,z:-2.2};
const solids=[{minX:-24.95,maxX:-22.05,minZ:-9.2,maxZ:-5.8},{minX:-24.85,maxX:-22.15,minZ:-4.4,maxZ:-3},{minX:-25.85,maxX:-25.15,minZ:-11.6,maxZ:-9.5}];
const blocked=(p,r)=>!familyRoomContains(room,p,r)||solids.some(b=>Math.hypot(Math.max(b.minX-p.x,0,p.x-b.maxX),Math.max(b.minZ-p.z,0,p.z-b.maxZ))<r);
const reservedPoints=[{x:-23.5,y:.215,z:-10.6},base],result=chooseFamilyPlacement({base,room,blocked,planPath:(_,p)=>[p],actors:[{...base,radius:.25}],reservedPoints});
assert(result);assert(result.position.z< -9.4,'choose the clear foot-of-bed floor, not the narrow strip behind the tea table');assert.equal(result.roomId,'guest');assert(!blocked(result.position,.75));for(const p of result.carePoints){assert(familyRoomContains(room,p,.35));assert(!blocked(p,.35));assert(reservedPoints.every(q=>Math.hypot(p.x-q.x,p.z-q.z)>=.65),'care points preserve the door/working anchor');}
assert.equal(chooseFamilyPlacement({base:{x:0,y:0,z:0},room:{id:'narrow',bounds:[-.6,.6,-4,4]},blocked:()=>false,planPath:(_,p)=>[p]}),null);
assert(chooseFamilyPlacement({base:{x:0,y:0,z:0},blocked:()=>false,planPath:(_,p)=>[p]}));
console.log('PASS: same-room clear floor with two care positions; no tea-table slot or reserved entrance anchor; narrow room rejected, public fallback kept');
