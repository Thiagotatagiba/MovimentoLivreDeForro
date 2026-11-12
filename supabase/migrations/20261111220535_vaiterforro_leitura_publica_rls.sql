-- Snapshot of an already applied remote migration. DO NOT reapply to production.
-- Source: supabase_migrations.schema_migrations, read-only export 2026-11-11.
grant select on public.locais,public.marcas,public.eventos,public.versoes_evento to anon,authenticated;
create policy locais_publicos on public.locais for select to anon,authenticated using (ativo);
create policy marcas_publicas on public.marcas for select to anon,authenticated using (ativo);
create policy eventos_publicados on public.eventos for select to anon,authenticated using (estado_publicacao='publicado' and versao_publicada_id is not null);
create policy versoes_publicadas on public.versoes_evento for select to anon,authenticated using (exists (select 1 from public.eventos e where e.id=evento_id and e.versao_publicada_id=versoes_evento.id and e.estado_publicacao='publicado'));


