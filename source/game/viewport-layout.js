// The canvas, projection and picking must use the same displayed CSS viewport.
// Three's default setSize() writes inline pixels, which can outlive a mobile
// browser-bar / orientation transition even when the dynamic viewport changes.
export function displayedViewport(canvas){
 const {width,height,left,top}=canvas.getBoundingClientRect();
 return {width:Math.max(1,Math.round(width)),height:Math.max(1,Math.round(height)),left,top};
}

// Insets belong to the layout viewport. Intersect its safe frame with the
// visual viewport before adding a margin; an offset viewport must not apply
// the notch inset twice. This frame never moves the WebGL canvas.
export function safeUiRect(visual,layout=visual,safe={},gutter=12){
 const left=Math.max(visual.left,layout.left+(safe.left||0));
 const top=Math.max(visual.top,layout.top+(safe.top||0));
 const right=Math.max(left,Math.min(visual.left+visual.width,layout.left+layout.width-(safe.right||0)));
 const bottom=Math.max(top,Math.min(visual.top+visual.height,layout.top+layout.height-(safe.bottom||0)));
 const x=Math.min(gutter,(right-left)/2),y=Math.min(gutter,(bottom-top)/2);
 return {left:left+x,top:top+y,right:right-x,bottom:bottom-y,width:Math.max(0,right-left-x*2),height:Math.max(0,bottom-top-y*2)};
}

// The fixed HUD and all dialogs consume these same measured CSS coordinates.
const uiFrames=new WeakMap();
export function syncUiViewport(root=document){
 const el=root.documentElement,view=root.defaultView;
 if(!el?.style?.setProperty||!view)return null;
 const layout={left:0,top:0,width:el.clientWidth||view.innerWidth,height:el.clientHeight||view.innerHeight};
 const vv=view.visualViewport,visual=vv?{left:vv.offsetLeft,top:vv.offsetTop,width:vv.width,height:vv.height}:layout;
 const style=view.getComputedStyle(el),safe=Object.fromEntries(['left','top','right','bottom'].map(side=>[side,parseFloat(style.getPropertyValue(`--ww-safe-${side}`))||0]));
 const rect=safeUiRect(visual,layout,safe);
 uiFrames.set(root,rect);
 const values={left:rect.left,right:layout.width-rect.right,top:rect.top,bottom:layout.height-rect.bottom,width:rect.width,height:rect.height,'center-x':rect.left+rect.width/2,'center-y':rect.top+rect.height/2};
 for(const [key,value] of Object.entries(values))el.style.setProperty(`--ww-ui-${key}`,`${value}px`);
 return rect;
}

const HUD='.topbar a,.topbar button,.topbar .logo,.location-card,.lot-tools,.daybook,.character-card,.interaction,.joystick,.touch-action,.camera-tools,.career-wallet-slot,.jp-service-ticket,.jp-performance-ticket,.cn-meal-ticket,.cn-salon-ticket,.fr-labor-badge,#toast,#arrival,dialog[open]';
export function createHudLayout(root=document){
 let dirty=true,rects=[];
 const dimensions=new WeakMap(),observed=new WeakSet(),invalidate=()=>{dirty=true;};
 const resizeObserver=typeof ResizeObserver==='function'?new ResizeObserver(invalidate):null;
 // New service / career dialogs join lazily; movement of world labels does not
 // invalidate the HUD. Cache reads until layout or actual HUD content changes.
 const mutationObserver=typeof MutationObserver==='function'?new MutationObserver(invalidate):null;
 mutationObserver?.observe(root.body,{childList:true});
 return {
  invalidate,
  rects(){
   if(dirty){
    const elements=[...root.querySelectorAll(HUD)];
    for(const el of elements)if(!observed.has(el)){observed.add(el);resizeObserver?.observe(el);}
    rects=elements.filter(el=>!el.hidden&&el.getClientRects().length).map(el=>el.getBoundingClientRect());
    dirty=false;
   }
   return rects;
  },
  obscures(label,viewport,padding=6){
   const key=label.textContent+'|'+viewport.width+'|'+viewport.height;
   let size=dimensions.get(label);
   if(!size||size.key!==key){size={key,width:label.offsetWidth,height:label.offsetHeight};dimensions.set(label,size);}
   const x=parseFloat(label.style.left),y=parseFloat(label.style.top);
   return labelOverlapsHud({left:x-size.width/2,right:x+size.width/2,top:y-size.height,bottom:y},this.rects(),uiFrames.get(root)||viewport,padding);
  }
 };
}
export function labelOverlapsHud(r,rects,viewport,padding=6){
 if(r.left<viewport.left+padding||r.top<viewport.top+padding||r.right>viewport.left+viewport.width-padding||r.bottom>viewport.top+viewport.height-padding)return true;
 return rects.some(h=>r.left<h.right+padding&&r.right>h.left-padding&&r.top<h.bottom+padding&&r.bottom>h.top-padding);
}
