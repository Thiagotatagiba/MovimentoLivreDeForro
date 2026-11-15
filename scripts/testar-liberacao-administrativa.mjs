import {test,before,after,beforeEach,afterEach} from 'node:test';import assert from 'node:assert/strict';
import {criarBancoAdministrativo,id} from './fixtures/bancoAdministrativo.mjs';
import fs from 'node:fs';
import {manifestoAdministrativo,sqlBootstrap,sqlPosflight,sqlPreservacao,sqlPreflight,historicoProducao} from './lib/liberacaoAdministrativa.mjs';
let db,migrations;const email='administrador@fixture.invalid',key=id(9501);
async function upgrade(){for(const m of migrations)await db.exec(m.sql);}
async function rejects(sql,pattern){await db.exec('savepoint expected');try{await assert.rejects(db.exec(sql),pattern);}finally{await db.exec('rollback to savepoint expected;release savepoint expected');}}
before(async()=>{db=await criarBancoAdministrativo({semAdministracao:true});migrations=await manifestoAdministrativo();
 await db.exec('create schema supabase_migrations;create table supabase_migrations.schema_migrations(version text primary key)');
 await db.query('insert into supabase_migrations.schema_migrations select unnest($1::text[])',[historicoProducao]);
 await db.query('update auth.users set email=$1,email_confirmed_at=now() where id=$2',[email,id(4)]);
});
beforeEach(async()=>{await db.exec('begin');});afterEach(async()=>{await db.exec('rollback');});after(async()=>{await db.close();});
test('release rehearsal applies seven exact migrations and bootstrap without changing existing user/catalog rows',async()=>{
 const before=(await db.query(sqlPreservacao)).rows[0];await upgrade();
 assert.deepEqual((await db.query(sqlPreservacao)).rows[0],before);
 // Bootstrap contains its own transaction: omit only framing inside this test's transaction.
 const bootstrap=sqlBootstrap(email,key).replace('\nbegin;','').replace('\ncommit;','');
 await db.exec(bootstrap);await db.exec(bootstrap);
 const post=(await db.query(sqlPosflight)).rows[0];assert.deepEqual(post.seguranca,{administradores_ativos:1,anon_le_inscricoes:false,funcoes_privadas_anon:0,wrappers_definer:0,tabelas_sem_rls:0});assert.deepEqual(post.preservacao,before.preservacao);
 const admin=(await db.query('select usuario_id from public.administradores_sistema')).rows;assert.deepEqual(admin,[{usuario_id:id(4)}]);
 assert.equal((await db.query("select count(*)::int n from app_private.operacoes_administrativas where operacao='bootstrap_admin_sistema'")).rows[0].n,1);
 assert.deepEqual((await db.query(sqlPreservacao)).rows[0],before);
});
test('bootstrap refuses unconfirmed accounts, existing administrators and replay after revocation',async()=>{
 await upgrade();const bootstrap=sqlBootstrap(email,key).replace('\nbegin;','').replace('\ncommit;','');
 await db.query('update auth.users set email_confirmed_at=null where id=$1',[id(4)]);await rejects(bootstrap,/conta_inicial_nao_confirmada/);
 assert.equal((await db.query('select count(*)::int n from public.administradores_sistema')).rows[0].n,0);
 await db.query('update auth.users set email_confirmed_at=now() where id=$1',[id(4)]);await db.exec(bootstrap);
 await rejects(sqlBootstrap('other@fixture.invalid',id(9502)).replace('\nbegin;','').replace('\ncommit;',''),/conta_inicial_nao_confirmada/);
 await rejects(sqlBootstrap(email,id(9502)).replace('\nbegin;','').replace('\ncommit;',''),/bootstrap_inicial_ja_executado/);
 await db.exec('update public.administradores_sistema set ativo=false');await rejects(bootstrap,/bootstrap_estado_alterado/);
 assert.equal((await db.query('select ativo from public.administradores_sistema')).rows[0].ativo,false);
});
test('production preflight rejects a nonproduction catalog and changed migration history before installing anything',async()=>{
 await rejects(sqlPreflight(email),/catalogo_producao_divergente/);
 assert.equal((await db.query("select to_regnamespace('app_private') result")).rows[0].result,null);
 await db.exec("insert into supabase_migrations.schema_migrations values('99999999999999')");await rejects(sqlPreflight(email),/historico_producao_divergente/);
 assert.throws(()=>sqlBootstrap('email\nmalformado',key),/e-mail válido/);assert.throws(()=>sqlBootstrap(email,"';drop table auth.users;--"),/Chave/);
});
test('rollback pause disables new RPCs while preserving catalog access and all existing records',async()=>{
 await upgrade();const before=(await db.query(sqlPreservacao)).rows[0];
 const pause=fs.readFileSync(new URL('../supabase/liberacao/pausar_administracao.sql',import.meta.url),'utf8').replace('\nbegin;','').replace('\ncommit;','');
 await db.exec(pause);assert.deepEqual((await db.query(sqlPreservacao)).rows[0],before);
 assert.equal((await db.query("select has_function_privilege('authenticated','public.publicar_evento(uuid,bigint,uuid)','EXECUTE') allowed")).rows[0].allowed,false);
 assert.equal((await db.query("select has_function_privilege('service_role','public.reservar_entrega_convite()','EXECUTE') allowed")).rows[0].allowed,false);
 await db.exec('set local role anon');assert.equal((await db.query('select count(*)::int n from public.eventos')).rows[0].n,1);await db.exec('reset role');
});
