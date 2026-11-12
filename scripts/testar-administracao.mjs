import {PGlite} from '@electric-sql/pglite';
import fs from 'node:fs';
import {test,before,after,beforeEach,afterEach} from 'node:test';
import assert from 'node:assert/strict';

const db = new PGlite();
const id = n => '00000000-0000-0000-0000-'+String(n).padStart(12,'0');
const key = n => id(1000+n);
const event=id(301), other=id(302), version=id(401);
const content={id:'evt-test',slug:'evento-test',marcaId:'mrc-a',localId:'loc-a',
 titulo:'Evento original',data:'2026-11-13',horario:'22:00',dataTermino:'2026-11-14',horarioTermino:'02:00',
 ativo:true,terminoEstimado:true,lineup:{bandas:['Trio'],djs:[]},ingresso:{link:'em breve',precoAPartirDe:0}};
const draft={...content,titulo:'Novo titulo',terminoEstimado:false};
async function as(user,role='authenticated') {
 await db.exec('reset role');
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user ? id(user) : '']);
 await db.exec('set role '+role);
}
async function denied(sql,args,pattern) {
 await db.exec('savepoint expected_error');
 try { await assert.rejects(db.query(sql,args),pattern); }
 finally { await db.exec('rollback to savepoint expected_error; release savepoint expected_error'); }
}
async function save(user=2,revision=0,k=1,c=draft,e=event) {
 await as(user);
 return (await db.query('select public.salvar_rascunho_evento($1,$2,$3,$4) result',[e,c,revision,key(k)])).rows[0].result;
}
async function publish(user=3,revision=1,k=2,e=event) {
 await as(user);
 return (await db.query('select public.publicar_evento($1,$2,$3) result',[e,revision,key(k)])).rows[0].result;
}
before(async()=>{
 await db.exec(`
 create role anon;
 create role authenticated;
 create schema auth;
 create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as
 'select nullif(current_setting(''request.jwt.claim.sub'',true),'''')::uuid';
 grant usage on schema auth to anon,authenticated;
 grant execute on function auth.uid() to anon,authenticated;
 alter default privileges in schema public grant all on tables to anon,authenticated;
 alter default privileges in schema public grant execute on functions to anon,authenticated;
 create table public.perfis(id uuid primary key);
 create table public.interacoes(id text primary key);
 create table public.ingressos(id text primary key);
 insert into public.perfis values ('${id(999)}');
 insert into public.interacoes values ('favorite-preserved');
 insert into public.ingressos values ('ticket-preserved');
 `);
 // The production migrations from September/October modify existing Auth/profile
 // setup. This isolated fixture tests the exact catalog history and pending admin DDL.
 const migrations=new URL('../supabase/migrations/',import.meta.url);
 for(const name of fs.readdirSync(migrations).filter(n=>n.endsWith('.sql') && n >= '20261111000000').sort()) {
   try { await db.exec(fs.readFileSync(new URL(name,migrations),'utf8')); }
   catch(e) { throw Error(name+': '+e.message); }
 }
 await db.query('insert into auth.users select x::uuid from unnest($1::text[]) x',[[1,2,3,4,5,6,7,8].map(id)]);
 await db.query("insert into public.locais(id,id_legado,slug,nome) values($1,'loc-a','local-a','Local A')",[id(201)]);
 await db.query("insert into public.marcas(id,id_legado,slug,nome,local_padrao_id) values($1,'mrc-a','marca-a','Marca A',$3),($2,'mrc-b','marca-b','Marca B',$3)",[id(101),id(102),id(201)]);
 await db.query("insert into public.eventos(id,id_legado,slug,marca_id,local_id) values($1,'evt-test','evento-test',$3,$5),($2,'evt-other','evento-other',$4,$5)",[event,other,id(101),id(102),id(201)]);
 await db.query("insert into public.versoes_evento(id,evento_id,numero,conteudo) values($1,$2,1,$3)",[version,event,content]);
 await db.query("update public.eventos set versao_publicada_id=$1,estado_publicacao='publicado' where id=$2",[version,event]);
 await db.query("insert into public.membros_marca(id,marca_id,usuario_id,papel) values($1,$2,$3,'administrador'),($4,$2,$5,'equipe'),($6,$2,$7,'equipe'),($8,$9,$10,'administrador'),($11,$2,$12,'equipe')",
   [id(501),id(101),id(1),id(502),id(2),id(503),id(3),id(505),id(102),id(5),id(508),id(8)]);
 await db.query("insert into public.permissoes_membro values($1,'gerenciar_eventos'),($2,'publicar_eventos'),($3,'consultar_listas')",[id(502),id(503),id(508)]);
 await db.query("insert into public.administradores_sistema values($1,true)",[id(6)]);
});
beforeEach(async()=>{await db.exec('reset role; begin');});
afterEach(async()=>{await db.exec('rollback; reset role');});
after(async()=>{await db.close();});

test('anonymous has no administrative RPCs, drafts or membership access',async()=>{
 await as(null,'anon');
 await denied('select public.salvar_rascunho_evento($1,$2,0,$3)',[event,draft,key(1)],/permission denied/i);
 await denied('select * from public.rascunhos_evento',[],/permission denied/i);
 await denied('select * from public.membros_marca',[],/permission denied/i);
 assert.equal((await db.query('select count(*)::int n from public.eventos')).rows[0].n,1);
});
test('permissions isolate brands, editing, publishing and list-only membership',async()=>{
 await as(5);
 await denied('select public.salvar_rascunho_evento($1,$2,0,$3)',[event,draft,key(1)],/sem_permissao/);
 await as(3);
 await denied('select public.salvar_rascunho_evento($1,$2,0,$3)',[event,draft,key(2)],/sem_permissao/);
 await as(2);
 await denied('select public.publicar_evento($1,1,$2)',[event,key(3)],/sem_permissao/);
 await as(8);
 await denied('select public.salvar_rascunho_evento($1,$2,0,$3)',[event,draft,key(4)],/sem_permissao/);
});
test('draft CAS prevents lost updates and does not change the public version',async()=>{
 const first=await save();
 assert.equal(first.revisao,1);
 await denied('select public.salvar_rascunho_evento($1,$2,0,$3)',[event,{...draft,titulo:'Stale'},key(2)],/conflito_revisao/);
 await as(null,'anon');
 assert.equal((await db.query('select conteudo->>\'titulo\' titulo from public.versoes_evento')).rows[0].titulo,content.titulo);
 await as(5);
 assert.equal((await db.query('select count(*)::int n from public.rascunhos_evento')).rows[0].n,0);
});
test('request replay returns the same result without audit duplication',async()=>{
 const first=await save();
 assert.deepEqual(await save(),first);
 await denied('select public.salvar_rascunho_evento($1,$2,0,$3)',[event,{...draft,titulo:'Changed'},key(1)],/chave_idempotencia_reutilizada/);
 await db.exec('reset role');
 assert.equal((await db.query("select count(*)::int n from public.auditoria_administrativa")).rows[0].n,1);
});
test('publisher can publish but cannot edit; publication is versioned and audited with outbox',async()=>{
 await save();
 const published=await publish();
 assert.equal(published.numero,2);assert.equal(published.revisao,2);
 assert.deepEqual(await publish(),published);
 await as(null,'anon');
 const rows=(await db.query('select numero,conteudo,situacao from public.versoes_evento')).rows;
 assert.equal(rows.length,1);assert.equal(rows[0].numero,2);
 assert.equal(rows[0].conteudo.id,'evt-test');
 assert.equal(rows[0].conteudo.titulo,'Novo titulo');
 await db.exec('reset role');
 assert.equal((await db.query('select count(*)::int n from public.versoes_evento')).rows[0].n,2);
 assert.equal((await db.query('select count(*)::int n from app_private.outbox_publicacoes')).rows[0].n,1);
 assert.equal((await db.query("select count(*)::int n from public.auditoria_administrativa where acao='publicar_evento'")).rows[0].n,1);
});
test('publication requires confirmed explicit end times and rejects public metadata injection',async()=>{
 for (const [i,bad] of [{...draft,horarioTermino:null},{...draft,terminoEstimado:true},
   {...draft,dataTermino:'2026-11-13',horarioTermino:'21:00'},{...draft,situacao:'confirmado'},
   {...draft,id:'evt-stolen'},{...draft,ingresso:{link:'javascript:alert(1)'}}].entries()) {
  await save(2,i,10+i,bad);
  await as(3);
  await denied('select public.publicar_evento($1,$2,$3)',[event,i+1,key(30+i)],
    /inicio_e_termino|confirme_horario|termino_anterior|campo_nao_publicavel|identidade_imutavel|link_ingresso/);
 }
 await db.exec('reset role');
 assert.equal((await db.query('select count(*)::int n from public.versoes_evento')).rows[0].n,1);
 assert.equal((await db.query('select count(*)::int n from app_private.outbox_publicacoes')).rows[0].n,0);
});
test('stale publication revision fails and revision never resets after publication',async()=>{
 await save();
 await publish();
 await as(2);
 await denied('select public.salvar_rascunho_evento($1,$2,1,$3)',[event,draft,key(8)],/conflito_revisao/);
 const next=await save(2,2,9,{...draft,titulo:'Next draft'});
 assert.equal(next.revisao,3);
 await as(3);
 await denied('select public.publicar_evento($1,2,$2)',[event,key(10)],/conflito_revisao/);
});
test('operational status creates a new published version and survives republication',async()=>{
 await save();
 await as(3);
 const params=[event,'cancelado',version,key(7)];
 const change=(await db.query('select public.alterar_situacao_evento($1,$2,$3,$4) r',params)).rows[0].r;
 assert.deepEqual((await db.query('select public.alterar_situacao_evento($1,$2,$3,$4) r',params)).rows[0].r,change);
 await denied('select public.alterar_situacao_evento($1,$2,$3,$4)',[event,'adiado',version,key(8)],/conflito_versao/);
 await publish(3,1,9);
 await as(null,'anon');
 assert.equal((await db.query('select situacao from public.versoes_evento')).rows[0].situacao,'cancelado');
});
test('last active brand administrator cannot be removed, including by global admin',async()=>{
 for(const user of [1,6]) {
  await as(user);
  await denied('select public.alterar_membro_marca($1,$2,$3,$4,$5)',[id(501),'equipe',true,[],key(user)],/ultimo_administrador_ativo/);
 }
 await db.exec('reset role');
 await db.query("insert into public.membros_marca(id,marca_id,usuario_id,papel) values($1,$2,$3,'administrador')",[id(507),id(101),id(7)]);
 await as(1);
 await db.query('select public.alterar_membro_marca($1,$2,$3,$4,$5)',[id(507),'equipe',true,[],key(20)]);
 await denied('select public.alterar_membro_marca($1,$2,$3,$4,$5)',[id(501),'administrador',false,[],key(21)],/ultimo_administrador_ativo/);
});
test('revoked permission is revalidated even for a previously successful request',async()=>{
 await save();
 await db.exec('reset role');
 await db.query('delete from public.permissoes_membro where membro_id=$1',[id(502)]);
 await as(2);
 await denied('select public.salvar_rascunho_evento($1,$2,0,$3)',[event,draft,key(1)],/sem_permissao/);
});
test('user_metadata cannot grant roles, tables cannot be written directly, private helpers are inaccessible',async()=>{
 await as(4);
 await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({user_metadata:{admin:true,papel:'administrador'}})]);
 await denied('select public.publicar_evento($1,1,$2)',[event,key(1)],/sem_permissao/);
 await denied("update public.membros_marca set papel='administrador'",[],/permission denied/i);
 await denied('select app_private.registrar_operacao($1,$2,$3,$4)',[key(1),'hack',{},{}],/permission denied/i);
 await denied('select * from app_private.outbox_publicacoes',[],/permission denied/i);
 await db.exec('reset role');
 assert.equal((await db.query('select count(*)::int n from public.perfis')).rows[0].n,1);
 assert.equal((await db.query('select count(*)::int n from public.interacoes')).rows[0].n,1);
 assert.equal((await db.query('select count(*)::int n from public.ingressos')).rows[0].n,1);
});
test('public administrative functions use invoker; no definer function is exposed to anon',async()=>{
 await db.exec('reset role');
 const exposed=(await db.query("select proname,prosecdef from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and proname in ('publicar_evento','salvar_rascunho_evento','alterar_situacao_evento','alterar_membro_marca')")).rows;
 assert.equal(exposed.length,4);assert.ok(exposed.every(p=>!p.prosecdef));
 const anonymous=(await db.query("select count(*)::int n from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='app_private' and has_function_privilege('anon',p.oid,'EXECUTE')")).rows[0].n;
 assert.equal(anonymous,0);
});

test('draft reading is allowed to editors/publishers and denied to other brands/list viewers',async()=>{
 await save();
 for(const [user,count] of [[2,1],[3,1],[4,0],[5,0],[8,0]]) {
  await as(user);
  assert.equal((await db.query('select count(*)::int n from public.rascunhos_evento')).rows[0].n,count);
 }
});
test('global administrator can intervene through the same audited operations',async()=>{
 await save(6);
 const result=await publish(6);
 assert.equal(result.numero,2);
 await db.exec('reset role');
 assert.equal((await db.query("select count(*)::int n from public.auditoria_administrativa where autor_id=$1",[id(6)])).rows[0].n,2);
});
test('inactive venue blocks publication atomically',async()=>{
 await save();
 await db.exec('reset role');
 await db.query('update public.locais set ativo=false where id=$1',[id(201)]);
 await as(3);
 await denied('select public.publicar_evento($1,1,$2)',[event,key(2)],/marca_ou_local_inativo/);
 await db.exec('reset role');
 assert.equal((await db.query('select count(*)::int n from public.versoes_evento')).rows[0].n,1);
 assert.equal((await db.query('select count(*)::int n from app_private.outbox_publicacoes')).rows[0].n,0);
});
test('invalid member permissions roll back; valid changes audit both previous and new permissions',async()=>{
 await as(1);
 await denied('select public.alterar_membro_marca($1,$2,$3,$4,$5)',[id(502),'equipe',true,['invalid'],key(1)],/check constraint/);
 assert.deepEqual((await db.query('select permissao from public.permissoes_membro where membro_id=$1',[id(502)])).rows.map(r=>r.permissao),['gerenciar_eventos']);
 await db.query('select public.alterar_membro_marca($1,$2,$3,$4,$5)',[id(502),'equipe',true,['publicar_eventos'],key(2)]);
 const audit=(await db.query("select antes,depois from public.auditoria_administrativa where acao='alterar_membro'")).rows[0];
 assert.deepEqual(audit.antes.permissoes,['gerenciar_eventos']);
 assert.deepEqual(audit.depois.permissoes,['publicar_eventos']);
 await as(2);
 await denied('select public.salvar_rascunho_evento($1,$2,0,$3)',[event,draft,key(3)],/sem_permissao/);
});
