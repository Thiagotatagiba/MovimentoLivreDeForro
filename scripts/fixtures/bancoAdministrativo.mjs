import {PGlite} from '@electric-sql/pglite';
import fs from 'node:fs';
export const id = n => '00000000-0000-0000-0000-'+String(n).padStart(12,'0');
export const conteudoInicial={id:'evt-test',slug:'evento-test',marcaId:'mrc-a',localId:'loc-a',
 titulo:'Evento original',data:'2026-11-13',horario:'22:00',dataTermino:'2026-11-14',horarioTermino:'02:00',
 ativo:true,terminoEstimado:true,lineup:{bandas:['Trio'],djs:[]},ingresso:{link:'em breve',precoAPartirDe:0}};
const event=id(301),other=id(302),version=id(401);
export async function criarBancoAdministrativo() {
 const db=new PGlite();
 const content=conteudoInicial;

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
 const migrations=new URL('../../supabase/migrations/',import.meta.url);
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

 return db;
}
