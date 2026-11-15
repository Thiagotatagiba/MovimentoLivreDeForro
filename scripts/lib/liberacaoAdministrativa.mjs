import fs from 'node:fs/promises';import {createHash} from 'node:crypto';
export const historicoProducao=['20260929205228','20260929205247','20261015113927','20261111220010','20261111220300','20261111220330','20261111220535'];
export const migracoesAdministrativas=[
 '20261112000155_governanca_rascunhos_publicacao.sql',
 '20261113214349_conflitos_administrativos_http409.sql',
 '20261114220518_convites_equipe_verificados.sql',
 '20261114223502_fila_entrega_convites.sql',
 '20261115114508_listas_vip_configuracao.sql',
 '20261115115907_listas_vip_inscricoes.sql',
 '20261115172032_restringir_execucao_auto_rls.sql',
];
export const normalizarSql=s=>s.replace(/^\uFEFF/,'').replace(/\r\n/g,'\n');
export async function manifestoAdministrativo(root=new URL('../../',import.meta.url)){
 return Promise.all(migracoesAdministrativas.map(async arquivo=>{const sql=normalizarSql(await fs.readFile(new URL('supabase/migrations/'+arquivo,root),'utf8'));
  return {arquivo,nome:arquivo.slice(15,-4),sha256:createHash('sha256').update(sql).digest('hex'),md5:createHash('md5').update(sql).digest('hex'),sql};}));
}
function emailSql(email){if(typeof email!=='string'||email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||/[\x00-\x1f\x7f]/.test(email))throw Error('Informe e-mail válido somente no ambiente local.');return "'"+email.toLowerCase().replace(/'/g,"''")+"'";}
export const sqlPreservacao=`select jsonb_object_agg(tabela,jsonb_build_object('registros',registros,'assinatura',assinatura)) preservacao from (
 select 'perfis' tabela,count(*) registros,md5(coalesce(string_agg(to_jsonb(t)::text,'' order by id),'')) assinatura from public.perfis t
 union all select 'interacoes',count(*),md5(coalesce(string_agg(to_jsonb(t)::text,'' order by id),'')) from public.interacoes t
 union all select 'ingressos',count(*),md5(coalesce(string_agg(to_jsonb(t)::text,'' order by id),'')) from public.ingressos t
 union all select 'eventos',count(*),md5(coalesce(string_agg(to_jsonb(t)::text,'' order by id),'')) from public.eventos t
 union all select 'versoes_evento',count(*),md5(coalesce(string_agg(to_jsonb(t)::text,'' order by id),'')) from public.versoes_evento t
) q;`;
export function sqlPreflight(email){const emailLiteral=emailSql(email);return `-- Read-only. Abort on any unexpected release baseline.
do $vtf_preflight$ begin
 if (select array_agg(version::text order by version) from supabase_migrations.schema_migrations) is distinct from array[${historicoProducao.map(v=>"'"+v+"'").join(',')}]::text[] then raise exception 'historico_producao_divergente'; end if;
 if to_regnamespace('app_private') is not null or to_regclass('public.administradores_sistema') is not null then raise exception 'administracao_ja_instalada'; end if;
 if (select count(*) from auth.users where lower(email)=${emailLiteral} and email_confirmed_at is not null and not coalesce(is_anonymous,false))<>1 then raise exception 'conta_inicial_nao_confirmada'; end if;
 if (select count(*) from public.marcas)<>15 or (select count(*) from public.locais)<>16 or (select count(*) from public.eventos)<>24 or (select count(*) from public.versoes_evento)<>24 then raise exception 'catalogo_producao_divergente'; end if;
end $vtf_preflight$;
${sqlPreservacao}`;}
export function sqlBootstrap(email,chave){const emailLiteral=emailSql(email);
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(chave??''))throw Error('Chave de bootstrap inválida.');
 return `-- Owner-only bootstrap of the specifically authorized, confirmed account.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
do $vtf_bootstrap$
declare usuario uuid; quantidade integer; anterior app_private.operacoes_administrativas;
begin
 select count(*) into quantidade from auth.users where lower(email)=${emailLiteral} and email_confirmed_at is not null and not coalesce(is_anonymous,false);
 if quantidade<>1 then raise exception 'conta_inicial_nao_confirmada'; end if;
 select id into usuario from auth.users where lower(email)=${emailLiteral} and email_confirmed_at is not null and not coalesce(is_anonymous,false);
 perform pg_advisory_xact_lock(hashtextextended('vtf-bootstrap-administrador',0));
 select * into anterior from app_private.operacoes_administrativas where autor_id=usuario and chave='${chave}'::uuid;
 if found then
  if anterior.operacao<>'bootstrap_admin_sistema' or not exists(select 1 from public.administradores_sistema where usuario_id=usuario and ativo) then raise exception 'bootstrap_estado_alterado'; end if;
  return;
 end if;
 if exists(select 1 from public.administradores_sistema) then raise exception 'bootstrap_inicial_ja_executado'; end if;
 insert into public.administradores_sistema(usuario_id,ativo) values(usuario,true);
 insert into app_private.operacoes_administrativas(autor_id,chave,operacao,parametros_hash,resposta)
 values(usuario,'${chave}'::uuid,'bootstrap_admin_sistema',md5(jsonb_build_object('usuario_id',usuario)::text),jsonb_build_object('administrador_criado',true));
end $vtf_bootstrap$;
select count(*)::integer administradores_ativos from public.administradores_sistema where ativo;
commit;`;
}
export const sqlPosflight=`with seguranca as (select
 (select count(*) from public.administradores_sistema where ativo) administradores_ativos,
 has_table_privilege('anon','public.inscricoes_vip','SELECT') anon_le_inscricoes,
 (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='app_private' and has_function_privilege('anon',p.oid,'EXECUTE')) funcoes_privadas_anon,
 (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef and p.proname in
 ('criar_evento_rascunho','criar_marca_catalogo','criar_local_catalogo','salvar_rascunho_evento','publicar_evento','alterar_situacao_evento','alterar_membro_marca','criar_convite_marca','revogar_convite_marca','aceitar_convite_marca','criar_lista_vip','encerrar_lista_vip','salvar_inscricao_vip','cancelar_inscricao_vip','corrigir_inscricao_vip',
 'limpar_entregas_convites','reservar_entrega_convite','iniciar_entrega_convite','finalizar_entrega_convite','consultar_lista_vip','confirmar_data_lista_vip','consultar_grupos_vip','exportar_lista_vip','consultar_gestao_listas_vip','consultar_minha_inscricao_vip','consultar_lista_vip_evento')) wrappers_definer,
 (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','app_private') and c.relname in
 ('administradores_sistema','membros_marca','permissoes_membro','auditoria_administrativa','convites_marca','listas_vip','inscricoes_vip','auditoria_listas_vip','tokens_convite','outbox_convites','execucoes_convites','operacoes_administrativas','outbox_publicacoes') and not c.relrowsecurity) tabelas_sem_rls),
 preservacao as (${sqlPreservacao.replace(/;$/,'')}) select to_jsonb(seguranca) seguranca,preservacao.preservacao from seguranca cross join preservacao;`;
