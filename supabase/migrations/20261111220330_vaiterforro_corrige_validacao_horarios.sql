-- Snapshot of an already applied remote migration. DO NOT reapply to production.
-- Source: supabase_migrations.schema_migrations, read-only export 2026-11-11.
alter table public.versoes_evento drop constraint versoes_evento_horarios_obrigatorios;
alter table public.versoes_evento add constraint versoes_evento_horarios_obrigatorios check (
conteudo ? 'data' and conteudo ? 'horario' and conteudo ? 'dataTermino' and conteudo ? 'horarioTermino'
and (conteudo->>'data') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
and (conteudo->>'dataTermino') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
and (conteudo->>'horario') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
and (conteudo->>'horarioTermino') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
and ((conteudo->>'dataTermino')::date + (conteudo->>'horarioTermino')::time) > ((conteudo->>'data')::date + (conteudo->>'horario')::time)
);

