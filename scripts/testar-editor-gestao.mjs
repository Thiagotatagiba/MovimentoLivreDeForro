import {test} from 'node:test';
import assert from 'node:assert/strict';
import {criarEditor,compararEdicoes,normalizarConteudoEditor,validarParaPublicar} from '../admin/js/editorModelo.js';
import {criarApiDemo} from './fixtures/adminDemoApi.mjs';
import {id,conteudoInicial} from './fixtures/bancoAdministrativo.mjs';
const conteudo=normalizarConteudoEditor({...conteudoInicial,terminoEstimado:false});
const snapshot=(c=conteudo,rev=1)=>({evento:{id:'event',slug:'event',versao_publicada_id:'v1',
 versao:{numero:1,conteudo:{...c,titulo:'Publicado'},situacao:'cancelado'}},
 conteudo:structuredClone(c),rascunho:{conteudo:structuredClone(c)},revisao:rev});
function criar(servico={}) {
 let keys=0;
 return criarEditor({servico,novaChave:()=>String(++keys)});
}
test('JSONB key order and displayed empty defaults do not create false conflicts',()=>{
 const a={...conteudo,lineup:{bandas:['Trio'],djs:[]},ingresso:{link:'em breve',precoAPartirDe:0,tipoEntrada:''}};
 const b={...conteudo,lineup:{djs:[],bandas:['Trio']},ingresso:{tipoEntrada:'',precoAPartirDe:0,link:'em breve'}};
 assert.deepEqual(compararEdicoes(conteudo,a,b),[]);
 const editor=criar();editor.carregar(snapshot(a));editor.editar(b);assert.equal(editor.estado().alterado,false);
 const original={...conteudoInicial};const normalized=normalizarConteudoEditor(original);
 assert.equal(normalized.descricao,'');assert.ok(!Object.hasOwn(original,'descricao'));
 assert.equal(normalizarConteudoEditor({}).horarioTermino,''); // no invented end time
});
test('saving keeps the public version and produces a separate draft revision',async()=>{
 const editor=criar({salvarRascunho:async()=>({revisao:2})});
 editor.carregar(snapshot());editor.editar({...conteudo,titulo:'Meu rascunho'});
 await editor.salvar();
 assert.equal(editor.estado().snapshot.evento.versao.conteudo.titulo,'Publicado');
 assert.equal(editor.estado().snapshot.revisao,2);assert.equal(editor.estado().alterado,false);
 assert.equal(editor.estado().publicacaoPendente,true);
});
test('ambiguous network failure reuses the same key and payload, changed payload gets a new key',async()=>{
 const calls=[];
 const editor=criar({salvarRascunho:async args=>{calls.push(structuredClone(args));throw Error('offline');}});
 editor.carregar(snapshot());
 await assert.rejects(editor.salvar(),/offline/);await assert.rejects(editor.salvar(),/offline/);
 assert.deepEqual(calls[0],calls[1]);
 editor.editar({...conteudo,titulo:'Outra edição'});
 await assert.rejects(editor.salvar(),/offline/);
 assert.notEqual(calls[1].chave,calls[2].chave);
});
test('busy state prevents duplicate commands and edits while saving',async()=>{
 let resolve;
 const editor=criar({salvarRascunho:()=>new Promise(r=>{resolve=r;})});
 editor.carregar(snapshot());
 const first=editor.salvar();
 assert.equal(editor.estado().busy,true);
 await assert.rejects(editor.salvar(),/Aguarde/);
 assert.throws(()=>editor.editar(conteudo),/Aguarde/);
 resolve({revisao:2});await first;assert.equal(editor.estado().busy,false);
});
test('CAS conflict preserves local content and explicit choice prepares but does not auto-save',async()=>{
 let calls=0;
 const remoto=snapshot({...conteudo,titulo:'Título da equipe'},4);
 const editor=criar({salvarRascunho:async()=>{calls++;throw Object.assign(Error('conflict'),{codigo:'CONFLITO'});},
  carregarEvento:async()=>structuredClone(remoto)});
 editor.carregar(snapshot());editor.editar({...conteudo,titulo:'Meu título'});
 await assert.rejects(editor.salvar(),/conflict/);
 assert.equal(editor.estado().conteudo.titulo,'Meu título');
 assert.equal(editor.estado().conflito.linhas.length,1);
 assert.throws(()=>editor.resolver({}),/Escolha/);
 editor.resolver({titulo:'local'});
 assert.equal(editor.estado().snapshot.revisao,4);
 assert.equal(editor.estado().conteudo.titulo,'Meu título');assert.equal(calls,1);
 assert.equal(editor.estado().alterado,true);
});
test('merge preserves noneditable remote fields and can select the remote content explicitly',async()=>{
 const remoto=snapshot({...conteudo,titulo:'Atual',condicoesEspeciais:[{tipo:'aviso',descricao:'Atualização'}]},2);
 const editor=criar({salvarRascunho:async()=>{throw Object.assign(Error('conflict'),{codigo:'CONFLITO'});},
 carregarEvento:async()=>remoto});
 editor.carregar(snapshot());editor.editar({...conteudo,titulo:'Local'});
 await assert.rejects(editor.salvar());editor.resolver({titulo:'remoto'});
 assert.equal(editor.estado().conteudo.titulo,'Atual');
 assert.deepEqual(editor.estado().conteudo.condicoesEspeciais,remoto.conteudo.condicoesEspeciais);
 assert.equal(editor.estado().alterado,false);
});
test('publishing requires saved changes, valid times and explicit historical end confirmation',async()=>{
 const editor=criar({publicarEvento:async()=>({revisao:2,numero:2,versao_id:'v2'})});
 editor.carregar({...snapshot(),rascunho:null});assert.throws(()=>editor.publicar(),/rascunho/);
 editor.carregar(snapshot());editor.editar({...conteudo,titulo:'Não salvo'});assert.throws(()=>editor.publicar(),/Salve/);
 assert.throws(()=>validarParaPublicar({...conteudo,terminoEstimado:true}),/Confirme/);
 assert.throws(()=>validarParaPublicar({...conteudo,horarioTermino:''}),/obrigat/);
 editor.carregar(snapshot());await editor.publicar();
 assert.equal(editor.estado().snapshot.evento.versao.situacao,'cancelado');
 assert.equal(editor.estado().snapshot.evento.versao_publicada_id,'v2');
 assert.equal(editor.estado().publicacaoPendente,false);
});
test('operational status uses the current published version without overwriting the draft',async()=>{
 let sent;
 const editor=criar({alterarSituacao:async args=>{sent=args;return {versao_id:'v2',numero:2,situacao:'adiado'};}});
 editor.carregar(snapshot());const before=editor.estado().conteudo;
 await editor.alterarSituacao('adiado');
 assert.equal(sent.versaoId,'v1');assert.equal(sent.situacao,'adiado');
 assert.deepEqual(editor.estado().conteudo,before);
 assert.equal(editor.estado().snapshot.evento.versao.situacao,'adiado');
});
test('SQL demo API isolates profiles, preserves public content before publication and validates exact RPCs',async()=>{
 const api=await criarApiDemo();
 const call=(path,perfil,body=null,query='')=>api.executar('/__admin_demo/'+path,perfil,body,new URLSearchParams(query));
 try{
  assert.equal((await call('contexto','invalid')).status,401);
  const context=await call('contexto','editor');assert.equal(context.data.marcas[0].nome,'Marca A');
  const other=await call('contexto','outra-marca');assert.equal(other.data.marcas[0].nome,'Marca B');
  const p={p_evento:id(301),p_conteudo:{...conteudoInicial,titulo:'Rascunho privado',terminoEstimado:false},p_revisao:0,p_chave:id(1001)};
  const save=await call('rpc','editor',{nome:'salvar_rascunho_evento',parametros:p});assert.equal(save.status,200);
  const publicRead=await call('evento','outra-marca',null,'id='+id(301));
  assert.equal(publicRead.data.rascunho,null);assert.equal(publicRead.data.conteudo.titulo,conteudoInicial.titulo);
  const forbidden=await call('rpc','editor',{nome:'publicar_evento',parametros:{p_evento:id(301),p_revisao:1,p_chave:id(1002)}});
  assert.equal(forbidden.error.code,'42501');
  const pub=await call('rpc','publicador',{nome:'publicar_evento',parametros:{p_evento:id(301),p_revisao:1,p_chave:id(1003)}});
  assert.equal(pub.data.numero,2);
  const invalid=await call('rpc','editor',{nome:'arbitrary_sql',parametros:{}});
  assert.equal(invalid.error.code,'22023');
 }finally{await api.fechar();}
});
