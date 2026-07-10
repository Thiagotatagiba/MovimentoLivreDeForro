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

### Cards
- `.event-card` — componente único de card de evento, usado na Home, na Agenda e nos "Eventos relacionados". Ver `js/components.js → criarEventCard()`.
- `.skeleton-card` — estado de carregamento, mesma altura/proporção do card real para evitar salto de layout.
- `.empty-state` — estado vazio (sem eventos), sempre com uma ação de saída (ex. link para a agenda completa).

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

- **Estados de acesso ao evento** (gratuito/couvert/pagamento local/lista) — arquitetura pronta em `js/access.js`, visual a definir quando forem implementados.
- **Componentes de formulário completos** (input de texto, textarea, upload de imagem) — vêm com o painel administrativo (Etapa 4).
- **Mapa interativo** — vai precisar de um token de altura padrão e um card de resultado próprio.
