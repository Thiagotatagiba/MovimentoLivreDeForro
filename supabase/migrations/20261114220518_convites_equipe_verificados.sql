-- Pending for production. Apply to the isolated staging project first.
create table public.convites_marca (
 id uuid primary key default gen_random_uuid(),
 marca_id uuid not null references public.marcas(id),
 email_destino text not null check (email_destino=lower(btrim(email_destino)) and length(email_destino)<=254),
 papel text not null check (papel in ('administrador','equipe')),
 permissoes text[] not null default '{}',
 estado text not null default 'pendente' check (estado in ('pendente','aceito','expirado','revogado')),
 criado_por uuid not null references auth.users(id),
 criado_em timestamptz not null default clock_timestamp(),
 expira_em timestamptz not null default (clock_timestamp()+interval '7 days'),
 aceito_por uuid references auth.users(id),
 aceito_em timestamptz,
 membro_id uuid references public.membros_marca(id),
 revogado_em timestamptz,
 check ((estado='aceito' and aceito_por is not null and aceito_em is not null and membro_id is not null)
   or (estado<>'aceito' and aceito_por is null and aceito_em is null and membro_id is null)),
 check (permissoes <@ array['editar_marca','gerenciar_eventos','publicar_eventos','gerenciar_listas','consultar_listas']::text[]
   and array_position(permissoes,null) is null),
 check (papel<>'administrador' or cardinality(permissoes)=0)
);
create unique index convites_pendentes_email_idx on public.convites_marca(marca_id,email_destino) where estado='pendente';
create index convites_destinatario_idx on public.convites_marca(email_destino,criado_em desc);
create table app_private.tokens_convite (
 convite_id uuid primary key references public.convites_marca(id),
 token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$')
);
-- Delivery payload is sensitive and server-only. A future sender must recheck
-- pending/unexpired state, scrub the token after delivery and never log it.
create table app_private.outbox_convites (
 id uuid primary key default gen_random_uuid(),
 convite_id uuid not null unique references public.convites_marca(id),
 token text check (token is null or token ~ '^[a-f0-9]{64}$'),
 criado_em timestamptz not null default clock_timestamp(),
 processado_em timestamptz,
 cancelado_em timestamptz,
 tentativas integer not null default 0
);
create index outbox_convites_pendentes_idx on app_private.outbox_convites(criado_em)
 where processado_em is null and cancelado_em is null;
alter table public.convites_marca enable row level security;
alter table app_private.tokens_convite enable row level security;
alter table app_private.outbox_convites enable row level security;
revoke all on public.convites_marca from public,anon,authenticated;
revoke all on app_private.tokens_convite,app_private.outbox_convites from public,anon,authenticated;
grant select on public.convites_marca to authenticated;

create function app_private.email_verificado_atual() returns text
language sql stable security definer set search_path='' as $$
 select lower(btrim(u.email)) from auth.users u where u.id=auth.uid()
 and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false)
$$;
revoke all on function app_private.email_verificado_atual() from public,anon;
grant execute on function app_private.email_verificado_atual() to authenticated;
create policy convites_visiveis on public.convites_marca for select to authenticated
 using (app_private.admin_marca(marca_id) or email_destino=(select app_private.email_verificado_atual()) or aceito_por=(select auth.uid()));

create function app_private.criar_convite_marca(p_marca uuid,p_email text,p_papel text,p_permissoes text[],p_token text,p_chave uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare email text; permissoes text[]; hash text; parametros jsonb; anterior jsonb; convite public.convites_marca;
 expirado public.convites_marca; resultado jsonb;
begin
 if auth.uid() is null then raise exception 'autenticacao_obrigatoria' using errcode='42501'; end if;
 email:=lower(btrim(p_email));
 if email is null or length(email)>254 or email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
 or p_papel is null or p_papel<>all(array['administrador','equipe']) or p_permissoes is null
 or exists(select 1 from unnest(p_permissoes) x where x is null or x<>all(array['editar_marca','gerenciar_eventos','publicar_eventos','gerenciar_listas','consultar_listas']))
 or (p_papel='administrador' and cardinality(p_permissoes)>0)
 or p_token is null or p_token !~ '^[a-f0-9]{64}$' then
  raise exception 'convite_invalido' using errcode='22023';
 end if;
 select coalesce(array_agg(x order by x),'{}'::text[]) into permissoes from (select distinct unnest(p_permissoes) x) q;
 hash:=encode(sha256(convert_to(p_token,'UTF8')),'hex');
 parametros:=jsonb_build_object('marca',p_marca,'email',email,'papel',p_papel,'permissoes',permissoes,'token_hash',hash);
 anterior:=app_private.repeticao(p_chave,'criar_convite',parametros);
 perform 1 from public.marcas where id=p_marca and ativo for update;
 if not found or not app_private.admin_marca(p_marca) then raise exception 'sem_permissao' using errcode='42501'; end if;
 if anterior is not null then return anterior; end if;
 for expirado in update public.convites_marca set estado='expirado'
  where marca_id=p_marca and estado='pendente' and expira_em<=clock_timestamp() returning * loop
  update app_private.outbox_convites set token=null,cancelado_em=clock_timestamp() where convite_id=expirado.id;
  insert into public.auditoria_administrativa(marca_id,entidade_id,acao,autor_id,depois)
  values(p_marca,expirado.id,'expirar_convite',auth.uid(),jsonb_build_object('estado','expirado'));
 end loop;
 if exists(select 1 from public.convites_marca where marca_id=p_marca and email_destino=email and estado='pendente') then
  raise exception 'convite_pendente_existente' using errcode='PT409';
 end if;
 insert into public.convites_marca(marca_id,email_destino,papel,permissoes,criado_por)
 values(p_marca,email,p_papel,permissoes,auth.uid()) returning * into convite;
 insert into app_private.tokens_convite values(convite.id,hash);
 insert into app_private.outbox_convites(convite_id,token) values(convite.id,p_token);
 insert into public.auditoria_administrativa(marca_id,entidade_id,acao,autor_id,depois)
 values(p_marca,convite.id,'criar_convite',auth.uid(),jsonb_build_object('papel',p_papel,'permissoes',permissoes,'expira_em',convite.expira_em));
 resultado:=jsonb_build_object('convite_id',convite.id,'expira_em',convite.expira_em);
 return app_private.registrar_operacao(p_chave,'criar_convite',parametros,resultado);
end
$$;

create function app_private.revogar_convite_marca(p_convite uuid,p_chave uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare marca uuid; convite public.convites_marca; anterior jsonb; parametros jsonb; resultado jsonb;
begin
 parametros:=jsonb_build_object('convite',p_convite);
 anterior:=app_private.repeticao(p_chave,'revogar_convite',parametros);
 select marca_id into marca from public.convites_marca where id=p_convite;
 if marca is null then raise exception 'sem_permissao' using errcode='42501'; end if;
 perform 1 from public.marcas where id=marca for update;
 if not app_private.admin_marca(marca) then raise exception 'sem_permissao' using errcode='42501'; end if;
 if anterior is not null then return anterior; end if;
 select * into convite from public.convites_marca where id=p_convite for update;
 if convite.estado<>'pendente' or convite.expira_em<=clock_timestamp() then
  raise exception 'convite_nao_pendente' using errcode='PT409';
 end if;
 update public.convites_marca set estado='revogado',revogado_em=clock_timestamp() where id=p_convite;
 update app_private.outbox_convites set token=null,cancelado_em=clock_timestamp() where convite_id=p_convite;
 insert into public.auditoria_administrativa(marca_id,entidade_id,acao,autor_id,antes,depois)
 values(marca,p_convite,'revogar_convite',auth.uid(),jsonb_build_object('estado','pendente'),jsonb_build_object('estado','revogado'));
 resultado:=jsonb_build_object('convite_id',p_convite,'estado','revogado');
 return app_private.registrar_operacao(p_chave,'revogar_convite',parametros,resultado);
end
$$;

create function app_private.aceitar_convite_marca(p_convite uuid,p_token text,p_chave uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare marca uuid; convite public.convites_marca; membro public.membros_marca; email text;
 hash text; anterior jsonb; parametros jsonb; resultado jsonb; antes jsonb; permissoes_antes text[];
begin
 email:=app_private.email_verificado_atual();
 if email is null or p_token is null or p_token !~ '^[a-f0-9]{64}$' then
  raise exception 'convite_indisponivel' using errcode='42501';
 end if;
 hash:=encode(sha256(convert_to(p_token,'UTF8')),'hex');
 parametros:=jsonb_build_object('convite',p_convite,'token_hash',hash);
 anterior:=app_private.repeticao(p_chave,'aceitar_convite',parametros);
 select c.marca_id into marca from public.convites_marca c join app_private.tokens_convite t on t.convite_id=c.id
 where c.id=p_convite and t.token_hash=hash and c.email_destino=email;
 if marca is null then raise exception 'convite_indisponivel' using errcode='42501'; end if;
 perform 1 from public.marcas where id=marca and ativo for update;
 if not found then raise exception 'convite_indisponivel' using errcode='42501'; end if;
 select * into convite from public.convites_marca where id=p_convite for update;
 if anterior is not null then
  if not exists(select 1 from public.membros_marca where id=convite.membro_id and usuario_id=auth.uid() and ativo)
   then raise exception 'sem_permissao' using errcode='42501'; end if;
  return anterior;
 end if;
 if convite.estado<>'pendente' or convite.expira_em<=clock_timestamp() then
  raise exception 'convite_nao_pendente' using errcode='PT409';
 end if;
 if not (exists(select 1 from public.administradores_sistema where usuario_id=convite.criado_por and ativo)
  or exists(select 1 from public.membros_marca where marca_id=marca and usuario_id=convite.criado_por and ativo and papel='administrador')) then
  raise exception 'convite_indisponivel' using errcode='42501';
 end if;
 select * into membro from public.membros_marca where marca_id=marca and usuario_id=auth.uid() for update;
 if found and membro.ativo then raise exception 'membro_ja_ativo' using errcode='PT409'; end if;
 if membro.id is not null then
  select coalesce(array_agg(permissao order by permissao),'{}'::text[]) into permissoes_antes from public.permissoes_membro where membro_id=membro.id;
  antes:=to_jsonb(membro)||jsonb_build_object('permissoes',permissoes_antes);
  update public.membros_marca set ativo=true,papel=convite.papel where id=membro.id returning * into membro;
  delete from public.permissoes_membro where membro_id=membro.id;
 else
  insert into public.membros_marca(marca_id,usuario_id,papel) values(marca,auth.uid(),convite.papel) returning * into membro;
 end if;
 insert into public.permissoes_membro(membro_id,permissao) select membro.id,unnest(convite.permissoes);
 update public.convites_marca set estado='aceito',aceito_por=auth.uid(),aceito_em=clock_timestamp(),membro_id=membro.id where id=p_convite;
 update app_private.outbox_convites set token=null,cancelado_em=coalesce(cancelado_em,clock_timestamp()) where convite_id=p_convite;
 insert into public.auditoria_administrativa(marca_id,entidade_id,acao,autor_id,antes,depois)
 values(marca,p_convite,'aceitar_convite',auth.uid(),antes,jsonb_build_object('estado','aceito','membro_id',membro.id,'papel',convite.papel,'permissoes',convite.permissoes));
 resultado:=jsonb_build_object('convite_id',p_convite,'membro_id',membro.id,'estado','aceito');
 return app_private.registrar_operacao(p_chave,'aceitar_convite',parametros,resultado);
end
$$;

create function public.criar_convite_marca(p_marca uuid,p_email text,p_papel text,p_permissoes text[],p_token text,p_chave uuid)
returns jsonb language sql security invoker set search_path='' as $$
 select app_private.criar_convite_marca(p_marca,p_email,p_papel,p_permissoes,p_token,p_chave)
$$;
create function public.revogar_convite_marca(p_convite uuid,p_chave uuid)
returns jsonb language sql security invoker set search_path='' as $$
 select app_private.revogar_convite_marca(p_convite,p_chave)
$$;
create function public.aceitar_convite_marca(p_convite uuid,p_token text,p_chave uuid)
returns jsonb language sql security invoker set search_path='' as $$
 select app_private.aceitar_convite_marca(p_convite,p_token,p_chave)
$$;
revoke all on function public.criar_convite_marca(uuid,text,text,text[],text,uuid),public.revogar_convite_marca(uuid,uuid),
 public.aceitar_convite_marca(uuid,text,uuid),app_private.criar_convite_marca(uuid,text,text,text[],text,uuid),
 app_private.revogar_convite_marca(uuid,uuid),app_private.aceitar_convite_marca(uuid,text,uuid) from public,anon;
grant execute on function public.criar_convite_marca(uuid,text,text,text[],text,uuid),public.revogar_convite_marca(uuid,uuid),
 public.aceitar_convite_marca(uuid,text,uuid),app_private.criar_convite_marca(uuid,text,text,text[],text,uuid),
 app_private.revogar_convite_marca(uuid,uuid),app_private.aceitar_convite_marca(uuid,text,uuid) to authenticated;
