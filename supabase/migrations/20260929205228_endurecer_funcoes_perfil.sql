-- Snapshot of an already applied remote migration. DO NOT reapply to production.
-- Source: supabase_migrations.schema_migrations, read-only export 2026-11-11.
-- Corrige dois achados do linter de segurança nas funções criadas em perfis.sql:
-- 1) search_path fixo em atualizar_timestamp_perfil (evita sequestro de search_path)
-- 2) criar_perfil_no_cadastro não deveria ser chamável diretamente via RPC —
--    é função de gatilho, só deve rodar dentro do trigger em auth.users.

create or replace function public.atualizar_timestamp_perfil()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

revoke execute on function public.criar_perfil_no_cadastro() from anon, authenticated;
revoke execute on function public.atualizar_timestamp_perfil() from anon, authenticated;
