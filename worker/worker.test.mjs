import assert from 'node:assert/strict';
import {createHandler} from './index.mjs';
const fixture={state:{version:1,day:23,player:{},npcs:{},objects:[]},authenticated:true,epoch:'do-not-forward'};
let calls=[];
const handle=createHandler(async(url,opts)=>{calls.push({url,opts});return new Response(JSON.stringify(fixture),{headers:{'content-type':'application/json'}})});
let r=await handle(new Request('https://private.test/api/pull-remote-save',{headers:{Cookie:'private',Authorization:'private'}}));
assert.equal(r.status,200);assert.deepEqual(await r.json(),{state:fixture.state});assert.equal(r.headers.get('cache-control'),'no-store');
assert.equal(calls[0].url,'https://www.doudouai.net:6443/api/state');assert.deepEqual(calls[0].opts.headers,{Accept:'application/json'});assert.equal(calls[0].opts.credentials,'omit');assert.equal(calls[0].opts.redirect,'manual');assert.equal(calls[0].opts.method,'GET');
for(const [url,init,status] of [['https://private.test/api/pull-remote-save',{method:'POST'},405],['https://private.test/api/pull-remote-save?url=https://bad.test',{},400],['https://private.test/api/pull-remote-save',{headers:{Origin:'https://bad.test'}},403],['https://private.test/api/pull-remote-save',{headers:{'Sec-Fetch-Site':'cross-site'}},403]]){assert.equal((await handle(new Request(url,init))).status,status);}
assert.equal(calls.length,1);
assert.equal((await handle(new Request('https://private.test/not-api'))).status,404);
for(const response of [new Response('',{status:302,headers:{Location:'https://bad.test'}}),new Response('bad',{headers:{'content-type':'application/json'}}),new Response('{}',{headers:{'content-type':'text/html'}}),new Response('x'.repeat(900001),{headers:{'content-type':'application/json'}}),new Response('{"state":{}}',{headers:{'content-type':'application/json'}})]){assert.equal((await createHandler(async()=>response)(new Request('https://private.test/api/pull-remote-save'))).status,502);}
assert.equal((await createHandler(async()=>{throw Error('secret-not-shown')})(new Request('https://private.test/api/pull-remote-save'))).status,502);
console.log('PASS fixed read-only proxy: valid response, bounded body, malformed/failure, redirect, origin, method, no credentials/query forwarding');
