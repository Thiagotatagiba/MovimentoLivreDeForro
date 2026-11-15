-- Optimistic edits; an address used by any published version is copy-on-write.
alter table public.marcas add column revisao bigint not null default 1 check(revisao>0);
alter table public.locais add column revisao bigint not null default 1 check(revisao>0);

create function app_private.consultar_cadastros_catalogo() returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if not app_private.admin_global() then raise exception 'somente_administrador_global' using errcode='42501'; end if;
 return jsonb_build_object('marcas',(select coalesce(jsonb_agg(to_jsonb(m) order by m.nome,m.id),'[]') from public.marcas m),
 'locais',(select coalesce(jsonb_agg(to_jsonb(l)||jsonb_build_object('tem_publicacao',exists(select 1 from public.eventos e join public.versoes_evento v on v.evento_id=e.id where e.local_id=l.id)) order by l.nome,l.id),'[]') from public.locais l));
end $$;

create function app_private.validar_edicao_catalogo(p_tipo text,p_conteudo jsonb) returns void
language plpgsql security invoker set search_path='' as $$
declare campo text; valor jsonb; endereco jsonb;
begin
 if p_tipo is null or p_tipo not in ('marca','local') or p_conteudo is null or jsonb_typeof(p_conteudo)<>'object' or p_conteudo='{}'::jsonb then
  raise exception 'edicao_invalida' using errcode='22023'; end if;
 for campo,valor in select * from jsonb_each(p_conteudo) loop
  if campo<>all(case when p_tipo='marca' then array['nome','localPadraoId','descricao','frequencia','diasSemana','categorias','cidadeBase','instagram','whatsapp','site','logo','capa','ativo']
   else array['nome','endereco','latitude','longitude','tipo','descricao','instagram','site','telefone','ativo'] end) then
   raise exception 'campo_nao_editavel' using errcode='22023'; end if;
  if campo not in ('endereco','latitude','longitude','diasSemana','categorias','ativo') and (jsonb_typeof(valor)<>'string' or length(valor#>>'{}')>10000) then
   raise exception 'campo_invalido' using errcode='22023'; end if;
  if campo='ativo' and jsonb_typeof(valor)<>'boolean' then raise exception 'ativo_invalido' using errcode='22023'; end if;
  if campo='nome' and (length(btrim(valor#>>'{}'))<2 or length(btrim(valor#>>'{}'))>160) then raise exception 'nome_obrigatorio' using errcode='22023'; end if;
  if campo in ('instagram','whatsapp','site','logo','capa') and valor#>>'{}'<>'' and
   (length(valor#>>'{}')>2000 or valor#>>'{}' !~ '^https://[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?(:[0-9]{1,5})?([/?#][^[:space:][:cntrl:]]*)?$') then
   raise exception 'url_https_invalida' using errcode='22023'; end if;
  if campo in ('diasSemana','categorias') then
   if jsonb_typeof(valor)<>'array' then raise exception 'lista_invalida' using errcode='22023'; end if;
   if exists(select 1 from jsonb_array_elements(valor) x where jsonb_typeof(x)<>'string' or length(x#>>'{}')>100) then raise exception 'lista_invalida' using errcode='22023'; end if;
  end if;
  if campo='endereco' then
   endereco:=valor;
   if jsonb_typeof(endereco)<>'object' then raise exception 'endereco_invalido' using errcode='22023'; end if;
   if exists(select 1 from jsonb_each(endereco) x where x.key<>all(array['cep','logradouro','numero','complemento','bairro','cidade','estado']) or jsonb_typeof(x.value)<>'string' or length(x.value#>>'{}')>300) then raise exception 'endereco_invalido' using errcode='22023'; end if;
   if exists(select 1 from unnest(array['logradouro','numero','bairro','cidade','estado']) c where nullif(btrim(endereco->>c),'') is null) or endereco->>'estado' !~ '^[A-Z]{2}$' then raise exception 'endereco_incompleto' using errcode='22023'; end if;
  end if;
  if campo in ('latitude','longitude') then
   if jsonb_typeof(valor)<>'number' then raise exception 'ponto_invalido' using errcode='22023'; end if;
   if not((valor#>>'{}')::double precision between case when campo='latitude' then -90 else -180 end and case when campo='latitude' then 90 else 180 end) then raise exception 'ponto_invalido' using errcode='22023'; end if;
  end if;
 end loop;
end $$;

create function app_private.editar_cadastro_catalogo(p_tipo text,p_id uuid,p_revisao bigint,p_conteudo jsonb,p_chave uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare m public.marcas; l public.locais; depois jsonb; antes jsonb; parametros jsonb; anterior jsonb; resultado jsonb;
 novo uuid; local_padrao uuid; v_nome text; novo_slug text; endereco_novo jsonb; lat double precision; lon double precision;
 mudou_endereco boolean:=false; publicado boolean:=false; bifurcado boolean:=false; revisao_anterior bigint;
begin
 parametros:=jsonb_build_object('id',p_id,'revisao',p_revisao,'conteudo',p_conteudo);
 anterior:=app_private.repeticao(p_chave,'editar_'||p_tipo,parametros);
 perform 1 from public.administradores_sistema where usuario_id=auth.uid() and ativo for share;
 if not found then raise exception 'somente_administrador_global' using errcode='42501'; end if;
 if anterior is not null then return anterior; end if;
 perform app_private.validar_edicao_catalogo(p_tipo,p_conteudo);
 if p_tipo='marca' then
  select * into m from public.marcas where id=p_id for update;
  if not found then raise exception 'cadastro_indisponivel' using errcode='22023'; end if;
  if p_revisao is null or p_revisao<>m.revisao then raise exception 'conflito_revisao' using errcode='PT409'; end if;
  antes:=to_jsonb(m);v_nome:=coalesce(btrim(p_conteudo->>'nome'),m.nome);
  if p_conteudo ? 'nome' then
   perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('catalogo:marca:'||lower(v_nome),0));
   if exists(select 1 from public.marcas x where x.id<>m.id and lower(btrim(x.nome))=lower(v_nome)) then raise exception 'cadastro_ja_existe' using errcode='22023'; end if;
  end if;
  local_padrao:=m.local_padrao_id;
  if p_conteudo ? 'localPadraoId' then
   local_padrao:=nullif(p_conteudo->>'localPadraoId','')::uuid;
   if local_padrao is not null then
    perform 1 from public.locais where id=local_padrao and ativo and id_legado is not null for share;
    if not found then raise exception 'local_padrao_indisponivel' using errcode='22023'; end if;
   end if;
  end if;
  update public.marcas set nome=v_nome,local_padrao_id=local_padrao,dados=dados||(p_conteudo-'nome'-'localPadraoId'-'ativo'),
   ativo=coalesce((p_conteudo->>'ativo')::boolean,m.ativo),revisao=revisao+1,atualizado_em=now() where id=m.id returning to_jsonb(marcas.*) into depois;
 else
  select * into l from public.locais where id=p_id for update;
  if not found then raise exception 'cadastro_indisponivel' using errcode='22023'; end if;
  if p_revisao is null or p_revisao<>l.revisao then raise exception 'conflito_revisao' using errcode='PT409'; end if;
  antes:=to_jsonb(l);v_nome:=coalesce(btrim(p_conteudo->>'nome'),l.nome);
  endereco_novo:=coalesce(p_conteudo->'endereco',l.endereco);lat:=coalesce((p_conteudo->>'latitude')::double precision,l.latitude);lon:=coalesce((p_conteudo->>'longitude')::double precision,l.longitude);
  mudou_endereco:=endereco_novo is distinct from l.endereco or lat is distinct from l.latitude or lon is distinct from l.longitude;
  if mudou_endereco and (lat is null or lon is null) then raise exception 'confirme_ponto_no_mapa' using errcode='22023'; end if;
  -- Publishers and editors lock the venue, so this check cannot race a first publication.
  publicado:=exists(select 1 from public.eventos e join public.versoes_evento v on v.evento_id=e.id where e.local_id=l.id);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('catalogo:local:'||lower(v_nome),0));
  if exists(select 1 from public.locais x where x.id<>l.id and lower(btrim(x.nome))=lower(v_nome) and x.endereco=endereco_novo and x.latitude is not distinct from lat and x.longitude is not distinct from lon) then raise exception 'cadastro_ja_existe' using errcode='22023'; end if;
  if mudou_endereco and publicado then
   if p_conteudo ? 'ativo' and (p_conteudo->>'ativo')::boolean is distinct from l.ativo then raise exception 'altere_situacao_separadamente' using errcode='22023'; end if;
   bifurcado:=true;novo:=gen_random_uuid();
   novo_slug:=coalesce(nullif(left(btrim(regexp_replace(translate(lower(v_nome),'áàâãäéèêëíìîïóòôõöúùûüçñ','aaaaaeeeeiiiiooooouuuucn'),'[^a-z0-9]+','-','g'),'-'),60),''),'local')||'-'||replace(novo::text,'-','');
   insert into public.locais(id,id_legado,slug,nome,endereco,latitude,longitude,dados,ativo)
   values(novo,'loc-'||novo::text,novo_slug,v_nome,endereco_novo,lat,lon,
    l.dados||(p_conteudo-'nome'-'endereco'-'latitude'-'longitude'-'ativo')||jsonb_build_object('mapsLink','https://www.google.com/maps?q='||lat::text||','||lon::text),coalesce((p_conteudo->>'ativo')::boolean,l.ativo)) returning to_jsonb(locais.*) into depois;
   update public.locais set revisao=revisao+1,atualizado_em=now() where id=l.id returning revisao into revisao_anterior;
  else
   update public.locais set nome=v_nome,endereco=endereco_novo,latitude=lat,longitude=lon,
    dados=dados||(p_conteudo-'nome'-'endereco'-'latitude'-'longitude'-'ativo')||case when mudou_endereco then jsonb_build_object('mapsLink','https://www.google.com/maps?q='||lat::text||','||lon::text) else '{}'::jsonb end,
    ativo=coalesce((p_conteudo->>'ativo')::boolean,l.ativo),revisao=revisao+1,atualizado_em=now() where id=l.id returning to_jsonb(locais.*) into depois;
  end if;
  depois:=depois||jsonb_build_object('tem_publicacao',publicado and not bifurcado);
 end if;
 insert into public.auditoria_catalogo(entidade,entidade_id,autor_id,conteudo) values(p_tipo,(depois->>'id')::uuid,auth.uid(),jsonb_build_object('acao','editar','antes',antes,'depois',depois,'novo_endereco',bifurcado));
 resultado:=jsonb_build_object('id',depois->'id','tipo',p_tipo,'registro',depois,'novo_endereco',bifurcado,'anterior_id',case when bifurcado then p_id else null end,'anterior_revisao',revisao_anterior);
 return app_private.registrar_operacao(p_chave,'editar_'||p_tipo,parametros,resultado);
end $$;

-- Publication must hold a shared venue lock, matching editor FOR UPDATE.
create or replace function app_private.publicar_evento(p_evento uuid,p_revisao bigint,p_chave uuid)
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
  raise exception 'conflito_revisao' using errcode='PT409';
 end if;
 select * into marca from public.marcas where id=e.marca_id;
 select * into local from public.locais where id=e.local_id for share;
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


create function public.consultar_cadastros_catalogo() returns jsonb language sql security invoker set search_path='' as $$select app_private.consultar_cadastros_catalogo()$$;
create function public.editar_marca_catalogo(p_id uuid,p_revisao bigint,p_conteudo jsonb,p_chave uuid) returns jsonb language sql security invoker set search_path='' as $$select app_private.editar_cadastro_catalogo('marca',p_id,p_revisao,p_conteudo,p_chave)$$;
create function public.editar_local_catalogo(p_id uuid,p_revisao bigint,p_conteudo jsonb,p_chave uuid) returns jsonb language sql security invoker set search_path='' as $$select app_private.editar_cadastro_catalogo('local',p_id,p_revisao,p_conteudo,p_chave)$$;
revoke all on function app_private.validar_edicao_catalogo(text,jsonb),app_private.consultar_cadastros_catalogo(),app_private.editar_cadastro_catalogo(text,uuid,bigint,jsonb,uuid),public.consultar_cadastros_catalogo(),public.editar_marca_catalogo(uuid,bigint,jsonb,uuid),public.editar_local_catalogo(uuid,bigint,jsonb,uuid) from public,anon,authenticated;
grant execute on function app_private.consultar_cadastros_catalogo(),app_private.editar_cadastro_catalogo(text,uuid,bigint,jsonb,uuid),public.consultar_cadastros_catalogo(),public.editar_marca_catalogo(uuid,bigint,jsonb,uuid),public.editar_local_catalogo(uuid,bigint,jsonb,uuid) to authenticated;
