// Both shifts retain the accepted gate / front-stair duty circuit. The relief
// guards then cover opposite public side lanes and the building backs. Close
// corner waypoints keep the planner outside the residence and raised halls.
const outward=[
 {id:'range-exit',at:[-17.15,.13,19.1],label:'收弓出射圃 · 从金线后绕行'},
 {id:'court-entry',at:[-15.25,.13,19],label:'巡看射圃入口',look:[-17.6,19],hold:1.6},
 {id:'west-court',at:[-11.8,.13,21],label:'巡看仪庭西侧',look:[0,23],hold:2.4},
 {id:'gate',at:[-3,.13,33.1],label:'承礼门值察 · 看门廊与来路',look:[0,39],hold:3.2},
 {id:'stair-foot',at:[-3,.14,11],label:'沿中轴前往正殿'},
 {id:'hall',at:[-3,1.415,6],label:'正殿阶前值察 · 查看廊前',look:[0,3],hold:3.2},
 {id:'stair-return',at:[-3,.14,11],label:'沿正殿前阶下行'}
];
const home=[
 {id:'return-court',at:[-12,.13,17.8],label:'巡毕沿西庭返岗'},
 {id:'return-entry',at:[-15.25,.13,19],label:'由后方入口返回射圃'},
 {id:'return-strip',at:[-17.15,.13,19.1],label:'归队 · 等候当面交班'}
];
const stop=(id,x,z,label,look,hold=2.6)=>({id,at:[x,.115,z],label,...(look?{look,hold}:{})});
export const CHINA_GUARD_ROUTES={
 west:[...outward,
  stop('west-lane-mouth',-14.9,4,'转入西内庭小巷'),
  stop('west-blind-turn',-14.9,-6.5,'西巷驻足 · 查看台阶背面与墙角',[-13.8,-9.4]),
  stop('west-garden-mouth',-14.9,-15.2,'沿后宫外墙巡看荷庭西口',[-18,-13.5]),
  stop('residence-rear-turn',-14.9,-21.6,'绕至后宫背面'),
  stop('residence-rear',-21,-21.6,'后宫外侧驻足 · 查看背墙与转角',[-25,-20.6],3.2),
  stop('west-quiet-path',-21,-28.5,'巡看西北静巷',[-25,-31]),
  stop('archive-west-back',-14.9,-36.7,'沿雅集楼西侧绕至楼后',[-12.5,-32]),
  stop('northwest-watch',-5,-37,'楼后驻足 · 查看北墙与后阶',[-1,-35.8],3.2),
  stop('west-rear-return',-14.9,-36.7,'沿楼外西巷返程'),
  stop('west-archive-return',-14.9,-25,'巡毕沿雅集楼外侧南行'),
  stop('west-garden-return',-14.9,-15.2,'沿荷庭西侧返回'),
  stop('west-lane-return',-14.9,4,'沿西内庭小巷出庭'),
  ...home],
 east:[...outward,
  stop('east-court-turn',14.9,11,'经东庭转入东内庭小巷'),
  stop('east-lane-mouth',14.9,4,'巡看御膳房外侧巷口'),
  stop('east-blind-turn',14.9,-6.5,'东巷驻足 · 查看殿侧墙角',[13.9,-4.8]),
  stop('kitchen-rear-turn',14.9,-14.7,'绕至御膳房后方'),
  stop('kitchen-rear',21,-14.7,'御膳房后驻足 · 查看后门与背墙',[22,-12],3.2),
  stop('east-quiet-path',21,-27.5,'巡看东北静巷',[25,-31]),
  stop('archive-east-back',14.9,-36.7,'沿雅集楼东侧绕至楼后',[12.5,-32]),
  stop('northeast-watch',5,-37,'楼后驻足 · 查看北墙与后阶',[1,-35.8],3.2),
  stop('east-rear-return',14.9,-36.7,'沿楼外东巷返程'),
  stop('east-archive-return',14.9,-25,'巡毕沿雅集楼外侧南行'),
  stop('east-garden-return',14.9,-14.7,'沿荷庭东侧返回'),
  stop('east-lane-return',14.9,4,'沿东内庭小巷出庭'),
  stop('east-court-return',14.9,11,'由东庭绕过正殿前阶'),
  stop('front-court-return',-3,11,'沿正殿前庭返回射圃'),
  ...home]
};
