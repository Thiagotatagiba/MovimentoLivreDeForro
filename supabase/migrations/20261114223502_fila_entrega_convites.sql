-- Pending for production. Server-only invitation delivery; no automatic schedule.
grant usage on schema app_private to service_role;
alter table app_private.outbox_convites
 add column reserva_id uuid,
 add column reservado_ate timestamptz,
 add column proxima_tentativa_em timestamptz not null default clock_timestamp(),
 add column primeira_tentativa_em timestamptz,
 add column falhou_em timestamptz,
 add column falha_codigo text,
 add column provedor_id text,
 add column payload jsonb;
create table app_private.execucoes_convites (
 reserva_id uuid primary key,
 outbox_id uuid not null references app_private.outbox_convites(id),
 iniciado_em timestamptz not null default clock_timestamp(),
 finalizado_em timestamptz,
 resultado text not null default 'reservado',
 codigo text,
 provedor_id text
);
alter table app_private.execucoes_convites enable row level security;
revoke all on app_private.execucoes_convites from public,anon,authenticated;
create index execucoes_convites_outbox_idx on app_private.execucoes_convites(outbox_id,iniciado_em desc);
create index outbox_convites_disponiveis_idx on app_private.outbox_convites(proxima_tentativa_em,criado_em)
 where processado_em is null and cancelado_em is null and falhou_em is null and token is not null;

create function app_private.exigir_servico_convites() returns void
language plpgsql security invoker set search_path='' as $$
begin
 if coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'role','')<>'service_role' then
  raise exception 'servico_obrigatorio' using errcode='42501';
 end if;
end
$$;
revoke all on function app_private.exigir_servico_convites() from public,anon,authenticated;
grant execute on function app_private.exigir_servico_convites() to service_role;

-- Existing accept/revoke RPCs already scrub token; extend that scrub to any
-- frozen email body and lease without changing their authorization contracts.
create function app_private.limpar_payload_convite() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if new.token is null then
  new.payload:=null;new.reserva_id:=null;new.reservado_ate:=null;
  if old.reserva_id is not null then
   update app_private.execucoes_convites set finalizado_em=clock_timestamp(),resultado='cancelado',codigo='convite_inativo'
    where reserva_id=old.reserva_id and finalizado_em is null;
  end if;
 end if;
 return new;
end
$$;
revoke all on function app_private.limpar_payload_convite() from public,anon,authenticated;
create trigger limpar_payload_convite before update on app_private.outbox_convites
 for each row execute function app_private.limpar_payload_convite();

create function app_private.limpar_entregas_convites() returns jsonb
language plpgsql security definer set search_path='' as $$
declare marca uuid; expirados integer:=0; cancelados integer:=0; incertos integer:=0; n integer;
begin
 perform app_private.exigir_servico_convites();
 -- Brand -> invitation -> outbox, the same order as the administrative RPCs.
 for marca in select m.id from public.marcas m where exists(
  select 1 from public.convites_marca c join app_private.outbox_convites o on o.convite_id=c.id
  where c.marca_id=m.id and o.token is not null and
   (c.estado<>'pendente' or c.expira_em<=clock_timestamp() or o.tentativas>=5
    or o.primeira_tentativa_em<clock_timestamp()-interval '23 hours'))
  order by m.id for update skip locked limit 100 loop
  update public.convites_marca set estado='expirado' where marca_id=marca and estado='pendente' and expira_em<=clock_timestamp();
  get diagnostics n=row_count;expirados:=expirados+n;
  update app_private.execucoes_convites e set finalizado_em=clock_timestamp(),resultado='cancelado',codigo='convite_inativo'
  where e.finalizado_em is null and exists(select 1 from app_private.outbox_convites o join public.convites_marca c on c.id=o.convite_id
   where o.id=e.outbox_id and c.marca_id=marca and (c.estado<>'pendente' or c.expira_em<=clock_timestamp()));
  update app_private.outbox_convites o set token=null,cancelado_em=coalesce(cancelado_em,clock_timestamp())
  from public.convites_marca c where c.id=o.convite_id and c.marca_id=marca and o.token is not null
   and (c.estado<>'pendente' or c.expira_em<=clock_timestamp());
  get diagnostics n=row_count;cancelados:=cancelados+n;
  -- Never retry an ambiguous send beyond the provider's 24-hour dedupe window.
  update app_private.execucoes_convites e set finalizado_em=clock_timestamp(),resultado='indeterminado',codigo='limite_seguro'
  where e.finalizado_em is null and exists(select 1 from app_private.outbox_convites o join public.convites_marca c on c.id=o.convite_id
   where o.id=e.outbox_id and c.marca_id=marca and o.token is not null and (o.reservado_ate is null or o.reservado_ate<=clock_timestamp())
   and (o.tentativas>=5 or o.primeira_tentativa_em<clock_timestamp()-interval '23 hours'));
  update app_private.outbox_convites o set token=null,falhou_em=clock_timestamp(),falha_codigo='limite_seguro'
  from public.convites_marca c where c.id=o.convite_id and c.marca_id=marca and o.token is not null
   and (o.reservado_ate is null or o.reservado_ate<=clock_timestamp())
   and (o.tentativas>=5 or o.primeira_tentativa_em<clock_timestamp()-interval '23 hours');
  get diagnostics n=row_count;incertos:=incertos+n;
 end loop;
 return jsonb_build_object('expirados',expirados,'cancelados',cancelados,'limite_seguro',incertos);
end
$$;

create function app_private.reservar_entrega_convite() returns jsonb
language plpgsql security definer set search_path='' as $$
declare marca uuid; convite public.convites_marca; job app_private.outbox_convites; reserva uuid;
begin
 perform app_private.exigir_servico_convites();
 for marca in select m.id from public.marcas m where m.ativo and exists(
  select 1 from public.convites_marca c join app_private.outbox_convites o on o.convite_id=c.id
  where c.marca_id=m.id and c.estado='pendente' and c.expira_em>clock_timestamp() and o.token is not null
  and o.processado_em is null and o.cancelado_em is null and o.falhou_em is null and o.tentativas<5
  and o.proxima_tentativa_em<=clock_timestamp() and (o.reservado_ate is null or o.reservado_ate<=clock_timestamp())
  and (o.primeira_tentativa_em is null or o.primeira_tentativa_em>clock_timestamp()-interval '23 hours'))
  order by m.id for update skip locked limit 100 loop
  select c.* into convite from public.convites_marca c join app_private.outbox_convites o on o.convite_id=c.id
   where c.marca_id=marca and c.estado='pendente' and c.expira_em>clock_timestamp() and o.token is not null
   and o.processado_em is null and o.cancelado_em is null and o.falhou_em is null and o.tentativas<5
   and o.proxima_tentativa_em<=clock_timestamp() and (o.reservado_ate is null or o.reservado_ate<=clock_timestamp())
   and (o.primeira_tentativa_em is null or o.primeira_tentativa_em>clock_timestamp()-interval '23 hours')
   and (exists(select 1 from public.administradores_sistema where usuario_id=c.criado_por and ativo)
    or exists(select 1 from public.membros_marca where marca_id=marca and usuario_id=c.criado_por and ativo and papel='administrador'))
   order by o.criado_em,c.id for update of c skip locked limit 1;
  if not found then continue;end if;
  select * into job from app_private.outbox_convites where convite_id=convite.id for update;
  update app_private.execucoes_convites set finalizado_em=clock_timestamp(),resultado='reserva_expirada'
   where outbox_id=job.id and finalizado_em is null;
  reserva:=gen_random_uuid();
  update app_private.outbox_convites set reserva_id=reserva,reservado_ate=clock_timestamp()+interval '120 seconds',
   tentativas=tentativas+1,primeira_tentativa_em=coalesce(primeira_tentativa_em,clock_timestamp()) where id=job.id;
  insert into app_private.execucoes_convites(reserva_id,outbox_id) values(reserva,job.id);
  return jsonb_build_object('outbox_id',job.id,'reserva_id',reserva,'convite_id',convite.id,'email',convite.email_destino,
   'papel',convite.papel,'permissoes',convite.permissoes,'expira_em',convite.expira_em,'token',job.token,'payload',job.payload,
   'marca',(select nome from public.marcas where id=marca));
 end loop;
 return null;
end
$$;

create function app_private.iniciar_entrega_convite(p_outbox uuid,p_reserva uuid,p_payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare marca uuid; convite public.convites_marca; job app_private.outbox_convites;
begin
 perform app_private.exigir_servico_convites();
 select c.marca_id into marca from public.convites_marca c join app_private.outbox_convites o on o.convite_id=c.id where o.id=p_outbox;
 if marca is null then raise exception 'reserva_indisponivel' using errcode='PT409';end if;
 perform 1 from public.marcas where id=marca for update;
 select c.* into convite from public.convites_marca c join app_private.outbox_convites o on o.convite_id=c.id where o.id=p_outbox for update of c;
 select * into job from app_private.outbox_convites where id=p_outbox for update;
 if job.reserva_id is distinct from p_reserva or job.reservado_ate<=clock_timestamp() then
  raise exception 'reserva_indisponivel' using errcode='PT409';end if;
 if convite.estado<>'pendente' or convite.expira_em<=clock_timestamp()
  or not exists(select 1 from public.marcas where id=marca and ativo)
  or not (exists(select 1 from public.administradores_sistema where usuario_id=convite.criado_por and ativo)
   or exists(select 1 from public.membros_marca where marca_id=marca and usuario_id=convite.criado_por and ativo and papel='administrador')) then
  update app_private.outbox_convites set token=null,cancelado_em=clock_timestamp() where id=job.id;
  update app_private.execucoes_convites set finalizado_em=clock_timestamp(),resultado='cancelado',codigo='convite_inativo' where reserva_id=p_reserva;
  return null;
 end if;
 if job.payload is not null then return job.payload;end if;
 if p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>32768
  or jsonb_typeof(p_payload->'to') is distinct from 'array' or p_payload->'to'<>jsonb_build_array(convite.email_destino)
  or nullif(p_payload->>'from','') is null or coalesce(p_payload->>'from','')~'[\r\n]'
  or nullif(p_payload->>'subject','') is null or coalesce(p_payload->>'subject','')~'[\r\n]'
  or position(job.token in coalesce(p_payload->>'text',''))=0
  or exists(select 1 from jsonb_object_keys(p_payload) k where k<>all(array['from','to','subject','text','html'])) then
  raise exception 'mensagem_invalida' using errcode='22023';
 end if;
 update app_private.outbox_convites set payload=p_payload where id=job.id;
 return p_payload;
end
$$;

create function app_private.finalizar_entrega_convite(p_outbox uuid,p_reserva uuid,p_resultado text,p_provedor_id text,p_codigo text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare marca uuid; job app_private.outbox_convites; execucao app_private.execucoes_convites; atraso integer;
begin
 perform app_private.exigir_servico_convites();
 if p_resultado is null or p_resultado<>all(array['enviado','transitorio','permanente'])
  or (p_resultado='enviado' and (p_provedor_id is null or p_provedor_id!~'^[A-Za-z0-9_-]{1,160}$'))
  or (p_resultado<>'enviado' and p_provedor_id is not null)
  or (p_codigo is not null and p_codigo!~'^[a-z0-9_]{1,40}$') then
  raise exception 'resultado_invalido' using errcode='22023';end if;
 select c.marca_id into marca from public.convites_marca c join app_private.outbox_convites o on o.convite_id=c.id where o.id=p_outbox;
 if marca is null then raise exception 'reserva_indisponivel' using errcode='PT409';end if;
 perform 1 from public.marcas where id=marca for update;
 perform 1 from public.convites_marca c join app_private.outbox_convites o on o.convite_id=c.id where o.id=p_outbox for update of c;
 select * into job from app_private.outbox_convites where id=p_outbox for update;
 select * into execucao from app_private.execucoes_convites where reserva_id=p_reserva and outbox_id=p_outbox;
 if execucao.finalizado_em is not null and execucao.resultado=any(array['enviado','transitorio','permanente']) then
  if execucao.resultado<>p_resultado or execucao.provedor_id is distinct from p_provedor_id or execucao.codigo is distinct from p_codigo then
   raise exception 'resultado_reutilizado' using errcode='22023';end if;
  return jsonb_build_object('registrado',true);
 end if;
 if job.reserva_id is distinct from p_reserva or job.reservado_ate<=clock_timestamp() then
  return jsonb_build_object('registrado',false,'reserva_expirada',true);end if;
 update app_private.execucoes_convites set finalizado_em=clock_timestamp(),resultado=p_resultado,codigo=p_codigo,
  provedor_id=case when p_resultado='enviado' then p_provedor_id else null end where reserva_id=p_reserva and outbox_id=p_outbox;
 if p_resultado='enviado' then
  update app_private.outbox_convites set processado_em=clock_timestamp(),token=null,provedor_id=p_provedor_id,
   falha_codigo=null where id=job.id;
 elsif p_resultado='permanente' or job.tentativas>=5 or job.primeira_tentativa_em<=clock_timestamp()-interval '23 hours' then
  update app_private.outbox_convites set falhou_em=clock_timestamp(),token=null,falha_codigo=coalesce(p_codigo,'limite_seguro') where id=job.id;
 else
  atraso:=least(3600,60*power(2,job.tentativas-1)::integer);
  update app_private.outbox_convites set reserva_id=null,reservado_ate=null,proxima_tentativa_em=clock_timestamp()+make_interval(secs=>atraso),
   falha_codigo=p_codigo where id=job.id;
 end if;
 return jsonb_build_object('registrado',true);
end
$$;

create function public.limpar_entregas_convites() returns jsonb language sql security invoker set search_path='' as $$select app_private.limpar_entregas_convites()$$;
create function public.reservar_entrega_convite() returns jsonb language sql security invoker set search_path='' as $$select app_private.reservar_entrega_convite()$$;
create function public.iniciar_entrega_convite(p_outbox uuid,p_reserva uuid,p_payload jsonb) returns jsonb language sql security invoker set search_path='' as $$select app_private.iniciar_entrega_convite(p_outbox,p_reserva,p_payload)$$;
create function public.finalizar_entrega_convite(p_outbox uuid,p_reserva uuid,p_resultado text,p_provedor_id text,p_codigo text) returns jsonb language sql security invoker set search_path='' as $$select app_private.finalizar_entrega_convite(p_outbox,p_reserva,p_resultado,p_provedor_id,p_codigo)$$;
revoke all on function public.limpar_entregas_convites(),public.reservar_entrega_convite(),public.iniciar_entrega_convite(uuid,uuid,jsonb),
 public.finalizar_entrega_convite(uuid,uuid,text,text,text),app_private.limpar_entregas_convites(),app_private.reservar_entrega_convite(),
 app_private.iniciar_entrega_convite(uuid,uuid,jsonb),app_private.finalizar_entrega_convite(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.limpar_entregas_convites(),public.reservar_entrega_convite(),public.iniciar_entrega_convite(uuid,uuid,jsonb),
 public.finalizar_entrega_convite(uuid,uuid,text,text,text),app_private.limpar_entregas_convites(),app_private.reservar_entrega_convite(),
 app_private.iniciar_entrega_convite(uuid,uuid,jsonb),app_private.finalizar_entrega_convite(uuid,uuid,text,text,text) to service_role;
