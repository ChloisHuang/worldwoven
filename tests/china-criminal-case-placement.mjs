import assert from 'node:assert/strict';
import {createCriminalCaseMeetingPlacement} from '../source/game/china-criminal-case-placement.js';
const actor={root:{position:{toArray:()=>[0,0,0]}}};let calls=0;
const place=createCriminalCaseMeetingPlacement({getPlayerPosition:()=>[2,0,2],resolveStand:(_,p)=>p,planPath:(_,p)=>{calls++;return p[2]>0?[[0,0,-1]]:[p];},canFinish:()=>true});
assert.deepEqual(place(actor),[.78,0,0],'reject legal south room when planner only reaches other side of doorway');const before=calls;assert.deepEqual(place(actor),[.78,0,0]);assert.equal(calls,before,'stable original body reuses selected legal point');
actor.root.position.toArray=()=>[2,0,0];assert(place(actor));assert(calls>before,'moving original body invalidates cached point');
const center=createCriminalCaseMeetingPlacement({getPlayerPosition:()=>[0,0,1],resolveStand:()=>[0,0,0],planPath:()=>[[0,0,0]],canFinish:()=>true});actor.root.position.toArray=()=>[0,0,0];assert.equal(center(actor),null,'no stand on occupied body');
const blocked=createCriminalCaseMeetingPlacement({getPlayerPosition:()=>[0,0,1],resolveStand:(_,p)=>p,planPath:(_,p)=>[p],canFinish:()=>false});assert.equal(blocked(actor),null,'blocked final segment cannot become an interaction point');
console.log('PASS original case meeting point: body clearance, real route end, doorway side, moving target invalidation and stable cache');

const points=createCriminalCaseMeetingPlacement({getPlayerPosition:()=>[0,0,1],resolveStand:(_,p)=>p,planPath:(_,p)=>[{x:p[0],y:p[1],z:p[2]}],canFinish:()=>true});assert.deepEqual(points(actor),[0,0,.78],'production planner plain points accepted');

const throughBody=createCriminalCaseMeetingPlacement({getPlayerPosition:()=>[0,0,2],resolveStand:(_,p)=>p[2]<0?p:null,planPath:(_,p)=>[p],canFinish:()=>true});assert.equal(throughBody(actor),null,'cannot hold witness in a doorway and plan through their body');
const short=createCriminalCaseMeetingPlacement({getPlayerPosition:()=>[0,0,2],resolveStand:(_,p)=>p,planPath:(_,p)=>[[p[0]+.25,p[1],p[2]]],canFinish:()=>true});assert.equal(short(actor),null,'partial .25 endpoint cannot satisfy .24 execution');
let from=[0,0,2],reachable=true,plans=0;const movePlayer=createCriminalCaseMeetingPlacement({getPlayerPosition:()=>from,resolveStand:(_,p)=>p,planPath:(_,p)=>{plans++;return reachable?[p]:[];},canFinish:()=>true});assert(movePlayer(actor));const planned=plans;from=[2,0,0];reachable=false;assert.equal(movePlayer(actor),null);assert(plans>planned,'changed player origin replans positive cache');
