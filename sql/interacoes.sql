-- ============================================================
-- Interações (favoritar evento / seguir marca) — Vai Ter Forró!
-- Rode este script inteiro no SQL Editor do Supabase (uma vez só).
-- Decisão registrada em DECISOES_DE_ARQUITETURA.md (2026-10-02).
-- ============================================================

create table if not exists public.interacoes (
  id uuid default gen_random_uuid() primary key,
  usuario_id uuid references auth.users(id) on delete cascade not null,
  entidade_tipo text not null check (entidade_tipo in ('marca', 'evento')),
  entidade_id text not null,
  tipo text not null check (tipo in ('favorito', 'seguindo')),
  criado_em timestamptz not null default now(),

  -- Favorito só existe em Evento, Seguindo só existe em Marca — reflete
  -- services/interacaoService.js (TIPO_POR_ENTIDADE), não misturar.
  constraint interacao_tipo_entidade_valida check (
    (tipo = 'favorito' and entidade_tipo = 'evento') or
    (tipo = 'seguindo' and entidade_tipo = 'marca')
  ),

  -- Mesma pessoa não favorita o mesmo evento duas vezes (alternarInteracao
  -- depende disso pra saber se já existe).
  unique (usuario_id, entidade_tipo, entidade_id, tipo)
);

alter table public.interacoes enable row level security;

-- Leitura pública: necessário pra mostrar contagem ("32 pessoas vão") no
-- futuro, sem precisar de login só pra ver números agregados.
create policy "Interações são públicas para leitura"
  on public.interacoes for select
  using (true);

create policy "Usuário cria sua própria interação"
  on public.interacoes for insert
  with check (auth.uid() = usuario_id);

create policy "Usuário remove sua própria interação"
  on public.interacoes for delete
  using (auth.uid() = usuario_id);

-- Sem policy de update: alternar = inserir ou remover, nunca editar uma
-- linha existente (mesmo racional de simplicidade de perfis.sql).

create index if not exists idx_interacoes_usuario on public.interacoes (usuario_id);
create index if not exists idx_interacoes_entidade on public.interacoes (entidade_tipo, entidade_id);
