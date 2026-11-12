-- Snapshot of an already applied remote migration. DO NOT reapply to production.
-- Source: supabase_migrations.schema_migrations, read-only export 2026-11-11.
-- REVOKE ... FROM anon, authenticated não basta: por padrão o Postgres concede
-- EXECUTE a PUBLIC na criação da função, e anon/authenticated herdam disso.
-- Precisa revogar de PUBLIC também.
revoke execute on function public.criar_perfil_no_cadastro() from public;
revoke execute on function public.atualizar_timestamp_perfil() from public;

