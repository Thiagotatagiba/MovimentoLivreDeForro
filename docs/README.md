# Vai Ter Forró! — Site público, PWA, admin e Carteira

Site + painel administrativo com o design system **Terra Acesa**, Supabase para
autenticação/perfil/interações e **Carteira de ingressos** privada.

> **Atualizado em 2026-10-28** com a rodada de melhorias (busca, capa curta,
> acessibilidade, SEO, cache e card redesenhado) e o merge da Carteira de
> ingressos. O backlog completo está em [`MELHORIAS.md`](MELHORIAS.md);
> prioridades do dia a dia em `ROADMAP.md` (raiz).

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
Clear site data. O `sw.js` **não cacheia nada em localhost**.

**Login com Google/Magic Link** exige um projeto Supabase configurado — ver
`docs/GUIA_SUPABASE_SETUP.md` (Site URL/Redirect URLs). A **Carteira de
ingressos** exige também rodar `sql/ingressos.sql` no Supabase (tabela + bucket
privado).

**Antes de deploy:** rode `node scripts/gerar-compartilhamento.js` (gera as
páginas com Open Graph por evento) e `node scripts/validar-dados.js`
(integridade dos JSONs e dos arquivos de imagem).

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
carteira.html                     → Carteira de ingressos (só logado): guarda o
                                    print do ingresso, marca como usado e
                                    arquiva os passados (bucket privado)

manifest.json, sw.js, robots.txt, sitemap.xml
compartilhar/                   → páginas estáticas geradas por evento (Open
                                  Graph para a prévia no WhatsApp, com redirect
                                  para a página real)
scripts/validar-dados.js        → validação sem dependências (node)
scripts/gerar-compartilhamento.js → gera compartilhar/{slug}.html

admin/                   → Painel administrativo (File System Access API)

css/
  tokens.css        → paleta Terra Acesa, tipografia, espaçamento, alvo de toque
  base.css          → reset, tipografia fluida, container responsivo
  components.css    → cards, pills, nav, botões, drawer, carrossel, skeletons
  perfil.css        → formulário de perfil
  perfil-visualizar.css → card de perfil
  carteira.css      → página e janelas da Carteira de ingressos

components/
  loginModal.js      → modal de login (Google + Magic Link), com foco preso
  painelUsuario.js   → painel "Bem vindo," do menu lateral; mostra/esconde o
                       item "Carteira de ingressos" conforme o login
  botaoInteracao.js  → favoritar/seguir
  compartilhar.js    → Web Share API + fallback de cópia
  modalIngresso.js   → janela "Adicionar ingresso" (sugere eventos da agenda)
  detalheIngresso.js → janela do ingresso: imagem, Usado/Desfazer e Excluir

js/
  barraTopo.js      → barra do topo (logo, nav desktop, favoritos, busca/voltar)
  pwa.js            → service worker, nav inferior, drawer (inert + foco)
  repositories/     → só busca o JSON, sem regra de negócio
  services/         → join Evento+Marca+Local, busca, validação
  utils/            → format, card, UI, metatags, ingressos e dom
  pages/            → um script por página, só renderização

services/
  authService.js     → login/logout/sessão via Supabase
  perfilService.js    → ler/salvar perfil + upload de foto
  interacaoService.js  → favoritar evento / seguir marca (tabela interacoes)
  ingressoService.js    → Carteira de ingressos (tabela + bucket PRIVADO)

data/
  eventos.json, marcas.json, locais.json  → dados reais
  supabaseClient.js                        → configuração do Supabase

sql/
  perfis.sql, interacoes.sql, ingressos.sql  → migrações do Supabase
```

Nenhuma página do site público tem HTML de navegação hardcoded — tudo nasce de
`js/barraTopo.js` e `js/pwa.js`.

## Carteira de ingressos (privada)

O QR code de um ingresso funciona como senha de entrada, então o bucket
`ingressos` é **privado** (`public = false`), com RLS na tabela e no Storage:
só o dono lê, envia ou apaga. A imagem é exibida por link assinado de curta
duração (10 min). A página só aparece no menu para quem está logado.

Regras de data (tolerância de madrugada, arquivamento calculado), ordem das
operações (nunca deixar imagem órfã) e limitações conhecidas estão em
[`DECISOES_DE_ARQUITETURA.md`](DECISOES_DE_ARQUITETURA.md) (2026-10-14).

## Regras de design

- Cores, espaçamento e tipografia só via tokens de `css/tokens.css`.
- Nada de `style="font-size: ..."` em template novo: a hierarquia é do CSS.
- Contraste mínimo AA, alvo de toque 44px, foco visível.
- Imagem de card é `<img loading="lazy">`, não `background-image`.

## O que falta

Ver `ROADMAP.md` (prioridades do momento) e `MELHORIAS.md` (backlog completo,
com o que já foi entregue e o que ficou pendente).
