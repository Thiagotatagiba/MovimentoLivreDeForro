import {test} from 'node:test';import assert from 'node:assert/strict';
import {criarNovoEvento,conteudoNovoEvento,validarImagemNova} from '../admin/js/novoEventoModelo.js';import {criarEditor} from '../admin/js/editorModelo.js';
const content=()=>({...conteudoNovoEvento(),titulo:'Baile',data:'2026-12-20',horario:'22:00',dataTermino:'2026-12-21',horarioTermino:'02:00',terminoEstimado:false});
const serverResult=c=>({evento_id:'server-uuid',id_legado:'evt-generated',slug:'baile-generated',marca_id:'brand',local_id:'venue',revisao:1,conteudo:{...c,id:'evt-generated',slug:'baile-generated',marcaId:'legacy-brand',localId:'legacy-venue'}});
test('new form never guesses an end time and rejects missing venue/end confirmation before any RPC',async()=>{
 const initial=conteudoNovoEvento();assert.equal(initial.horarioTermino,'');assert.equal(initial.terminoEstimado,true);
 const model=criarNovoEvento({servico:{criarEvento:()=>assert.fail()}});
 await assert.rejects(model.salvar({marcaId:'brand',localId:'',conteudo:content()}),/marca e o local/);
 await assert.rejects(model.salvar({marcaId:'brand',localId:'venue',conteudo:{...content(),terminoEstimado:true}}),/Confirme/);
});
test('ambiguous creation reuses request key, changed payload gets another and server identities are authoritative',async()=>{
 let n=0,fail=true;const keys=[];const model=criarNovoEvento({novaChave:()=>String(++n),servico:{criarEvento:async args=>{keys.push(args.chave);if(fail)throw Object.assign(Error('Network'),{codigo:'INDISPONIVEL'});return serverResult(args.conteudo);}}});
 const args={marcaId:'brand',localId:'venue',conteudo:content()};await assert.rejects(model.salvar(args));await assert.rejects(model.salvar(args));
 await assert.rejects(model.salvar({...args,conteudo:{...content(),titulo:'Outro'}}));assert.deepEqual(keys,['1','1','2']);fail=false;
 const snapshot=await model.salvar(args);assert.equal(snapshot.evento.id,'server-uuid');assert.equal(snapshot.evento.id_legado,'evt-generated');assert.equal(snapshot.evento.versao_publicada_id,null);assert.equal(snapshot.revisao,1);
});
test('confirmed creation feeds the existing editor directly and only explicit publication creates the public version',async()=>{
 let creates=0,publishes=0;const service={criarEvento:async args=>{creates++;return serverResult(args.conteudo);},publicarEvento:async args=>{publishes++;assert.equal(args.eventoId,'server-uuid');assert.equal(args.revisao,1);return {versao_id:'version-1',numero:1,revisao:2};}};
 const model=criarNovoEvento({servico:service}),snapshot=await model.salvar({marcaId:'brand',localId:'venue',conteudo:content()});
 const editor=criarEditor({servico:service});editor.carregar(snapshot);assert.equal(editor.estado().alterado,false);assert.equal(editor.estado().publicacaoPendente,true);assert.equal(publishes,0);
 await editor.publicar();assert.equal(creates,1);assert.equal(publishes,1);assert.equal(editor.estado().snapshot.evento.versao_publicada_id,'version-1');assert.equal(editor.estado().snapshot.evento.estado_publicacao,'publicado');
});
test('new image validator refuses credentials, mixed content and unsafe schemes, and canonicalizes HTTPS',()=>{
 for(const url of ['http://img.test/a.jpg','javascript:alert(1)','https://user:secret@img.test/a.jpg','https://img.test/a\nb'])assert.throws(()=>validarImagemNova(url));
 assert.equal(validarImagemNova('https://FORRO.test/arte.jpg'),'https://forro.test/arte.jpg');assert.equal(validarImagemNova(''),undefined);
});
test('duplicate creation clicks are blocked while awaiting the server',async()=>{
 let release;const model=criarNovoEvento({servico:{criarEvento:args=>new Promise(r=>release=()=>r(serverResult(args.conteudo)))}});
 const args={marcaId:'brand',localId:'venue',conteudo:content()},pending=model.salvar(args);await assert.rejects(model.salvar(args),/Aguarde/);release();await pending;
});
