-- Pending migration. Validated locally only; do not apply before catalog cutover review.
create schema app_private;
revoke all on schema app_private from public, anon;
grant usage on schema app_private to authenticated;
alter default privileges in schema app_private revoke execute on functions from public;

create table public.administradores_sistema (
 usuario_id uuid primary key references auth.users(id),
 ativo boolean not null default true
);
create table public.membros_marca (
 id uuid primary key default gen_random_uuid(),
 marca_id uuid not null references public.marcas(id),
 usuario_id uuid not null references auth.users(id),
 papel text not null check (papel in ('administrador','equipe')),
 ativo boolean not null default true,
 unique(marca_id,usuario_id)
);
create index membros_marca_usuario_idx on public.membros_marca(usuario_id,marca_id) where ativo;
create table public.permissoes_membro (
 membro_id uuid not null references public.membros_marca(id) on delete cascade,
 permissao text not null check (permissao in
 ('editar_marca','gerenciar_eventos','publicar_eventos','gerenciar_listas','consultar_listas')),
 primary key(membro_id,permissao)
);
create table public.auditoria_administrativa (
 id uuid primary key default gen_random_uuid(),
 marca_id uuid not null references public.marcas(id),
 entidade_id uuid not null,
 acao text not null,
 autor_id uuid not null references auth.users(id),
 antes jsonb,
 depois jsonb,
 ocorrido_em timestamptz not null default now()
);
create index auditoria_marca_data_idx on public.auditoria_administrativa(marca_id,ocorrido_em desc);
create table app_private.operacoes_administrativas (
 autor_id uuid not null references auth.users(id),
 chave uuid not null,
 operacao text not null,
 parametros_hash text not null,
 resposta jsonb not null,
 criado_em timestamptz not null default now(),
 primary key(autor_id,chave)
);
create table app_private.outbox_publicacoes (
 id uuid primary key default gen_random_uuid(),
 evento_id uuid not null references public.eventos(id),
 versao_id uuid not null unique references public.versoes_evento(id),
 tipo text not null default 'atualizar_previa',
 criado_em timestamptz not null default now(),
 processado_em timestamptz,
 tentativas integer not null default 0
);
create index outbox_publicacoes_pendentes_idx on app_private.outbox_publicacoes(criado_em)
 where processado_em is null;
alter table public.administradores_sistema enable row level security;
alter table public.membros_marca enable row level security;
alter table public.permissoes_membro enable row level security;
alter table public.auditoria_administrativa enable row level security;
alter table app_private.operacoes_administrativas enable row level security;
alter table app_private.outbox_publicacoes enable row level security;
revoke all on public.administradores_sistema,public.membros_marca,
 public.permissoes_membro,public.auditoria_administrativa from anon,authenticated;
revoke all on all tables in schema app_private from public,anon,authenticated;
grant select on public.administradores_sistema,public.membros_marca,
 public.permissoes_membro,public.auditoria_administrativa,public.rascunhos_evento to authenticated;

-- Definer helpers stay in an unexposed schema and derive identity only from auth.uid().
-- No user_metadata authorization. Empty search_path and fully qualified objects.
create function app_private.admin_global() returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists (
  select 1 from public.administradores_sistema where usuario_id=auth.uid() and ativo
 )
$$;
create function app_private.admin_marca(p_marca uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (app_private.admin_global() or exists (
  select 1 from public.membros_marca
  where marca_id=p_marca and usuario_id=auth.uid() and ativo and papel='administrador'
 ))
$$;
create function app_private.tem_permissao(p_marca uuid,p_permissao text) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (app_private.admin_marca(p_marca) or exists (
  select 1 from public.membros_marca m join public.permissoes_membro p on p.membro_id=m.id
  where m.marca_id=p_marca and m.usuario_id=auth.uid() and m.ativo and p.permissao=p_permissao
 ))
$$;
revoke all on function app_private.admin_global(),app_private.admin_marca(uuid),
 app_private.tem_permissao(uuid,text) from public,anon;
grant execute on function app_private.admin_global(),app_private.admin_marca(uuid),
 app_private.tem_permissao(uuid,text) to authenticated;

create policy admin_sistema_proprio on public.administradores_sistema for select to authenticated
 using (usuario_id=(select auth.uid()));
create policy membros_visiveis on public.membros_marca for select to authenticated
 using (usuario_id=(select auth.uid()) or app_private.admin_marca(marca_id));
create policy permissoes_visiveis on public.permissoes_membro for select to authenticated
 using (exists(select 1 from public.membros_marca m where m.id=membro_id));
create policy eventos_administrativos on public.eventos for select to authenticated
 using (app_private.tem_permissao(marca_id,'gerenciar_eventos') or app_private.tem_permissao(marca_id,'publicar_eventos'));
create policy rascunhos_autorizados on public.rascunhos_evento for select to authenticated
 using (exists(select 1 from public.eventos e where e.id=evento_id and
 (app_private.tem_permissao(e.marca_id,'gerenciar_eventos') or app_private.tem_permissao(e.marca_id,'publicar_eventos'))));
create policy auditoria_autorizada on public.auditoria_administrativa for select to authenticated
 using (app_private.tem_permissao(marca_id,'gerenciar_eventos') or app_private.tem_permissao(marca_id,'publicar_eventos'));

-- All commands lock by request key, then the affected aggregate. Retrying the same
-- request returns its original result. Reusing a key with different parameters fails.
create function app_private.repeticao(p_chave uuid,p_operacao text,p_parametros jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare anterior app_private.operacoes_administrativas;
begin
 if auth.uid() is null then raise exception 'autenticacao_obrigatoria' using errcode='42501'; end if;
 if p_chave is null then raise exception 'chave_idempotencia_obrigatoria' using errcode='22023'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text||':'||p_chave::text,0));
 select * into anterior from app_private.operacoes_administrativas
 where autor_id=auth.uid() and chave=p_chave;
 if found then
  if anterior.operacao<>p_operacao or anterior.parametros_hash<>pg_catalog.md5(p_parametros::text)
   then raise exception 'chave_idempotencia_reutilizada' using errcode='22023'; end if;
  return anterior.resposta;
 end if;
 return null;
end
$$;
create function app_private.registrar_operacao(p_chave uuid,p_operacao text,p_parametros jsonb,p_resposta jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 insert into app_private.operacoes_administrativas(autor_id,chave,operacao,parametros_hash,resposta)
 values(auth.uid(),p_chave,p_operacao,pg_catalog.md5(p_parametros::text),p_resposta);
 return p_resposta;
end
$$;
-- Internal helpers have no authenticated EXECUTE grant.
revoke all on function app_private.repeticao(uuid,text,jsonb),
 app_private.registrar_operacao(uuid,text,jsonb,jsonb) from public,anon,authenticated;

create function app_private.validar_publicacao(p_conteudo jsonb) returns void
language plpgsql security invoker set search_path='' as $$
declare inicio timestamp; fim timestamp; chave text;
begin
 if p_conteudo is null or jsonb_typeof(p_conteudo)<>'object' then
  raise exception 'conteudo_invalido' using errcode='22023';
 end if;
 for chave in select jsonb_object_keys(p_conteudo) loop
  if chave<>all(array['id','slug','marcaId','localId','titulo','data','horario','dataTermino','horarioTermino',
    'terminoEstimado','descricao','ingresso','lineup','imagemUrl','ativo','condicoesEspeciais']) then
   raise exception 'campo_nao_publicavel: %',chave using errcode='22023';
  end if;
 end loop;
 if jsonb_typeof(p_conteudo->'titulo') is distinct from 'string' or nullif(btrim(p_conteudo->>'titulo'),'') is null or length(p_conteudo->>'titulo')>200
  or jsonb_typeof(p_conteudo->'ativo') is distinct from 'boolean' then
  raise exception 'titulo_ou_ativo_invalido' using errcode='22023';
 end if;
 if coalesce(p_conteudo->>'terminoEstimado','false')<>'false' then
  raise exception 'confirme_horario_termino' using errcode='22023';
 end if;
 if coalesce(p_conteudo->>'data','')!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
  or coalesce(p_conteudo->>'dataTermino','')!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
  or coalesce(p_conteudo->>'horario','')!~'^([01][0-9]|2[0-3]):[0-5][0-9]$'
  or coalesce(p_conteudo->>'horarioTermino','')!~'^([01][0-9]|2[0-3]):[0-5][0-9]$' then
  raise exception 'inicio_e_termino_obrigatorios' using errcode='22023';
 end if;
 inicio:=(p_conteudo->>'data')::date+(p_conteudo->>'horario')::time;
 fim:=(p_conteudo->>'dataTermino')::date+(p_conteudo->>'horarioTermino')::time;
 if fim<=inicio then raise exception 'termino_anterior_ao_inicio' using errcode='22023'; end if;
 if p_conteudo ? 'lineup' and (
  jsonb_typeof(p_conteudo->'lineup') is distinct from 'object'
  or jsonb_typeof(p_conteudo->'lineup'->'bandas') is distinct from 'array'
  or jsonb_typeof(p_conteudo->'lineup'->'djs') is distinct from 'array') then
  raise exception 'lineup_invalido' using errcode='22023';
 end if;
 if p_conteudo ? 'lineup' and exists (
  select 1 from jsonb_array_elements((p_conteudo->'lineup'->'bandas')||(p_conteudo->'lineup'->'djs')) x
  where jsonb_typeof(x)<>'string') then
  raise exception 'lineup_invalido' using errcode='22023';
 end if;
 if p_conteudo ? 'ingresso' and jsonb_typeof(p_conteudo->'ingresso') is distinct from 'object' then
  raise exception 'ingresso_invalido' using errcode='22023';
 end if;
 if p_conteudo->'ingresso' ? 'precoAPartirDe'
  and jsonb_typeof(p_conteudo->'ingresso'->'precoAPartirDe') <> 'null' then
  if jsonb_typeof(p_conteudo->'ingresso'->'precoAPartirDe') <> 'number' then
   raise exception 'preco_invalido' using errcode='22023';
  end if;
  if (p_conteudo->'ingresso'->>'precoAPartirDe')::numeric < 0 then
   raise exception 'preco_invalido' using errcode='22023';
  end if;
 end if;
 if coalesce(p_conteudo->'ingresso'->>'link','') not in ('','em breve')
  and (p_conteudo->'ingresso'->>'link')!~'^https?://' then
  raise exception 'link_ingresso_invalido' using errcode='22023';
 end if;
 if coalesce(p_conteudo->>'imagemUrl','') not in ('','em breve')
  and (p_conteudo->>'imagemUrl')!~'^(https?://|assets/)' then
  raise exception 'imagem_invalida' using errcode='22023';
 end if;
end
$$;
revoke all on function app_private.validar_publicacao(jsonb) from public,anon,authenticated;

create function app_private.salvar_rascunho_evento(p_evento uuid,p_conteudo jsonb,p_revisao bigint,p_chave uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare e public.eventos; r public.rascunhos_evento; anterior jsonb; parametros jsonb; resultado jsonb;
begin
 parametros:=jsonb_build_object('evento',p_evento,'conteudo',p_conteudo,'revisao',p_revisao);
 anterior:=app_private.repeticao(p_chave,'salvar_rascunho',parametros);
 select * into e from public.eventos where id=p_evento for update;
 if not found or not app_private.tem_permissao(e.marca_id,'gerenciar_eventos') then
  raise exception 'sem_permissao' using errcode='42501';
 end if;
 if anterior is not null then return anterior; end if;
 if p_conteudo is null or jsonb_typeof(p_conteudo)<>'object' then
  raise exception 'conteudo_invalido' using errcode='22023';
 end if;
 select * into r from public.rascunhos_evento where evento_id=p_evento for update;
 if p_revisao is null or coalesce(r.revisao,0)<>p_revisao then
  raise exception 'conflito_revisao' using errcode='40001';
 end if;
 insert into public.rascunhos_evento(evento_id,conteudo,revisao,editado_por)
 values(p_evento,p_conteudo,1,auth.uid())
 on conflict(evento_id) do update set conteudo=excluded.conteudo,revisao=public.rascunhos_evento.revisao+1,
 editado_por=auth.uid(),atualizado_em=now()
 returning jsonb_build_object('evento_id',evento_id,'revisao',revisao) into resultado;
 insert into public.auditoria_administrativa(marca_id,entidade_id,acao,autor_id,antes,depois)
 values(e.marca_id,e.id,'salvar_rascunho',auth.uid(),r.conteudo,p_conteudo);
 return app_private.registrar_operacao(p_chave,'salvar_rascunho',parametros,resultado);
end
$$;

create function app_private.publicar_evento(p_evento uuid,p_revisao bigint,p_chave uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare e public.eventos; r public.rascunhos_evento; v public.versoes_evento; nova uuid;
 marca public.marcas; local public.locais; proximo integer; anterior jsonb; parametros jsonb; resultado jsonb; conteudo_novo jsonb;
begin
 parametros:=jsonb_build_object('evento',p_evento,'revisao',p_revisao);
 anterior:=app_private.repeticao(p_chave,'publicar_evento',parametros);
 select * into e from public.eventos where id=p_evento for update;
 if not found or not app_private.tem_permissao(e.marca_id,'publicar_eventos') then
  raise exception 'sem_permissao' using errcode='42501';
 end if;
 if anterior is not null then return anterior; end if;
 select * into r from public.rascunhos_evento where evento_id=p_evento for update;
 if r.evento_id is null or p_revisao is null or r.revisao<>p_revisao then
  raise exception 'conflito_revisao' using errcode='40001';
 end if;
 select * into marca from public.marcas where id=e.marca_id;
 select * into local from public.locais where id=e.local_id;
 if not coalesce(marca.ativo,false) or not coalesce(local.ativo,false) then
  raise exception 'marca_ou_local_inativo' using errcode='22023';
 end if;
 if e.id_legado is null or marca.id_legado is null or local.id_legado is null then
  raise exception 'identidade_publica_obrigatoria' using errcode='22023';
 end if;
 -- Identity and operational status are never writable through draft JSON.
 if (r.conteudo ? 'id' and (r.conteudo->>'id') is distinct from e.id_legado)
  or (r.conteudo ? 'slug' and (r.conteudo->>'slug') is distinct from e.slug)
  or (r.conteudo ? 'marcaId' and (r.conteudo->>'marcaId') is distinct from marca.id_legado)
  or (r.conteudo ? 'localId' and (r.conteudo->>'localId') is distinct from local.id_legado) then
  raise exception 'identidade_imutavel' using errcode='22023';
 end if;
 conteudo_novo:=r.conteudo||jsonb_build_object('id',e.id_legado,'slug',e.slug,'marcaId',marca.id_legado,'localId',local.id_legado);
 perform app_private.validar_publicacao(conteudo_novo);
 select * into v from public.versoes_evento where id=e.versao_publicada_id;
 select coalesce(max(numero),0)+1 into proximo from public.versoes_evento where evento_id=e.id;
 insert into public.versoes_evento(evento_id,numero,conteudo,situacao,publicado_por)
 values(e.id,proximo,conteudo_novo,coalesce(v.situacao,'confirmado'),auth.uid()) returning id into nova;
 update public.eventos set versao_publicada_id=nova,estado_publicacao='publicado',atualizado_em=now() where id=e.id;
 -- Keep and increment the draft revision to avoid ABA conflicts after publication.
 update public.rascunhos_evento set conteudo=conteudo_novo,revisao=revisao+1,atualizado_em=now()
 where evento_id=e.id;
 insert into public.auditoria_administrativa(marca_id,entidade_id,acao,autor_id,antes,depois)
 values(e.marca_id,e.id,'publicar_evento',auth.uid(),to_jsonb(v),jsonb_build_object('versao_id',nova,'numero',proximo,'conteudo',conteudo_novo));
 insert into app_private.outbox_publicacoes(evento_id,versao_id) values(e.id,nova);
 resultado:=jsonb_build_object('evento_id',e.id,'versao_id',nova,'numero',proximo,'revisao',r.revisao+1);
 return app_private.registrar_operacao(p_chave,'publicar_evento',parametros,resultado);
end
$$;

create function app_private.alterar_situacao_evento(p_evento uuid,p_situacao text,p_versao uuid,p_chave uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare e public.eventos; v public.versoes_evento; nova uuid; proximo integer;
 anterior jsonb; parametros jsonb; resultado jsonb;
begin
 parametros:=jsonb_build_object('evento',p_evento,'situacao',p_situacao,'versao',p_versao);
 anterior:=app_private.repeticao(p_chave,'alterar_situacao',parametros);
 select * into e from public.eventos where id=p_evento for update;
 if not found or not app_private.tem_permissao(e.marca_id,'publicar_eventos') then
  raise exception 'sem_permissao' using errcode='42501';
 end if;
 if anterior is not null then return anterior; end if;
 if p_situacao is null or p_situacao<>all(array['confirmado','adiado','cancelado','interrompido']) then
  raise exception 'situacao_invalida' using errcode='22023';
 end if;
 if e.estado_publicacao<>'publicado' or p_versao is null or e.versao_publicada_id is distinct from p_versao then
  raise exception 'conflito_versao' using errcode='40001';
 end if;
 select * into v from public.versoes_evento where id=e.versao_publicada_id;
 select max(numero)+1 into proximo from public.versoes_evento where evento_id=e.id;
 insert into public.versoes_evento(evento_id,numero,conteudo,situacao,publicado_por)
 values(e.id,proximo,v.conteudo,p_situacao,auth.uid()) returning id into nova;
 update public.eventos set versao_publicada_id=nova,atualizado_em=now() where id=e.id;
 insert into public.auditoria_administrativa(marca_id,entidade_id,acao,autor_id,antes,depois)
 values(e.marca_id,e.id,'alterar_situacao',auth.uid(),jsonb_build_object('situacao',v.situacao,'versao_id',v.id),
 jsonb_build_object('situacao',p_situacao,'versao_id',nova));
 insert into app_private.outbox_publicacoes(evento_id,versao_id) values(e.id,nova);
 resultado:=jsonb_build_object('evento_id',e.id,'versao_id',nova,'numero',proximo,'situacao',p_situacao);
 return app_private.registrar_operacao(p_chave,'alterar_situacao',parametros,resultado);
end
$$;

create function app_private.alterar_membro_marca(p_membro uuid,p_papel text,p_ativo boolean,p_permissoes text[],p_chave uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.membros_marca; marca uuid; parametros jsonb; anterior jsonb; resultado jsonb; permissoes_antes text[];
begin
 parametros:=jsonb_build_object('membro',p_membro,'papel',p_papel,'ativo',p_ativo,'permissoes',p_permissoes);
 anterior:=app_private.repeticao(p_chave,'alterar_membro',parametros);
 select marca_id into marca from public.membros_marca where id=p_membro;
 if marca is null then raise exception 'sem_permissao' using errcode='42501'; end if;
 -- Serialize all membership changes within a brand, including last-admin checks.
 perform 1 from public.marcas where id=marca for update;
 if not app_private.admin_marca(marca) then raise exception 'sem_permissao' using errcode='42501'; end if;
 if anterior is not null then return anterior; end if;
 select * into m from public.membros_marca where id=p_membro for update;
 if p_papel is null or p_papel<>all(array['administrador','equipe']) or p_ativo is null or p_permissoes is null then
  raise exception 'membro_invalido' using errcode='22023';
 end if;
 if m.ativo and m.papel='administrador' and (not p_ativo or p_papel<>'administrador')
  and not exists(select 1 from public.membros_marca where marca_id=marca and ativo and papel='administrador' and id<>m.id) then
  raise exception 'ultimo_administrador_ativo' using errcode='23514';
 end if;
 select coalesce(array_agg(permissao order by permissao),'{}'::text[]) into permissoes_antes from public.permissoes_membro where membro_id=m.id;
 update public.membros_marca set papel=p_papel,ativo=p_ativo where id=m.id;
 delete from public.permissoes_membro where membro_id=m.id;
 insert into public.permissoes_membro(membro_id,permissao) select m.id,x from (select distinct unnest(p_permissoes) x) p;
 insert into public.auditoria_administrativa(marca_id,entidade_id,acao,autor_id,antes,depois)
 values(marca,m.id,'alterar_membro',auth.uid(),to_jsonb(m)||jsonb_build_object('permissoes',permissoes_antes),jsonb_build_object('papel',p_papel,'ativo',p_ativo,'permissoes',p_permissoes));
 resultado:=jsonb_build_object('membro_id',m.id,'papel',p_papel,'ativo',p_ativo);
 return app_private.registrar_operacao(p_chave,'alterar_membro',parametros,resultado);
end
$$;

-- Only INVOKER entrypoints are exposed by PostgREST. Private implementations
-- validate auth.uid and permissions on every invocation, including idempotent retries.
create function public.salvar_rascunho_evento(p_evento uuid,p_conteudo jsonb,p_revisao bigint,p_chave uuid)
returns jsonb language sql security invoker set search_path='' as $$
 select app_private.salvar_rascunho_evento(p_evento,p_conteudo,p_revisao,p_chave)
$$;
create function public.publicar_evento(p_evento uuid,p_revisao bigint,p_chave uuid)
returns jsonb language sql security invoker set search_path='' as $$
 select app_private.publicar_evento(p_evento,p_revisao,p_chave)
$$;
create function public.alterar_situacao_evento(p_evento uuid,p_situacao text,p_versao uuid,p_chave uuid)
returns jsonb language sql security invoker set search_path='' as $$
 select app_private.alterar_situacao_evento(p_evento,p_situacao,p_versao,p_chave)
$$;
create function public.alterar_membro_marca(p_membro uuid,p_papel text,p_ativo boolean,p_permissoes text[],p_chave uuid)
returns jsonb language sql security invoker set search_path='' as $$
 select app_private.alterar_membro_marca(p_membro,p_papel,p_ativo,p_permissoes,p_chave)
$$;
revoke all on function public.salvar_rascunho_evento(uuid,jsonb,bigint,uuid),
 public.publicar_evento(uuid,bigint,uuid),public.alterar_situacao_evento(uuid,text,uuid,uuid),
 public.alterar_membro_marca(uuid,text,boolean,text[],uuid) from public,anon;
revoke all on function app_private.salvar_rascunho_evento(uuid,jsonb,bigint,uuid),
 app_private.publicar_evento(uuid,bigint,uuid),app_private.alterar_situacao_evento(uuid,text,uuid,uuid),
 app_private.alterar_membro_marca(uuid,text,boolean,text[],uuid) from public,anon;
grant execute on function public.salvar_rascunho_evento(uuid,jsonb,bigint,uuid),
 public.publicar_evento(uuid,bigint,uuid),public.alterar_situacao_evento(uuid,text,uuid,uuid),
 public.alterar_membro_marca(uuid,text,boolean,text[],uuid) to authenticated;
grant execute on function app_private.salvar_rascunho_evento(uuid,jsonb,bigint,uuid),
 app_private.publicar_evento(uuid,bigint,uuid),app_private.alterar_situacao_evento(uuid,text,uuid,uuid),
 app_private.alterar_membro_marca(uuid,text,boolean,text[],uuid) to authenticated;
