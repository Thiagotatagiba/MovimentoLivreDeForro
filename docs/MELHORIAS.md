# MELHORIAS.md — Backlog completo do Vai Ter Forró!

> Auditoria feita em **2026-10-26** sobre o commit `e99d6f9` (branch `main`,
> sincronizada com `origin/main`). Levantamento por leitura de código,
> documentação, dados JSON e SQL — **sem execução em navegador**. Itens marcados
> com ⚠️ dependem de validação manual (ver "Como validar").
>
> Este documento é o **banco de melhorias**. Ele não substitui o `ROADMAP.md`:
> o ROADMAP continua sendo a resposta para "o que fazer agora"; este arquivo é
> a lista completa de onde escolher. Quando um item daqui for assumido, ele
> deve ser copiado para o ROADMAP com a prioridade do momento.

---

## 0. Status da execução — 2026-10-28

Rodada de implementação feita logo após a auditoria. **Entregue:**

- **P0:** PRD-01 (busca), DAT-01 (WhatsApp), UX-01 (contraste), UX-02 (datas),
  UX-03 (CTA de ingresso). PRD-02 (recorrência semanal) foi implementado e
  **removido no mesmo dia** — ver `DECISOES_DE_ARQUITETURA.md` (continuação 3).
- **P1:** PRD-03 (bloco "Hoje"), UX-04 a UX-12, TEC-01 a TEC-04, SEC-01
  (página de privacidade; exclusão automática segue pendente), SEO-01, DOC-01.
- **P2:** PRD-04 (filtro por categoria + agrupamento por dia e estado da
  seleção; período/região ainda não), PRD-05 (.ics), PRD-06 (Local usa
  instagram/site/fotos), UX-13 a UX-17, UX-19 a UX-21, TEC-05, TEC-06, TEC-10,
  TEC-12, TEC-13, SEO-02, SEO-03, DAT-03, DOC-02, DOC-03, DOC-04.
- **P3 pontuais:** UX-22 (tokens `--esp-2xs`/`--traco-icone`/`--toque-min`) e
  UX-23 parcial (ícone novo; sprite ainda não).

**Pendente (fora desta rodada):** PRD-07 parcial (selos de preço/Hoje feitos;
aviso de chuva não), PRD-08, PRD-09 a PRD-18, TEC-07 (lint/CI), TEC-08
(parcial: pré-cache inclui os módulos, mas offline continua "casca"), TEC-09,
TEC-11, TEC-14, SEC-02, SEC-04? (não existe), DAT-02, DOC-05, DOC-06, OPS-01.

> A validação visual foi feita com Chrome headless (390/500/1280px) e a lógica
> de busca com testes em Node. **Falta o teste em navegador real**
> com login, admin e instalação do PWA — está no ROADMAP como pendência
> imediata.

**Revisão 2 (mesma data, depois do teste no navegador):** capa do evento e de
Marca/Local com altura curta e identidade sobreposta, página de evento em duas
colunas com cartão sticky, "Como chegar" e botões de ação inline. Registrado em
`DECISOES_DE_ARQUITETURA.md` (2026-10-28, continuação 2).

---

## 1. Como usar

### 1.1 Escala de prioridade

| Nível | Critério | Regra prática |
|---|---|---|
| **P0** | Quebra a experiência hoje, ou é conserto de minutos | Fazer antes de qualquer feature nova |
| **P1** | Alto impacto percebido pelo usuário ou risco técnico real | Ciclo atual / próxima semana |
| **P2** | Melhoria relevante, sem urgência | Próximos 1–2 meses |
| **P3** | Ideia/futuro, depende de outra entrega ou de decisão de produto | Só quando chegar a fase |

### 1.2 Escala de esforço

- **S** — até ~2 horas
- **M** — meio dia a 2 dias
- **G** — mais de 2 dias ou depende de decisão estrutural

### 1.3 Como marcar progresso

Sugestão de status por item: `todo` → `doing` → `done` (e `dropped` quando a
decisão for não fazer). O ID é estável — use ele em commits e nas DECISOES.

### 1.4 Como validar

Os itens de interface (contraste, foco, toque, stories, layout) foram medidos
por CSS, não visualmente. Antes de fechar cada um: testar em Chrome DevTools
(320px, 390px, 768px, 1280px), com teclado (Tab/Shift+Tab/Esc) e leitor de tela
(VoiceOver/TalkBack). Para o item TEC-02 (cache do service worker), testar em
produção com duas contas no mesmo navegador.

---

## 2. Diagnóstico em números

| Indicador | Hoje | Meta |
|---|---|---|
| Eventos futuros no catálogo | **3 de 15** (nenhum nos próximos 10 dias) | ≥ 1 por semana na região |
| Busca na Home | campo abre, **não busca** | busca funcional ou botão oculto |
| Contraste do badge de data (11px) | **2,74:1** | ≥ 4,5:1 |
| Contraste do rótulo da nav inferior (11px) | **3,16:1** | ≥ 4,5:1 |
| Alvos de toque abaixo de 44px | 6 controles (32–40px) | 0 |
| `style="..."` inline em templates JS | **56** | 0 (só exceções documentadas) |
| Imagem duplicada no repositório | capa = logo, **1,19 MB cada** | 1 arquivo, < 200 KB |
| Páginas com Open Graph | **0 de 10** | todas as páginas públicas |
| Documentos desatualizados | 3 (ROADMAP, GUIA_SUPABASE, link IDEIAS) | 0 |
| Arquivos de lixo rastreados | 2 (`Teste.html`, `old.zip`) | 0 |
| Automação (testes/lint/CI) | **nenhuma** | script de integridade + lint |

---

## 3. Lista mestra

### P0 — fazer primeiro

| ID | Item | Impacto | Esforço | Onde |
|---|---|---|---|---|
| PRD-01 | Busca da Home não busca nada | Alto | M | `js/pages/home.js:30-46` |
| PRD-02 | Agenda sem eventos futuros (recorrência — tentativa revertida) | Alto | G | `data/eventos.json`, `js/services/eventoService.js` |
| DAT-01 | WhatsApp da Marca `mrc-008` em formato inválido | Alto | S | `data/marcas.json:165` |
| UX-01 | Contraste insuficiente (texto fraco, badge, nav) | Alto | S | `css/tokens.css`, `css/components.css` |
| UX-02 | Datas com "De" maiúsculo por `text-transform: capitalize` | Médio | S | `js/pages/evento.js:80`, `js/pages/home.js:223` |
| UX-03 | CTA "Garantir ingresso" aponta para `#` quando não há link | Médio | S | `js/pages/evento.js:88` |

### P1 — ciclo atual

| ID | Item | Impacto | Esforço | Onde |
|---|---|---|---|---|
| PRD-03 | Bloco "Hoje" na Home (responder a pergunta do produto) | Alto | M | `index.html`, `js/pages/home.js` |
| UX-04 | Alvos de toque abaixo de 44px | Alto | S | `css/components.css` |
| UX-05 | `padding-bottom` sem `safe-area-inset` esconde conteúdo no iPhone | Alto | S | `css/base.css:14` |
| UX-06 | Imagens: duplicata de 1,2 MB + `background-image` sem lazy/srcset | Alto | M | `assets/marcas/`, `js/utils/format.js` |
| UX-07 | Card de evento sem horário/preço e sem `line-clamp` | Alto | M | `js/utils/cardEvento.js` |
| UX-08 | Tipografia sem fluidez + hierarquia em estilo inline | Alto | M | `css/base.css`, `js/pages/*.js` |
| UX-09 | Story com barra de progresso sem timer/swipe | Médio | M | `js/pages/home.js`, `css/components.css` |
| UX-10 | Navegação fragmentada + ícone "casa" rotulado "Voltar" | Alto | M | `js/barraTopo.js`, `js/pwa.js` |
| UX-11 | Modal de login: cor primária divergente, sem Esc/foco | Médio | S | `components/loginModal.js`, `modal-login.css` |
| UX-12 | Menu lateral fechado com links focáveis (`aria-hidden` + foco) | Alto | S | `js/pwa.js:65` |
| TEC-01 | Service worker: bootstrap do cache e bump manual a cada deploy | Alto | M | `sw.js` |
| TEC-02 | Service worker cacheia GETs do Supabase (cross-origin) | Alto | S/M | `sw.js:66-95` |
| TEC-03 | Soft-delete não propaga: evento de Marca/Local inativa continua | Alto | S | `js/repositories/eventoRepository.js` |
| TEC-04 | Dados entram crus em `innerHTML` (site + admin) | Médio | M | `js/utils/cardEvento.js`, `admin/js/*` |
| SEC-01 | LGPD: sem política de privacidade nem exclusão de conta | Alto | M | `sql/perfis.sql`, páginas de perfil |
| SEO-01 | Sem Open Graph/metadata: prévia genérica no WhatsApp | Alto | M | todos os `.html` |
| DOC-01 | ROADMAP e GUIA_SUPABASE contradizem o código | Médio | S | `ROADMAP.md`, `docs/GUIA_SUPABASE_SETUP.md` |

### P2 — próximos 1–2 meses

| ID | Item | Impacto | Esforço | Onde |
|---|---|---|---|---|
| PRD-04 | Agenda: filtro por data/região + estado na URL | Alto | M | `js/pages/agenda.js` |
| PRD-05 | "Adicionar ao calendário" (Google/ICS) no evento | Alto | S/M | `js/pages/evento.js` |
| PRD-06 | Página de Local ignora `instagram`, `site`, `fotoCapa` existentes | Médio | S | `js/pages/local.js` |
| PRD-07 | Selos de estado no card (Grátis, Colaborativo, avisos) | Alto | M | `js/utils/cardEvento.js` |
| PRD-08 | Contagem social ("X pessoas vão") nos eventos | Médio | M | `js/pages/evento.js`, `sql/interacoes.sql` |
| UX-13 | Sem skeleton de carregamento | Médio | S | `js/pages/agenda.js`, `home.js` |
| UX-14 | Sem hover/press: interface não responde ao toque | Médio | S | `css/components.css` |
| UX-15 | Empty states sem CTA nem personalidade | Médio | S | páginas de agenda/favoritos/marca |
| UX-16 | Desktop: coluna de 640px + bottom nav fixa em qualquer tela | Alto | M | `css/base.css`, `css/components.css` |
| UX-17 | Tira de Dias com borda em gradiente competindo com os cards | Baixo | S | `css/components.css:330-339` |
| UX-18 | Erros de formulário sem `aria-live` nem validação por campo | Médio | S | `js/pages/perfil-editar.js` |
| UX-19 | Página Sobre manda para o Instagram sem link | Baixo | S | `sobre.html:39` |
| UX-20 | Hero do evento: imagem full-bleed vs. resto em cards | Baixo | S | `js/pages/evento.js:58` |
| TEC-05 | `eventValidator` não checa se o Local existe/está ativo | Médio | S | `js/services/eventValidator.js` |
| TEC-06 | Sem script de integridade dos JSONs (checagem manual a cada mudança) | Alto | M | novo `scripts/validar-dados.js` |
| TEC-07 | Sem lint/formatação/CI | Médio | M | raiz do projeto |
| TEC-08 | PWA offline incompleto: módulos de página fora do pré-cache | Médio | S | `sw.js:21-41` |
| TEC-09 | Admin não valida slug duplicado | Baixo | S | `admin/js/eventos.js`, `locais.js` |
| TEC-10 | 6 eventos ainda com `ingresso.plataforma` (schema legado) | Médio | S | `data/eventos.json` |
| TEC-11 | Campos órfãos no Local (`fotoCapa`, `fotoPerfil`) e timestamps só nele | Baixo | S | `admin/js/locais.js`, `data/locais.json` |
| TEC-12 | Upload de avatar sem validar tipo/tamanho antes de enviar | Baixo | S | `js/pages/perfil-editar.js` |
| TEC-13 | `inicioDeHoje()` duplicada em 3 services | Baixo | S | `js/services/*.js` |
| SEC-02 | `interacoes` com `select using (true)`: qualquer um lê todos os registros | Médio | M | `sql/interacoes.sql:31-33` |
| SEO-02 | `robots.txt` + `noindex` no admin | Médio | S | `admin/index.html` |
| SEO-03 | `meta description` só na Home | Baixo | S | `*.html` |
| DAT-02 | 12 eventos passados sem política de arquivamento | Médio | S | `data/eventos.json` |
| DAT-03 | Formatos inconsistentes (`whatsapp` URL vs telefone, `instagram` com/sem @) | Médio | S | `data/marcas.json` |
| DOC-02 | Sem `README.md` na raiz (GitHub abre sem apresentação) | Médio | S | raiz |
| DOC-03 | `ARQUITETURA.md` e `MODELO_DE_DADOS.md` não refletem Interações/Perfil completo | Baixo | S | `docs/` |
| DOC-04 | Lixo rastreado (`Teste.html`, `old.zip`) e sem `.gitignore` | Baixo | S | raiz |
| UX-21 | Ícone do app não aparece dentro do app (marca só em texto) | Baixo | S | `js/barraTopo.js` |

### P3 — ideias e fases futuras

| ID | Item | Impacto | Esforço | Onde |
|---|---|---|---|---|
| PRD-09 | Entidade Festival (Marca → Festival → Dias → Eventos) | Alto | G | modelo de dados |
| PRD-10 | Bandas/DJs como entidade (hoje só texto no lineup) | Médio | G | modelo de dados |
| PRD-11 | Importador de eventos (Google Agenda, Instagram, Sympla/Onticket) | Alto | G | novo |
| PRD-12 | Mapa interativo na página de Local | Médio | M | `js/pages/local.js` |
| PRD-13 | Página "Novo no Forró?" (acolhimento) | Médio | S | nova página |
| PRD-14 | Avaliações de Marca/Local (estrutura, som, piso, banheiro) | Médio | G | `docs/IDEIAS.MD` |
| PRD-15 | Contador de comunidade (eventos no mês, marcas ativas) | Baixo | S | Home/rodapé |
| PRD-16 | Modelo de colaborador regional + `regiao` em Local | Médio | G | modelo de dados |
| PRD-17 | Página "Contratar Artistas" | Baixo | M | depende de PRD-10 |
| PRD-18 | Compartilhar também em Marca e Local | Baixo | S | `marca.js`, `local.js` |
| UX-22 | Tokens de espaço/ícone faltando (12px, traço de ícone) | Baixo | S | `css/tokens.css` |
| UX-23 | Sprite/coleção de ícones SVG (ícones repetidos em 3+ arquivos) | Baixo | M | vários |
| TEC-14 | Duplicação do `<head>` (fontes + CSS) nas 10 páginas | Baixo | M | `*.html` |
| DOC-05 | Arquivar entradas antigas de `DECISOES_DE_ARQUITETURA.md` (~53 KB) | Baixo | S | `docs/` |
| DOC-06 | Checklist de deploy (bump do cache, validação de dados, teste de login) | Médio | S | novo `docs/DEPLOY.md` |
| OPS-01 | Medição de uso (analytics privacy-friendly) para decidir prioridades | Médio | M | a definir |

---

## 4. Detalhamento — P0

### PRD-01 — Busca da Home não busca nada

**Sintoma:** o botão de busca abre o campo (`aria-expanded` muda, foco vai
para o input), a pessoa digita e **nada acontece**. Não existe listener de
`input` nem área de resultados.

**Por que é P0:** é a promessa mais visível da interface depois da agenda. Um
campo que aceita texto e não responde destrói confiança mais rápido do que não
ter busca.

**Como resolver (duas opções, escolher uma):**
1. **Implementar** (recomendado): `services/buscaService.js` novo, com índice
   em memória de Marcas + Locais + Eventos (são 9, 12 e 15 itens — busca
   client-side pura). Normalizar com `String.prototype.normalize('NFD')` para
   ignorar acento ("forro" acha "Forró"). Renderizar resultados em uma lista
   logo abaixo do campo, com `<a>` para `marca.html`, `local.html`,
   `evento.html`; `role="status"` para o contador; estado vazio com sugestões.
2. **Esconder** o botão enquanto não existir busca (`data-busca-topo` sai do
   `<body>` do `index.html`), e registrar a busca no ROADMAP como feature.

**Pronto quando:** digitar "deck" mostra a Marca Forró Deck 16 e seus eventos;
digitar "forro" acha resultados com acento; teclado navega e Esc fecha.

---

### PRD-02 — Agenda sem eventos futuros (recorrência não materializada)

> **Status 2026-10-28:** implementado como ocorrências em memória e **removido
> no mesmo dia** a pedido do Thiago (não é confirmado pela Marca e não é
> editável no admin). O texto abaixo fica como referência para uma futura
> versão com confirmação explícita por edição.

**Sintoma:** hoje (26/10/2026) existem **3 eventos futuros** de 15. A Tira de
Dias (7 dias) fica sem badge e os cards não abrem nada. A Home responde "nada"
para a pergunta central do produto.

**Causa:** `Marca.frequencia` + `Marca.diasSemana` guardam a recorrência
("semanal", "quinta"), mas o Evento é sempre uma data única preenchida à mão.
`Forró do Praia` (quintas) e `Forró na Marina` (domingos) têm só instâncias
passadas.

**Como resolver:** decidir entre:
- **(A) Materializar ocorrências no service** (sem mudar schema): a partir de
  `frequencia`/`diasSemana` da Marca, gerar as próximas N ocorrências virtuais
  no `eventoService`, marcadas com `origem: 'recorrencia'` e sem gravar no
  JSON. Resolve em dias, mas cada ocorrência virtual precisa de `horario` e
  `ingresso` herdados do último evento real da Marca.
- **(B) Gerador no admin**: botão "gerar próximas 8 semanas" que cria eventos
  reais a partir da recorrência. Dados ficam explícitos, mas o JSON cresce.

Recomendação: **A** agora (urgência de conteúdo) com **B** depois, quando o
admin tiver lote.

**Pronto quando:** a Home mostra eventos na semana corrente sem ninguém
cadastrar manualmente; eventos reais continuam tendo prioridade sobre os
gerados; o card sinaliza quando a data é recorrente.

---

### DAT-01 — WhatsApp da Marca em formato inválido

`mrc-008` (`Forró Vix Botequim`) tem `whatsapp: "27996457828"`, enquanto as
outras usam `https://wa.me/...`. `js/pages/marca.js:86` usa o valor direto no
`href` → o botão "WhatsApp" vira link relativo quebrado.

**Como resolver:** normalizar para `https://wa.me/5527996457828` e, no admin,
converter telefone para link no padrão (`admin/js/marcas.js`), com dica no
campo. Vale conferir `mrc-002` (`+55 27 9962-5136` tem 8 dígitos no número
local — provável erro de digitação).

**Pronto quando:** todos os `whatsapp` de `marcas.json` começam com `https://`.

---

### UX-01 — Contraste insuficiente

Valores medidos (WCAG 2.1 AA pede 4,5:1 para texto < 18,66px):

| Elemento | Contraste | Correção sugerida |
|---|---|---|
| `.badge` data (11px, gold) | 2,74:1 | fundo `--cor-clay` + branco (4,49:1) ou criar `--cor-gold-escuro-2` |
| Nav inferior inativa (11px) | 3,16:1 | 12px + `--cor-texto-suave` (5,58:1) |
| Nav inferior ativa (clay) | 4,42:1 | `--cor-clay-escuro` (7,47:1) ou pine |
| `.texto-fraco` (13px) | 2,8:1 | escurecer `--cor-texto-fraco` para ~`#7A6B55` |

**Pronto quando:** todo texto pequeno ≥ 4,5:1 e componentes de UI ≥ 3:1,
verificado no DevTools (contrast ratio) ou axe.

---

### UX-02 — "De" maiúsculo nas datas

`formatarDataCompleta()` devolve `"sexta, 9 de outubro"`, e as páginas aplicam
`text-transform: capitalize`, que em pt-BR capitaliza **cada palavra**:
"Sexta, 9 **De** Outubro".

**Como resolver:** remover o `text-transform` do `style` inline e aplicar
`capitalizar(formatarDataCompleta(...))` (função já existente em
`js/utils/format.js`) ou `::first-letter` + `text-transform: lowercase` no
elemento.

**Pronto quando:** datas aparecem "Sexta, 9 de outubro".

---

### UX-03 — CTA de ingresso sem link

`js/pages/evento.js:88` renderiza "Garantir ingresso" com `href="#"` quando
`ingresso.link` é `"em breve"` ou vazio — 5 eventos estão nesse estado.

**Como resolver:** quando não houver link, trocar o CTA por um estado
informativo ("Ingresso na porta" / "Em breve") sem link, ou desabilitar o
botão com `aria-disabled` e explicação. Nunca `href="#"`.

**Pronto quando:** nenhum link de ingresso aponta para `#` em `eventos.json`.

---

## 5. Detalhamento — P1

### PRD-03 — Bloco "Hoje" na Home

A Home começa com "Grande Vitória" (texto que parece seletor), a Tira de Dias e
"Próximos bailes" — mas nunca responde diretamente "onde tem forró hoje?".

**Proposta:** um bloco no topo (pine ou clay, ocupando a largura do container)
com uma de duas mensagens:
- **Com evento:** "Hoje tem 2 bailes" + o mais próximo (nome, horário, local,
  preço) + CTA "Ver os 2".
- **Sem evento:** "Hoje não tem baile" + "O próximo é quinta, 5 de novembro —
  Forró do Praia" + CTA "Ver agenda".

Isso resolve hierarquia, expectativa e o estado vazio de uma vez. Depende de
PRD-02 para não mostrar "nada" com frequência.

---

### UX-04 — Alvos de toque

Abaixo de 44×44: `.barra-topo-icone` (32), `.seta-tira` (32),
`.controle-direita` (32 de altura), `.story-fechar` (36), `.botao-midia` (40),
`.pill` (~33 de altura).

**Correção:** manter o ícone em 22px e aumentar a área com `padding`/
`min-height: 44px` (ou `::after` estendendo o hit area). Não aumentar o
desenho do ícone.

---

### UX-05 — Safe area do iPhone

`css/base.css:14` usa `padding-bottom: 76px` fixo. A nav inferior soma
`env(safe-area-inset-bottom)`; no iPhone com indicador, a nav fica mais alta que
76px e cobre o último card.

**Correção:** `padding-bottom: calc(76px + env(safe-area-inset-bottom));`

---

### UX-06 — Imagens: peso e entrega

Dois problemas acoplados:
1. `forro-do-canto-capa.png` e `forro-do-canto-logo.png` são **byte-idênticos**
   (1,19 MB cada), e a capa é usada como fallback de imagem do evento — entra
   na Home e nos cards.
2. O site usa `background-image` inline (`js/utils/format.js:119`), o que
   impede `loading="lazy"`, `srcset` e `decoding="async"`, e não reserva espaço
   (CLS).

**Correção:** (a) excluir a duplicata e reexportar capa/logo em WebP ~1600px
de largura (meta < 200 KB); (b) migrar o card para `<img>` com
`aspect-ratio: 16/9; object-fit: cover`, `loading="lazy"`, `decoding="async"`
e `srcset` de 1x/2x; (c) manter o gradiente como `::after` do `.midia`.

---

### UX-07 — Card de evento

Hoje: foto 140px com badge de data **e** marca sobrepostas, título 15px/500 sem
limite de linhas, meta "Quarta · Local". Faltam **horário** e **preço** — as
duas informações de decisão.

**Proposta de anatomia:** capa 16/9 → marca sobre a foto (sem badge) → título
600 com `line-clamp: 2` → linha de meta `Hoje · 20h · R$ 30` (ou `Grátis`) →
local discreto. Data no corpo ou como coluna "7 NOV" à esquerda; nunca os dois
elementos brigando sobre 140px.

---

### UX-08 — Tipografia fluida e fim da hierarquia inline

`h1` fixo em 40px quebra nomes longos de Marca no header; títulos de seção
dependem de `style="font-size: var(--tam-titulo-sm)"` repetido em ~15 lugares
(56 `style=` no total nos templates JS).

**Correção:**
```css
h1 { font-size: clamp(1.75rem, 6.5vw, 2.5rem); text-wrap: balance; }
.secao > h2 { font-size: var(--tam-titulo-sm); margin-bottom: var(--esp-md); }
.perfil-header h1 { font-size: clamp(1.6rem, 7vw, 2.25rem); }
```
e remover os estilos inline correspondentes. Bônus: `.botao--inline` e
`.botao--sm` para eliminar os `width:auto; padding-left/right:24px` ad hoc.

---

### UX-09 — Story: decidir o comportamento

A barra de progresso sugere auto-advance que não existe. Escolher:
- **(A) Story de verdade:** 5s por slide com `animation` na barra, swipe por
  Pointer Events, pausa ao segurar.
- **(B) Carrossel paginado:** "1 de 3", setas, sem barra de progresso.

Recomendação: **(B)** nesta fase (menos código, acessível por teclado). Em
ambos os casos: não avançar ao clicar em qualquer lugar sem affordance, e
mover o foco para o diálogo ao abrir.

---

### UX-10 — Navegação

- Ícone de **casa** rotulado "Voltar" em 9 páginas (`js/barraTopo.js:19-25`):
  trocar por chevron-left; se não houver histórico, cair no fallback.
- **Favoritos** mora só no coração do topo; **Perfil/Configurações/Sobre** só no
  drawer. Unificar: Favoritos no drawer (ou na nav inferior no lugar de "Menu",
  com o menu virando "Perfil").
- **Desktop:** a partir de 900px, desligar a nav inferior e usar a barra do topo
  como navegação.

---

### UX-11 — Modal de login

- Botão primário em **clay** enquanto o resto do app usa **pine** para ação →
  padronizar em pine; clay fica para destaque/estado.
- Sem fechar com **Esc**, sem prender o foco, sem devolver o foco ao fechar.
- Sem "alça" visual de bottom sheet (no mobile parece um card solto).
- Adicionar `role="alert"`/`aria-live` na mensagem de status.

---

### UX-12 — Menu lateral fechado

`js/pwa.js:65` aplica `aria-hidden="true"` no drawer fechado, mas os links
continuam focáveis por Tab (violação de acessibilidade). Usar o atributo
`inert` (ou `visibility: hidden` no estado fechado, com transição só no
`transform` de abertura).

---

### TEC-01 — Estratégia de cache do service worker

Hoje: cache-first para **tudo** (exceto `/data/` e localhost). Arquivos ficam
congelados até alguém trocar `CACHE_NOME` manualmente (`sw.js:12`) — já causou
produção travada (DECISOES 2026-10-07).

**Proposta:** *stale-while-revalidate* para HTML/JS/CSS (serve o cache e
atualiza em background), `cache-first` só para ícones/fontes, e um fallback
offline. Isso elimina o bump manual e a classe de bug "página travada".

---

### TEC-02 — Service worker × Supabase ⚠️

O handler de `fetch` (`sw.js:66-95`) trata qualquer GET fora de `/data/` como
estático — incluindo cross-origin. Requisições do Supabase (ex.
`/auth/v1/user`, mesma URL para qualquer usuário) podem ser servidas do cache,
com risco de estado de sessão desatualizado ou dado de outra conta após
logout/troca de usuário no mesmo dispositivo.

**Ação imediata:** no `fetch`, se `url.origin !== self.location.origin` →
`fetch(request)` direto, sem cache. **Depois:** validar em produção com duas
contas no mesmo navegador.

---

### TEC-03 — Soft-delete não propaga

`listarEventos()` filtra apenas `evento.ativo`. Desativar uma Marca ou um Local
não esconde os eventos: eles continuam na Home como "Marca em breve". Hoje é
latente (todas as marcas ativas), mas o admin oferece o checkbox.

**Correção:** filtrar no service (não no repository) por
`marca?.ativo !== false && local?.ativo !== false`, ou fazer o join no
repository. Documentar a semântica: "evento herda a visibilidade da Marca e do
Local".

---

### TEC-04 — Dados crus em `innerHTML`

`titulo`, `descricao`, `nome` e `condicoesEspeciais[].descricao` são
interpolados sem escape em `cardEvento.js`, `evento.js`, `marca.js`,
`local.js` e nas listas do admin. Risco baixo hoje (só o admin escreve), mas
vira XSS armazenado quando o cadastro abrir para colaboradores.

**Correção:** helper `escaparHtml()` em `js/utils/format.js` (ou
`textContent`/`createElement` nos pontos críticos); aplicar também no admin.
Nota: o admin já tem `escaparAtributo()` local em `eventos.js` — extrair para
`admin/js/util.js` e reutilizar.

---

### SEC-01 — LGPD

Coletamos nome, sobrenome, data de nascimento, gênero, cidade, telefone e bio,
sem política de privacidade, sem termo de uso e sem exclusão de conta
self-service (só logout). Um perfil pode ser apagado pelo banco, mas o usuário
não tem caminho na interface.

**Proposta:** página `privacidade.html` (o que coletamos, por quê, retenção,
como excluir), link no drawer e no cadastro; botão "Excluir minha conta" em
`configuracoes.html` chamando uma função `excluirConta()` (Edge Function com
`service_role` ou fluxo por e-mail). Enquanto não houver exclusão: pelo menos
um canal de contato explícito.

---

### SEO-01 — Open Graph e metadados

Nenhuma página tem `og:*`, `twitter:*`, canonical, JSON-LD ou `sitemap.xml`; só
`index.html` tem `meta description`. As páginas de detalhe montam conteúdo por
JS, então robôs de prévia não veem o evento — a prévia no WhatsApp sai genérica
(limitação já registrada em DECISOES 2026-10-08).

**Proposta fase 1 (S):** `<meta name="description">` em todas as páginas +
`og:title`/`og:description`/`og:image` estáticos na Home, `robots.txt`,
`sitemap.xml` com as páginas e uma entrada por Marca/Local (pode ser gerado por
script no deploy).
**Fase 2 (M/G):** pré-render das páginas de evento ou Edge Function que devolve
HTML com OG por slug.

---

### DOC-01 — Documentação contradiz o código

| Documento | Afirma | Realidade |
|---|---|---|
| `ROADMAP.md:69-73` | `interacoes` nunca criada; `favoritos.html` é placeholder | `sql/interacoes.sql` existe e `favoritos.js` funciona |
| `GUIA_SUPABASE_SETUP.md:10-13` | Interações não implementadas | Implementadas em 2026-10-02 |
| `ROADMAP.md:97-98` | remete a `IDEIAS_INSPIRACAO_FORROZINHO.md` | arquivo inexistente (só `docs/IDEIAS.MD`) |
| `ROADMAP.md:50-58` | "GitHub atrasado" | `main` sincronizada com `origin/main` |

**Ação:** atualizar os três, mover "GitHub atrasado" para concluído, corrigir o
link, e adicionar este arquivo (`MELHORIAS.md`) à seção "Leia antes de alterar"
do `CLAUDE.md` só quando ele virar fonte oficial de prioridade.

---

## 6. Detalhamento — P2 (resumido)

- **PRD-04 · Agenda por data/região.** Hoje só filtra por categoria da Marca.
  Adicionar filtro de período (hoje/semana/mês) e cidade, com estado na URL
  (`?cat=&de=&ate=`) para permitir compartilhar a agenda filtrada.
- **PRD-05 · Adicionar ao calendário.** Botão secundário no evento gerando
  `.ics` client-side (Blob) ou link `calendar.google.com/render?action=TEMPLATE`.
  Alto valor para intenção "quero ir".
- **PRD-06 · Local usa os dados que já tem.** `instagram`, `site`, `fotoCapa` e
  `fotoPerfil` existem em `locais.json` e não aparecem em `local.js`. Exibir
  capa no header, foto circular e chips de contato (padrão do perfil).
- **PRD-07 · Selos no card.** `Grátis`, preço, `Colaborativo`, aviso de chuva —
  já registrado como ideia no ROADMAP; combinar com a reformulação do card
  (UX-07) para não mexer duas vezes.
- **PRD-08 · Contagem social.** "12 pessoas vão" na página de evento e nos
  cards. Requer revisar SEC-02 (a leitura pública das interações expõe linhas
  individuais; para contagem o ideal é uma view agregada ou uma função RPC).
- **UX-13 · Skeletons.** Placeholder com o mesmo `aspect-ratio` do card evita
  pulo de layout na Home/Agenda/Favoritos.
- **UX-14 · Feedback de toque.** `:hover`/`:active` em cards, pills e botões;
  `transition: 120ms`; respeitar `prefers-reduced-motion` (já há regra global).
- **UX-15 · Empty states.** "Nenhum evento futuro" é o texto atual da Home.
  Adicionar ícone/ilustração e CTA ("Ver agenda completa", "Seguir marcas").
- **UX-16 · Desktop.** A partir de 900px: container 960px, grade de 2–3
  colunas, nav no topo, headers alinhados à esquerda. Sem isso o app parece um
  site mobile aberto no computador.
- **UX-17 · Tira de Dias.** Deixar só "Hoje" com realce; os outros dias em
  cartão neutro. Mover o badge de contagem para o canto superior direito do
  cartão para não colidir com o mês.
- **UX-18 · Formulários.** Erro por campo (`aria-invalid`, `aria-describedby`),
  `role="alert"` no resumo, validação de e-mail/telefone antes do envio.
- **UX-19 · Sobre.** O texto pede contato pelo Instagram e não linka. Adicionar
  botão/link para o perfil do Movimento Livre de Forró.
- **UX-20 · Hero do evento.** `height: 220px; border-radius: 0` inline
  (`evento.js:58`) rompe a linguagem de cards. Opção editorial: imagem
  full-bleed com título sobreposto (mesmo tratamento do story) ou card arredondado
  como os demais.
- **TEC-05 · Validator.** `validarLocalDoEvento` não verifica se `localId`
  existe/está ativo; referência quebrada vira "Local em breve" silencioso.
  Estender o veredito e logar no console como já é feito para a Marca.
- **TEC-06 · Script de dados.** `node scripts/validar-dados.js` checando: JSON
  válido, IDs e slugs únicos, refs existentes, `localPadraoId` coerente,
  `ingresso` no schema atual, campos obrigatórios, formato de `whatsapp`.
  Rodar antes de deploy (ou em pre-commit).
- **TEC-07 · Lint/CI.** Sem `package.json`. Adicionar ESLint (flat config) +
  Prettier apenas como ferramenta de dev (sem build) e um workflow do GitHub
  Actions rodando lint + validação de dados.
- **TEC-08 · PWA offline.** `ARQUIVOS_ESTATICOS` não inclui `js/pages/*`,
  `js/services/*`, `js/utils/*`, `js/repositories/*` nem `components/*.js`.
  Offline a casca abre e a página fica vazia. Incluir os módulos no pré-cache
  (ou aceitar que offline é "shell only" e documentar).
- **TEC-09 · Slug único.** Admin não avisa quando o slug gerado já existe
  (duas marcas com nome igual, ou evento duplicado com mesma data).
- **TEC-10 · Schema legado.** 6 eventos ainda têm `ingresso.plataforma`; a
  interface lê `tipoEntrada` e o campo antigo é ignorado. Migrar por script
  (o admin migra um a um ao reeditar).
- **TEC-11 · Campos órfãos.** `fotoCapa`/`fotoPerfil` nunca são preenchidos nem
  exibidos; `origem`/`criadoEm`/`atualizadoEm` existem só em Local. Decidir:
  exibir (PRD-06) ou remover do schema e do admin.
- **TEC-12 · Avatar.** Validar `type.startsWith('image/')`, extensão aceita e
  tamanho (ex. 5 MB) antes do upload; redimensionar no canvas (avatar de 112px
  não precisa de 4000px).
- **TEC-13 · `inicioDeHoje()`.** Duplicada em `eventoService`, `marcaService` e
  `localService`. Mover para `js/utils/format.js` como `inicioDoDia()`.
- **SEC-02 · Leitura pública de interações.** `select using (true)` permite
  listar quem favoritou o quê. Se a intenção é só contagem agregada, trocar por
  view/RPC que devolva apenas números; se for "quem vai" público, documentar a
  decisão e o trade-off de privacidade.
- **SEO-02 · robots/noindex.** `admin/index.html` é um HTML estático público em
  `vaiterforro.com.br/admin/`; não vaza dados (o acesso ao disco exige
  permissão local), mas confunde e pode ser indexado. Adicionar
  `<meta name="robots" content="noindex">` e um `robots.txt` com `Disallow:
  /admin/`.
- **SEO-03 · Descriptions.** Uma `<meta name="description">` por página,
  específica (agenda, sobre, perfil não precisa).
- **DAT-02 · Eventos passados.** 12 eventos no passado. Decidir política:
  (a) manter para o "Histórico" da Marca (já existe em `marca.js`), (b) arquivar
  em `data/eventos-arquivo.json` acima de X meses, (c) limpar manualmente.
  Recomendação: (b) com script, mantendo 12 meses no arquivo principal.
- **DAT-03 · Padronizar campos.** `whatsapp` sempre URL `wa.me` (ou sempre
  telefone, com o service montando o link); `instagram` sempre handle sem `@`
  (o perfil já remove, a Marca não). Definir no `MODELO_DE_DADOS.md`.
- **DOC-02 · README raiz.** Um resumo de 20 linhas + link para `docs/README.md`,
  stack, como rodar e link do site. Hoje o GitHub abre o repositório sem
  apresentação.
- **DOC-03 · Arquitetura.** `ARQUITETURA.md` precisa citar Interações como
  implementadas e o padrão de service sem repository; `MODELO_DE_DADOS.md`
  precisa listar os campos reais de Evento/Marca/Local (hoje só descreve
  relações).
- **DOC-04 · Limpeza.** Remover `Teste.html` (mockup antigo), `old.zip`
  (snapshot de 248 KB), criar `.gitignore` (`.DS_Store`, `Thumbs.db`,
  `node_modules/`, `*.log`).
- **UX-21 · Marca dentro do app.** Usar `assets/icons/icon-192.png` como selo
  pequeno ao lado do nome na barra do topo (reconhecimento e confiança).

---

## 7. Detalhamento — P3 (ideias aceitas, sem prazo)

- **PRD-09 · Festival.** Estrutura oficial Marca → Festival → Dias → Eventos
  diários. Nunca modelar Festival como Evento único (decisão já registrada).
- **PRD-10 · Bandas/DJs.** Hoje `lineup.bandas` e `lineup.djs` são arrays de
  string. Virar entidade quando houver demanda de perfil/histórico.
- **PRD-11 · Importadores.** Google Agenda, Instagram/flyer, Sympla, Onticket.
  A base oficial continua sendo o sistema (importador, não fonte).
- **PRD-12 · Mapa no Local.** `latitude`/`longitude` já existem; `local.html`
  só linka para o Maps externo. Mapa embutido (Leaflet/OSM sem chave de API).
- **PRD-13 · "Novo no Forró?"** Conteúdo estático de acolhimento; baixo esforço.
- **PRD-14 · Avaliações.** Estrutura, som, piso, banheiro (notas de 5 estrelas)
  — está em `docs/IDEIAS.MD`; depende de entidade de usuário madura e de
  moderação.
- **PRD-15 · Contador de comunidade.** Só faz sentido com volume real de dados.
- **PRD-16 · Colaborador regional.** Exige `regiao`/`cidade` como atributo de
  primeira classe em Local **antes** de abrir curadoria.
- **PRD-17 · Contratar artistas.** Depende de PRD-10.
- **PRD-18 · Compartilhar em Marca/Local.** `components/compartilhar.js` já é
  reutilizável; falta o botão nas duas páginas.
- **UX-22/UX-23 · Sistema visual.** Tokens que faltam (`--esp-2xs`,
  `--traco-icone`) e sprite de ícones (coração, casa, calendário se repetem em
  3+ arquivos).
- **TEC-14 · `<head>` duplicado.** Fontes + CSS repetidos em 10 páginas. Sem
  build tools, dá para extrair com um `js/head.js` (mesmo padrão de
  `barraTopo.js`) ou aceitar a duplicação como consciente — decidir e registrar.
- **DOC-05 · Arquivar DECISOES.** ~53 KB; mover entradas anteriores a 2026-09
  para `DECISOES_ARQUIVO.md` mantendo as recentes no principal.
- **DOC-06 · Checklist de deploy.** Bump do cache (até TEC-01 resolver),
  `validar-dados`, teste de login em produção, conferir se imagens novas
  existem. Salvar como `docs/DEPLOY.md`.
- **OPS-01 · Medição.** Analytics sem cookies (ex. Plausible/Umami ou contagem
  própria no Supabase) para saber se a Home é vista, se a busca é usada, se
  stories abrem. Sem isso, priorização vira palpite.

---

## 8. Sequência sugerida

### Ciclo 0 — "consertos de hoje" (~1 dia)
DAT-01 → UX-01 → UX-02 → UX-03 → UX-05 → UX-04.
São todos S, sem decisão de produto, e resolvem os defeitos mais visíveis.

### Ciclo 1 — "a Home funciona" (~1 semana)
PRD-01 (busca) → PRD-03 (bloco Hoje) → UX-07 (card).
Aqui o produto passa a responder à pergunta central com informação confiável.

### Ciclo 2 — "confiança e alcance" (~1 semana)
TEC-01/TEC-02 (cache) → TEC-03 (soft-delete) → SEO-01 (OG) → TEC-04 (escape) →
DOC-01.

### Ciclo 3 — "refino visual" (~1 semana)
UX-08 (tipografia) → UX-09 (stories) → UX-10 (navegação) → UX-11/UX-12
(modal/menu) → UX-06 (imagens) → UX-13/UX-14 (estados e feedback).

### Ciclo 4 — "operação" (contínuo)
TEC-06 (script de dados) → TEC-07 (lint/CI) → DOC-02..06 → SEC-01 (LGPD) →
SEO-02/03 → DAT-02/03.

---

## 9. O que deliberadamente fica de fora (decisões já tomadas)

Não reabrir sem nova decisão registrada em `DECISOES_DE_ARQUITETURA.md`:

- Gamificação (pontos, níveis, check-in, ranking) — Fase 2/3.
- Entidade Professores — deprioritizada.
- Evolução do admin para app desktop Python — caminho recomendado é Flask
  reaproveitando o JS atual, só quando houver necessidade.
- Acervo de álbuns/letras e jogos/quiz — fogem do objetivo central.
- Login social além de Google/magic link — não é prioridade.

---

## 10. Manutenção deste documento

- Este arquivo é **entrada**, o `ROADMAP.md` é **saída**: ao assumir um item,
  copiar para o ROADMAP com prazo e dono.
- Ao concluir, marcar `done` aqui e registrar o "por quê" em
  `DECISOES_DE_ARQUITETURA.md` quando a mudança for estrutural (regra do
  `CLAUDE.md`).
- A cada auditoria nova, revisar P0/P1 e rebaixar o que já não dói.
- Não transformar este documento em lista de desejos: cada item precisa de
  critério de pronto verificável (como os do P0/P1 acima).
