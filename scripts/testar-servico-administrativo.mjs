import {test} from 'node:test';
import assert from 'node:assert/strict';
import {criarServicoAdministrativo} from '../services/administracaoService.js';

test('administrative commands preserve revision, request key and permission boundaries',async()=>{
 const calls=[];
 const service=criarServicoAdministrativo({obterCliente:async()=>({
  rpc:async(name,args)=>{calls.push({name,args});return {data:{ok:true},error:null};},
 })});
 const request={eventoId:'internal-event',conteudo:{titulo:'Rascunho'},revisao:7,chave:'request-1'};
 await service.salvarRascunho(request);await service.salvarRascunho(request);
 assert.deepEqual(calls[0],calls[1]);
 assert.equal(calls[0].args.p_revisao,7);
 await service.publicarEvento({eventoId:request.eventoId,revisao:8,chave:'request-2'});
 assert.equal(calls[2].name,'publicar_evento');
 assert.ok(!Object.hasOwn(calls[2].args,'p_conteudo'));
 await service.alterarSituacao({eventoId:request.eventoId,situacao:'cancelado',versaoId:'current',chave:'request-3'});
 assert.equal(calls[3].args.p_versao,'current');
});
test('missing idempotency key fails before any request',async()=>{
 let requests=0;
 const service=criarServicoAdministrativo({obterCliente:async()=>{requests++;}});
 await assert.rejects(service.publicarEvento({eventoId:'e',revisao:1}),e=>e.codigo==='VALIDACAO');
 assert.equal(requests,0);
});
test('conflicts are explicit and never auto-overwrite the draft',async()=>{
 let requests=0;
 const service=criarServicoAdministrativo({obterCliente:async()=>({
   rpc:async()=>{requests++;return {error:{code:'40001',message:'conflito_revisao'}};}
 })});
 await assert.rejects(service.salvarRascunho({eventoId:'e',conteudo:{},revisao:1,chave:'k'}),
  e=>e.codigo==='CONFLITO');
 assert.equal(requests,1);
});
test('permission and validation errors remain distinct from network failure',async()=>{
 for(const [code,expected] of [['42501','SEM_PERMISSAO'],['23514','VALIDACAO'],['22023','VALIDACAO'],['PGRST202','INDISPONIVEL']]) {
  const service=criarServicoAdministrativo({obterCliente:async()=>({rpc:async()=>({error:{code}})})});
  await assert.rejects(service.publicarEvento({eventoId:'e',revisao:1,chave:'k'}),e=>e.codigo===expected);
 }
});
