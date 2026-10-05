// Regression for the reported physical jump: inspect every intermediate pose,
// including reverse traversal. This is geometry/state coverage, not browser QA.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {walletGeometry,walletNoteFrame,walletPocketFrame} from '../source/game/wallet.js';
const bounds=f=>{const a=Math.abs(f.angle)*Math.PI/180,dx=(f.width*Math.cos(a)+f.height*Math.sin(a))/2,dy=(f.height*Math.cos(a)+f.width*Math.sin(a))/2;return {left:f.x+f.width/2-dx,right:f.x+f.width/2+dx,top:f.y+f.height/2-dy,bottom:f.y+f.height/2+dy};};
const cases=[[345,260],[295,242],[290,185],[170,245],[350,360]];
for(const [width,height] of cases)for(let count=1;count<=4;count++){
 const g=walletGeometry(width,height,count);
 for(let tick=0;tick<=200;tick++){
  const progress=tick/100,leather=walletPocketFrame(g,progress);
  assert(leather.back.y<leather.front.y,'backplate extends above the front lip');
  assert(bounds(leather.front).bottom<=g.height,'the complete tilted wallet stays inside the scrollable cash stage');
  for(let index=0;index<count;index++){
   const f=walletNoteFrame(g,index,progress),b=bounds(f);
   assert(b.left>=0&&b.right<=width&&b.top>=0,`paper stays in the short landscape stage (${width}×${height}, ${count}, ${progress})`);
   if(progress<=1){assert(f.angle===0,'lift and return are straight through the pocket');assert.equal(f.x,width/2-f.width/2,'no sideways fan before the lip clears');}
   if(progress>=1)assert(b.bottom<=g.lipY-3,`all paper corners clear the tilted front before fanning (${width}×${height}, ${count}, ${progress})`);
   if(progress===0){assert(b.bottom>leather.front.y,'closed paper is inside the front pocket');assert(b.bottom<leather.front.y+leather.front.height,'closed paper does not stick out below leather');}
   if(tick){const prev=walletNoteFrame(g,index,(tick-1)/100);assert(Math.abs(f.y-prev.y)<4,'no position jump at the lift/fan boundary');}
   const reverse=walletNoteFrame(g,index,2-(200-tick)/100);assert(Math.abs(reverse.y-f.y)<1e-10&&Math.abs(reverse.angle-f.angle)<1e-10,'return uses exactly the reverse path');
  }
 }
 if(count>1){
  const fan=Array.from({length:count},(_,i)=>walletNoteFrame(g,i,2));
  assert(fan.at(-1).x-fan[0].x>=g.fanWidth*.2*(count-1)-1e-8,'currency tickets expose horizontal edges instead of a nearly vertical stack');
  assert(fan[0].angle<0&&fan.at(-1).angle>0,'outer tickets fan to opposite sides');
  const inspected=bounds(walletNoteFrame(g,0,2,1));
  assert(inspected.left>=0&&inspected.right<=width&&inspected.top>=0&&inspected.bottom<g.lipY,'inspecting the larger original ticket stays in the cash pane above the lip');
 }
 if(count===4&&width>=290)assert(g.fanWidth>=160,'four currency notes retain readable illustrated width');
}
const css=fs.readFileSync(new URL('../source/game/wallet.css',import.meta.url),'utf8');
assert(!css.includes('is-unfolded'),'no conditional z-index switch');
assert.match(css,/\.ww-wallet-back\{[^}]*z-index:0/);assert.match(css,/\.ww-wallet-stack\{[^}]*z-index:10/);assert.match(css,/\.ww-wallet-pocket\{[^}]*z-index:20/);
assert.doesNotMatch(css,/\.ww-wallet-pocket::?before\s*\{/,'a negative-z lip inside the transformed front still covers paper; the back must remain a separate sibling');
assert.match(css,/not\(\[data-art-state=ready\]\)>\*[^}]*visibility:hidden/,'unloaded paper cannot expose floating amount labels');
console.log('PASS wallet geometry: 1–4 currencies, 5 stage sizes, 201 forward/reverse samples each; fixed layers, straight lift, cleared fan corners, tucked return and horizontal note edges with bounded inspection');
if(process.argv[2]){
 const out=[];
 for(const [width,height] of [[345,260],[290,185]])for(const count of [1,4])for(const [name,progress] of [['closed',0],['half-extracted',.5],['clear-of-pocket',1],['fan',2],['gathering',1.5],['reinsertion',.5]]){
  const g=walletGeometry(width,height,count);out.push({width,height,count,name,progress,geometry:g,leather:walletPocketFrame(g,progress),notes:Array.from({length:count},(_,i)=>walletNoteFrame(g,i,progress))});
 }
 fs.writeFileSync(process.argv[2],JSON.stringify(out,null,2));
}
