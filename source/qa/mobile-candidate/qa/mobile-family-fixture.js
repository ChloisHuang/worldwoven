// Actual family UI with bounded, invented adults and memory-only persistence.
// This QA fixture never imports main, reads storage or starts 3D simulation.
import {createFamilyRuntime} from '../game/family-runtime.js';
const position=x=>({x,y:0,z:0,distanceTo(other){return Math.hypot(this.x-other.x,this.y-other.y,this.z-other.z);}});
function familyCase(many=false){return ({document:doc,log})=>{
 if(doc!==globalThis.document)throw Error('Family QA must mount in its own document');
 const clock={day:1,seconds:200},actors=[{actorId:'player',ageYears:24,alive:true,root:{position:position(0)}}];
 const names=['青禾','林舟','阿米娜','艾米尔','悠纪','月笙'];
 for(let i=0;i<(many?32:5);i++)actors.push({actorId:`qa-family-${i}`,ageYears:25+i,alive:true,station:{id:`qa-family-${i}`,npcName:`${names[i%names.length]} · 虚构旅人${i+1}`,ageYears:25+i,reproductiveRole:'none'},root:{position:position(1+i)}});
 let saved=null,activities=null;
 const ui=createFamilyRuntime({worldSeed:785,getClock:()=>clock,getCountry:()=> 'china',getActors:()=>actors,getActor:id=>actors.find(a=>a.actorId===id),getContext:()=>({}),getProfile:()=>({traits:{},needs:{}}),isAvailable:()=>false,
  saveState:next=>{saved=structuredClone(next);return true;},saveActivities:next=>{activities=structuredClone(next);return true;},
  notify:text=>log?.(text),onOpen:()=>log?.('亲缘簿打开 · 仅虚构内存数据'),onClose:()=>log?.('亲缘簿关闭'),onSelected:id=>log?.(`查看人物 ${id}`)});
 ui.sync();return {ui,open:()=>ui.show('player'),snapshot:()=>({saved:structuredClone(saved),activities:structuredClone(activities)}),refreshDay(){clock.day++;clock.seconds+=1;ui.update(0);log?.('游戏日刷新 · 检查原焦点与滚动保留');},dispose:()=>ui.dispose()};
};}
export const familyCases=[
 {id:'family-player',label:'亲缘簿 · 人物与生育条件自绘下拉',group:'手机下拉与亲缘',mount:familyCase()},
 {id:'family-long-list',label:'亲缘簿 · 长人物列表触摸滚动',group:'手机下拉与亲缘',mount:familyCase(true)},
];
