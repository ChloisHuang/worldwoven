import {createFacilityQueue} from './npc-facilities.js';
import {palaceResident} from './china-palace-residents.js';
const SHORE=[[-13.7,.145,-14.5],[-13.7,.145,-20.85]],TEA=[[-13.7,.145,-20.85],[-2.7,.145,-20.85],[0,.295,-20.85],[0,.815,-22.3],[0,.815,-24.3],[2.9,.815,-28.25]],DINING=[[-14.4,.115,.4],[-8,.13,11],[14,.13,11],[14,.13,4],[21,.215,4],[21,.215,1.3]];
const reverse=a=>a.slice().reverse().map(p=>p.slice());
export const CONSORT_GARDEN_SLOTS=Object.freeze([[-9.1,.145,-20.85],[-7.35,.145,-20.85],[-5.6,.145,-20.85]]);
export function consortActivities(n,{stage,homeExit,homeReturn,bed,mealSeats,host,available}){
 const profile=palaceResident(n.station.id),name=profile.shortName,home=n.home.toArray();
 const trip=(destination,label,route,options={})=>[stage('leave-suite','离开自己的私室 · 经过公共前厅',homeExit(n)),stage(destination,label,route,0,{...options,chosen:true}),stage('return-suite','沿公共通廊回到自己的私室',[...reverse(route),...homeReturn(n)])];
 return [
  {id:'read',label:name+' · 在自己的私室静读',base:.25,traits:{curiosity:.9,quiet:.7},needs:{fatigue:-.2},relief:{social:.05,fatigue:-.10},duration:[11,21],cooldown:44,steps:[stage('private-reading','在自己的私室静读书卷',[home],0,{action:'read',chosen:true})]},
  {id:'rest',label:name+' · 回自己的卧榻歇息',facilityId:bed?.id,base:.08,traits:{quiet:.3},needs:{fatigue:2.8,social:-.15},relief:{fatigue:-.65},duration:[14,24],cooldown:76,available:!!bed&&available(bed.id),steps:[stage('private-rest','在自己的卧榻休息',[bed?.position||home],0,{mount:bed,chosen:true}),stage('stand-after-rest','起身整理衣袖',[home])]},
  {id:'garden',label:name+' · 去荷庭赏景',base:.15,traits:{outdoors:1.35},needs:{fatigue:-.55,social:.2},relief:{fatigue:-.12,social:-.12},duration:[14,24],cooldown:76,socialEvent:{values:{company:.5,quiet:.3,curiosity:.6},strength:.065},targets:CONSORT_GARDEN_SLOTS.map((p,i)=>({id:'palace-garden-'+i,available:available('palace-garden-'+i),choice:{facilityId:'palace-garden-'+i,steps:trip('garden-view','荷庭驻足 · 看花与水色',[...SHORE,p],{look:[-5,.3,-18],garden:true})}}))},
  {id:'meal',label:name+' · 去御膳餐厅用点心',base:.02,traits:{appetite:.3},needs:{hunger:3.5},relief:{hunger:-.72,fatigue:-.05},duration:[12,18],cooldown:110,targets:mealSeats.map(seat=>({id:seat.id,available:available(seat.id),choice:{facilityId:seat.id,steps:trip('meal','在御膳餐厅坐凳上用点心',[...DINING,seat.position],{mount:seat,meal:true})}}))},
  {id:'visit',label:name+' · 去雅集茶厅拜访 Lin',base:.08,traits:{sociability:1.35},needs:{social:2,fatigue:-.35,hunger:.15},relief:{social:-.65},duration:[8,13],cooldown:96,socialEvent:{values:{company:1,quiet:-1,curiosity:.15},strength:.08},targets:[{id:host.station.id,available:available('palace-tea-host'),relationship:{target:host.station.id,weight:.8,gain:.08},choice:{facilityId:'palace-tea-host',steps:trip('tea-conversation','前往雅集茶厅 · 等 Lin 忙完',[...SHORE,...TEA.slice(1)],{pair:true})}}]}
 ];
}

// Use the existing finite-slot queue. Scene claims expire after a bounded
// travel/wait budget; player conversation pauses that budget, not the whole day.
export function createPalaceLeisureClaims(){
 const queue=createFacilityQueue(),leases=new Map();
 return {
  available(id,actor){return !id||!queue.state().some(f=>f.id===id&&f.reservations.some(r=>r.actor!==actor));},
  reserve(id,actor){if(!id)return true;const claim=queue.reserve(id,actor);if(!claim){queue.release(id,actor);return false;}leases.set(actor,{id,remaining:120});return true;},
  release(actor){queue.releaseActor(actor);leases.delete(actor);},
  tick(actor,dt,paused=false){const lease=leases.get(actor);if(!lease||paused)return false;lease.remaining-=dt;if(lease.remaining>0)return false;queue.releaseActor(actor);leases.delete(actor);return true;},
  state:()=>[...leases].map(([actor,value])=>({actor,...value})),dispose(){leases.clear();queue.dispose();}
 };
}
