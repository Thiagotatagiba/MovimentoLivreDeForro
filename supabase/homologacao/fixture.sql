-- Test data ONLY for qmhrlexpnnbjntpecjis; run through the operator connector,
-- never through the public client or a production migration.
-- Auth accounts are created through Auth Admin API, never by inserting auth.users.
do $$
declare
 editor uuid; publicador uuid; outra uuid;
 local_a uuid; marca_a uuid; marca_b uuid; evento_a uuid; versao_a uuid;
 membro_editor uuid; membro_publicador uuid;
begin
 if exists(select 1 from public.marcas) or exists(select 1 from public.eventos)
    or exists(select 1 from public.membros_marca) then
   raise exception 'Fixture exige catalogo e membros vazios';
 end if;
 select id into strict editor from auth.users where email='editor.qmhrlexpnnbjntpecjis@homologacao.invalid' and email_confirmed_at is not null;
 select id into strict publicador from auth.users where email='publicador.qmhrlexpnnbjntpecjis@homologacao.invalid' and email_confirmed_at is not null;
 select id into strict outra from auth.users where email='outra_marca.qmhrlexpnnbjntpecjis@homologacao.invalid' and email_confirmed_at is not null;
 insert into public.locais(id_legado,slug,nome,endereco)
 values('loc-homologacao-a','local-homologacao-a','Local ficticio de homologacao',
   '{"cidade":"Rio de Janeiro","estado":"RJ"}') returning id into local_a;
 insert into public.marcas(id_legado,slug,nome,local_padrao_id)
 values('mrc-homologacao-a','marca-homologacao-a','Marca A — Homologacao',local_a) returning id into marca_a;
 insert into public.marcas(id_legado,slug,nome,local_padrao_id)
 values('mrc-homologacao-b','marca-homologacao-b','Marca B — Homologacao',local_a) returning id into marca_b;
 insert into public.eventos(id_legado,slug,marca_id,local_id)
 values('evt-homologacao-concorrencia','evento-homologacao-concorrencia',marca_a,local_a) returning id into evento_a;
 insert into public.versoes_evento(evento_id,numero,situacao,conteudo)
 values(evento_a,1,'cancelado',jsonb_build_object(
  'id','evt-homologacao-concorrencia','slug','evento-homologacao-concorrencia',
  'marcaId','mrc-homologacao-a','localId','loc-homologacao-a','titulo','Evento ficticio — Homologacao',
  'data','2026-12-15','horario','22:00','dataTermino','2026-12-16','horarioTermino','02:00',
  'terminoEstimado',false,'ativo',true,'descricao','Dados ficticios. Nao e um evento real.',
  'lineup',jsonb_build_object('bandas',jsonb_build_array('Trio ficticio'),'djs','[]'::jsonb),
  'ingresso',jsonb_build_object('link','em breve','precoAPartirDe',0))) returning id into versao_a;
 update public.eventos set versao_publicada_id=versao_a,estado_publicacao='publicado' where id=evento_a;
 insert into public.membros_marca(marca_id,usuario_id,papel) values(marca_a,editor,'equipe') returning id into membro_editor;
 insert into public.membros_marca(marca_id,usuario_id,papel) values(marca_a,publicador,'equipe') returning id into membro_publicador;
 insert into public.membros_marca(marca_id,usuario_id,papel) values(marca_b,outra,'administrador');
 insert into public.permissoes_membro(membro_id,permissao)
 values(membro_editor,'gerenciar_eventos'),(membro_publicador,'publicar_eventos');
end;
$$;
