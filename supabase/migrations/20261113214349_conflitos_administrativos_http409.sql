-- Application revision conflicts are terminal, not serialization failures.
-- PostgREST 14 retries 40001; PT409 returns an explicit HTTP 409.
-- Preserve signatures, permissions, locking, idempotency and transaction scope.

create or replace function app_private.salvar_rascunho_evento(p_evento uuid,p_conteudo jsonb,p_revisao bigint,p_chave uuid)
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
  raise exception 'conflito_revisao' using errcode='PT409';
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

create or replace function app_private.alterar_situacao_evento(p_evento uuid,p_situacao text,p_versao uuid,p_chave uuid)
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
  raise exception 'conflito_versao' using errcode='PT409';
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
