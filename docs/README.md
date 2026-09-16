# Vai Ter Forró! — Redesign Terra Acesa

Reconstrução completa do site público a partir dos documentos de arquitetura
(`docs/`), com o novo design system inspirado estruturalmente no app Vibe,
paleta **Terra Acesa** (evolução do pine/clay/paper original).

## Como rodar localmente

As páginas usam `fetch()` para os arquivos de `data/*.json`. Isso **não funciona**
abrindo o HTML direto no navegador (duplo clique / `file:///C:/...`) — o Chrome
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

Se já tiver testado antes e mudado `sw.js`, force um "hard refresh" (Ctrl+Shift+R)
ou vá em DevTools → Application → Service Workers → Unregister, porque o
navegador guarda a versão antiga em cache até você atualizar a página duas vezes
ou fechar todas as abas.

## Estrutura

```
index.html          → Home ("onde tem forró hoje?")
agenda.html          → Agenda completa com filtro por categoria
evento.html           → Detalhe do evento (?slug=)
marca.html             → Perfil da Marca (?slug=)
local.html              → Perfil do Local (?slug=)
sobre.html
favoritos.html          → Placeholder honesto (depende de conta de usuário — Fase 2/3)
configuracoes.html       → Botão de instalar o PWA

manifest.json        → nome, cores, ícones do PWA
sw.js                  → service worker (cache-first estático, network-only pra dados)

assets/
  icons/              → ícones do PWA (hoje em branco — ver README da pasta)
  eventos/            → fotos de evento (ver README da pasta)

css/
  tokens.css      → paleta Terra Acesa + tipografia (Fraunces/Work Sans)
  base.css        → reset e layout global
  components.css  → cards, pills, nav, botões, menu lateral

js/
  pwa.js          → registro do service worker + menu lateral (carregado em toda página)
  repositories/   → só busca o JSON, sem regra de negócio
  services/       → junta Evento + Marca + Local, aplica regras + integridade referencial
  utils/format.js → formatação de data/preço/endereço
  pages/          → um script por página, só renderização

data/
  eventos.json, marcas.json, locais.json  → dados reais
```

## O que falta (próxima sessão)

- Painel administrativo (Cadastro Geral) — não incluído neste pacote, só o site público
- Página de Festivais (próximo item do roadmap, ver `docs/CLAUDE.md`)
- Mapa interativo na página de Local (hoje só linka pro Google Maps)
- Ícones do PWA ainda são placeholders em branco — trocar pelos de verdade (ver
  `assets/icons/README.md`)

Veja `docs/DECISOES_DE_ARQUITETURA.md` para o histórico completo de decisões.
