import {test} from 'node:test';
import assert from 'node:assert/strict';
import {acionarFila} from './acionar-fila-convites.mjs';
const claims={role:'anon',ref:'qmhrlexpnnbjntpecjis',exp:2000000000};
const jwt=p=>'e30.'+Buffer.from(JSON.stringify(p)).toString('base64url')+'.assinatura_ficticia';
const env={VTF_EXECUCAO_CONVITES_ATIVA:'true',VTF_CONVITES_PROJETO_AUTORIZADO:claims.ref,
 VTF_CONVITES_ANON_JWT:jwt(claims),VTF_CONVITES_WORKER_SECRET:'s'.repeat(64)};
const result={enviados:1,falhas:0,cancelados:0,reservas_expiradas:0,limpeza:{expirados:0,cancelados:0,limite_seguro:0}};
test('scheduler defaults to disabled without reading credentials or making requests',async()=>{
 assert.deepEqual(await acionarFila({env:{},fetchImpl:()=>assert.fail()}),{estado:'agendamento_desativado'});
});
test('scheduler refuses production, privileged credentials, malformed or expired JWT and bad secret',async()=>{
 for(const change of [{VTF_CONVITES_PROJETO_AUTORIZADO:'hpemkfzqbhbzjepbxvwh'},
  {VTF_CONVITES_ANON_JWT:jwt({...claims,role:'service_role'})},{VTF_CONVITES_ANON_JWT:jwt({...claims,ref:'hpemkfzqbhbzjepbxvwh'})},
  {VTF_CONVITES_ANON_JWT:'sb_publishable_wrong_gateway_format'},{VTF_CONVITES_ANON_JWT:jwt({...claims,exp:1})},
  {VTF_CONVITES_ANON_JWT:jwt({...claims,exp:undefined})},{VTF_CONVITES_WORKER_SECRET:'short'},
  {VTF_CONVITES_WORKER_SECRET:'s'.repeat(64)+'\n'}]){
  await assert.rejects(acionarFila({env:{...env,...change},fetchImpl:()=>assert.fail()}),/projeto_nao_autorizado|jwt_publico_invalido|segredo_invalido/);
 }
});
test('scheduler uses fixed staging endpoint, public JWT and separate secret; output is allowlisted',async()=>{
 let calls=0;const data=await acionarFila({env,fetchImpl:async(url,options)=>{
  calls++;assert.equal(url,'https://qmhrlexpnnbjntpecjis.supabase.co/functions/v1/enviar-convites');
  assert.equal(options.method,'POST');assert.equal(options.redirect,'error');assert.ok(options.signal);
  assert.equal(options.headers.Authorization,'Bearer '+env.VTF_CONVITES_ANON_JWT);
  assert.equal(options.headers['x-worker-secret'],env.VTF_CONVITES_WORKER_SECRET);
  assert.equal(options.body,undefined);return Response.json({...result,token:'do_not_print',limpeza:{...result.limpeza,email:'private'}});
 }});assert.equal(calls,1);assert.deepEqual(data,{estado:'processado',...result});
});
test('network ambiguity and HTTP errors are never retried or leaked',async()=>{
 for(const mode of ['network','http']){let calls=0;
  await assert.rejects(acionarFila({env,fetchImpl:async()=>{calls++;if(mode==='network')throw Error('sensitive credential');return new Response('sensitive body',{status:503});}}),
   {message:mode==='network'?'resposta_ambigua_sem_repeticao':'worker_http_503'});assert.equal(calls,1);
 }
});
test('malformed or impossible counters fail instead of hiding a worker failure',async()=>{
 for(const data of [null,{}, {...result,enviados:4},{...result,enviados:-1},{...result,falhas:'1'},
  {...result,limpeza:null},{...result,envio:'ativo'},{...result,pausado:'yes'}])
  await assert.rejects(acionarFila({env,fetchImpl:async()=>Response.json(data)}),/resposta_invalida/);
 await assert.rejects(acionarFila({env,fetchImpl:async()=>new Response('invalid json')}),/resposta_invalida/);
});
test('cleanup-only mode and provider pause remain visible in sanitized summary',async()=>{
 const expected={...result,enviados:0,envio:'desativado',pausado:true};
 assert.deepEqual(await acionarFila({env,fetchImpl:async()=>Response.json(expected)}),{estado:'processado',...expected});
});
