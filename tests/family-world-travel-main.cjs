// Resume a legitimate travelling parent's family in a selected actual country.
// Separate processes keep the four existing scene builds within their normal cap.
const fs=require('node:fs'),vm=require('node:vm');let source=fs.readFileSync('tests/family-main.cjs','utf8');
source=source.replace("actorId:'cn-consort-yue',name:'月容 · 妃嫔',country:'china',ageYears:29", "actorId:'player',name:'你',country:'china',ageYears:24");
source=source.replace("all.find(e=>e.dataset.region==='china').onclick();ids.travel.onclick();", "const country=process.env.FAMILY_COUNTRY||'japan';all.find(e=>e.dataset.region===country).onclick();ids.travel.onclick();");
source=source.replace("ledger.children('china')", "ledger.children(country)");
source=source.replace("assert.equal(r.npcs.filter(n=>!n.familyBorn).length,31);assert.equal(r.npcs.find(n=>n.station.id==='cn-emperor').station.id,'cn-emperor');", "assert(r.npcs.filter(n=>!n.familyBorn).length>0);assert.equal(child.caregiverId,'player');assert.equal(child.birthCountry,'china');assert.equal(child.country,country);");
source=source.replace("const out='qa/family-main-'+childAge;", "const out='qa/family-world-'+country;");
source=source.replace("status:'PASS',childAge", "status:'PASS',country,childAge");
new vm.Script(source,{filename:__filename}).runInNewContext({structuredClone,URL,Float32Array,Float64Array,Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,ArrayBuffer,require,console,process,Buffer,__filename,__dirname});
