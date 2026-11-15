import {test} from 'node:test';import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';import fs from 'node:fs';
const migration=fs.readFileSync(new URL('../supabase/migrations/20261115172032_restringir_execucao_auto_rls.sql',import.meta.url),'utf8');
test('auto-RLS permission hardening preserves the platform trigger and automatic RLS',async()=>{
 const db=new PGlite();try{
  await db.exec(`create role anon;create role authenticated;
   create function public.rls_auto_enable() returns event_trigger language plpgsql security definer set search_path='pg_catalog' as $$
   declare cmd record;begin for cmd in select * from pg_event_trigger_ddl_commands() where command_tag='CREATE TABLE' and schema_name='public' loop
    execute format('alter table %s enable row level security',cmd.object_identity);end loop;end $$;
   create event trigger ensure_rls on ddl_command_end execute function public.rls_auto_enable();
   grant execute on function public.rls_auto_enable() to public,anon,authenticated;`);
  await db.exec(migration);await db.exec(migration);
  for(const role of ['anon','authenticated'])assert.equal((await db.query("select has_function_privilege($1,'public.rls_auto_enable()','EXECUTE') allowed",[role])).rows[0].allowed,false);
  await db.exec('create table public.qa_auto_rls(id integer)');
  assert.equal((await db.query("select relrowsecurity from pg_class where oid='public.qa_auto_rls'::regclass")).rows[0].relrowsecurity,true);
  assert.equal((await db.query("select evtenabled from pg_event_trigger where evtname='ensure_rls'")).rows[0].evtenabled,'O');
 }finally{await db.close();}
});
test('hardening tolerates an absent platform helper and rejects a conflicting ordinary RPC',async()=>{
 const db=new PGlite();try{
  await db.exec('create role anon;create role authenticated;');await db.exec(migration);
  await db.exec('create function public.rls_auto_enable() returns text language sql as $$select \'unexpected\'::text$$;');
  await assert.rejects(db.exec(migration),/funcao_auto_rls_inesperada/);
 }finally{await db.close();}
});
