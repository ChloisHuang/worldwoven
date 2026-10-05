import assert from 'node:assert/strict';
// Existing salary/storage fixtures use the same new review boundaries. World
// adapters separately verify NPC proximity, paper pickup and reading actions.
export function approvePending(careers,ageYears=22){
 const application=careers.applicationResult(),options={ageYears,applicationId:application?.id};assert.equal(application?.status,'pending');
 let result=careers.reviewApplication(application.roleId,options);assert(result.ok,JSON.stringify(result));
 if(result.code==='document-ready'){
  result=careers.reviewApplication(application.roleId,{...options,step:'receive-document'});assert(result.ok,JSON.stringify(result));
  result=careers.reviewApplication(application.roleId,{...options,step:'appointment'});assert(result.ok,JSON.stringify(result));
 }
 assert.equal(result.code,'approved');return result;
}
