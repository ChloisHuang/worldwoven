const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
(async()=>{const root=path.resolve(process.env.SOURCE_ROOT||'source'),m=new vm.SourceTextModule(fs.readFileSync(path.join(root,'game/movement-runtime.js'),'utf8'));await m.link(()=>{});await m.evaluate();const R=m.namespace;
for(const hz of [4,10,15,20,30,60,144,240]){let elapsed=0,steps=0;for(let i=0;i<hz*4;i++){const f=R.simulationFrame(1/hz);assert(f.stepDt<=R.MAX_SIMULATION_STEP+1e-12);assert(f.steps<=8);elapsed+=f.steps*f.stepDt;steps+=f.steps;}assert(Math.abs(elapsed-4)<1e-10);}
for(const bad of [-1,NaN,Infinity,-Infinity])assert.equal(R.simulationFrame(bad).dt,0);
for(const long of [.5,1,60,120000]){const f=R.simulationFrame(long);assert.equal(f.dt,.25);assert.equal(f.steps,8);}
for(const zero of [0,.01,.079,.08])assert.equal(R.movementInputMagnitude(zero),0);
assert.equal(R.movementInputMagnitude(.5),1);assert.equal(R.movementInputMagnitude(1),1);assert.equal(R.movementInputMagnitude(Math.SQRT2),1);
let previous=0;for(let i=0;i<=10000;i++){const v=R.movementInputMagnitude(i/10000);assert(v>=previous&&v<=1);assert(v-previous<=.00024);previous=v;}
assert.equal(R.PLAYER_TRAVEL_SCALE,1.45);console.log(JSON.stringify({status:'PASS',wallClockRates:[4,10,15,20,30,60,144,240],maxStep:R.MAX_SIMULATION_STEP,maxFrameAdvance:R.MAX_FRAME_ADVANCE,continuousInput:true},null,2));
})().catch(e=>{console.error(e);process.exit(1)});
