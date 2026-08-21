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

## Estrutura

```
index.html        → Home ("onde tem forró hoje?")
agenda.html        → Agenda completa com filtro por categoria
evento.html         → Detalhe do evento (?slug=)
marca.html           → Perfil da Marca (?slug=)
local.html            → Perfil do Local (?slug=)
sobre.html

css/
  tokens.css      → paleta Terra Acesa + tipografia (Fraunces/Work Sans)
  base.css        → reset e layout global
  components.css  → cards, pills, nav, botões

js/
  repositories/   → só busca o JSON, sem regra de negócio
  services/       → junta Evento + Marca + Local, aplica regras
  utils/format.js → formatação de data/preço/endereço
  pages/          → um script por página, só renderização

data/
  eventos.json, marcas.json, locais.json  → seed de exemplo
```

## O que falta (próxima sessão)

- Painel administrativo (Cadastro Geral) — não incluído neste pacote, só o site público
- Substituir os dados de seed pelos dados reais
- Página de Festivais (próximo item do roadmap, ver `docs/CLAUDE.md`)
- Mapa interativo na página de Local (hoje só linka pro Google Maps)

Veja `docs/DECISOES_DE_ARQUITETURA.md` para o histórico completo de decisões,
incluindo a entrada de 2026-08-20 sobre este redesign.
