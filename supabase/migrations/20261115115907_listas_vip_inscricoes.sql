-- C2: private groups, owner writes, producer review/correction and text export.
alter table public.listas_vip add column versao_data_confirmada_id uuid;
alter table public.listas_vip add constraint lista_data_mesmo_evento foreign key(evento_id,versao_data_confirmada_id)
 references public.versoes_evento(evento_id,id);
create table public.inscricoes_vip (
 id uuid primary key default gen_random_uuid(),
 lista_id uuid not null references public.listas_vip(id),
 usuario_id uuid not null references auth.users(id),
 nome text not null,
 acompanhantes text[] not null default '{}',
 avatar_url text,
 ativa boolean not null default true,
 revisao bigint not null default 1 check(revisao>0),
 termos_aceitos_em timestamptz not null default clock_timestamp(),
 criado_em timestamptz not null default clock_timestamp(),
 atualizado_em timestamptz not null default clock_timestamp(),
 unique(lista_id,usuario_id),
 check(cardinality(acompanhantes)<=10)
);
create index inscricoes_vip_usuario_idx on public.inscricoes_vip(usuario_id,lista_id);
alter table public.inscricoes_vip enable row level security;
revoke all on public.inscricoes_vip from public,anon,authenticated;
grant select on public.inscricoes_vip to authenticated;
-- Direct reads intentionally expose only the owner's own group. Producers use
-- an authorized RPC, so duplicate-name flags never escape into owner responses.
create policy inscricao_vip_propria on public.inscricoes_vip for select to authenticated
 using(usuario_id=(select auth.uid()));

create function app_private.contexto_vip(p_lista uuid,p_bloquear boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare l public.listas_vip; e public.eventos; v public.versoes_evento; estado text; disponivel boolean;
begin
 select * into l from public.listas_vip where id=p_lista;
 if not found then raise exception 'lista_indisponivel' using errcode='42501'; end if;
 if p_bloquear then
  select * into e from public.eventos where id=l.evento_id for update;
  select * into l from public.listas_vip where id=p_lista for update;
 else select * into e from public.eventos where id=l.evento_id; end if;
 select * into v from public.versoes_evento where id=e.versao_publicada_id and evento_id=e.id;
 disponivel:=e.estado_publicacao='publicado' and v.id is not null and v.conteudo->>'ativo'='true'
  and exists(select 1 from public.marcas where id=e.marca_id and ativo)
  and exists(select 1 from public.locais where id=e.local_id and ativo);
 estado:=case when l.encerrada_em is not null or l.prazo_inscricao<=clock_timestamp() or v.situacao in ('cancelado','interrompido') then 'encerrada'
  when not coalesce(disponivel,false) or (v.situacao='adiado' and l.versao_data_confirmada_id is distinct from v.id) then 'suspensa' else 'aberta' end;
 return jsonb_build_object('lista',to_jsonb(l),'marca_id',e.marca_id,'estado',estado,'disponivel',coalesce(disponivel,false),'versao_id',v.id,'situacao',v.situacao);
end $$;
create function app_private.validar_nomes_vip(p_nome text,p_acompanhantes text[]) returns void
language plpgsql security invoker set search_path='' as $$
begin
 if p_nome is null or length(btrim(p_nome)) not between 1 and 120 or p_nome~'[[:cntrl:]]'
  or p_acompanhantes is null or array_ndims(p_acompanhantes)>1 or cardinality(p_acompanhantes)>10
  or exists(select 1 from unnest(p_acompanhantes) n where n is null or length(btrim(n)) not between 1 and 120 or n~'[[:cntrl:]]') then
  raise exception 'nomes_invalidos' using errcode='22023'; end if;
end $$;
create function app_private.exigir_titular_vip() returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from auth.users where id=auth.uid() and not coalesce(is_anonymous,false)) then
  raise exception 'autenticacao_obrigatoria' using errcode='42501'; end if;
end $$;
create function app_private.exigir_produtor_vip(p_contexto jsonb,p_editar boolean default false) returns void
language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is null or not (app_private.tem_permissao((p_contexto->>'marca_id')::uuid,'gerenciar_listas')
  or (not p_editar and app_private.tem_permissao((p_contexto->>'marca_id')::uuid,'consultar_listas'))) then
  raise exception 'sem_permissao' using errcode='42501'; end if;
end $$;

create function app_private.salvar_inscricao_vip(p_lista uuid,p_nome text,p_acompanhantes text[],p_aceita_termos boolean,p_revisao bigint,p_chave uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c jsonb; i public.inscricoes_vip; antes jsonb; parametros jsonb; anterior jsonb; resposta jsonb; avatar text;
begin
 perform app_private.exigir_titular_vip();
 parametros:=jsonb_build_object('lista',p_lista,'nome',p_nome,'acompanhantes',p_acompanhantes,'termos',p_aceita_termos,'revisao',p_revisao);
 anterior:=app_private.repeticao(p_chave,'salvar_inscricao_vip',parametros);c:=app_private.contexto_vip(p_lista,true);
 if anterior is not null then return anterior; end if;
 if c->>'estado'<>'aberta' then raise exception 'lista_nao_aberta' using errcode='PT409'; end if;
 perform app_private.validar_nomes_vip(p_nome,p_acompanhantes);
 if p_aceita_termos is distinct from true or cardinality(p_acompanhantes)>(c->'lista'->>'max_acompanhantes')::integer then
  raise exception 'termos_ou_acompanhantes_invalidos' using errcode='22023'; end if;
 select * into i from public.inscricoes_vip where lista_id=p_lista and usuario_id=auth.uid() for update;
 if p_revisao is null or coalesce(i.revisao,0)<>p_revisao then raise exception 'conflito_revisao' using errcode='PT409'; end if;
 antes:=case when i.id is null then null else to_jsonb(i) end;
 select to_jsonb(p)->>'avatar_url' into avatar from public.perfis p where p.id=auth.uid();
 if avatar !~ '^https://' or length(avatar)>2000 then avatar:=null; end if;
 insert into public.inscricoes_vip(lista_id,usuario_id,nome,acompanhantes,avatar_url)
 values(p_lista,auth.uid(),btrim(p_nome),array(select btrim(n) from unnest(p_acompanhantes) n),avatar)
 on conflict(lista_id,usuario_id) do update set nome=excluded.nome,acompanhantes=excluded.acompanhantes,ativa=true,
  avatar_url=excluded.avatar_url,revisao=public.inscricoes_vip.revisao+1,termos_aceitos_em=clock_timestamp(),atualizado_em=clock_timestamp()
 returning * into i;
 insert into app_private.auditoria_listas_vip(lista_id,autor_id,origem,acao,antes,depois)
 values(p_lista,auth.uid(),'usuario','salvar_inscricao',antes,to_jsonb(i));
 resposta:=jsonb_build_object('inscricao_id',i.id,'revisao',i.revisao);
 return app_private.registrar_operacao(p_chave,'salvar_inscricao_vip',parametros,resposta);
end $$;
create function app_private.cancelar_inscricao_vip(p_lista uuid,p_revisao bigint,p_chave uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c jsonb; i public.inscricoes_vip; antes jsonb; parametros jsonb; anterior jsonb; resposta jsonb;
begin
 perform app_private.exigir_titular_vip();
 parametros:=jsonb_build_object('lista',p_lista,'revisao',p_revisao);
 anterior:=app_private.repeticao(p_chave,'cancelar_inscricao_vip',parametros);c:=app_private.contexto_vip(p_lista,true);
 if anterior is not null then return anterior; end if;
 if c->>'estado'<>'aberta' then raise exception 'lista_nao_aberta' using errcode='PT409'; end if;
 select * into i from public.inscricoes_vip where lista_id=p_lista and usuario_id=auth.uid() for update;
 if i.id is null or not i.ativa or p_revisao is null or i.revisao<>p_revisao then raise exception 'conflito_revisao' using errcode='PT409'; end if;
 antes:=to_jsonb(i);
 update public.inscricoes_vip set ativa=false,revisao=revisao+1,atualizado_em=clock_timestamp() where id=i.id returning * into i;
 insert into app_private.auditoria_listas_vip(lista_id,autor_id,origem,acao,antes,depois) values(p_lista,auth.uid(),'usuario','cancelar_inscricao',antes,to_jsonb(i));
 resposta:=jsonb_build_object('inscricao_id',i.id,'revisao',i.revisao);
 return app_private.registrar_operacao(p_chave,'cancelar_inscricao_vip',parametros,resposta);
end $$;
create function app_private.corrigir_inscricao_vip(p_inscricao uuid,p_nome text,p_acompanhantes text[],p_revisao bigint,p_chave uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c jsonb; i public.inscricoes_vip; antes jsonb; parametros jsonb; anterior jsonb; resposta jsonb;
begin
 parametros:=jsonb_build_object('inscricao',p_inscricao,'nome',p_nome,'acompanhantes',p_acompanhantes,'revisao',p_revisao);
 anterior:=app_private.repeticao(p_chave,'corrigir_inscricao_vip',parametros);
 select * into i from public.inscricoes_vip where id=p_inscricao;
 c:=app_private.contexto_vip(i.lista_id,true);perform app_private.exigir_produtor_vip(c,true);
 if anterior is not null then return anterior; end if;
 if c->>'estado'<>'encerrada' then raise exception 'correcao_somente_apos_fechamento' using errcode='PT409'; end if;
 select * into i from public.inscricoes_vip where id=p_inscricao for update;
 if not i.ativa or p_revisao is null or i.revisao<>p_revisao then raise exception 'conflito_revisao' using errcode='PT409'; end if;
 perform app_private.validar_nomes_vip(p_nome,p_acompanhantes);
 if cardinality(p_acompanhantes)<>cardinality(i.acompanhantes) then raise exception 'quantidade_imutavel' using errcode='22023'; end if;
 antes:=to_jsonb(i);
 update public.inscricoes_vip set nome=btrim(p_nome),acompanhantes=array(select btrim(n) from unnest(p_acompanhantes) n),
  revisao=revisao+1,atualizado_em=clock_timestamp() where id=i.id returning * into i;
 insert into app_private.auditoria_listas_vip(lista_id,autor_id,origem,acao,antes,depois) values(i.lista_id,auth.uid(),'usuario','corrigir_nomes',antes,to_jsonb(i));
 resposta:=jsonb_build_object('inscricao_id',i.id,'revisao',i.revisao);
 return app_private.registrar_operacao(p_chave,'corrigir_inscricao_vip',parametros,resposta);
end $$;
create function app_private.confirmar_data_lista_vip(p_lista uuid,p_versao uuid,p_revisao bigint,p_chave uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c jsonb; anterior jsonb; parametros jsonb; antes jsonb; l public.listas_vip; resposta jsonb;
begin
 parametros:=jsonb_build_object('lista',p_lista,'versao',p_versao,'revisao',p_revisao);
 anterior:=app_private.repeticao(p_chave,'confirmar_data_lista_vip',parametros);
 c:=app_private.contexto_vip(p_lista,true);perform app_private.exigir_produtor_vip(c,true);
 if anterior is not null then return anterior; end if;
 if c->>'estado'='encerrada' or c->>'situacao'<>'adiado' or c->>'disponivel'<>'true' or p_versao is null
  or p_versao::text<>c->>'versao_id' or p_revisao is null or p_revisao<>(c->'lista'->>'revisao')::bigint then
  raise exception 'conflito_data_ou_revisao' using errcode='PT409'; end if;
 antes:=c->'lista';
 update public.listas_vip set versao_data_confirmada_id=p_versao,revisao=revisao+1 where id=p_lista returning * into l;
 insert into app_private.auditoria_listas_vip(lista_id,autor_id,origem,acao,antes,depois) values(p_lista,auth.uid(),'usuario','confirmar_nova_data',antes,to_jsonb(l));
 resposta:=jsonb_build_object('lista_id',l.id,'revisao',l.revisao);
 return app_private.registrar_operacao(p_chave,'confirmar_data_lista_vip',parametros,resposta);
end $$;

create function app_private.consultar_grupos_vip(p_lista uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare c jsonb; grupos jsonb; duplicados jsonb;
begin
 c:=app_private.contexto_vip(p_lista);perform app_private.exigir_produtor_vip(c);
 select coalesce(jsonb_agg(jsonb_build_object('id',i.id,'nome',i.nome,'acompanhantes',i.acompanhantes,'avatar_url',i.avatar_url,'revisao',i.revisao)
 order by i.criado_em,i.id),'[]'::jsonb) into grupos from public.inscricoes_vip i where i.lista_id=p_lista and i.ativa;
 select coalesce(jsonb_agg(nome order by nome),'[]'::jsonb) into duplicados from (
  select lower(regexp_replace(btrim(n),'\s+',' ','g')) nome from public.inscricoes_vip i,
  lateral unnest(array[i.nome]||i.acompanhantes) n where i.lista_id=p_lista and i.ativa group by 1 having count(*)>1
 ) d;
 return jsonb_build_object('estado',c->>'estado','grupos',grupos,'duplicados',duplicados);
end $$;
create function app_private.exportar_lista_vip(p_lista uuid) returns text
language plpgsql stable security definer set search_path='' as $$
declare c jsonb; i public.inscricoes_vip; texto text; total integer:=0; grupo integer:=0; j integer;
begin
 c:=app_private.contexto_vip(p_lista);perform app_private.exigir_produtor_vip(c);
 if c->>'estado'<>'encerrada' then raise exception 'exportacao_somente_apos_fechamento' using errcode='PT409'; end if;
 texto:=regexp_replace(c->'lista'->>'titulo','[[:cntrl:]]',' ','g')||E'\n';
 for i in select * from public.inscricoes_vip where lista_id=p_lista and ativa order by criado_em,id loop
  grupo:=grupo+1;total:=total+1+cardinality(i.acompanhantes);texto:=texto||E'\n'||grupo||'. '||i.nome||E'\n';
  for j in 1..cardinality(i.acompanhantes) loop texto:=texto||'   '||chr(64+j)||'. '||i.acompanhantes[j]||E'\n'; end loop;
 end loop;
 return texto||E'\nTotal de pessoas: '||total;
end $$;
create function app_private.consultar_gestao_listas_vip() returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('evento_id',e.id,'marca',m.nome,'titulo',v.conteudo->>'titulo',
 'data',v.conteudo->>'data','horario',v.conteudo->>'horario','versao_id',v.id,'situacao',v.situacao,
 'gerenciar',app_private.tem_permissao(e.marca_id,'gerenciar_listas'),
 'lista',case when l.id is null then null else (app_private.contexto_vip(l.id)->'lista')||jsonb_build_object('estado',app_private.contexto_vip(l.id)->>'estado') end)
 order by m.nome,v.conteudo->>'data',e.id),'[]'::jsonb)
 from public.eventos e join public.marcas m on m.id=e.marca_id join public.versoes_evento v on v.id=e.versao_publicada_id and v.evento_id=e.id
 left join public.listas_vip l on l.evento_id=e.id where auth.uid() is not null and
 (app_private.tem_permissao(e.marca_id,'gerenciar_listas') or app_private.tem_permissao(e.marca_id,'consultar_listas'))
$$;

create or replace function public.consultar_lista_vip(p_lista uuid) returns jsonb
language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('id',l.id,'evento_id',l.evento_id,'titulo',l.titulo,'termos',l.termos,
 'prazo_inscricao',l.prazo_inscricao,'beneficio_inicio',l.beneficio_inicio,'beneficio_fim',l.beneficio_fim,
 'max_acompanhantes',l.max_acompanhantes,'revisao',l.revisao,
 'estado',case when l.encerrada_em is not null or l.prazo_inscricao<=statement_timestamp() or v.situacao in ('cancelado','interrompido') then 'encerrada'
  when v.situacao='adiado' and l.versao_data_confirmada_id is distinct from v.id then 'suspensa' else 'aberta' end)
 from public.listas_vip l join public.eventos e on e.id=l.evento_id
 join public.versoes_evento v on v.id=e.versao_publicada_id and v.evento_id=e.id where l.id=p_lista
$$;
create function public.consultar_minha_inscricao_vip(p_lista uuid) returns jsonb
language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('id',id,'nome',nome,'acompanhantes',acompanhantes,'ativa',ativa,'revisao',revisao)
 from public.inscricoes_vip where lista_id=p_lista and usuario_id=(select auth.uid())
$$;

-- Generate fixed wrappers, never dynamic client-supplied names or SQL.
do $$
declare signature text; name text; params text; callargs text; result_type text;
begin
 for name,params,callargs,result_type in values
 ('salvar_inscricao_vip','p_lista uuid,p_nome text,p_acompanhantes text[],p_aceita_termos boolean,p_revisao bigint,p_chave uuid','p_lista,p_nome,p_acompanhantes,p_aceita_termos,p_revisao,p_chave','jsonb'),
 ('cancelar_inscricao_vip','p_lista uuid,p_revisao bigint,p_chave uuid','p_lista,p_revisao,p_chave','jsonb'),
 ('corrigir_inscricao_vip','p_inscricao uuid,p_nome text,p_acompanhantes text[],p_revisao bigint,p_chave uuid','p_inscricao,p_nome,p_acompanhantes,p_revisao,p_chave','jsonb'),
 ('confirmar_data_lista_vip','p_lista uuid,p_versao uuid,p_revisao bigint,p_chave uuid','p_lista,p_versao,p_revisao,p_chave','jsonb'),
 ('consultar_grupos_vip','p_lista uuid','p_lista','jsonb'),
 ('exportar_lista_vip','p_lista uuid','p_lista','text'),
 ('consultar_gestao_listas_vip','','','jsonb') loop
  execute format('create function public.%I(%s) returns %s language sql security invoker set search_path='''' as $body$select app_private.%I(%s)$body$',name,params,result_type,name,callargs);
 end loop;
 -- Every new helper defaults to no client access. Only the seven wrappers'
 -- corresponding private entry points get authenticated EXECUTE below.
 for signature in select p.oid::regprocedure::text from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='app_private' and p.proname in ('contexto_vip','validar_nomes_vip','exigir_titular_vip','exigir_produtor_vip',
  'salvar_inscricao_vip','cancelar_inscricao_vip','corrigir_inscricao_vip','confirmar_data_lista_vip','consultar_grupos_vip','exportar_lista_vip','consultar_gestao_listas_vip') loop
  execute 'revoke all on function '||signature||' from public,anon,authenticated';
 end loop;
 for signature in select p.oid::regprocedure::text from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname in ('public','app_private') and p.proname in ('salvar_inscricao_vip','cancelar_inscricao_vip','corrigir_inscricao_vip',
  'confirmar_data_lista_vip','consultar_grupos_vip','exportar_lista_vip','consultar_gestao_listas_vip') loop
  execute 'revoke all on function '||signature||' from public,anon,authenticated';
  execute 'grant execute on function '||signature||' to authenticated';
 end loop;
end $$;
revoke all on function public.consultar_minha_inscricao_vip(uuid) from public,anon;
grant execute on function public.consultar_minha_inscricao_vip(uuid) to authenticated;
create function public.consultar_lista_vip_evento(p_evento_legado text) returns jsonb
language sql stable security invoker set search_path='' as $$
 select public.consultar_lista_vip(l.id) from public.listas_vip l join public.eventos e on e.id=l.evento_id where e.id_legado=p_evento_legado
$$;
revoke all on function public.consultar_lista_vip_evento(text) from public;
grant execute on function public.consultar_lista_vip_evento(text) to anon,authenticated;
