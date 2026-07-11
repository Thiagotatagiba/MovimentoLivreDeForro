# Design System — Movimento Livre de Forró

Este documento descreve os tokens e componentes já implementados em
`css/tokens.css` e `css/styles.css`. Não é um sistema à parte — é a leitura
organizada do que já existe no CSS, para qualquer pessoa (ou eu, no futuro)
conseguir reutilizar sem reabrir todos os arquivos.

## Princípio

Poucas cores, hierarquia clara, muito espaço em branco. Verde-pinha é a cor
de ação (botões, links, header). **Terracota é reservada exclusivamente para
o marcador "acontecendo hoje"** — nunca vira cor de botão genérica. Isso é
proposital: quando o terracota aparece, o usuário aprende a associar
"algo está rolando agora", e isso perde força se a cor for usada em qualquer
lugar.

## Cores (`css/tokens.css`)

| Token | Uso |
|---|---|
| `--ink` | Texto principal |
| `--ink-soft` | Texto secundário (parágrafos de apoio) |
| `--muted` | Metadados (datas, endereços) |
| `--paper` | Fundo da página |
| `--surface` | Fundo de cards e superfícies elevadas |
| `--sand` / `--sand-line` | Bordas e divisores |
| `--pine` / `--pine-strong` | Cor primária de ação (botões, links ativos, header) |
| `--pine-tint` | Fundo suave para blocos de destaque (ex. "Sobre o Movimento") |
| `--clay` | Reservada para o marcador "Hoje" — não usar em outros contextos |
| `--clay-tint` | Reservada para variações futuras do marcador de destaque |

## Tipografia

- **Display** (`--font-display`, Fraunces): títulos, `h1`–`h3`, nomes de evento nos cards.
- **Corpo/UI** (`--font-body`, Work Sans): texto corrido, botões, labels, filtros.
- Escala: `--text-xs` (12px) até `--text-4xl` (48px), sempre via variável — nunca `px` direto no CSS de componente.

## Espaçamento

Grid de 8px: `--sp-1` (4px) até `--sp-9` (96px). Qualquer margem/padding novo deve usar uma dessas variáveis.

## Componentes

### Botões (`.btn`)
- `.btn-primary` — ação principal (verde-pinha). Ex.: "Ver detalhes", "Ingressos".
- `.btn-ghost` — ação secundária (contorno). Ex.: "Falar no WhatsApp", "Ver no Instagram".
- `.btn-sm` — variante compacta, usada dentro dos cards.

### Badges / marcadores
- `.badge-type` — tipo do evento (Baile, Aula...), sobre a miniatura do card.
- `.pulse-today` — marcador "Hoje" com animação de pulso (`--clay`). Só aparece quando `ehHoje(evento)` é verdadeiro.
- `.chip` — marcador neutro dentro da página de evento (ex. "Música ao vivo").
- `.price-tag` — preço ou "Gratuito" no rodapé do card.
- **`.badge` + modificador** — sistema padronizado de badges informativas, usado na página de evento (`.badges-row`). Modificadores: `.badge--type` (tipo do evento), `.badge--free`, `.badge--ticket`, `.badge--couvert`, `.badge--local`, `.badge--list` (forma de acesso — mapeados em `js/access.js → badgeAcesso()`) e `.badge--live`, `.badge--dj` (tipo de música). Nenhum modificador usa `--clay`: essa cor continua reservada só ao marcador "Hoje". O card de evento não usa mais badges — a forma de acesso (couvert, pagamento no local etc.) aparece direto na linha de valor (`.card-price`) quando relevante, mantendo o card enxuto.

### Banner "Hoje tem forró?"
- `.today-banner` — bloco de destaque na Home, logo abaixo do H1. Borda esquerda em `--clay` (mesma associação de "hoje" usada no resto do site). Três variações de conteúdo: data + contagem + cidades (há eventos), ou data + mensagem convidando para ver amanhã (não há eventos). Ver `criarBannerHoje()` em `js/components.js`.

### Cards
- `.event-card` — componente único de card de evento, usado na Home, na Agenda e nos "Eventos relacionados". Ver `js/components.js → criarEventCard(evento, contexto)`. Recebe `contexto.local` e `contexto.marca` para exibir endereço e identidade do baile — nunca busca esses dados sozinho.
- **Hierarquia visual do card** (inspirada em Sympla/Shotgun/Fever, adaptada à identidade do projeto): `.card-eyebrow` (Marca) → título (Nome do evento) → `.card-line` (Data/Horário) → `.card-line--muted` (Cidade/Local) → `.card-price` (Valor) → botão "Ingressos" — este último só aparece quando o evento tem link de compra (`js/access.js → botaoAcesso()`). Sem ingresso, o card continua navegável pela imagem e pelo título; só o botão extra some, sem deixar espaço vazio.
- A miniatura ocupa `aspect-ratio: 4/3` — proporcionalmente maior que o padrão anterior, para que a imagem tenha peso visual sem competir com a informação, que é o que decide se a pessoa vai ao evento.
- `.skeleton-card` — estado de carregamento, mesma altura/proporção do card real (evita salto de layout).
- `.empty-state` / `.empty-state-actions` — estado vazio, **nunca sem uma saída**: `criarEstadoVazio(titulo, mensagem, acoes)` aceita uma lista de ações (links ou botões com `onClick`, ex. "Limpar filtros", "Ver o mês inteiro").

### Grades de eventos
- `.event-grid` (base, até 3 colunas) — Home e "Eventos relacionados": listas curadas e curtas.
- **`.event-grid.is-grade`** (até 4 colunas em telas largas) — visualização padrão da Agenda. Grade contínua sem agrupamento por dia: cada card já mostra a data, e a comparação lado a lado é o objetivo (descoberta, não consulta de calendário).

### Formulários / filtros
- `.filter-select` — `<select>` estilizado, usado nos filtros da Agenda. Base para futuros campos de formulário (ex. formulário de organizador na Etapa 4).
- `.search-input` — campo de busca de texto livre. Mesma linguagem visual do `.filter-select`, largura total.
- `.date-tabs` — tabs de período (Hoje/Amanhã/Semana/Mês), com `role="tablist"`/`aria-selected` para acessibilidade. Fica oculta (`hidden`) quando a visualização "Semana" está ativa, já que ela cobre sempre os próximos 7 dias.
- `.view-toggle` — par de botões "Lista"/"Semana" (`role="group"`, `aria-pressed`), controla o modo de exibição da Agenda.

### Grade semanal
- `.week-grid` / `.week-day` / `.week-event` — visualização em 7 colunas (uma por dia, a partir de hoje). Rolagem horizontal com snap no mobile, grade fixa a partir de 900px. `.week-day.is-today` destaca o dia atual com a cor `--clay` — mesma lógica do marcador "Hoje" nos cards, mantendo o terracota reservado a esse único significado em todo o site.

### Layout
- `.wrap` — container centralizado com largura máxima (`--container-max: 1120px`).
- `.section` / `.section-head` — bloco de seção genérico com título e eyebrow opcional.
- `.info-card` — card de informações práticas na página de evento (data, local, endereço, ações).

## Acessibilidade

- Todos os componentes interativos usam `:focus-visible` com contorno de 3px.
- `.sr-only` para texto only-leitor-de-tela (labels de filtro).
- `.skip-link` para pular direto ao conteúdo.
- Contraste de texto (`--ink` sobre `--paper`/`--surface`) segue WCAG AA.
- `prefers-reduced-motion` desativa animações (pulso do marcador "Hoje", shimmer do skeleton).

## O que ainda não existe (e onde vai entrar)

- **Página da Marca** — dados e serviço já existem (`data/marcas.json`, `js/services/marcasService.js`, `eventosService.listarPorMarca()`); falta só o layout da página em si (próxima etapa do roadmap).
- **Estados de acesso ao evento** (gratuito/couvert/pagamento local/lista) — arquitetura pronta em `js/access.js`, visual a definir quando forem implementados.
- **Componentes de formulário completos** (input de texto, textarea, upload de imagem) — vêm com o painel administrativo.
- **Mapa interativo** — vai precisar de um token de altura padrão e um card de resultado próprio.
