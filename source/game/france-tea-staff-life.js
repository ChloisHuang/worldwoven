// Existing salon book and open west galleries/garden path. No new seat, room,
// supply claim or worker: the tea controller moves the original released NPC.
export function franceTeaStaffChoices(){
 const book={id:'salon-book',choice:{point:[-6.7,.302,.1],target:[-7.1,1.08,-1.55],label:'在镜厅翻阅诗集'}},
  gallery={id:'service-gallery',choice:{point:[-13.8,.23,-5],target:[-13.8,1.5,-2.6],label:'在西侧连廊歇歇脚'}},
  garden={id:'garden-path',traits:{outdoors:.5},choice:{point:[-13.6,0,-2.6],target:[-15.5,1,-1],label:'沿西侧绿篱步道散步'}},
  outside={id:'gallery-view',choice:{point:[-13.8,.23,-9.5],target:[-13.8,1.5,-12],label:'在连廊看看庭园'}};
 return [
  {id:'garden',base:.3,traits:{outdoors:.85,curiosity:.4},duration:[9,16],cooldown:32,targets:[garden,{...gallery,choice:{...gallery.choice,label:'沿西侧服务连廊散步'}}]},
  {id:'read',base:.25,traits:{quiet:.9,curiosity:.35},duration:[14,24],cooldown:45,action:'read',targets:[book]},
  {id:'rest',base:.18,traits:{quiet:.55},needs:{fatigue:1.5},duration:[12,20],cooldown:40,relief:{fatigue:-.12},targets:[gallery]},
  {id:'look-outside',base:.2,traits:{curiosity:.7,outdoors:.45},duration:[8,15],cooldown:28,targets:[outside]}
 ];
}
