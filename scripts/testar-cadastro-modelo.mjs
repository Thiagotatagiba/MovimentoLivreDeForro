import {test} from 'node:test';import assert from 'node:assert/strict';
import {validarCadastro,criarSolicitadorCadastro} from '../admin/js/cadastroModelo.js';import {criarBuscaEnderecos} from '../admin/js/mapaCadastro.js';
const local={nome:'Local',endereco:{logradouro:'Rua',numero:'1',bairro:'Centro',cidade:'Vitoria',estado:'ES'},latitude:-20,longitude:-40};
test('venue requires complete address and finite confirmed point; links must be credential-free HTTPS',()=>{
 assert.equal(validarCadastro('local',local),local);
 for(const patch of [{latitude:null},{longitude:Infinity},{latitude:91},{site:'http://example.com'},{site:'https://me:secret@example.com'}])assert.throws(()=>validarCadastro('local',{...local,...patch}));
 assert.throws(()=>validarCadastro('local',{...local,endereco:{}}));
});
test('ambiguous create reuses key; changed payload changes key; confirmed result clears request',async()=>{
 let next=0,fail=true;const keys=[];const m=criarSolicitadorCadastro({novaChave:()=>String(++next),servico:{criarMarca:async a=>{keys.push(a.chave);if(fail)throw Object.assign(Error('network'),{codigo:'INDISPONIVEL'});return {id:'created'};}}});
 await assert.rejects(m.salvar('marca',{nome:'Marca'}));await assert.rejects(m.salvar('marca',{nome:'Marca'}));await assert.rejects(m.salvar('marca',{nome:'Outra'}));
 fail=false;assert.deepEqual(await m.salvar('marca',{nome:'Outra'}),{id:'created'});assert.deepEqual(keys,['1','1','2','2']);
});
test('double submit is blocked while request is pending',async()=>{
 let finish;const m=criarSolicitadorCadastro({novaChave:()=> 'key',servico:{criarLocal:()=>new Promise(r=>finish=r)}});const pending=m.salvar('local',local);await assert.rejects(m.salvar('local',local),/Aguarde/);finish({id:'venue'});await pending;
});
test('address search is limited, cached, HTTPS-only and ignores malformed points',async()=>{
 let calls=0,clock=0;const search=criarBuscaEnderecos({url:'https://photon.komoot.io/api/',agora:()=>clock,fetchImpl:async url=>{calls++;assert.equal(url.searchParams.get('limit'),'5');return {ok:true,json:async()=>({features:[{geometry:{type:'Point',coordinates:[-40,-20]},properties:{name:'Local',city:'Vitoria'}},{geometry:{type:'Point',coordinates:['x',null]}}]})};}});
 assert.deepEqual(await search('ab'),[]);const rows=await search('local');assert.equal(rows.length,1);assert.equal(rows[0].latitude,-20);assert.deepEqual(await search('local'),rows);assert.equal(calls,1);
 await assert.rejects(search('outro'),/Aguarde/);clock=1200;await search('outro');assert.equal(calls,2);
});
