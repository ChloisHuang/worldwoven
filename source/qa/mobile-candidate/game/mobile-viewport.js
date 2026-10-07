// A mobile game lives in a real landscape browsing context. Rotating a body
// alone leaves media queries, top-layer dialogs and native pointer coordinates
// in portrait. The browser maps all input and dialogs through this one frame.
export function mobileViewportGeometry(layout,visual=layout,safe={},portrait=layout.height>layout.width){
 const left=Math.max(visual.left||0,safe.left||0),top=Math.max(visual.top||0,safe.top||0);
 const right=Math.min((visual.left||0)+visual.width,layout.width-(safe.right||0));
 const bottom=Math.min((visual.top||0)+visual.height,layout.height-(safe.bottom||0));
 const width=Math.max(1,visual.width),height=Math.max(1,visual.height);
 const physical={left:Math.max(0,left-(visual.left||0)),top:Math.max(0,top-(visual.top||0)),right:Math.max(0,(visual.left||0)+width-right),bottom:Math.max(0,(visual.top||0)+height-bottom)};
 return {width:portrait?height:width,height:portrait?width:height,left:(visual.left||0)+(portrait?width:0),top:visual.top||0,rotation:portrait?90:0,safe:portrait?{left:physical.top,top:physical.right,right:physical.bottom,bottom:physical.left}:physical};
}

const SIDES=['left','top','right','bottom'];
const FRAME_MARKER='worldwoven-mobile-game';
export function mountMobileViewport(view=window){
 const doc=view.document;
 // Only our same-origin child bypasses the shell; URL flags cannot cause an
 // accidental recursive boot. Bookmarks and preview query strings stay intact.
 let host;
 try{host=view.frameElement;}catch{}
 if(host?.dataset?.mobileGame===FRAME_MARKER){
  const apply=()=>{
   let geometry;try{geometry=JSON.parse(host.dataset.mobileGeometry||'null');}catch{}
   if(!geometry)return;
   for(const side of SIDES)doc.documentElement.style.setProperty('--ww-safe-'+side,geometry.safe[side]+'px');
   doc.documentElement.dataset.mobileGame='inner';
   doc.documentElement.dataset.physicalOrientation=geometry.rotation?'portrait':'landscape';
  };
  apply();
  view.addEventListener('message',event=>{
   if(event.source!==view.parent||event.origin!==view.location.origin||event.data?.kind!=='worldwoven-viewport')return;
   apply();view.dispatchEvent(new Event('resize'));
  });
  const reportEditing=()=>{const active=doc.activeElement;view.parent.postMessage({kind:'worldwoven-editing',active:!!active&&(active.matches?.('input:not([type=button]):not([type=range]):not([type=checkbox]),textarea')||active.isContentEditable)},view.location.origin);};
  doc.addEventListener('focusin',reportEditing);doc.addEventListener('focusout',()=>Promise.resolve().then(reportEditing));
  // Navigation links deliberately leave the shell. Refresh stays within this
  // same child and never mounts another frame; storage keeps its original origin.
  doc.addEventListener('click',event=>{const link=event.target.closest?.('a[href]');if(link&&!link.target&&new URL(link.href,view.location.href).origin===view.location.origin)link.target='_top';});
  return false;
 }
 if(!view.matchMedia('(pointer: coarse)').matches)return false;
 createMobileViewportHost(view);
 return true;
}

export function createMobileViewportHost(view=window,{url=view.location.href,forcePortrait=null}={}){
 const doc=view.document,frame=doc.createElement('iframe');
 frame.dataset.mobileGame=FRAME_MARKER;frame.id='mobile-game-viewport';
 frame.title='四方生活 · 横向游戏';frame.setAttribute('allow','fullscreen');
 frame.style.cssText='position:fixed;border:0;margin:0;max-width:none;max-height:none;transform-origin:0 0;display:block;background:#163642';
 doc.documentElement.dataset.mobileGame='shell';
 doc.body.replaceChildren(frame);
 let editing=false,lastPortrait=null;
 const resize=()=>{
  const root=doc.documentElement,layout={left:0,top:0,width:root.clientWidth||view.innerWidth,height:root.clientHeight||view.innerHeight};
  const vv=view.visualViewport,visual=vv?{left:vv.offsetLeft,top:vv.offsetTop,width:vv.width,height:vv.height}:layout;
  const style=view.getComputedStyle(root),safe=Object.fromEntries(SIDES.map(side=>[side,parseFloat(style.getPropertyValue('--ww-safe-'+side))||0]));
  // An on-screen keyboard can make the visual/layout viewport short without
  // physically rotating the device. Keep orientation stable until it closes.
  const portrait=forcePortrait??(editing&&lastPortrait!==null?lastPortrait:layout.height>layout.width);
  lastPortrait=portrait;
  const geometry=mobileViewportGeometry(layout,visual,safe,portrait);
  Object.assign(frame.style,{width:geometry.width+'px',height:geometry.height+'px',left:geometry.left+'px',top:geometry.top+'px',transform:`rotate(${geometry.rotation}deg)`});
  frame.dataset.mobileGeometry=JSON.stringify(geometry);
  frame.contentWindow?.postMessage({kind:'worldwoven-viewport'},view.location.origin);
 };
 resize();frame.src=url;frame.addEventListener('load',resize);
 view.addEventListener('message',event=>{if(event.origin===view.location.origin&&event.source===frame.contentWindow&&event.data?.kind==='worldwoven-editing')editing=event.data.active===true;});
 view.addEventListener('resize',resize);view.addEventListener('orientationchange',()=>{lastPortrait=null;resize();});
 view.visualViewport?.addEventListener('resize',resize);view.visualViewport?.addEventListener('scroll',resize);
 return {frame,resize};
}
