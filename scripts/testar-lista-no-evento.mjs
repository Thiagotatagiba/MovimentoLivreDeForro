import {test} from 'node:test';import assert from 'node:assert/strict';
import {eventoDaBusca,selecionarEventoLista,estadoListaNoEvento} from '../admin/js/listaNoEventoModelo.js';
const id='00000000-0000-0000-0000-000000000001',other='00000000-0000-0000-0000-000000000002';
const evento={id,estado_publicacao:'publicado',versao_publicada_id:'v1',versao:{situacao:'confirmado',conteudo:{ativo:true}}};
const props={evento,podeGerenciar:true,registro:{evento_id:id,gerenciar:true,situacao:'confirmado',lista:null}};
test('event route is a UUID only, never an external destination or an empty default',()=>{
 assert.equal(eventoDaBusca(''),null);assert.equal(eventoDaBusca('?evento='+id),id);
 for(const value of ['', 'https://example.com','fake','../listas.html'])assert.throws(()=>eventoDaBusca('?evento='+encodeURIComponent(value)),/inválido/);
});
test('a requested edition must match exactly; unavailable target never selects the first accessible event',()=>{
 const rows=[{evento_id:other},{evento_id:id}];assert.equal(selecionarEventoLista(rows,id,other),rows[1]);
 assert.throws(()=>selecionarEventoLista([rows[0]],id,other),/Nenhuma outra edição/);assert.throws(()=>selecionarEventoLista([],id,''));
 assert.equal(selecionarEventoLista(rows,null,id),rows[1]);assert.equal(selecionarEventoLista(rows,null,''),rows[0]);
});
test('unpublished, unauthorized, dirty, pending publication and failed reads do not offer creation',()=>{
 for(const delta of [{evento:{id}},{podeGerenciar:false},{alterado:true},{publicacaoPendente:true},{carregando:true},{erro:true},{registro:null}])assert.ok(!estadoListaNoEvento({...props,...delta}).criar);
 assert.ok(!estadoListaNoEvento({...props,evento:{...evento,versao:{situacao:'cancelado'}}}).criar);
});
test('confirmed published edition offers inline creation; an existing list offers management or consultation',()=>{
 assert.equal(estadoListaNoEvento(props).criar,true);
 const registro={...props.registro,lista:{id:'list',titulo:'VIP'}};assert.equal(estadoListaNoEvento({...props,registro}).acao,'Gerenciar lista deste evento');
 assert.equal(estadoListaNoEvento({...props,registro,podeGerenciar:false,podeConsultar:true}).acao,'Consultar lista deste evento');
 assert.equal(estadoListaNoEvento({...props,registro,publicacaoPendente:true}).gerenciar,true);
});
