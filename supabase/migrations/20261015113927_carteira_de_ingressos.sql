-- Snapshot of an already applied remote migration. DO NOT reapply to production.
-- Source: supabase_migrations.schema_migrations, read-only export 2026-11-11.
create table if not exists public.ingressos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  evento_id text,
  titulo text not null,
  data_evento date not null,
  imagem_path text not null,
  usado_em timestamptz,
  criado_em timestamptz not null default now(),
  constraint ingressos_titulo_valido
    check (char_length(btrim(titulo)) between 1 and 120),
  constraint ingressos_imagem_do_dono
    check (split_part(imagem_path, '/', 1) = usuario_id::text)
);

alter table public.ingressos enable row level security;

revoke all on table public.ingressos from anon;

create policy "Dono vê os próprios ingressos"
  on public.ingressos for select to authenticated
  using ((select auth.uid()) = usuario_id);

create policy "Dono cria os próprios ingressos"
  on public.ingressos for insert to authenticated
  with check ((select auth.uid()) = usuario_id);

create policy "Dono atualiza os próprios ingressos"
  on public.ingressos for update to authenticated
  using ((select auth.uid()) = usuario_id)
  with check ((select auth.uid()) = usuario_id);

create policy "Dono apaga os próprios ingressos"
  on public.ingressos for delete to authenticated
  using ((select auth.uid()) = usuario_id);

create index if not exists idx_ingressos_usuario_data
  on public.ingressos (usuario_id, data_evento desc);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ingressos', 'ingressos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "Dono lê os próprios arquivos de ingresso"
  on storage.objects for select to authenticated
  using (bucket_id = 'ingressos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Dono envia os próprios arquivos de ingresso"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'ingressos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Dono apaga os próprios arquivos de ingresso"
  on storage.objects for delete to authenticated
  using (bucket_id = 'ingressos' and (storage.foldername(name))[1] = (select auth.uid())::text);

