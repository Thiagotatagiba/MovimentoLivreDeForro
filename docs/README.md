# Vai Ter Forró! — Site público, PWA e admin

Site + painel administrativo com o design system **Terra Acesa** e Supabase
para autenticação, perfil e interações.

> **Atualizado em 2026-10-28** com a rodada de melhorias (busca, capa curta,
> acessibilidade, SEO, cache e card redesenhado). O backlog completo e o que
> ficou pendente estão em [`MELHORIAS.md`](MELHORIAS.md). Prioridades do dia a
> dia: `ROADMAP.md` na raiz.

## Como rodar localmente

As páginas usam `fetch()` para os arquivos de `data/*.json`. Isso **não
funciona** abrindo o HTML direto no navegador (`file://`) — o Chrome bloqueia
`fetch()` de arquivos locais. Sirva a pasta por HTTP:

**Windows (Python):**
```powershell
python -m http.server 8000
```

**Windows/Mac/Linux (Node):**
```bash
npx serve .
```

Depois abra `http://localhost:8000/index.html` — **nunca** `file://`.

**Isso vale ainda mais forte agora que o projeto é um PWA:** o service worker
só registra em contexto seguro (`http://localhost` conta, `file://` não).

Se já tiver testado antes e mudado algum `.js`/`.css`, force um "hard refresh"
(Ctrl+Shift+R) ou vá em DevTools → Application → Service Workers → Unregister +
Clear site data. O `sw.js` **não cacheia nada em localhost**, justamente pra
evitar esse tipo de fantasma.

**Login com Google/Magic Link** exige um projeto Supabase configurado — ver
`docs/GUIA_SUPABASE_SETUP.md`, especialmente a seção sobre Site URL/Redirect
URLs.

**Antes de deploy:** rode `node scripts/validar-dados.js` (integridade dos JSONs
e dos arquivos de imagem).

## Estrutura

```
index.html              → Home: bloco "Hoje", busca, Tira de Dias, próximos bailes
agenda.html              → Agenda agrupada por dia, com filtro por categoria
evento.html               → Detalhe do evento (?slug=), .ics e compartilhar
marca.html                 → Perfil da Marca (?slug=), com próximos eventos e histórico
local.html                  → Perfil do Local (?slug=), mapa e contato
sobre.html
favoritos.html               → Favoritos e marcas seguidas (requer login)
perfil.html                   → Visualização do perfil
perfil-editar.html             → Edição do perfil
configuracoes.html              → Instalação do PWA
privacidade.html                 → LGPD: o que coletamos, como excluir

manifest.json, sw.js, robots.txt, sitemap.xml
scripts/validar-dados.js        → validação sem dependências (node)

admin/                   → Painel administrativo (File System Access API)

css/
  tokens.css        → paleta Terra Acesa, tipografia, espaçamento, alvo de toque
  base.css          → reset, tipografia fluida, container responsivo
  components.css    → cards, pills, nav, botões, drawer, carrossel, skeletons
  perfil.css        → formulário de perfil
  perfil-visualizar.css → card de perfil

components/
  loginModal.js      → modal de login (Google + Magic Link), com foco preso
  painelUsuario.js   → painel "Bem vindo," do menu lateral
  botaoInteracao.js  → favoritar/seguir
  compartilhar.js    → Web Share API + fallback de cópia

js/
  barraTopo.js      → barra do topo (logo, nav desktop, favoritos, busca/voltar)
  pwa.js            → service worker, nav inferior, drawer (inert + foco)
  repositories/     → só busca o JSON, sem regra de negócio
  services/         → join Evento+Marca+Local, busca, validação
  utils/            → format, card, UI, metatags
  pages/            → um script por página, só renderização

services/
  authService.js     → login/logout/sessão via Supabase
  perfilService.js    → ler/salvar perfil + upload de foto
  interacaoService.js  → favoritar evento / seguir marca

data/
  eventos.json, marcas.json, locais.json  → dados reais
  supabaseClient.js                        → configuração do Supabase

sql/
  perfis.sql, interacoes.sql  → migrações do Supabase
```

Nenhuma página do site público tem HTML de navegação hardcoded — tudo nasce de
`js/barraTopo.js` e `js/pwa.js`.

## Regras de design (novas)

- Cores, espaçamento e tipografia só via tokens de `css/tokens.css`.
- Nada de `style="font-size: ..."` em template novo: a hierarquia é do CSS.
- Contraste mínimo AA, alvo de toque 44px, foco visível.
- Imagem de card é `<img loading="lazy">`, não `background-image`.

## O que falta

Ver `ROADMAP.md` (prioridades do momento) e `MELHORIAS.md` (backlog completo,
com o que já foi entregue e o que ficou pendente).
