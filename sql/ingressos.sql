-- ============================================================
-- Carteira de ingressos — Vai Ter Forró!
-- Decisão registrada em DECISOES_DE_ARQUITETURA.md (2026-10-14).
--
-- ATENÇÃO — diferente do bucket de fotos de perfil (público), o ingresso fica
-- num bucket PRIVADO: o QR code funciona como uma senha de entrada, quem tiver
-- a imagem consegue usar o ingresso. Só o dono lê/envia/apaga o próprio arquivo.
-- ============================================================

create table if not exists public.ingressos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,

  -- id do evento no catálogo (ex: 'evt-001'). NULL = evento que não está na agenda.
  evento_id text,

  -- titulo e data_evento são sempre preenchidos. Quando evento_id existe, o
  -- catálogo é a fonte de verdade na tela (ex: evento remarcado); estes dois
  -- campos ficam como cópia de segurança, pro ingresso nunca "quebrar" se o
  -- evento sair do catálogo.
  titulo text not null,
  data_evento date not null,

  -- caminho do arquivo no bucket privado: {usuario_id}/{id}.{ext}
  imagem_path text not null,

  -- NULL = não usado. Preenchido = usado nesse momento (e "desfazer" volta pra NULL).
  usado_em timestamptz,

  criado_em timestamptz not null default now(),

  constraint ingressos_titulo_valido
    check (char_length(btrim(titulo)) between 1 and 120),
  -- o arquivo tem que estar dentro da pasta do próprio dono
  constraint ingressos_imagem_do_dono
    check (split_part(imagem_path, '/', 1) = usuario_id::text)
);

alter table public.ingressos enable row level security;

-- Visitante sem login nunca encosta nessa tabela (defesa extra além do RLS).
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

-- ---------- Bucket PRIVADO (public = false) ----------
-- Limite de tamanho e tipos aceitos valem no servidor: não dá pra burlar
-- mexendo no JavaScript do navegador.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ingressos', 'ingressos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Convenção de caminho: {usuario_id}/{ingresso_id}.{ext}
create policy "Dono lê os próprios arquivos de ingresso"
  on storage.objects for select to authenticated
  using (bucket_id = 'ingressos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Dono envia os próprios arquivos de ingresso"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'ingressos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Dono apaga os próprios arquivos de ingresso"
  on storage.objects for delete to authenticated
  using (bucket_id = 'ingressos' and (storage.foldername(name))[1] = (select auth.uid())::text);
