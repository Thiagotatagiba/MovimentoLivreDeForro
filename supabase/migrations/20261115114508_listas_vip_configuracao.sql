-- C1: list configuration only. No registration/name tables or public UI yet.
create table public.listas_vip (
 id uuid primary key default gen_random_uuid(),
 evento_id uuid not null unique references public.eventos(id),
 titulo text not null check (length(btrim(titulo)) between 1 and 200),
 termos text not null check (length(btrim(termos)) between 1 and 4000),
 prazo_inscricao timestamptz not null,
 beneficio_inicio timestamptz not null,
 beneficio_fim timestamptz not null,
 max_acompanhantes integer not null check (max_acompanhantes between 0 and 10),
 encerrada_em timestamptz,
 motivo_encerramento text check (motivo_encerramento in ('manual','cancelado','interrompido')),
 revisao bigint not null default 1 check (revisao>0),
 criada_em timestamptz not null default clock_timestamp(),
 check (beneficio_fim>beneficio_inicio and prazo_inscricao<=beneficio_fim),
 check ((encerrada_em is null)=(motivo_encerramento is null))
);
alter table public.listas_vip enable row level security;
revoke all on public.listas_vip from public,anon,authenticated;
grant select on public.listas_vip to anon,authenticated;
-- Only benefit metadata is public; no recipient/participant data exists here.
create policy listas_vip_publicas on public.listas_vip for select to anon,authenticated using (
 exists(select 1 from public.eventos e join public.versoes_evento v on v.id=e.versao_publicada_id and v.evento_id=e.id
 join public.marcas m on m.id=e.marca_id join public.locais l on l.id=e.local_id
 where e.id=listas_vip.evento_id and e.estado_publicacao='publicado' and m.ativo and l.ativo and v.conteudo->>'ativo'='true')
);
create policy listas_vip_gestores on public.listas_vip for select to authenticated using (
 exists(select 1 from public.eventos e where e.id=listas_vip.evento_id and
  (app_private.tem_permissao(e.marca_id,'gerenciar_listas') or app_private.tem_permissao(e.marca_id,'consultar_listas')))
);
create table app_private.auditoria_listas_vip (
 id uuid primary key default gen_random_uuid(),
 lista_id uuid not null references public.listas_vip(id),
 autor_id uuid references auth.users(id),
 origem text not null check (origem in ('usuario','evento')),
 acao text not null,
 antes jsonb,
 depois jsonb not null,
 ocorrido_em timestamptz not null default clock_timestamp()
);
create index auditoria_listas_vip_lista_idx on app_private.auditoria_listas_vip(lista_id,ocorrido_em desc);
create index auditoria_listas_vip_autor_idx on app_private.auditoria_listas_vip(autor_id);
alter table app_private.auditoria_listas_vip enable row level security;
revoke all on app_private.auditoria_listas_vip from public,anon,authenticated;

create function app_private.criar_lista_vip(p_evento uuid,p_titulo text,p_termos text,p_prazo timestamptz,
 p_inicio timestamptz,p_fim timestamptz,p_acompanhantes integer,p_chave uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare e public.eventos; v public.versoes_evento; l public.listas_vip; anterior jsonb; parametros jsonb; resposta jsonb;
begin
 parametros:=jsonb_build_object('evento',p_evento,'titulo',p_titulo,'termos',p_termos,'prazo',p_prazo,'inicio',p_inicio,'fim',p_fim,'acompanhantes',p_acompanhantes);
 anterior:=app_private.repeticao(p_chave,'criar_lista_vip',parametros);
 select * into e from public.eventos where id=p_evento for update;
 if not found or not app_private.tem_permissao(e.marca_id,'gerenciar_listas') then raise exception 'sem_permissao' using errcode='42501'; end if;
 if anterior is not null then return anterior; end if;
 select * into v from public.versoes_evento where id=e.versao_publicada_id and evento_id=e.id;
 if e.estado_publicacao<>'publicado' or v.id is null or v.situacao<>'confirmado' or v.conteudo->>'ativo' is distinct from 'true'
  or not exists(select 1 from public.marcas where id=e.marca_id and ativo)
  or not exists(select 1 from public.locais where id=e.local_id and ativo) then
  raise exception 'evento_indisponivel' using errcode='22023'; end if;
 if p_titulo is null or length(btrim(p_titulo)) not between 1 and 200 or p_termos is null or length(btrim(p_termos)) not between 1 and 4000
  or p_prazo is null or not isfinite(p_prazo) or p_prazo<=clock_timestamp() or p_inicio is null or not isfinite(p_inicio)
  or p_fim is null or not isfinite(p_fim) or p_fim<=p_inicio or p_prazo>p_fim
  or p_acompanhantes is null or p_acompanhantes not between 0 and 10 then raise exception 'lista_invalida' using errcode='22023'; end if;
 if exists(select 1 from public.listas_vip where evento_id=p_evento) then raise exception 'lista_da_edicao_existente' using errcode='PT409'; end if;
 insert into public.listas_vip(evento_id,titulo,termos,prazo_inscricao,beneficio_inicio,beneficio_fim,max_acompanhantes)
 values(p_evento,btrim(p_titulo),btrim(p_termos),p_prazo,p_inicio,p_fim,p_acompanhantes) returning * into l;
 resposta:=jsonb_build_object('lista_id',l.id,'revisao',l.revisao);
 insert into app_private.auditoria_listas_vip(lista_id,autor_id,origem,acao,depois)
 values(l.id,auth.uid(),'usuario','criar',to_jsonb(l));
 return app_private.registrar_operacao(p_chave,'criar_lista_vip',parametros,resposta);
end $$;

create function app_private.encerrar_lista_vip(p_lista uuid,p_revisao bigint,p_chave uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare e public.eventos; l public.listas_vip; anterior jsonb; antes jsonb; parametros jsonb; resposta jsonb;
begin
 parametros:=jsonb_build_object('lista',p_lista,'revisao',p_revisao);
 anterior:=app_private.repeticao(p_chave,'encerrar_lista_vip',parametros);
 -- Event -> list matches publication and the automatic close trigger.
 select e0.* into e from public.eventos e0 join public.listas_vip l0 on l0.evento_id=e0.id where l0.id=p_lista for update of e0;
 if not found or not app_private.tem_permissao(e.marca_id,'gerenciar_listas') then raise exception 'sem_permissao' using errcode='42501'; end if;
 if anterior is not null then return anterior; end if;
 select * into l from public.listas_vip where id=p_lista for update;
 if p_revisao is null or p_revisao<>l.revisao then raise exception 'conflito_revisao' using errcode='PT409'; end if;
 if l.encerrada_em is not null or l.prazo_inscricao<=clock_timestamp() then raise exception 'lista_encerrada' using errcode='PT409'; end if;
 antes:=to_jsonb(l);
 update public.listas_vip set encerrada_em=clock_timestamp(),motivo_encerramento='manual',revisao=revisao+1 where id=p_lista returning * into l;
 insert into app_private.auditoria_listas_vip(lista_id,autor_id,origem,acao,antes,depois)
 values(l.id,auth.uid(),'usuario','encerrar',antes,to_jsonb(l));
 resposta:=jsonb_build_object('lista_id',l.id,'revisao',l.revisao);
 return app_private.registrar_operacao(p_chave,'encerrar_lista_vip',parametros,resposta);
end $$;

create function app_private.encerrar_listas_evento() returns trigger
language plpgsql security definer set search_path='' as $$
declare situacao text; l public.listas_vip; antes jsonb;
begin
 select v.situacao into situacao from public.versoes_evento v where v.id=new.versao_publicada_id and v.evento_id=new.id;
 if situacao in ('cancelado','interrompido') then
  for l in select * from public.listas_vip where evento_id=new.id and encerrada_em is null for update loop
   antes:=to_jsonb(l);
   update public.listas_vip set encerrada_em=clock_timestamp(),motivo_encerramento=situacao,revisao=revisao+1 where id=l.id returning * into l;
   insert into app_private.auditoria_listas_vip(lista_id,autor_id,origem,acao,antes,depois)
   values(l.id,auth.uid(),'evento','encerrar',antes,to_jsonb(l));
  end loop;
 end if;
 return new;
end $$;
revoke all on function app_private.encerrar_listas_evento() from public,anon,authenticated;
create trigger encerrar_listas_evento after update of versao_publicada_id on public.eventos
 for each row when (old.versao_publicada_id is distinct from new.versao_publicada_id) execute function app_private.encerrar_listas_evento();

create function public.criar_lista_vip(p_evento uuid,p_titulo text,p_termos text,p_prazo timestamptz,
 p_inicio timestamptz,p_fim timestamptz,p_acompanhantes integer,p_chave uuid) returns jsonb
language sql security invoker set search_path='' as $$select app_private.criar_lista_vip(p_evento,p_titulo,p_termos,p_prazo,p_inicio,p_fim,p_acompanhantes,p_chave)$$;
create function public.encerrar_lista_vip(p_lista uuid,p_revisao bigint,p_chave uuid) returns jsonb
language sql security invoker set search_path='' as $$select app_private.encerrar_lista_vip(p_lista,p_revisao,p_chave)$$;
revoke all on function public.criar_lista_vip(uuid,text,text,timestamptz,timestamptz,timestamptz,integer,uuid),
 public.encerrar_lista_vip(uuid,bigint,uuid),app_private.criar_lista_vip(uuid,text,text,timestamptz,timestamptz,timestamptz,integer,uuid),
 app_private.encerrar_lista_vip(uuid,bigint,uuid) from public,anon,authenticated;
grant execute on function public.criar_lista_vip(uuid,text,text,timestamptz,timestamptz,timestamptz,integer,uuid),
 public.encerrar_lista_vip(uuid,bigint,uuid),app_private.criar_lista_vip(uuid,text,text,timestamptz,timestamptz,timestamptz,integer,uuid),
 app_private.encerrar_lista_vip(uuid,bigint,uuid) to authenticated;

-- Deadline is enforced/read on the server even with no cron or browser open.
create function public.consultar_lista_vip(p_lista uuid) returns jsonb
language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('id',l.id,'evento_id',l.evento_id,'titulo',l.titulo,'termos',l.termos,
 'prazo_inscricao',l.prazo_inscricao,'beneficio_inicio',l.beneficio_inicio,'beneficio_fim',l.beneficio_fim,
 'max_acompanhantes',l.max_acompanhantes,'revisao',l.revisao,
 'estado',case when l.encerrada_em is not null or l.prazo_inscricao<=statement_timestamp() or v.situacao in ('cancelado','interrompido') then 'encerrada'
  when v.situacao='adiado' then 'suspensa' else 'aberta' end)
 from public.listas_vip l join public.eventos e on e.id=l.evento_id
 join public.versoes_evento v on v.id=e.versao_publicada_id and v.evento_id=e.id where l.id=p_lista
$$;
revoke all on function public.consultar_lista_vip(uuid) from public;
grant execute on function public.consultar_lista_vip(uuid) to anon,authenticated;
