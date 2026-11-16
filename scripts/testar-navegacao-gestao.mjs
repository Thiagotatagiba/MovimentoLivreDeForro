import {test} from 'node:test';import assert from 'node:assert/strict';
import {acessosMenu,itensGestao,destinoAtalho} from '../admin/js/navegacaoModelo.js';
import {destinoGestao,criarAtalhoGestao} from '../components/atalhoGestao.js';

test('public menu uses panel permissions and routes list-only accounts directly to lists',()=>{
 assert.equal(destinoGestao({administradorSistema:true}),'admin/gestao.html');
 for(const permissao of ['gerenciar_eventos','publicar_eventos'])assert.equal(destinoGestao({acessos:[{permissoes:[permissao]}]}),'admin/gestao.html');
 for(const permissao of ['gerenciar_listas','consultar_listas'])assert.equal(destinoGestao({acessos:[{permissoes:[permissao]}]}),'admin/listas.html');
 assert.equal(destinoGestao({acessos:[{administrador:true}]}),'admin/convites.html');
 assert.equal(destinoGestao({acessos:[],user_metadata:{administradorSistema:true}}),null);
});

test('logout and account switches invalidate pending permission checks; failure stays hidden',async()=>{
 const elemento={hidden:true,removeAttribute(){delete this.href;}};
 const pendentes=[];let leituras=0;
 const atualizar=criarAtalhoGestao({elemento,carregarContexto:()=>{leituras++;return new Promise((resolve,reject)=>pendentes.push({resolve,reject}));}});
 await atualizar(null);assert.equal(leituras,0);
 const antiga=atualizar({id:'a'});await atualizar(null);
 pendentes.shift().resolve({administradorSistema:true});await antiga;assert.equal(elemento.hidden,true);assert.equal(elemento.href,undefined);
 const a=atualizar({id:'a'}),b=atualizar({id:'b'});
 pendentes[1].resolve({acessos:[]});await b;pendentes[0].resolve({administradorSistema:true});await a;
 assert.equal(elemento.hidden,true);
 pendentes.length=0;const falha=atualizar({id:'b'});pendentes.shift().reject(Error('offline'));await falha;assert.equal(elemento.hidden,true);
 const permitido=atualizar({id:'a'});pendentes.shift().resolve({administradorSistema:true});await permitido;assert.equal(elemento.hidden,false);assert.equal(elemento.href,'admin/gestao.html');
 const revogado=atualizar({id:'a'});assert.equal(elemento.hidden,true);pendentes.shift().resolve({acessos:[]});await revogado;assert.equal(elemento.href,undefined);
});
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
