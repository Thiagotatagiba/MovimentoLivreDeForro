import {test} from 'node:test';import assert from 'node:assert/strict';
import {acessosMenu,itensGestao,destinoAtalho} from '../admin/js/navegacaoModelo.js';
test('global has the five explicit areas and creation actions',()=>{
 const p=acessosMenu({administradorSistema:true,marcas:[]});assert.deepEqual(itensGestao.filter(i=>p[i.id]).map(i=>i.id),['eventos','locais','marcas','listas','gerentes']);
 assert.equal(destinoAtalho(itensGestao[0],p).url,'gestao.html?acao=novo');assert.match(itensGestao[4].novo,/convidar-gerente/);
});
test('list-only membership retains its menu despite having no event access',()=>{
 const p=acessosMenu({marcas:[],acessos:[{administrador:false,permissoes:['consultar_listas']}]});assert.equal(p.listas,true);assert.equal(p.eventos,false);assert.equal(p.locais,false);assert.equal(p.marcas,false);assert.equal(p.gerentes,false);
 assert.equal(destinoAtalho(itensGestao[3],p).texto,'Consultar listas');
});
test('publisher can manage events but cannot see a create-event shortcut or invitations',()=>{
 const p=acessosMenu({marcas:[{administrador:false,permissoes:['publicar_eventos']}]});assert.equal(p.eventos,true);assert.equal(p.novoEvento,false);assert.equal(p.gerentes,false);assert.equal(destinoAtalho(itensGestao[0],p).texto,'Gerenciar eventos');
});
test('brand administrator can invite managers but canonical catalog remains global-only',()=>{
 const p=acessosMenu({marcas:[{administrador:true,permissoes:['gerenciar_eventos','gerenciar_listas']}]});assert.equal(p.gerentes,true);assert.equal(p.novaLista,true);assert.equal(p.locais,false);assert.equal(p.marcas,false);
 assert.ok(Object.values(acessosMenu({marcas:[],user_metadata:{administrador:true}})).every(x=>x===false));
});
