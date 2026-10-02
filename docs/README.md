# Vai Ter Forró! — Redesign Terra Acesa

Site público + painel administrativo, com o design system **Terra Acesa**
(evolução do pine/clay/paper original) e autenticação via Supabase.

## Como rodar localmente

As páginas usam `fetch()` para os arquivos de `data/*.json`.
Isso **não funciona** abrindo o HTML direto no navegador (duplo clique / `file:///C:/...`) — o Chrome
bloqueia `fetch()` de arquivos locais por segurança, mesmo com caminho relativo
correto. É preciso servir a pasta por HTTP, mesmo que localmente.

**Windows (com Python instalado):**
```powershell
cd caminho\para\vai-ter-forro
python -m http.server 8000
```
Se `python` não for reconhecido, tente `py -m http.server 8000`.

**Windows/Mac/Linux (com Node instalado, sem precisar instalar nada):**
```bash
cd caminho/para/vai-ter-forro
npx serve .
```

Depois abra `http://localhost:8000/index.html` (ou a porta que o `npx serve`
mostrar no terminal) — **nunca** o caminho `file://`.

**Isso vale ainda mais forte agora que o projeto é um PWA:** o service worker
(`sw.js`) só registra em contexto seguro (`http://localhost` conta, `file://`
não). Se você abrir por `file://`, além da agenda não carregar, o app também
não vai poder ser instalado.

Se já tiver testado antes e mudado algum `.js`/`.css`, force um "hard
refresh" (Ctrl+Shift+R) ou vá em DevTools → Application → Service Workers →
Unregister + Clear site data — o cache-first do service worker pode mascarar
mudanças durante o desenvolvimento.

**Login com Google/Magic Link** exige um projeto Supabase configurado — ver
`docs/GUIA_SUPABASE_SETUP.md`, especialmente a seção sobre Site URL/Redirect
URLs (passo fácil de esquecer, e que já causou bugs reais aqui).

## Estrutura

```
index.html              → Home ("onde tem forró hoje?")
agenda.html              → Agenda completa com filtro por categoria
evento.html               → Detalhe do evento (?slug=)
marca.html                 → Perfil da Marca (?slug=)
local.html                  → Perfil do Local (?slug=)
sobre.html
favoritos.html               → Placeholder (login já existe; falta a tabela
                                `interacoes` — ver ROADMAP.md, item 1)
configuracoes.html            → Botão de instalar o PWA
perfil.html                    → Visualização do perfil (somente leitura)
perfil-editar.html              → Edição do perfil (Nome, foto, localização,
                                  Instagram, WhatsApp, data de nascimento,
                                  gênero, bio)

manifest.json           → nome, cores, ícones do PWA
sw.js                     → service worker (cache-first estático, network-only pra dados)

admin/                   → Painel administrativo (Cadastro Geral): cadastro
                           de Marcas/Eventos/Locais, usa File System Access
                           API pra ler/escrever os JSONs direto do disco

assets/
  icons/                 → ícones do PWA e avatar padrão

css/
  tokens.css        → paleta Terra Acesa + tipografia (Fraunces/Work Sans)
  base.css          → reset e layout global
  components.css    → cards, pills, nav, botões, menu lateral
  perfil.css        → formulário de perfil-editar.html
  perfil-visualizar.css → card de perfil.html

components/
  loginModal.js      → modal de login (Google + Magic Link)
  modal-login.css     → estilo do modal acima
  painelUsuario.js     → conteúdo do painel "Bem vindo," no menu lateral
                         (nome/avatar ou botão Entrar), chamado por js/pwa.js

js/
  barraTopo.js      → gera a barra do topo (logo + favoritos + busca/voltar)
                      em toda página — script clássico, síncrono, de propósito
                      (ver docs/DECISOES_DE_ARQUITETURA.md, 2026-09-30)
  pwa.js            → registro do service worker + gera nav inferior e menu
                      lateral + inicializa o painel de usuário (tudo
                      carregado em toda página)
  repositories/     → só busca o JSON, sem regra de negócio
  services/         → junta Evento + Marca + Local, aplica regras + integridade referencial
  utils/format.js   → formatação de data/preço/endereço
  pages/            → um script por página, só renderização

services/
  authService.js     → login/logout/sessão via Supabase
  perfilService.js    → ler/salvar perfil + upload de foto
  interacaoService.js  → favoritar/seguir — código pronto, tabela ainda não
                         criada no Supabase (ver docs/GUIA_SUPABASE_SETUP.md)

data/
  eventos.json, marcas.json, locais.json  → dados reais
  supabaseClient.js                        → configuração do Supabase (URL + anon key)

sql/
  perfis.sql    → migração completa de Perfil (tabela, gatilho, RLS, Storage)
```

Nenhuma página do site público tem mais HTML de navegação (barra do topo,
nav inferior, menu lateral) hardcoded — tudo nasce de `js/barraTopo.js` e
`js/pwa.js`. Ver `docs/DECISOES_DE_ARQUITETURA.md` (2026-09-30) se for mexer
nisso.

## O que falta

Ver `ROADMAP.md` (na raiz do projeto) para a lista priorizada — ele é o
documento vivo, atualizado a cada sessão. `docs/DECISOES_DE_ARQUITETURA.md`
tem o histórico completo de decisões e o porquê de cada uma.
