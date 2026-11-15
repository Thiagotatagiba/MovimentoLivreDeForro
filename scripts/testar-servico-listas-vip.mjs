import {test} from 'node:test';
import assert from 'node:assert/strict';
import {criarServicoListasVip} from '../services/listasVipService.js';
test('VIP service preserves revision and request key, disables SDK retries and uses only approved RPCs',async()=>{
 const calls=[];const service=criarServicoListasVip({obterCliente:async()=>({rpc:(name,params)=>({retry:async value=>{assert.equal(value,false);calls.push({name,params});return {data:{ok:true},error:null};}})})});
 await service.consultar('list');await service.criar({eventoId:'event',titulo:'VIP',termos:'Termos',prazo:'deadline',inicio:'start',fim:'end',maxAcompanhantes:10,chave:'key'});
 await service.encerrar({listaId:'list',revisao:7,chave:'close-key'});
 assert.deepEqual(calls,[{name:'consultar_lista_vip',params:{p_lista:'list'}},
  {name:'criar_lista_vip',params:{p_evento:'event',p_titulo:'VIP',p_termos:'Termos',p_prazo:'deadline',p_inicio:'start',p_fim:'end',p_acompanhantes:10,p_chave:'key'}},
  {name:'encerrar_lista_vip',params:{p_lista:'list',p_revisao:7,p_chave:'close-key'}}]);
});
test('VIP service rejects missing write key before obtaining a client and propagates hidden list as null',async()=>{
 const denied=criarServicoListasVip({obterCliente:()=>assert.fail()});
 await assert.rejects(denied.criar({}),{codigo:'VALIDACAO'});await assert.rejects(denied.encerrar({}),{codigo:'VALIDACAO'});
 const reader=criarServicoListasVip({obterCliente:async()=>({rpc:async()=>({data:null,error:null})})});assert.equal(await reader.consultar('hidden'),null);
});
test('VIP service distinguishes conflict, permission, validation and unavailable errors without auto-overwriting',async()=>{
 for(const [code,codigo] of [['PT409','CONFLITO'],['42501','SEM_PERMISSAO'],['22023','VALIDACAO'],['503','INDISPONIVEL']]){
  const service=criarServicoListasVip({obterCliente:async()=>({rpc:async()=>({error:{code}})})});
  await assert.rejects(service.encerrar({listaId:'list',revisao:1,chave:'key'}),{codigo});
 }
});
