# ARQUITETURA.md

## Catálogo (Marca, Evento, Local) — ainda em JSON

Usuário
↓
Página
↓
Services
↓
Repository
↓
JSON

Objetivo original: trocar apenas a camada Repository quando o catálogo for
pro Supabase. Ainda não aconteceu — ver "Caminho de evolução de dados" no
`ROADMAP.md`.

## Dados de usuário (Perfil, e futuramente Interações) — Supabase, sem Repository

Usuário
↓
Página
↓
Services
↓
Supabase (Postgres + RLS)

Aqui não existe camada de Repository: a própria tabela do Supabase, com Row
Level Security, já garante que cada usuário só acessa o que é seu — uma
camada de Repository nesse caso só repetiria essa checagem sem adicionar
valor. Services que seguem esse padrão: `authService.js`, `perfilService.js`.
Ver `DECISOES_DE_ARQUITETURA.md` (2026-09-28) para o racional completo.

## Por que dois caminhos diferentes

Catálogo é editado só pelo admin, lido por todo mundo — JSON estático resolve
bem e é simples de versionar. Dados de usuário são privados, por pessoa, e
mudam a qualquer momento pelo próprio dono — exigem autenticação e
autorização de verdade, que é exatamente o que Supabase + RLS oferecem.
