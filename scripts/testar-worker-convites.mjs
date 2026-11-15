import test from 'node:test';
import assert from 'node:assert/strict';
import {configuracaoEnvio,montarMensagem,enviarResend,criarHandlerEnvio,processarFila} from '../supabase/functions/enviar-convites/worker.mjs';
const ref='qmhrlexpnnbjntpecjis',secret='worker-secret-'.repeat(5),providerKey='re_only_a_fake_provider_test_key';
const serviceKey='e30.'+Buffer.from(JSON.stringify({role:'service_role',ref})).toString('base64url')+'.test';
const id=n=>'00000000-0000-0000-0000-'+String(n).padStart(12,'0');
const vars={VTF_CONVITES_ENVIO_ATIVO:'true',VTF_CONVITES_PROJETO_AUTORIZADO:ref,SUPABASE_URL:`https://${ref}.supabase.co`,
 SUPABASE_SERVICE_ROLE_KEY:serviceKey,VTF_CONVITES_WORKER_SECRET:secret,VTF_CONVITES_PROVEDOR:'resend',RESEND_API_KEY:providerKey,
 VTF_CONVITES_REMETENTE:'Vai Ter Forro <convites@example.test>',VTF_CONVITES_APP_URL:'https://app.example.test'};
const env=changes=>name=>({...vars,...changes})[name];
const job={outbox_id:id(1),reserva_id:id(2),convite_id:id(3),token:'ab'.repeat(32),email:'destino@example.test',
 marca:'Marca <script>alert(1)</script>',papel:'equipe',permissoes:['gerenciar_eventos'],expira_em:'2026-11-21T22:00:00Z',payload:null};
const req=(key=secret,body='{}')=>new Request('https://function.example.test',{method:'POST',headers:{'x-worker-secret':key},body});
const json=data=>new Response(JSON.stringify(data),{status:200,headers:{'Content-Type':'application/json'}});

test('delivery is disabled by default and makes no external or database requests',async()=>{
 let calls=0;const handler=criarHandlerEnvio({env:()=>undefined,fetchImpl:async()=>{calls++;}});
 const r=await handler(req());assert.equal(r.status,503);assert.deepEqual(await r.json(),{estado:'desativado'});assert.equal(calls,0);
});
test('configured delivery requires a matched project, service credential, provider and safe canonical URL',()=>{
 assert.equal(configuracaoEnvio(env()).ref,ref);
 for(const change of [{VTF_CONVITES_PROJETO_AUTORIZADO:'wrong'},
  {SUPABASE_SERVICE_ROLE_KEY:'sb_publishable_not_an_administrative_key'},
  {RESEND_API_KEY:serviceKey},{VTF_CONVITES_PROVEDOR:undefined},
  {VTF_CONVITES_APP_URL:'http://app.example.test'},{VTF_CONVITES_APP_URL:'https://user:secret@app.example.test/'},
  {VTF_CONVITES_REMETENTE:'bad\r\nBcc: other@example.test'}])assert.throws(()=>configuracaoEnvio(env(change)));
});
test('worker secret is required independently of the gateway JWT, before any queue access',async()=>{
 let calls=0;const handler=criarHandlerEnvio({env:env(),fetchImpl:async()=>{calls++;}});
 assert.equal((await handler(req('unauthorized'.repeat(5)))).status,401);
 assert.equal((await handler(new Request('https://function.example.test'))).status,405);assert.equal(calls,0);
});
test('cleanup can run without an email provider and returns only counters',async()=>{
 const calls=[];
 const handler=criarHandlerEnvio({env:env({VTF_CONVITES_ENVIO_ATIVO:'false',VTF_CONVITES_LIMPEZA_ATIVA:'true',RESEND_API_KEY:undefined}),fetchImpl:async(url)=>{
  calls.push(url);return json({expirados:2,cancelados:2,limite_seguro:0});
 }});
 const r=await handler(req());assert.equal(r.status,200);const result=await r.json();assert.equal(result.envio,'desativado');
 assert.equal(calls.length,1);assert.ok(calls[0].endsWith('/rpc/limpar_entregas_convites'));
});
test('message template escapes public data, lists permissions and keeps token in fragment',()=>{
 const payload=montarMensagem(job,configuracaoEnvio(env()));
 assert.ok(payload.html.includes('&lt;script&gt;'));assert.ok(!payload.html.includes('<script>'));
 assert.ok(payload.text.includes('Editar eventos'));assert.deepEqual(payload.to,['destino@example.test']);
 const link=new URL(payload.text.match(/https:\/\/\S+/)[0]);assert.equal(link.search,'');assert.ok(link.hash.includes(job.token));
 assert.equal(link.origin,'https://app.example.test');
});
test('provider adapter uses stable dedupe key, fixed endpoint and only the provider credential',async()=>{
 let request;const result=await enviarResend({text:'message'},job.outbox_id,configuracaoEnvio(env()),async(url,options)=>{
  request={url,options};return json({id:'provider_message'});
 });
 assert.equal(result.resultado,'enviado');assert.equal(request.url,'https://api.resend.com/emails');
 assert.equal(request.options.headers['Idempotency-Key'],'convite-marca/'+job.outbox_id);
 assert.equal(request.options.headers.Authorization,'Bearer '+providerKey);assert.equal(request.options.redirect,'error');
 assert.ok(!JSON.stringify(request).includes(serviceKey));
});
test('transient/permanent/provider-idempotency errors are classified without returning body or credentials',async()=>{
 for(const [status,name,expected] of [[429,'rate_limit','transitorio'],[422,'validation_error','permanente'],
  [503,'internal','transitorio'],[409,'concurrent_idempotent_requests','transitorio'],[409,'invalid_idempotent_request','permanente']]){
  const result=await enviarResend({},job.outbox_id,configuracaoEnvio(env()),async()=>new Response(JSON.stringify({name,message:'secret '+job.token}),{status}));
  assert.equal(result.resultado,expected);assert.ok(!JSON.stringify(result).includes(job.token));
 }
 const configError=await enviarResend({},job.outbox_id,configuracaoEnvio(env()),async()=>new Response('{}',{status:401}));
 assert.equal(configError.pausar,true);
});
test('network failure and malformed acknowledgement remain ambiguous and never leak error text',async()=>{
 const result=await enviarResend({},job.outbox_id,configuracaoEnvio(env()),async()=>{throw Error('secret '+providerKey);});
 assert.deepEqual(result,{resultado:'transitorio',provedorId:null,codigo:'sem_resposta'});
 const malformed=await enviarResend({},job.outbox_id,configuracaoEnvio(env()),async()=>json({accepted:true}));
 assert.equal(malformed.resultado,'transitorio');
});
test('HTTP trigger cannot override recipient/provider URL and exposes only summary counters',async()=>{
 let claims=0,providerPayload;
 const handler=criarHandlerEnvio({env:env(),fetchImpl:async(url,options)=>{
  if(url==='https://api.resend.com/emails'){providerPayload=JSON.parse(options.body);return json({id:'fake_delivery'});}
  assert.equal(options.headers.apikey,serviceKey);assert.equal(options.headers.Authorization,'Bearer '+serviceKey);
  if(url.endsWith('/limpar_entregas_convites'))return json({expirados:0,cancelados:0,limite_seguro:0});
  if(url.endsWith('/reservar_entrega_convite'))return json(claims++===0?job:null);
  if(url.endsWith('/iniciar_entrega_convite'))return json(JSON.parse(options.body).p_payload);
  if(url.endsWith('/finalizar_entrega_convite'))return json({registrado:true});
  throw Error('unexpected request');
 }});
 const r=await handler(req(secret,JSON.stringify({to:'attacker@example.test',providerUrl:'https://attacker.example.test'})));
 const result=await r.json();assert.equal(r.status,200);assert.equal(result.enviados,1);
 assert.deepEqual(providerPayload.to,[job.email]);assert.ok(!JSON.stringify(result).includes(job.token));assert.ok(!JSON.stringify(result).includes(job.email));
});
test('batch is bounded and provider authorization failure pauses remaining jobs',async()=>{
 let count=0;const api=async(name,p)=>name==='limpar_entregas_convites'?{}:name==='reservar_entrega_convite'?(count++,job):
  name==='iniciar_entrega_convite'?p.p_payload:{registrado:true};
 const result=await processarFila({config:configuracaoEnvio(env()),api,enviar:async()=>({resultado:'transitorio',codigo:'http_403',pausar:true})});
 assert.equal(count,1);assert.equal(result.pausado,true);
 await assert.rejects(processarFila({config:{},api,enviar:()=>{},maximo:100}));
});
