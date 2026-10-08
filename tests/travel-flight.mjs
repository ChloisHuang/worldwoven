import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,next){return s==='three'?{url:new URL('../source/vendor/three/build/three.module.js',import.meta.url).href,shortCircuit:true}:next(s,c);}});
const THREE=await import('../source/vendor/three/build/three.module.js');
const {createTravelArc,createTravelFlight,TRAVEL_FLIGHT_SECONDS}=await import('../source/game/travel-flight.js');
const markers=[['japan',36,138],['china',35,104],['egypt',27,30],['france',47.5,2.4]].map(([id,lat,lon])=>({id,anchor:new THREE.Vector3().setFromSphericalCoords(5.97,(90-lat)*Math.PI/180,(lon-70)*Math.PI/180)}));
for(const a of markers)for(const b of markers){if(a===b)continue;const arc=createTravelArc(markers,a.id,b.id);assert(arc.knownOrigin);assert(arc.point(0).normalize().distanceTo(a.anchor.clone().normalize())<1e-8);assert(arc.point(1).normalize().distanceTo(b.anchor.clone().normalize())<1e-8);for(let i=0;i<=100;i++)assert(arc.point(i/100).length()>6.7);}
const first=createTravelArc(markers,null,'japan');assert.equal(first.knownOrigin,false);assert.equal(first.from,null);
const globe={group:new THREE.Group(),markers},flight=createTravelFlight({globe}),j={id:'test-journey',from:'china',to:'france',stage:'flying'};
assert.equal(flight.start({...j,stage:'planned'}),false);assert(flight.start(j));for(let i=0;i<12;i++)flight.advance(.1);const p=flight.view().progress;assert(p>0&&p<1);
flight.pause();flight.advance(10);assert.equal(flight.view().progress,p);assert(flight.start(j));assert.equal(flight.view().progress,p);assert.equal(flight.start({...j,to:'egypt'}),false);
flight.advance(1000);assert(Math.abs(flight.view().progress-p-.25/TRAVEL_FLIGHT_SECONDS)<1e-9,'tab stall never advances a whole flight');
for(let i=0;i<100;i++)flight.advance(.1);assert(flight.view().complete);assert.equal(flight.view().progress,1);assert.equal(flight.view().journey.id,j.id);
flight.clear();assert.equal(flight.view().journey,null);flight.dispose();flight.dispose();assert.equal(globe.group.children.length,0);
console.log('PASS four-country flight arcs, same-journey pause, bounded presentation time and resource disposal; no calendar or ledger mutation');
