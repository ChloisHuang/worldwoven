// R16 gardener adds exactly two west nursery beds, one tool stand and one
// appended adult station. Keep the R15/historical baseline chain explicit.
const assert=require('node:assert/strict');
const fields={
 colliders:['496e256db2fc2b49f9782561585c7a2bc87698e5a668a619fa799e6d1d2e265e','e2b814d102e364677ec1dd50911c2856d761f761a2a6af5e05be4714102a58c2'],
 cameraColliders:['66904f74edbbed5bf45aba2d4dce03cb779507a0330dd04da9e5eb0d2e344cd8','cafd4e4a0cb4b5f474682b291f0963d62135a6766996ba97c8fd4216b8de8879'],
 stations:['f052b6414448b1ddce6d1d1ebeec79760c392d9de0b6e1091731393b8f7b0d3c','4cf3ea126b9686284027eca9f3f224f3725d53eb46d82c929940f35b245d7f89']
};
function franceGardenerContract(field,prior){const value=fields[field];if(!value)return prior;assert.equal(prior.sha256,value[0],'French gardener baseline '+field);return {sha256:value[1],priorSha256:value[0],status:'approved-gardener-addition',unchanged:false,reason:field==='stations'?'Append france-gardener only; retain the five original adults':'Two small nursery beds and one tool stand only; existing estate boundaries remain'};}
module.exports={franceGardenerContract};
