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

### Recorrência semanal — removida (2026-10-28)

A tentativa de gerar as próximas ocorrências semanais em memória (a partir de
`Marca.frequencia`/`diasSemana`) foi **removida no mesmo dia**. Ela criava
eventos que não existiam no JSON, não eram editáveis no admin e podiam
prometer um baile que a Marca não confirmou. Hoje a agenda mostra **apenas
eventos reais**; `frequencia`/`diasSemana` continuam sendo só rótulos
informativos na página da Marca. Ver `DECISOES_DE_ARQUITETURA.md`
(2026-10-28, continuação 3).

### Busca (2026-10-28)

`buscaService` filtra em memória Marcas, Locais e Eventos com `normalizar()`
(minúsculo, sem acento), ordena por relevância (exato → prefixo → contém) e
limita a 8 resultados. O catálogo é pequeno; não há endpoint nem índice.

### Soft-delete

`ativo: false` em Marca/Local faz o evento desaparecer do site: o serviço
descarta o evento quando o join com Marca ou Local não resolve. Antes o evento
continuava aparecendo como "Marca em breve".

## Dados de usuário (Perfil e Interações) — Supabase, sem Repository

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
valor. Services que seguem esse padrão: `authService.js`, `perfilService.js`,
`interacaoService.js` (Interações implementadas em 2026-10-02, tabela em
`sql/interacoes.sql`). Ver `DECISOES_DE_ARQUITETURA.md` (2026-09-28).

## Por que dois caminhos diferentes

Catálogo é editado só pelo admin, lido por todo mundo — JSON estático resolve
bem e é simples de versionar. Dados de usuário são privados, por pessoa, e
mudam a qualquer momento pelo próprio dono — exigem autenticação e
autorização de verdade, que é exatamente o que Supabase + RLS oferecem.

## Camadas do JS

```
js/repositories/   só busca o JSON (sem regra de negócio)
js/services/       junta entidades, aplica regras, busca, validação
js/utils/          funções puras (format, card, UI, metatags)
components/        UI reutilizável com DOM (login, favoritar, compartilhar, painel)
js/pages/          renderização de uma página (nunca fala com repositório)
```
