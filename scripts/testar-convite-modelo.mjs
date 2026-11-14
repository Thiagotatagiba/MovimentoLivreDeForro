import test from 'node:test';
import assert from 'node:assert/strict';
import {lerEntradaConvite,novoTokenConvite,linkConvite,estadoConvite} from '../admin/js/conviteModelo.js';
const id='00000000-0000-0000-0000-000000000001',token='ab'.repeat(32);
function storage(value){return {value,getItem(){return this.value;},removeItem(){this.value=null;}};}
test('invitation link keeps the capability only in fragment, never query or another origin',()=>{
 const url=new URL(linkConvite('https://vaiterforro.com.br/admin/convites.html',id,token));
 assert.equal(url.origin,'https://vaiterforro.com.br');assert.equal(url.pathname,'/admin/convites.html');assert.equal(url.search,'');
 assert.equal(new URLSearchParams(url.hash.slice(1)).get('token'),token);
 assert.throws(()=>linkConvite(url,'invalid',token));
});
test('tab-scoped invitation survives OAuth reload for at most fifteen minutes and clears invalid data',()=>{
 const value=JSON.stringify({fragmento:'#convite='+id+'&token='+token,instante:1000});
 const valid=storage(value);assert.deepEqual(lerEntradaConvite(valid,2000),{conviteId:id,token});
 assert.equal(lerEntradaConvite(valid,901001),null);assert.equal(valid.value,null);
 const invalid=storage('{"fragmento":"#convite=wrong&token=x","instante":1000}');
 assert.equal(lerEntradaConvite(invalid,2000),null);assert.equal(invalid.value,null);
});
test('invite token uses 32 random bytes rather than a timestamp or user identity',()=>{
 let length;const result=novoTokenConvite({getRandomValues(bytes){length=bytes.length;bytes.fill(128);return bytes;}});
 assert.equal(length,32);assert.equal(result,'80'.repeat(32));
});
test('pending invite expires for display while accepted/revoked states remain final',()=>{
 const expires='2026-11-14T00:00:00Z';
 assert.equal(estadoConvite({estado:'pendente',expira_em:expires},Date.parse(expires)+1),'expirado');
 assert.equal(estadoConvite({estado:'aceito',expira_em:expires},Date.parse(expires)+1),'aceito');
});
