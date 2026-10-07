// Five real authored fixtures share this dismount path. No renderer or NPC
// travel double can certify the main court chain; that has a separate probe.
const assert=require('node:assert/strict'),load=require('./fixtures/browser-module-loader.cjs').createBrowserModuleLoader('source');
(async()=>{
 const T=await load('vendor/three/build/three.module.js'),{blocked}=await load('game/navigation.js'),{createAutomaticDoors}=await load('game/automatic-doors.js');
 const cases=[['china','regions-east','buildChina','china-daily-toilet','createChinaDailyToilet','CHINA_DAILY_TOILET','china-toilet'],['china','regions-east','buildChina','china-public-toilet','createChinaPublicToilet','CHINA_PUBLIC_TOILET','china-public-toilet'],['japan','japan-bathhouse','buildJapan','japan-daily-toilet','createJapanDailyToilet','JAPAN_DAILY_TOILET','japan-toilet'],['france','regions-west','buildFrance','france-daily-toilet','createFranceDailyToilet','FRANCE_DAILY_TOILET','france-toilet'],['egypt','egypt-temple','buildEgypt','egypt-daily-toilet','createEgyptDailyToilet','EGYPT_DAILY_TOILET','egypt-toilet']];
 for(const [country,module,builder,file,creator,key,source]of cases){
  const lot=(await load('game/'+module+'.js'))[builder](),doors=createAutomaticDoors(lot,country),adapter=await load('game/'+file+'.js'),P=adapter[key],make=(id,p,r)=>{const root=new T.Group();root.position.set(...p);return {station:{id},root,collisionRadius:r,walking:false,route:[]};};
  const player=make('player',P.anchor,.34),other=make('blocker',P.approach,.25);let events=0,saved={serial:1,pending:{id:source+'-1',number:1,actorId:'player',facilityId:P.id,stage:'leaving',cancelled:true}};
  const service=adapter[creator]({lot,doors,getPlayer:()=>player,getActors:()=>[other],saved,saveState:s=>{saved=s;return true;},onCompleted:()=>{events++;return true;}});
  service.update(.1);
  // If the real narrow enclosure has no safe alternative, retain its real
  // body/lock until the obstruction is removed; never walk through a wall.
  const alternate=!service.active(),landing=player.root.position.toArray();if(P.id==='cn-tavern-public-toilet'&&alternate){const nav={bounds:lot.bounds,surfaces:lot.walkableSurfaces,legacyGround:false,bodyHeight:1.95,maxStep:.4};assert(doors.planPath(player.root.position,new T.Vector3(17.55,4.015,9.1),nav,.25).length,'landing joins the actual automatic-door/public-stair graph');}
  if(alternate){assert(!blocked(landing[0],landing[2],lot.colliders.concat(doors.cameraColliders),.34,{bounds:lot.bounds,surfaces:lot.walkableSurfaces,legacyGround:false,y:landing[1],bodyHeight:1.95}));assert(player.root.position.distanceTo(other.root.position)>=.67-1e-7);}
  else {assert.deepEqual(landing,P.anchor);other.root.position.set(0,-100,0);service.update(.1);assert(!service.active(),'once a physically trapped exit clears, old reservation must recover');assert.deepEqual(player.root.position.toArray(),P.approach);}
  assert.equal(saved.pending,null);assert.equal(events,0);console.log('PASS',P.id,JSON.stringify({alternate,landing,receipts:events}));service.dispose();doors.dispose();lot.group.traverse(o=>o.geometry?.dispose());
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
