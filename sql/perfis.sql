-- ============================================================
-- Perfis de usuário — Vai Ter Forró!
-- Rode este script inteiro no SQL Editor do Supabase (uma vez só).
-- Decisão registrada em DECISOES_DE_ARQUITETURA.md (2026-09-28).
-- ============================================================

-- 1. Tabela de perfis (relação 1:1 com auth.users — id é a própria FK/PK)
create table if not exists public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  sobrenome text,
  apelido text,
  avatar_url text,
  cidade text,
  estado text,
  pais text,
  instagram text,
  telefone text,
  bio text,
  data_nascimento date,
  genero text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter table public.perfis enable row level security;

create policy "Usuário lê o próprio perfil"
  on public.perfis for select
  using (auth.uid() = id);

create policy "Usuário atualiza o próprio perfil"
  on public.perfis for update
  using (auth.uid() = id);

-- Sem policy de insert/delete: a linha só nasce pelo gatilho abaixo,
-- nunca diretamente pelo usuário via API — evita perfis "órfãos" ou duplicados.

-- 2. Gatilho: cria o perfil automaticamente no primeiro login,
-- pré-preenchendo com o que o Google devolve (nome e foto).
create or replace function public.criar_perfil_no_cadastro()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  nome_completo text := coalesce(new.raw_user_meta_data->>'full_name', '');
  primeiro_nome text := split_part(nome_completo, ' ', 1);
  resto_nome text := trim(substring(nome_completo from length(primeiro_nome) + 1));
begin
  insert into public.perfis (id, nome, sobrenome, apelido, avatar_url)
  values (
    new.id,
    nullif(primeiro_nome, ''),
    nullif(resto_nome, ''),
    nullif(primeiro_nome, ''),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists ao_criar_usuario on auth.users;
create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.criar_perfil_no_cadastro();

-- 3. atualizado_em automático a cada edição
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

drop trigger if exists ao_atualizar_perfil on public.perfis;
create trigger ao_atualizar_perfil
  before update on public.perfis
  for each row execute function public.atualizar_timestamp_perfil();

-- Funções de gatilho não precisam (e não devem) ser chamáveis diretamente
-- via API/RPC por ninguém — só o próprio gatilho as invoca. Por padrão o
-- Postgres concede EXECUTE a PUBLIC na criação; revogamos explicitamente
-- (achado pelo linter de segurança do Supabase em 2026-09-29).
revoke execute on function public.criar_perfil_no_cadastro() from public, anon, authenticated;
revoke execute on function public.atualizar_timestamp_perfil() from public, anon, authenticated;

-- 4. Bucket de avatares (upload de foto de perfil)
insert into storage.buckets (id, name, public)
values ('avatares', 'avatares', true)
on conflict (id) do nothing;

-- Bucket público pra leitura: o app precisa exibir as fotos pra qualquer visitante.
create policy "Avatares são públicos para leitura"
  on storage.objects for select
  using (bucket_id = 'avatares');

-- Só o dono envia/substitui/remove dentro da própria pasta.
-- Convenção de caminho: {usuario_id}/avatar.{extensao}
create policy "Usuário envia o próprio avatar"
  on storage.objects for insert
  with check (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Usuário substitui o próprio avatar"
  on storage.objects for update
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Usuário remove o próprio avatar"
  on storage.objects for delete
  using (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);

-- 5. Backfill: quem já tinha logado antes desse script existir (ex: teste do Thiago)
-- não passou pelo gatilho acima — cria a linha retroativamente.
insert into public.perfis (id, nome, sobrenome, apelido, avatar_url)
select
  u.id,
  nullif(split_part(coalesce(u.raw_user_meta_data->>'full_name', ''), ' ', 1), ''),
  nullif(trim(substring(
    coalesce(u.raw_user_meta_data->>'full_name', '')
    from length(split_part(coalesce(u.raw_user_meta_data->>'full_name', ''), ' ', 1)) + 1
  )), ''),
  nullif(split_part(coalesce(u.raw_user_meta_data->>'full_name', ''), ' ', 1), ''),
  u.raw_user_meta_data->>'avatar_url'
from auth.users u
where not exists (select 1 from public.perfis p where p.id = u.id);
