-- Snapshot of an already applied remote migration. DO NOT reapply to production.
-- Source: supabase_migrations.schema_migrations, read-only export 2026-11-11.

create table public.locais (
 id uuid primary key default gen_random_uuid(),
 id_legado text unique,
 slug text not null unique,
 nome text not null,
 endereco jsonb not null default '{}'::jsonb,
 latitude double precision check (latitude between -90 and 90),
 longitude double precision check (longitude between -180 and 180),
 dados jsonb not null default '{}'::jsonb,
 ativo boolean not null default true,
 criado_em timestamptz not null default now(),
 atualizado_em timestamptz not null default now()
);
create table public.marcas (
 id uuid primary key default gen_random_uuid(),
 id_legado text unique,
 slug text not null unique,
 nome text not null,
 local_padrao_id uuid references public.locais(id),
 dados jsonb not null default '{}'::jsonb,
 ativo boolean not null default true,
 criado_em timestamptz not null default now(),
 atualizado_em timestamptz not null default now()
);
create table public.eventos (
 id uuid primary key default gen_random_uuid(),
 id_legado text unique,
 slug text not null unique,
 marca_id uuid not null references public.marcas(id),
 local_id uuid references public.locais(id),
 estado_publicacao text not null default 'rascunho' check (estado_publicacao in ('rascunho','publicado','arquivado')),
 versao_publicada_id uuid,
 criado_em timestamptz not null default now(),
 atualizado_em timestamptz not null default now()
);
create table public.versoes_evento (
 id uuid primary key default gen_random_uuid(),
 evento_id uuid not null references public.eventos(id),
 numero integer not null check (numero > 0),
 conteudo jsonb not null,
 situacao text not null default 'confirmado' check (situacao in ('confirmado','adiado','cancelado','interrompido')),
 publicado_por uuid references auth.users(id),
 publicado_em timestamptz not null default now(),
 unique(evento_id,numero),
 unique(evento_id,id)
);
alter table public.eventos add constraint eventos_versao_publicada_do_mesmo_evento
 foreign key (id,versao_publicada_id) references public.versoes_evento(evento_id,id);
create table public.rascunhos_evento (
 evento_id uuid primary key references public.eventos(id) on delete cascade,
 conteudo jsonb not null default '{}'::jsonb,
 revisao bigint not null default 1 check (revisao > 0),
 editado_por uuid references auth.users(id),
 atualizado_em timestamptz not null default now()
);
create index eventos_marca_idx on public.eventos(marca_id);
create index eventos_local_idx on public.eventos(local_id);
create index versoes_evento_evento_idx on public.versoes_evento(evento_id,numero desc);
alter table public.locais enable row level security;
alter table public.marcas enable row level security;
alter table public.eventos enable row level security;
alter table public.versoes_evento enable row level security;
alter table public.rascunhos_evento enable row level security;
revoke all on public.locais,public.marcas,public.eventos,public.versoes_evento,public.rascunhos_evento from anon,authenticated;


