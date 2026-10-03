// Only an explicitly approved, complete per-field R15 record may replace a historical contract.
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const fixturePath=path.join(__dirname,'r15-scene-contracts.json');
let fixture=null;
try{fixture=JSON.parse(fs.readFileSync(fixturePath,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
const sha256=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const sourceSha=value=>typeof value==='string'&&/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(value);
function selectR15SceneContract(region,field,historicalHash){
  const unchanged={sha256:historicalHash,status:'unchanged-historical-contract',unchanged:true};
  // Missing or pending approval never supplies an expected hash.
  if(!fixture||fixture.status!=='APPROVED_EXACT_FIELD_DIFFS')return unchanged;
  assert.equal(fixture.release,'R15','R15 scene contract release');
  assert(sourceSha(fixture.baselinePublishedSource),'R15 baselinePublishedSource must be a source SHA');
  assert(sourceSha(fixture.candidateSource),'R15 candidateSource must be a source SHA');
  assert(fixture.regions&&typeof fixture.regions==='object'&&!Array.isArray(fixture.regions),'R15 regions must be an object');
  const contract=fixture.regions[region];
  if(!contract)return unchanged;
  assert(Array.isArray(contract.approvedChangedFields),region+' R15 approvedChangedFields must be an array');
  assert(contract.approvedChangedFields.every(key=>typeof key==='string')&&new Set(contract.approvedChangedFields).size===contract.approvedChangedFields.length,region+' R15 approvedChangedFields must contain unique field names');
  if(!contract.approvedChangedFields.includes(field))return unchanged;
  const current=contract.hashes?.[field],prior=contract.priorHashes?.[field],diff=contract.fieldDiffHashes?.[field],reason=contract.fieldReasons?.[field];
  assert(sha256(current),region+' '+field+' R15 hash must be SHA-256');
  assert(sha256(prior),region+' '+field+' R15 prior hash must be SHA-256');
  assert(sha256(diff),region+' '+field+' R15 field diff hash must be SHA-256');
  assert(typeof reason==='string'&&reason.trim(),region+' '+field+' R15 approval requires a reason');
  assert.equal(prior,historicalHash,region+' '+field+' R15 prior hash must match its historical contract');
  assert.notEqual(current,prior,region+' '+field+' R15 approvedChangedFields must describe an actual change');
  return{sha256:current,status:'approved-r15-change',unchanged:false,priorSha256:prior,fieldDiffSha256:diff,reason};
}
module.exports={selectR15SceneContract};
