// The canvas, projection and picking must use the same displayed CSS viewport.
// Three's default setSize() writes inline pixels, which can outlive a mobile
// browser-bar / orientation transition even when the dynamic viewport changes.
export function displayedViewport(canvas){
 const {width,height,left,top}=canvas.getBoundingClientRect();
 return {width:Math.max(1,Math.round(width)),height:Math.max(1,Math.round(height)),left,top};
}

const HUD='.topbar a,.topbar button,.location-card,.lot-tools,.daybook,.character-card,.interaction,.joystick,.touch-action,.camera-tools,.career-wallet-slot,.jp-service-ticket,.jp-performance-ticket,#toast,#arrival,dialog[open]';
export function createHudLayout(root=document){
 let dirty=true,rects=[];
 const dimensions=new WeakMap(),observed=new WeakSet(),invalidate=()=>{dirty=true;};
 const resizeObserver=new ResizeObserver(invalidate);
 // New service / career dialogs join lazily; movement of world labels does not
 // invalidate the HUD. Cache reads until layout or actual HUD content changes.
 const mutationObserver=new MutationObserver(records=>{
  if(records.some(r=>!r.target.closest?.('#labels,#furniture-labels')))invalidate();
 });
 mutationObserver.observe(root.body,{childList:true,subtree:true});
 return {
  invalidate,
  rects(){
   if(dirty){
    const elements=[...root.querySelectorAll(HUD)];
    for(const el of elements)if(!observed.has(el)){observed.add(el);resizeObserver.observe(el);}
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
   return labelOverlapsHud({left:x-size.width/2,right:x+size.width/2,top:y-size.height,bottom:y},this.rects(),viewport,padding);
  }
 };
}
export function labelOverlapsHud(r,rects,viewport,padding=6){
 if(r.left<viewport.left+padding||r.top<viewport.top+padding||r.right>viewport.left+viewport.width-padding||r.bottom>viewport.top+viewport.height-padding)return true;
 return rects.some(h=>r.left<h.right+padding&&r.right>h.left-padding&&r.top<h.bottom+padding&&r.bottom>h.top-padding);
}
