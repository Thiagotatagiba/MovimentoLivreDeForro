import {test,before,after,beforeEach,afterEach} from 'node:test';import assert from 'node:assert/strict';
import {criarBancoAdministrativo,id} from './fixtures/bancoAdministrativo.mjs';
let db;
const local=()=>({nome:'Espaço fictício novo',endereco:{logradouro:'Rua de teste',numero:'10',bairro:'Centro',cidade:'Vitória',estado:'ES'},latitude:-20.3,longitude:-40.3,tipo:'Espaço cultural'});
const marca=()=>({nome:'Marca fictícia nova',localPadraoId:id(201),categorias:['Baile'],diasSemana:['sábado'],instagram:'https://instagram.com/teste'});
async function as(n=6,role='authenticated'){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[n?id(n):'']);await db.exec('set role '+role);}
async function owner(sql,args=[]){await db.exec('reset role');return db.query(sql,args);}
async function call(tipo,c,key=id(9901)){return(await db.query('select public.criar_'+tipo+'_catalogo($1,$2) result',[c,key])).rows[0].result;}
async function denied(fn,re){await db.exec('savepoint expected');try{await assert.rejects(fn,re);}finally{await db.exec('rollback to savepoint expected;release savepoint expected');}}
before(async()=>{db=await criarBancoAdministrativo();});beforeEach(async()=>{await db.exec('reset role;begin');await as();});afterEach(async()=>{await db.exec('rollback;reset role');});after(async()=>{await db.close();});
test('only global can create official venues and brands, regardless of forged metadata',async()=>{
 for(const n of [1,2,3,4,5,8]){await as(n);await denied(()=>call('local',local()),/somente_administrador_global/);await denied(()=>call('marca',marca()),/somente_administrador_global/);}
 await as(null,'anon');await denied(()=>call('local',local()),/permission denied/);
});
test('creation generates compatible identities and audit without granting team access or creating events',async()=>{
 const l=await call('local',local());const m=await call('marca',{...marca(),localPadraoId:l.id},id(9902));
 assert.match(l.id_legado,/^loc-[\da-f-]{36}$/);assert.match(m.id_legado,/^mrc-[\da-f-]{36}$/);assert.match(m.slug,/^marca-ficticia-nova-/);
 const row=(await owner('select local_padrao_id from public.marcas where id=$1',[m.id])).rows[0];assert.equal(row.local_padrao_id,l.id);
 assert.equal((await owner('select count(*)::int n from public.auditoria_catalogo')).rows[0].n,2);
 assert.equal((await owner('select count(*)::int n from public.membros_marca')).rows[0].n,5);
 assert.equal((await owner('select count(*)::int n from public.eventos')).rows[0].n,2);
 await as(null,'anon');assert.equal((await db.query('select nome from public.marcas where id=$1',[m.id])).rows[0].nome,marca().nome);
 await denied(()=>db.query('select * from public.auditoria_catalogo'),/permission denied/);
});
test('request replay is identical, different data conflicts, other keys cannot duplicate a brand or venue',async()=>{
 const first=await call('local',local());assert.deepEqual(await call('local',local()),first);
 await denied(()=>call('local',{...local(),nome:'Outro'}),/chave_idempotencia_reutilizada/);
 await denied(()=>call('local',local(),id(9902)),/cadastro_ja_existe/);
 await call('marca',marca(),id(9902));await denied(()=>call('marca',marca(),id(9903)),/cadastro_ja_existe/);
});
test('revoking global access blocks a previously successful replay',async()=>{
 await call('marca',marca());await owner('update public.administradores_sistema set ativo=false where usuario_id=$1',[id(6)]);await as();
 await denied(()=>call('marca',marca()),/somente_administrador_global/);
});
test('server rejects injected identities, permissions, unsafe links and malformed address/pin',async()=>{
 for(const patch of [{id:'fake'},{slug:'fake'},{ativo:false},{usuario_id:id(1)},{site:'http://example.com'},{logo:'https://user:pass@example.com/x'},{categorias:{}},{diasSemana:[1]},{nome:''}])
  await denied(()=>call('marca',{...marca(),...patch}),/campo_nao_editavel|url_https|lista_invalida|nome_obrigatorio/);
 for(const patch of [{latitude:null},{longitude:181},{endereco:{}},{endereco:{...local().endereco,estado:'Espirito Santo'}},{endereco:{...local().endereco,autor:'fake'}}])
  await denied(()=>call('local',{...local(),...patch}),/confirme_ponto|ponto_invalido|endereco_/);
});
test('inactive default venue rejected; itinerant brand allowed; direct writes and audit leaks denied',async()=>{
 await owner('update public.locais set ativo=false where id=$1',[id(201)]);await as();await denied(()=>call('marca',marca()),/local_padrao_indisponivel/);
 const c=marca();delete c.localPadraoId;await call('marca',c);
 await denied(()=>db.query("insert into public.marcas(nome,slug) values('direto','direto')"),/permission denied/);
 await as(1);assert.deepEqual((await db.query('select * from public.auditoria_catalogo')).rows,[]);
});
test('audit failure rolls back entity and idempotency; existing identities remain unchanged',async()=>{
 await owner("create function public.fail_catalog_audit() returns trigger language plpgsql as $$begin raise exception 'audit_failed';end$$");
 await owner('create trigger fail_audit before insert on public.auditoria_catalogo for each row execute function public.fail_catalog_audit()');await as();
 await denied(()=>call('local',local()),/audit_failed/);
 const result=await owner('select (select count(*) from public.locais)::int locais,(select count(*) from app_private.operacoes_administrativas)::int operacoes');assert.deepEqual(result.rows[0],{locais:1,operacoes:0});
 assert.equal((await owner('select id_legado from public.marcas where id=$1',[id(101)])).rows[0].id_legado,'mrc-a');
});

const edit=async(tipo,entity,rev,patch,key=id(9951))=>(await db.query('select public.editar_'+tipo+'_catalogo($1,$2,$3,$4) result',[entity,rev,patch,key])).rows[0].result;
test('global loads active/inactive records; other accounts cannot read the management snapshot',async()=>{
 await owner('update public.locais set ativo=false where id=$1',[id(201)]);await as();
 const all=(await db.query('select public.consultar_cadastros_catalogo() result')).rows[0].result;
 assert.equal(all.locais[0].ativo,false);assert.equal(all.locais[0].tem_publicacao,true);assert.equal(all.marcas[0].revisao,1);
 await as(1);await denied(()=>db.query('select public.consultar_cadastros_catalogo()'),/somente_administrador_global/);
 await as(null,'anon');await denied(()=>db.query('select public.consultar_cadastros_catalogo()'),/permission denied/);
});
test('edits preserve brand ID/slug and opaque legacy assets; stale revision cannot overwrite',async()=>{
 await owner("update public.marcas set dados='{\"logo\":\"assets/marcas/antiga.webp\",\"desconhecido\":\"preservado\"}' where id=$1",[id(101)]);await as();
 const first=await edit('marca',id(101),1,{nome:'Nome corrigido',descricao:'Nova descrição'});
 assert.equal(first.registro.id_legado,'mrc-a');assert.equal(first.registro.slug,'marca-a');assert.equal(first.registro.revisao,2);assert.equal(first.registro.dados.logo,'assets/marcas/antiga.webp');assert.equal(first.registro.dados.desconhecido,'preservado');
 assert.deepEqual(await edit('marca',id(101),1,{nome:'Nome corrigido',descricao:'Nova descrição'}),first);
 await denied(()=>edit('marca',id(101),1,{nome:'Sobrescrever'},id(9952)),/conflito_revisao/);
});
test('editing address referenced by a published version forks a venue and preserves event/default references',async()=>{
 const change={endereco:local().endereco,latitude:-20.4,longitude:-40.4};const result=await edit('local',id(201),1,change);
 assert.equal(result.novo_endereco,true);assert.notEqual(result.id,id(201));assert.equal(result.registro.revisao,1);assert.equal(result.anterior_revisao,2);
 const old=(await owner('select * from public.locais where id=$1',[id(201)])).rows[0];assert.deepEqual(old.endereco,{});assert.equal(old.id_legado,'loc-a');assert.equal(old.slug,'local-a');assert.equal(old.ativo,true);
 const refs=(await owner('select (select local_id from public.eventos where id=$1) evento,(select local_padrao_id from public.marcas where id=$2) marca',[id(301),id(101)])).rows[0];assert.deepEqual(refs,{evento:id(201),marca:id(201)});
 await as();assert.deepEqual(await edit('local',id(201),1,change),result);await denied(()=>edit('local',id(201),1,{descricao:'stale'},id(9952)),/conflito_revisao/);
});
test('unpublished venue edits in place; published venue contact edits also keep its identity',async()=>{
 const created=await call('local',local());const modified=await edit('local',created.id,1,{endereco:{...local().endereco,numero:'11'}});
 assert.equal(modified.novo_endereco,false);assert.equal(modified.id,created.id);assert.equal(modified.registro.endereco.numero,'11');
 const contact=await edit('local',id(201),1,{telefone:'27999999999'},id(9952));assert.equal(contact.id,id(201));assert.equal(contact.novo_endereco,false);assert.equal(contact.registro.dados.telefone,'27999999999');
});
test('non-global, injected identities, malformed fields and replay after revocation are refused',async()=>{
 await as(1);await denied(()=>edit('marca',id(101),1,{nome:'Xyz'}),/somente_administrador_global/);await as();
 for(const patch of [{slug:'fake'},{id_legado:'fake'},{revisao:100},{ativo:'false'},{site:'http://example.com'},{nome:''},{categorias:{}},{localPadraoId:id(999)}])await denied(()=>edit('marca',id(101),1,patch),/campo_nao_editavel|ativo_invalido|url_https|nome_obrigatorio|lista_invalida|local_padrao_indisponivel/);
 await edit('marca',id(101),1,{descricao:'OK'});await owner('update public.administradores_sistema set ativo=false where usuario_id=$1',[id(6)]);await as();await denied(()=>edit('marca',id(101),1,{descricao:'OK'}),/somente_administrador_global/);
});
test('audit failure rolls back an edit, revision and idempotency',async()=>{
 await owner("create function public.fail_edit_audit() returns trigger language plpgsql as $$begin raise exception 'audit_failed';end$$");await owner('create trigger fail_edit before insert on public.auditoria_catalogo for each row execute function public.fail_edit_audit()');await as();
 await denied(()=>edit('marca',id(101),1,{nome:'Alterado'}),/audit_failed/);const row=(await owner('select nome,revisao from public.marcas where id=$1',[id(101)])).rows[0];assert.deepEqual(row,{nome:'Marca A',revisao:1});
});

test('deactivation and reactivation preserve records while public visibility follows existing rules',async()=>{
 await edit('marca',id(101),1,{ativo:false});await as(null,'anon');assert.deepEqual((await db.query('select id from public.marcas where id=$1',[id(101)])).rows,[]);
 await as();await edit('marca',id(101),2,{ativo:true},id(9952));await edit('local',id(201),1,{ativo:false},id(9953));await as(null,'anon');assert.deepEqual((await db.query('select id from public.locais where id=$1',[id(201)])).rows,[]);
 await as();const reactivated=await edit('local',id(201),2,{ativo:true},id(9954));assert.equal(reactivated.id,id(201));assert.equal(reactivated.registro.revisao,3);
});
