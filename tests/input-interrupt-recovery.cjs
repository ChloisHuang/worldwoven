// Execute production input/lifecycle handlers in a small event-target fixture.
// Reproduces lost/cancelled pointers reviving movement, camera or clicks. This
// intentionally proves handler state, not browser dispatch or physical iOS use.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(process.env.INPUT_MAIN||'source/game/main.js','utf8');
const input=source.slice(source.lastIndexOf("addEventListener('pagehide'"),source.indexOf("$('travel').onclick="));
const contextLoss=source.slice(source.indexOf("canvas.addEventListener('webglcontextlost'"),source.indexOf("window.addEventListener('hashchange'"));
const panel=source.slice(source.indexOf('function pauseForReadOnlyPanel()'),source.indexOf('function refreshCourtHelp()'));
class Target{
 constructor(){this.events=new Map();this.captured=new Set();this.style={};this.hidden=false;}
 addEventListener(type,fn){this.events.set(type,[...(this.events.get(type)||[]),fn]);}
 emit(type,e={}){for(const fn of this.events.get(type)||[])fn(e);if(['pointerup','pointercancel'].includes(type))this.releasePointerCapture(e.pointerId);}
 setPointerCapture(id){this.captured.add(id);}
 hasPointerCapture(id){return this.captured.has(id);}
 releasePointerCapture(id){if(this.captured.delete(id))this.emit('lostpointercapture',{pointerId:id});}
 getBoundingClientRect(){return{left:0,top:0,width:108,height:108};}
}
function fixture(){
 const win=new Target(),doc=new Target(),canvas=new Target(),joystick=new Target(),knob=new Target(),viewportEvents=new Target();
 let panelOpen=false,taps=0,saves=0,frame=0;const elements={'joystick':joystick,'joystick-knob':knob};
 const context=vm.createContext({console,Map,Math,window:win,document:doc,canvas,$:id=>elements[id]||(elements[id]=new Target()),
 addEventListener:win.addEventListener.bind(win),requestAnimationFrame:()=>++frame,cancelAnimationFrame(){},
 syncUiViewport(){},displayedViewport:()=>({left:0,top:0,width:844,height:390}),hudLayout:{invalidate(){}},matchMedia:()=>({matches:false}),outfitPreview:{state:()=>({open:false})},
 camera:{position:{},updateProjectionMatrix(){}},renderer:{setSize(){},setPixelRatio(){}},devicePixelRatio:1,updateCamera(){},
 cancelPlayerStandIntent(){},showDoorwayHint(){},beginActorNavigationStep(){},gameHealth:{flush(){}},save(){saves++;},clock:{getDelta(){}},
 interactionMenuOpen:()=>panelOpen,pointer:{set(){}},ray:{setFromCamera(){taps++;}},pickWalkPoint:()=>null,
 player:{root:{position:{}}},furniture:null,focusedGlobe:null,mode:'lot',drag:null,joy:{x:0,y:0},keys:new Set(),paused:false,yaw:0,pitch:.22,distance:4.6,globeZoom:1,viewport:{left:0,top:0,width:844,height:390},
 });win.visualViewport=viewportEvents;
 vm.runInContext(input+'\n'+contextLoss+'\n'+panel+`\nthis.readInput=()=>({joy:{...joy},keys:[...keys],joyPointer,joyLastPoint,joyActionAnchor,touches:[...touches.keys()],drag:drag&&{...drag},pinchDistance,yaw,pitch,distance,paused});this.openPanel=()=>pauseForReadOnlyPanel();`,context);
 const ev=(id,x=72,y=54)=>({pointerId:id,button:0,clientX:x,clientY:y,preventDefault(){}}),send=(target,type,id,x,y)=>target.emit(type,ev(id,x,y));
 return{win,doc,canvas,joystick,knob,viewportEvents,ev,send,read:context.readInput,open:()=>{panelOpen=true;context.openPanel();},close:()=>{panelOpen=false;},taps:()=>taps,saves:()=>saves,context};
}
const results=[];
function check(name,fn){try{fn(fixture());results.push({name,status:'PASS'});}catch(e){results.push({name,status:'FAIL',error:e.message});}}
function hold(f){f.win.emit('keydown',{code:'KeyW',preventDefault(){}});f.send(f.joystick,'pointerdown',11);f.send(f.canvas,'pointerdown',21,200,200);f.send(f.canvas,'pointerdown',22,300,200);f.send(f.canvas,'pointermove',22,330,200);}
function cleared(f){const s=f.read();assert.equal(s.keys.length,0,'keyboard cleared');assert.equal(s.joyPointer,null,'joystick pointer cleared');assert.equal(s.joyLastPoint,null,'joystick last point cleared');assert.equal(s.joyActionAnchor,null,'joystick action anchor cleared');assert.equal(Math.hypot(s.joy.x,s.joy.y),0,'joystick neutral');assert.equal(s.touches.length,0,'camera pointers cleared');assert.equal(s.drag,null,'camera drag cleared');assert.equal(s.pinchDistance,0,'pinch baseline cleared');assert.equal(f.canvas.captured.size+f.joystick.captured.size,0,'captures released');}
function oldEventsIgnored(f){const before=f.read();f.send(f.joystick,'pointermove',11,90,60);f.send(f.canvas,'pointermove',22,360,200);f.send(f.canvas,'pointerup',21,200,200);const after=f.read();assert.equal(Math.hypot(after.joy.x,after.joy.y),0,'old joystick move cannot revive movement');assert.equal(after.yaw,before.yaw);assert.equal(after.distance,before.distance,'old pinch cannot zoom');assert.equal(f.taps(),0,'old release cannot click');}
function freshWorks(f){f.send(f.joystick,'pointerdown',31,85,54);assert(f.read().joy.x>.5,'fresh joystick works');f.send(f.joystick,'pointerup',31,85,54);f.send(f.canvas,'pointerdown',41,200,200);f.send(f.canvas,'pointermove',41,220,200);assert(f.read().yaw<0,'fresh drag works');f.send(f.canvas,'pointerup',41,220,200);f.send(f.canvas,'pointerdown',42,200,200);f.send(f.canvas,'pointerup',42,200,200);assert.equal(f.taps(),1,'fresh tap works once');}
for(const event of ['blur','visibilitychange','pagehide','orientationchange','resize','pageshow'])check(event+' clears and fresh input recovers',f=>{hold(f);if(event==='visibilitychange'){f.doc.hidden=true;f.doc.emit(event);assert(f.read().paused);f.doc.hidden=false;f.doc.emit(event);}else f.win.emit(event);oldEventsIgnored(f);cleared(f);freshWorks(f);});
check('context loss clears old input and blocks new pointers',f=>{hold(f);f.canvas.emit('webglcontextlost',f.ev(0));cleared(f);oldEventsIgnored(f);f.send(f.joystick,'pointerdown',31);assert.equal(f.read().joyPointer,null);assert(f.read().paused);});
check('visualViewport resize clears held gestures',f=>{hold(f);f.viewportEvents.emit('resize');cleared(f);oldEventsIgnored(f);freshWorks(f);});
check('panel open/close cancels prior gestures',f=>{hold(f);f.open();cleared(f);oldEventsIgnored(f);f.close();oldEventsIgnored(f);freshWorks(f);});
check('input received behind open panel is ignored',f=>{f.open();f.send(f.joystick,'pointerdown',11);f.send(f.canvas,'pointerdown',21,200,200);f.send(f.canvas,'pointermove',21,250,200);f.send(f.canvas,'pointerup',21,250,200);f.close();cleared(f);assert.equal(f.read().yaw,0);freshWorks(f);});
check('hidden page ignores new pointers',f=>{f.doc.hidden=true;f.doc.emit('visibilitychange');f.send(f.joystick,'pointerdown',11);f.send(f.canvas,'pointerdown',21,200,200);cleared(f);});
check('canvas lost capture clears pinch, no ghost zoom',f=>{f.send(f.canvas,'pointerdown',21,200,200);f.send(f.canvas,'pointerdown',22,300,200);f.canvas.releasePointerCapture(21);assert.equal(f.read().pinchDistance,0);assert(!f.read().touches.includes(21));const d=f.read().distance;f.send(f.canvas,'pointermove',22,330,200);assert.equal(f.read().distance,d);f.send(f.canvas,'pointerup',22,330,200);assert.equal(f.taps(),0);freshWorks(f);});
check('canvas pointercancel clears pinch baseline',f=>{f.send(f.canvas,'pointerdown',21,200,200);f.send(f.canvas,'pointerdown',22,300,200);f.send(f.canvas,'pointercancel',21,200,200);assert.equal(f.read().pinchDistance,0);f.send(f.canvas,'pointerup',22,300,200);assert.equal(f.taps(),0);freshWorks(f);});
check('joystick lost capture stops and recovers',f=>{f.send(f.joystick,'pointerdown',11);f.joystick.releasePointerCapture(11);assert.equal(f.read().joyPointer,null);assert.equal(Math.hypot(f.read().joy.x,f.read().joy.y),0);f.send(f.joystick,'pointermove',11,90,54);assert.equal(f.read().joy.x,0);freshWorks(f);});
check('unrelated joystick release leaves owned pointer intact',f=>{f.send(f.joystick,'pointerdown',11);const joy=f.read().joy.x;f.send(f.joystick,'pointerup',99);assert.equal(f.read().joyPointer,11);assert.equal(f.read().joy.x,joy);f.send(f.joystick,'pointerup',11);freshWorks(f);});
check('second joystick pointer cannot steal control',f=>{f.send(f.joystick,'pointerdown',11,85,54);f.send(f.joystick,'pointerdown',12,20,54);assert.equal(f.read().joyPointer,11);assert(f.read().joy.x>0);f.send(f.joystick,'pointerup',12);assert.equal(f.read().joyPointer,11);f.send(f.joystick,'pointerup',11);});
check('unknown canvas pointerup cannot consume or execute tap',f=>{f.send(f.canvas,'pointerdown',21,200,200);f.send(f.canvas,'pointerup',99,200,200);assert.equal(f.taps(),0);assert.equal(f.read().drag.id,21);f.send(f.canvas,'pointerup',21,200,200);assert.equal(f.taps(),1);f.send(f.canvas,'pointerup',21,200,200);assert.equal(f.taps(),1);});
check('normal joystick cancel was and remains safe',f=>{f.send(f.joystick,'pointerdown',11);f.send(f.joystick,'pointercancel',11);cleared(f);freshWorks(f);});
check('two finger release never becomes a tap',f=>{f.send(f.canvas,'pointerdown',21,200,200);f.send(f.canvas,'pointerdown',22,300,200);f.send(f.canvas,'pointerup',21,200,200);f.send(f.canvas,'pointerup',22,300,200);assert.equal(f.taps(),0);freshWorks(f);});
console.log(JSON.stringify({scope:'Production handler source, synthetic event targets; not native browser/iOS.',passed:results.filter(r=>r.status==='PASS').length,failed:results.filter(r=>r.status==='FAIL').length,results},null,2));if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
