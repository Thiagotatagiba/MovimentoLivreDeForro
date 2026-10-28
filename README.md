# Vai Ter Forró!

Plataforma para descobrir eventos de forró pé de serra — começando pela Grande
Vitória (ES), com arquitetura pensada para crescer para o Brasil.

**Site:** [vaiterforro.com.br](https://vaiterforro.com.br) · **PWA instalável** ·
**Stack:** HTML/CSS/JavaScript puro (sem build), Supabase para autenticação e
dados de usuário, catálogo em JSON, deploy no GitHub Pages.

> **Atualizado em 2026-10-28** com a rodada de melhorias (busca, capa curta,
> acessibilidade, SEO, cache e card redesenhado). O backlog completo e o que
> ficou pendente estão em [`docs/MELHORIAS.md`](docs/MELHORIAS.md).

## O que tem hoje

- **Agenda** com filtro por categoria e agrupada por dia — **só eventos reais**.
- **Busca** por marca, local ou evento na Home.
- **Bloco "Hoje"** na Home, que responde "onde tem forró hoje?" (ou mostra o
  próximo baile quando não tem).
- **Páginas de Evento, Marca e Local** com capa curta, compartilhar, "adicionar
  ao calendário" (.ics) e rota no mapa.
- **Login** com Google e link mágico (Supabase Auth) + **Perfil** com foto,
  bio, redes e localização.
- **Favoritar eventos e seguir marcas**, com página de Favoritos.
- **PWA** com service worker (offline na casca) e prompt de instalação.
- **Painel administrativo** (`/admin/`) que lê e grava os JSONs direto do disco
  via File System Access API — rode localmente, no Chrome/Edge.

## Como rodar localmente

As páginas usam `fetch()` para os JSONs: **não abra o HTML por `file://`**.
Sirva a pasta por HTTP:

```powershell
python -m http.server 8000
# ou: npx serve .
```

Abra `http://localhost:8000`. Login exige um projeto Supabase configurado — ver
[`docs/GUIA_SUPABASE_SETUP.md`](docs/GUIA_SUPABASE_SETUP.md).

Antes de publicar, rode a validação dos dados:

```bash
node scripts/validar-dados.js
```

## Estrutura

```
index.html, agenda.html, evento.html, marca.html, local.html, sobre.html,
favoritos.html, perfil.html, perfil-editar.html, configuracoes.html,
privacidade.html            → páginas públicas
admin/                      → painel de cadastro (uso local)
css/                        → tokens, base e componentes
components/                 → login, painel do usuário, favoritar, compartilhar
js/repositories/            → leitura dos JSONs
js/services/                → regra de negócio (join, busca, validação)
js/pages/                   → um script de renderização por página
js/utils/                   → formatação, card, UI e metatags
services/                   → Auth, Perfil e Interações (Supabase)
data/                       → eventos.json, marcas.json, locais.json, cliente Supabase
sql/                        → migrações do Supabase
scripts/                    → validação dos dados
docs/                       → visão, arquitetura, decisões, guia do Supabase
```

## Documentação

- [`ROADMAP.md`](ROADMAP.md) — o que fazer agora (documento vivo).
- [`docs/MELHORIAS.md`](docs/MELHORIAS.md) — backlog completo priorizado.
- [`docs/DECISOES_DE_ARQUITETURA.md`](docs/DECISOES_DE_ARQUITETURA.md) — por que
  cada decisão foi tomada.
- [`CLAUDE.md`](CLAUDE.md) — regras do projeto.

## Convenções

- Nunca duplicar componente ou dado sem justificar.
- Documentar mudança estrutural em `docs/DECISOES_DE_ARQUITETURA.md`.
- Hierarquia de CSS: tokens → base → componentes; nada de `style="..."` para
  tipografia em template novo.
- Acessibilidade: contraste AA, alvos de toque de 44px, foco visível.
- O catálogo só mostra o que está em `data/*.json`: não existem eventos gerados
  em memória (a recorrência automática foi removida — ver DECISOES 2026-10-28).
