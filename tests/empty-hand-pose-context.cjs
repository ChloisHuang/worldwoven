// Reproduces cached service/meal hands leaking into ordinary movement. Exercise
// the exact production context builder rather than weakening carry animations.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const text=fs.readFileSync('source/game/main.js','utf8'),start=text.indexOf('function characterPoseContext('),end=text.indexOf('\nfunction disposePerson(',start);
const context=vm.createContext({seated:null,bathTransition:null,npcSocial:{look:()=>null},lot:{},multiLevel:true,
 characterFloorOffsetAt:()=>.015,visualSupportHeight:()=>.815,footprintSupportHeight:()=>.815});
const pose=vm.runInContext('('+text.slice(start,end)+')',context),person={root:{position:{x:2.9,y:.815,z:-29}},characterScale:.96};
const first=pose(person,null),ground=first.groundHeightAt,footprint=first.footprintHeightAt;
Object.assign(first,{handoff:true,heldProp:'cloth',seatedMeal:true,receptionWriting:true,handoffLean:.75,handoffDip:.1,archery:{hands:[[-.18,1.1,.4],[.18,1.1,.4]]}});
const walking=pose(person,null);
assert.equal(walking,first,'reuse cheap per-person context and terrain probes');
for(const key of ['handoff','seatedMeal','receptionWriting'])assert.equal(walking[key],false,key+' must not survive service owner release');
assert.equal(walking.heldProp,null);assert.equal(walking.archery,null);assert.equal(walking.handoffLean,undefined);assert.equal(walking.handoffDip,undefined);
assert.equal(walking.groundHeightAt,ground);assert.equal(walking.footprintHeightAt,footprint);
// Current owner can immediately author real carry/contact; the next owner gets
// a neutral baseline. A second person never consumes this person's pose state.
Object.assign(pose(person,null),{handoff:true,archery:{hands:[[-.18,1.1,.4],[.18,1.1,.4]]}});
const other=pose({root:{position:{x:4,y:.815,z:-30}}},null);assert.equal(other.handoff,false);assert.equal(other.archery,null);
assert.equal(person.poseContext.handoff,true,'current owner explicit handoff remains until next context request');
assert.equal(pose(person,null).handoff,false);
console.log('PASS exact production pose-context resets all six transient service fields, preserves probes, isolates people and permits current-owner carrying');
// The same visitor moves from conversation point to the actual tea table.
// Its conversation flag is valid while stopped, but not along that empty walk.
const palace=fs.readFileSync('source/game/china-palace-life.js','utf8'),animateStart=palace.indexOf(' function animate(n,s,t){'),animateEnd=palace.indexOf('\n function restore(',animateStart);
let observed;const guest={root:{position:{x:3,y:.815,z:-29}},station:{id:'cn-consort-yue'},phase:0,walking:false,animate(t,walking,action,c){observed={walking,action,handoff:c.handoff,archery:c.archery};}};
const visitContext=vm.createContext({toilet:()=>null,meals:new Map([[guest,{show(){},sync(){}}]]),scripts:new Map([[guest,[{pair:true}]]]),poseContext:pose,hostHeld:guest,host:{},interrupted:()=>false,getTeaService:()=>null,conversation:null});
const visitPose=vm.runInContext('('+palace.slice(animateStart,animateEnd)+')',visitContext);
visitPose(guest,{index:0,arrived:true},1);assert.equal(observed.handoff,true,'stationary original conversation still owns its gesture');
guest.walking=true;visitPose(guest,{index:0,arrived:true},1.1);assert.equal(observed.handoff,false,'original palace guest walks empty-handed to tea table');assert.equal(observed.archery,null);
guest.walking=false;const hands=[[-.18,.95,.2],[.12,1.2,.29]];visitContext.getTeaService=()=>({guestLookTarget:()=>null,guestPose:()=>({handoff:true,archery:{hands}}),observeGuestPose(){}});
visitPose(guest,{index:0,arrived:true},2);assert.equal(observed.handoff,true);assert.equal(observed.archery.hands,hands,'actual guest cup contacts override the ordinary baseline');
console.log('PASS exact palace visitor animator: conversation to empty walk to original cup contact');
