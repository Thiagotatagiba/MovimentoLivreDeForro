-- Preserve signatures, grants, audit and idempotency; extend the approved public content.
create or replace function app_private.validar_publicacao(p_conteudo jsonb) returns void
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
 if p_conteudo ? 'condicoesEspeciais' then
  if jsonb_typeof(p_conteudo->'condicoesEspeciais') is distinct from 'array' then
   raise exception 'condicoes_especiais_invalidas' using errcode='22023'; end if;
  if exists(select 1 from jsonb_array_elements(p_conteudo->'condicoesEspeciais') c
   where jsonb_typeof(c) is distinct from 'object' or coalesce(c->>'tipo','') not in ('aniversariante','outros')
    or jsonb_typeof(c->'descricao') is distinct from 'string' or nullif(btrim(c->>'descricao'),'') is null) then
   raise exception 'condicoes_especiais_invalidas' using errcode='22023'; end if;
 end if;
end
$$;

-- Create an edition and its initial draft atomically. Never publishes implicitly.
create or replace function app_private.criar_evento_rascunho(p_marca uuid,p_local uuid,p_conteudo jsonb,p_chave uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare marca public.marcas; local public.locais; anterior jsonb; parametros jsonb; resultado jsonb;
 novo_id uuid; legado text; novo_slug text; prefixo text; conteudo jsonb; campo text; imagem text;
begin
 parametros:=jsonb_build_object('marca',p_marca,'local',p_local,'conteudo',p_conteudo);
 anterior:=app_private.repeticao(p_chave,'criar_evento_rascunho',parametros);
 select * into marca from public.marcas where id=p_marca for update;
 if not found or not app_private.tem_permissao(marca.id,'gerenciar_eventos') then raise exception 'sem_permissao' using errcode='42501'; end if;
 if anterior is not null then return anterior; end if;
 select * into local from public.locais where id=p_local for share;
 if not coalesce(marca.ativo,false) or not coalesce(local.ativo,false) or marca.id_legado is null or local.id_legado is null then
  raise exception 'marca_ou_local_indisponivel' using errcode='22023'; end if;
 if p_conteudo is null or jsonb_typeof(p_conteudo)<>'object' then raise exception 'conteudo_invalido' using errcode='22023'; end if;
 for campo in select jsonb_object_keys(p_conteudo) loop
  if campo<>all(array['titulo','data','horario','dataTermino','horarioTermino','terminoEstimado','descricao','lineup','ingresso','imagemUrl','ativo','condicoesEspeciais']) then
   raise exception 'campo_nao_editavel' using errcode='22023'; end if;
 end loop;
 if p_conteudo->'terminoEstimado' is distinct from 'false'::jsonb then raise exception 'horarios_confirmados_obrigatorios' using errcode='22023'; end if;
 if p_conteudo ? 'imagemUrl' then
  imagem:=p_conteudo->>'imagemUrl';
  if jsonb_typeof(p_conteudo->'imagemUrl') is distinct from 'string' or length(imagem)>2000 or
   imagem !~ '^https://[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?(:[0-9]{1,5})?([/?#][^[:space:][:cntrl:]]*)?$' then
   raise exception 'imagem_https_obrigatoria' using errcode='22023'; end if;
 end if;
 novo_id:=gen_random_uuid();legado:='evt-'||novo_id::text;
 prefixo:=btrim(regexp_replace(translate(lower(coalesce(p_conteudo->>'titulo','')),
  'áàâãäéèêëíìîïóòôõöúùûüçñ','aaaaaeeeeiiiiooooouuuucn'),'[^a-z0-9]+','-','g'),'-');
 prefixo:=coalesce(nullif(left(prefixo,60),''),'evento');
 novo_slug:=prefixo||'-'||coalesce(p_conteudo->>'data','')||'-'||replace(novo_id::text,'-','');
 conteudo:=jsonb_build_object('ativo',true,'descricao','','lineup',jsonb_build_object('bandas','[]'::jsonb,'djs','[]'::jsonb),
  'ingresso',jsonb_build_object('link','em breve','precoAPartirDe',null))||p_conteudo||
  jsonb_build_object('id',legado,'slug',novo_slug,'marcaId',marca.id_legado,'localId',local.id_legado);
 perform app_private.validar_publicacao(conteudo);
 conteudo:=jsonb_set(conteudo,'{titulo}',to_jsonb(btrim(conteudo->>'titulo')));
 insert into public.eventos(id,id_legado,slug,marca_id,local_id,estado_publicacao)
 values(novo_id,legado,novo_slug,marca.id,local.id,'rascunho');
 insert into public.rascunhos_evento(evento_id,conteudo,revisao,editado_por) values(novo_id,conteudo,1,auth.uid());
 insert into public.auditoria_administrativa(marca_id,entidade_id,acao,autor_id,antes,depois)
 values(marca.id,novo_id,'criar_evento',auth.uid(),null,jsonb_build_object('local_id',local.id,'conteudo',conteudo,'revisao',1));
 resultado:=jsonb_build_object('evento_id',novo_id,'id_legado',legado,'slug',novo_slug,'marca_id',marca.id,'local_id',local.id,'revisao',1,'conteudo',conteudo);
 return app_private.registrar_operacao(p_chave,'criar_evento_rascunho',parametros,resultado);
end $$;
