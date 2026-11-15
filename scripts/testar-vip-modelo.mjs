import {test} from 'node:test';import assert from 'node:assert/strict';
import {acompanhantesDoTexto,idListaDaUrl,criarSolicitadorVip} from '../js/utils/vipModelo.js';
test('VIP companion parsing accepts zero to ten people and rejects excess/control characters',()=>{
 assert.deepEqual(acompanhantesDoTexto(' Ana \r\n\nBia '),['Ana','Bia']);assert.deepEqual(acompanhantesDoTexto('',0),[]);
 assert.throws(()=>acompanhantesDoTexto('Ana',0));assert.throws(()=>acompanhantesDoTexto(Array(11).fill('Ana').join('\n')));
 assert.throws(()=>acompanhantesDoTexto('Ana\tForjado'));
});
test('public VIP URL accepts only a valid list UUID',()=>{
 assert.equal(idListaDaUrl('https://app.test/lista-vip.html?id=00000000-0000-0000-0000-000000000001'),'00000000-0000-0000-0000-000000000001');
 assert.equal(idListaDaUrl('https://app.test/lista-vip.html?id=<script>'),null);
});
test('ambiguous VIP request reuses its key, changed request gets another and successful completion clears it',async()=>{
 let n=0;const request=criarSolicitadorVip(()=>String(++n)),seen=[];
 const fail=async p=>{seen.push(p.chave);throw Object.assign(Error('network'),{codigo:'INDISPONIVEL'});};
 await assert.rejects(request.executar('salvar',{nome:'Ana'},fail));await assert.rejects(request.executar('salvar',{nome:'Ana'},fail));
 await assert.rejects(request.executar('salvar',{nome:'Bia'},fail));assert.deepEqual(seen,['1','1','2']);
 await request.executar('salvar',{nome:'Ana'},async p=>assert.equal(p.chave,'1'));
 await request.executar('salvar',{nome:'Ana'},async p=>assert.equal(p.chave,'3'));
});
test('VIP commands reject duplicate clicks, clear terminal conflicts and can discard account-specific keys',async()=>{
 let release,n=0;const request=criarSolicitadorVip(()=>String(++n));const pending=request.executar('salvar',{},()=>new Promise(r=>release=r));
 await assert.rejects(request.executar('cancelar',{},()=>assert.fail()),/Aguarde/);release();await pending;
 await assert.rejects(request.executar('salvar',{},async()=>{throw Object.assign(Error(),{codigo:'CONFLITO'});}));
 await request.executar('salvar',{},async p=>assert.equal(p.chave,'3'));
 await assert.rejects(request.executar('salvar',{},async()=>{throw Error('network');}));request.limpar();
 await request.executar('salvar',{},async p=>assert.equal(p.chave,'5'));
});
