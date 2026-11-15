-- Official catalog creation is global-only. Existing rows are never updated.
create table public.auditoria_catalogo (
 id uuid primary key default gen_random_uuid(),
 entidade text not null check(entidade in ('marca','local')),
 entidade_id uuid not null,
 autor_id uuid not null references auth.users(id),
 conteudo jsonb not null,
 criado_em timestamptz not null default now()
);
alter table public.auditoria_catalogo enable row level security;
revoke all on public.auditoria_catalogo from public,anon,authenticated;
grant select on public.auditoria_catalogo to authenticated;
create policy auditoria_catalogo_global on public.auditoria_catalogo for select to authenticated using(app_private.admin_global());

create function app_private.criar_cadastro_catalogo(p_tipo text,p_conteudo jsonb,p_chave uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare anterior jsonb; resultado jsonb; novo uuid; legado text; novo_slug text; campo text; valor jsonb;
 v_nome text; dados jsonb; endereco jsonb; local_id uuid; lat double precision; lon double precision;
begin
 anterior:=app_private.repeticao(p_chave,'criar_'||p_tipo,p_conteudo);
 -- Revalidate authority even on replay; serialize against revocation of this role.
 perform 1 from public.administradores_sistema where usuario_id=auth.uid() and ativo for share;
 if not found then raise exception 'somente_administrador_global' using errcode='42501'; end if;
 if anterior is not null then return anterior; end if;
 if p_tipo is null or p_tipo not in ('marca','local') or p_conteudo is null or jsonb_typeof(p_conteudo)<>'object' then
  raise exception 'cadastro_invalido' using errcode='22023'; end if;
 for campo,valor in select * from jsonb_each(p_conteudo) loop
  if campo<>all(case when p_tipo='marca' then array['nome','localPadraoId','descricao','frequencia','diasSemana','categorias','cidadeBase','instagram','whatsapp','site','logo','capa']
   else array['nome','endereco','latitude','longitude','tipo','descricao','instagram','site','telefone'] end) then
   raise exception 'campo_nao_editavel' using errcode='22023'; end if;
  if campo not in ('endereco','latitude','longitude','diasSemana','categorias') and (jsonb_typeof(valor)<>'string' or length(valor#>>'{}')>10000) then
   raise exception 'campo_invalido' using errcode='22023'; end if;
  if campo in ('instagram','whatsapp','site','logo','capa') and valor#>>'{}'<>'' and
   (length(valor#>>'{}')>2000 or valor#>>'{}' !~ '^https://[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?(:[0-9]{1,5})?([/?#][^[:space:][:cntrl:]]*)?$') then
   raise exception 'url_https_invalida' using errcode='22023'; end if;
 end loop;
 v_nome:=btrim(p_conteudo->>'nome');
 if v_nome is null or length(v_nome)<2 or length(v_nome)>160 then raise exception 'nome_obrigatorio' using errcode='22023'; end if;
 -- One catalog name cannot be accidentally created twice, including competing requests.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('catalogo:'||p_tipo||':'||lower(v_nome),0));
 if (p_tipo='marca' and exists(select 1 from public.marcas m where lower(btrim(m.nome))=lower(v_nome))) or
    (p_tipo='local' and exists(select 1 from public.locais l where lower(btrim(l.nome))=lower(v_nome) and l.endereco=p_conteudo->'endereco')) then
  raise exception 'cadastro_ja_existe' using errcode='22023'; end if;
 novo:=gen_random_uuid();legado:=case when p_tipo='marca' then 'mrc-' else 'loc-' end||novo::text;
 novo_slug:=left(btrim(regexp_replace(translate(lower(v_nome),'áàâãäéèêëíìîïóòôõöúùûüçñ','aaaaaeeeeiiiiooooouuuucn'),'[^a-z0-9]+','-','g'),'-'),60);
 novo_slug:=coalesce(nullif(novo_slug,''),p_tipo)||'-'||replace(novo::text,'-','');
 if p_tipo='marca' then
  for campo in select unnest(array['diasSemana','categorias']) loop
   if p_conteudo ? campo then
    if jsonb_typeof(p_conteudo->campo)<>'array' then raise exception 'lista_invalida' using errcode='22023'; end if;
    if exists(select 1 from jsonb_array_elements(p_conteudo->campo) x where jsonb_typeof(x)<>'string' or length(x#>>'{}')>100) then
     raise exception 'lista_invalida' using errcode='22023'; end if;
   end if;
  end loop;
  if nullif(p_conteudo->>'localPadraoId','') is not null then
   local_id:=(p_conteudo->>'localPadraoId')::uuid;
   perform 1 from public.locais where id=local_id and ativo and id_legado is not null for share;
   if not found then raise exception 'local_padrao_indisponivel' using errcode='22023'; end if;
  end if;
  dados:=p_conteudo-'nome'-'localPadraoId';
  insert into public.marcas(id,id_legado,slug,nome,local_padrao_id,dados) values(novo,legado,novo_slug,v_nome,local_id,dados);
 else
  endereco:=p_conteudo->'endereco';
  if endereco is null or jsonb_typeof(endereco)<>'object' then raise exception 'endereco_obrigatorio' using errcode='22023'; end if;
  for campo,valor in select * from jsonb_each(endereco) loop
   if campo<>all(array['cep','logradouro','numero','complemento','bairro','cidade','estado']) or jsonb_typeof(valor)<>'string' or length(valor#>>'{}')>300 then
    raise exception 'endereco_invalido' using errcode='22023'; end if;
  end loop;
  if exists(select 1 from unnest(array['logradouro','numero','bairro','cidade','estado']) c where nullif(btrim(endereco->>c),'') is null)
   or endereco->>'estado' !~ '^[A-Z]{2}$' then raise exception 'endereco_incompleto' using errcode='22023'; end if;
  if jsonb_typeof(p_conteudo->'latitude') is distinct from 'number' or jsonb_typeof(p_conteudo->'longitude') is distinct from 'number' then
   raise exception 'confirme_ponto_no_mapa' using errcode='22023'; end if;
  lat:=(p_conteudo->>'latitude')::double precision;lon:=(p_conteudo->>'longitude')::double precision;
  if not(lat between -90 and 90 and lon between -180 and 180) then raise exception 'ponto_invalido' using errcode='22023'; end if;
  dados:=(p_conteudo-'nome'-'endereco'-'latitude'-'longitude')||jsonb_build_object('origem','manual','mapsLink','https://www.google.com/maps?q='||lat::text||','||lon::text);
  insert into public.locais(id,id_legado,slug,nome,endereco,latitude,longitude,dados) values(novo,legado,novo_slug,v_nome,endereco,lat,lon,dados);
 end if;
 resultado:=jsonb_build_object('id',novo,'id_legado',legado,'slug',novo_slug,'nome',v_nome,'tipo',p_tipo);
 insert into public.auditoria_catalogo(entidade,entidade_id,autor_id,conteudo) values(p_tipo,novo,auth.uid(),p_conteudo);
 return app_private.registrar_operacao(p_chave,'criar_'||p_tipo,p_conteudo,resultado);
end $$;
create function public.criar_marca_catalogo(p_conteudo jsonb,p_chave uuid) returns jsonb language sql security invoker set search_path='' as $$select app_private.criar_cadastro_catalogo('marca',p_conteudo,p_chave)$$;
create function public.criar_local_catalogo(p_conteudo jsonb,p_chave uuid) returns jsonb language sql security invoker set search_path='' as $$select app_private.criar_cadastro_catalogo('local',p_conteudo,p_chave)$$;
revoke all on function app_private.criar_cadastro_catalogo(text,jsonb,uuid),public.criar_marca_catalogo(jsonb,uuid),public.criar_local_catalogo(jsonb,uuid) from public,anon,authenticated;
grant execute on function app_private.criar_cadastro_catalogo(text,jsonb,uuid),public.criar_marca_catalogo(jsonb,uuid),public.criar_local_catalogo(jsonb,uuid) to authenticated;
