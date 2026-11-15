-- Create an edition and its initial draft atomically. Never publishes implicitly.
create function app_private.criar_evento_rascunho(p_marca uuid,p_local uuid,p_conteudo jsonb,p_chave uuid) returns jsonb
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
  if campo<>all(array['titulo','data','horario','dataTermino','horarioTermino','terminoEstimado','descricao','lineup','ingresso','imagemUrl','ativo']) then
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
create function public.criar_evento_rascunho(p_marca uuid,p_local uuid,p_conteudo jsonb,p_chave uuid) returns jsonb
language sql security invoker set search_path='' as $$select app_private.criar_evento_rascunho(p_marca,p_local,p_conteudo,p_chave)$$;
revoke all on function public.criar_evento_rascunho(uuid,uuid,jsonb,uuid),app_private.criar_evento_rascunho(uuid,uuid,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.criar_evento_rascunho(uuid,uuid,jsonb,uuid),app_private.criar_evento_rascunho(uuid,uuid,jsonb,uuid) to authenticated;
