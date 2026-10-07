import assert from 'node:assert/strict';
import {createSocialMeetingPlaces,createSocialMeetingJourney,SOCIAL_MEETING_MATRIX} from '../source/game/social-meeting-places.js';
import {createFacilityQueue} from '../source/game/npc-facilities.js';
const actor=(id,x=0,z=0)=>({actorId:id,root:{visible:true,position:{x,y:0,z},rotation:{y:0}},locomotion:{walkSpeed:2},route:[{x:90,y:0,z:90}]});
const path=(from,to)=>[{...to}];
const fixtures={china:{id:'china-furniture-seat-2',name:'正殿木扶椅'},france:{id:'france-garden-bench-1-2',name:'宫苑铸铁木条长椅'},japan:{id:'japan-furniture-seat-2',name:'迎宾木长椅'},egypt:{id:'egypt-furniture-seat',name:'王室餐厅坐凳'}};
for(const country of Object.keys(SOCIAL_MEETING_MATRIX)){
 const people=[actor('a'),actor('b',0,1)],facilities=createFacilityQueue(),furniture={items:[{...fixtures[country],kind:'seat',position:[3,0,3],yaw:0}],facilities};
 const places=createSocialMeetingPlaces({country,lot:{},furniture,getActors:()=>people,getActor:id=>people.find(a=>a.actorId===id),planPath:path});
 const result=places.resolve(['a','b']);assert(result.ok,country+' has actual public furniture');assert.equal(result.place.private,false);assert.equal(result.place.points.length,2);
 assert(!places.resolve(['a','b'],{private:true}).ok,country+' never infers private entitlement from public furniture');
 assert(places.claim(result.place,['a','b']).ok);assert(!places.resolve(['b','a']).ok,'claimed fixture excludes competing pair');places.release(result.place,['a','b']);assert.equal(facilities.state()[0].reservations.length,0);
 facilities.reserve(result.place.fixtureId,'worker');assert(!places.resolve(['a','b']).ok,'existing work occupancy is respected');facilities.releaseActor('worker');
 const blocked=createSocialMeetingPlaces({country,lot:{},furniture,getActors:()=>people,getActor:id=>people.find(a=>a.actorId===id),planPath:()=>[]});assert(!blocked.resolve(['a','b']).ok,'no fake path success');
}
{
 const people=[actor('a'),actor('b',0,1)],facilities=createFacilityQueue(),bed={id:'real-bed',kind:'bed',privateRoomId:'real-room',position:[3,0,3]},room={id:'real-room',minX:2,maxX:5,minZ:2,maxZ:5,floorY:0};facilities.define(bed.id,['berth-1','berth-2']);
 let entitlement=false,available=true;
 const options={country:'china',lot:{interiorRooms:[room]},furniture:{items:[bed],facilities},getActors:()=>people,getActor:id=>people.find(a=>a.actorId===id),planPath:path,canEnterPrivateRoom:id=>id==='a'||entitlement,roomAvailable:()=>available};
 const places=createSocialMeetingPlaces(options);assert.equal(places.resolve(['a','b'],{private:true}).reason,'private-entitlement-required');entitlement=true;
 const result=places.resolve(['a','b'],{private:true});assert(result.ok);assert(places.claim(result.place,['a','b']).ok);assert.equal(facilities.state()[0].reservations.length,2);
 const outsider=actor('outsider',4,4);outsider.root.visible=false;outsider.socialPrivateFade=true;people.push(outsider);assert.equal(places.validate(result.place,['a','b']).reason,'room-occupied');people.pop();available=false;assert.equal(places.validate(result.place,['a','b']).reason,'room-unavailable');available=true;entitlement=false;assert.equal(places.validate(result.place,['a','b']).reason,'private-entitlement-required');places.release(result.place,['a','b']);assert.equal(facilities.state()[0].reservations.length,0);
}
{
 const people=[actor('a'),actor('b',0,1)],facilities=createFacilityQueue(),getActor=id=>people.find(a=>a.actorId===id),places=createSocialMeetingPlaces({country:'japan',lot:{},furniture:{items:[{...fixtures.japan,kind:'seat',position:[2,0,3],yaw:0}],facilities},getActors:()=>people,getActor,planPath:path});
 let adult=true,willing=true,available=true;
 const doors={routeStep(route,pos,tolerance){while(route.length&&Math.hypot(route[0].x-pos.x,route[0].z-pos.z)<tolerance)route.shift();return {waypoint:route[0]};}};
 const moveActor=(a,dx,dz)=>{a.root.position.x+=dx;a.root.position.z+=dz;return {};};
 const journey=createSocialMeetingJourney({places,getActor,planPath:path,moveActor,doors,getActors:()=>people,isAdult:()=>adult,isWilling:()=>willing,isAvailable:()=>available});
 adult=false;assert.equal(journey.start(['a','b']).reason,'adulthood-required');adult=true;const originalRoutes=people.map(a=>a.route);assert(journey.start(['a','b']).ok);assert.equal(journey.state().phase,'approaching');
 for(let i=0;i<200&&journey.state().phase==='approaching';i++)journey.update(.05);
 assert.equal(journey.state().phase,'arrived','physical pair arrives before parent starts timed fade');assert(people.every((a,i)=>a.route===originalRoutes[i]),'job route ownership preserved');
 people.forEach(a=>{a.root.visible=false;a.socialPrivateFade=true;});assert(journey.update(1).ok,'own non-graphic fade does not cancel arrival');people.forEach(a=>{a.root.visible=true;a.socialPrivateFade=false;});willing=false;assert.equal(journey.update(.1).reason,'withdrawn');assert.equal(facilities.state()[0].reservations.length,0);
 willing=true;assert(journey.start(['a','b']).ok);available=false;assert.equal(journey.update(.1).reason,'interrupted');available=true;assert(journey.start(['a','b']).ok);adult=false;assert.equal(journey.update(.1).reason,'adulthood-required');adult=true;
 assert(journey.start(['a','b']).ok);journey.update(.1);people[0].root.position.x+=1;assert.equal(journey.update(.1).reason,'left-place');assert.equal(facilities.state()[0].reservations.length,0);
}
console.log('PASS finite four-country public places; private joint entitlement/occupancy; claims; real paired navigation; live withdrawal/adult/work gates and cleanup');
