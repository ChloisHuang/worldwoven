// Shared frame regression for the reported landscape notch obstruction.
// Pure geometry + DOM-style adapter checks, never browser/device acceptance.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {safeUiRect,syncUiViewport,createHudLayout} from '../source/game/viewport-layout.js';
import {walletReceiptFrame} from '../source/game/wallet.js';
import {travelPassportView} from '../source/game/travel-passport.js';
import {buildPassportSpreads,renderPassportBook} from '../source/game/travel-passport-art.js';
const landscape={left:0,top:0,width:852,height:393};
const cases=[
 {name:'zero-insets',layout:landscape,visual:landscape,safe:{},expected:[12,12,840,381]},
 {name:'island-left',layout:landscape,visual:landscape,safe:{left:59,right:0,bottom:21},expected:[71,12,840,360]},
 {name:'island-right',layout:landscape,visual:landscape,safe:{left:0,right:59,bottom:21},expected:[12,12,781,360]},
 {name:'both-sides',layout:landscape,visual:landscape,safe:{left:59,right:34,bottom:21},expected:[71,12,806,360]},
 {name:'keyboard-offset',layout:landscape,visual:{left:80,top:45,width:692,height:220},safe:{left:59,right:34,bottom:21},expected:[92,57,760,253]},
 {name:'desktop',layout:{left:0,top:0,width:1440,height:900},safe:{},expected:[12,12,1428,888]},
 {name:'portrait',layout:{left:0,top:0,width:393,height:852},safe:{top:59,bottom:34},expected:[12,71,381,806]},
];
const view=travelPassportView({visited:['china','japan'],stamps:{china:['cn-tea']},nickname:'旅居者'},{day:2,hour:8});
const results=[];
for(const c of cases){
 c.visual??=c.layout;
 const rect=safeUiRect(c.visual,c.layout,c.safe);
 assert.deepEqual([rect.left,rect.top,rect.right,rect.bottom],c.expected,c.name);
 assert.equal(rect.width,rect.right-rect.left);assert.equal(rect.height,rect.bottom-rect.top);
 const inside=(box,name)=>{assert(box.left>=rect.left-1e-6&&box.top>=rect.top-1e-6&&box.left+box.width<=rect.right+1e-6&&box.top+box.height<=rect.bottom+1e-6,`${c.name}: ${name} fits`);};
 // Leading and trailing HUD controls occupy the full 44px touch target.
 for(const x of [rect.left,rect.right-44])for(const y of [rect.top,rect.bottom-44])inside({left:x,top:y,width:44,height:44},'44px edge control');
 const walletWidth=Math.min(c.layout.height<500?750:800,rect.width),walletHeight=Math.min(c.layout.height<500?Infinity:550,rect.height);
 inside({left:rect.left+(rect.width-walletWidth)/2,top:rect.top+(rect.height-walletHeight)/2,width:walletWidth,height:walletHeight},'wallet shell');
 const receipt=walletReceiptFrame(c.visual,c.layout,c.safe);inside({left:receipt.left,top:receipt.top,width:receipt.width*receipt.scale,height:receipt.height*receipt.scale},'receipt');
 const compact=c.layout.width/c.layout.height<.8,spreads=buildPassportSpreads(view,[],compact);
 const width=Math.min(compact?Infinity:1080,rect.width,rect.height*(compact?7/9:20/13));
 const height=width*(compact?9/7:13/20),x=rect.left+(rect.width-width)/2,y=rect.top+(rect.height-height)/2;
 inside({left:x,top:y,width,height},'passport physical ratio');
 for(const spread of [null,...spreads]){
  const scene=renderPassportBook({view,spread,index:Math.max(0,spreads.indexOf(spread)),count:spreads.length,compact});
  for(const hot of scene.hotspots){
   const w=Math.max(44,hot.w/scene.width*width),h=Math.max(44,hot.h/scene.height*height);
   const left=x+Math.min(hot.x/scene.width*width,width-44),top=y+Math.min(hot.y/scene.height*height,height-44);
   inside({left,top,width:w,height:h},`passport ${hot.action} touch target`);
  }
 }
 results.push({name:c.name,layout:c.layout,visual:c.visual,safe:c.safe,rect,passport:{left:x,top:y,width,height,compact}});
}
// The same document is rotated and then has its visual viewport moved/resized.
// Insets come from computed env() values, never device names or guessed offsets.
const values={},doc={documentElement:{clientWidth:852,clientHeight:393,style:{setProperty:(k,v)=>{values[k]=v;}}},defaultView:{getComputedStyle:()=>({getPropertyValue:key=>`${doc.insets[key.slice('--ww-safe-'.length)]||0}px`})}};
for(const c of cases.slice(0,5)){
 doc.insets=c.safe;doc.defaultView.visualViewport={offsetLeft:c.visual.left,offsetTop:c.visual.top,width:c.visual.width,height:c.visual.height};
 const rect=syncUiViewport(doc);
 assert.equal(values['--ww-ui-left'],`${rect.left}px`);assert.equal(values['--ww-ui-right'],`${852-rect.right}px`);
 assert.equal(values['--ww-ui-width'],`${rect.width}px`);assert.equal(values['--ww-ui-height'],`${rect.height}px`);
 assert.equal(values['--ww-ui-center-x'],`${rect.left+rect.width/2}px`);
 assert(Object.values(values).every(v=>/^\d+(\.\d+)?px$/.test(v)),'all public properties are lengths');
}
doc.querySelectorAll=()=>[];const hud=createHudLayout(doc),r=syncUiViewport(doc);
const label={textContent:'seat',offsetWidth:44,offsetHeight:44,style:{left:`${r.left+22}px`,top:`${r.top+44}px`}};
assert(hud.obscures(label,landscape),'world targets in the inset/edge margin are hidden');
label.style.left=`${r.left+40}px`;label.style.top=`${r.top+60}px`;assert(!hud.obscures(label,landscape),'visible world targets remain available');
console.log('PASS shared safe frame: zero, asymmetric left/right, dual inset, visual offset/keyboard, desktop, portrait; 44px HUD and actual passport hotspot bounds; wallet/receipt bounds; live CSS property updates');
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(results,null,2)+'\n');
