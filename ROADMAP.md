# Roadmap — Movimento Livre de Forró

Este documento existe para que qualquer pessoa (inclusive eu, em uma sessão
futura) entenda em que pé o projeto está e o que vem a seguir, sem precisar
reconstruir o histórico de decisões a partir do zero.

## Visão de produto

> O Movimento Livre de Forró não é apenas um site de eventos — é uma
> plataforma para fortalecer a comunidade do Forró Pé de Serra da Grande
> Vitória.

A Agenda continua sendo o produto principal e o caminho mais rápido para
responder "onde tem forró hoje?". Mas a arquitetura é pensada desde já para
crescer sem grandes refatorações até incluir perfis de Marcas, Locais,
Professores e Bandas, avaliações, comentários, seguidores, favoritos,
notificações, histórico de eventos, check-ins e fotos enviadas pela
comunidade. Nada disso está implementado — é o horizonte que orienta as
decisões de modelagem de dados e de componentes tomadas em cada etapa.

Princípio adotado a partir daqui: **priorizar componentes reutilizáveis,
entidades bem definidas e arquitetura preparada para evolução contínua**,
sempre mantendo a Agenda como o coração do projeto.

## Prioridade das próximas etapas

1. **Finalizar a Agenda** (UX refinada) — concluída
2. **Marcas** — modelo de dados e página de perfil concluídos
3. **Locais** — próxima
4. Professores
5. Bandas
6. Notícias
7. Mapa interativo
8. Sincronização com Google Calendar
9. Painel Administrativo
10. Comunidade (perfis, favoritos, avaliações, notificações, check-ins)

## Etapa 1 — MVP (concluída)

- Home, Agenda e Página de Evento, em HTML/CSS/JS vanilla (ES modules).
- Design System consolidado (`docs/DESIGN_SYSTEM.md`).
- Camada de dados em três níveis: `data/*.json` → `js/repositories/*` → `js/services/*`. Páginas só falam com o serviço.
- Modelo de evento já compatível com Google Calendar (`inicio`/`fim` em ISO 8601, `id` estável, `status`, `origem`).
- Arquitetura de estados de acesso ao evento (`js/access.js`) — hoje só "ingresso" está ativo.
- Home com subtítulo institucional e resumo automático da semana (nº de eventos, cidades, aulas).
- CTA dos cards padronizado como "Ver detalhes" (sem RSVP ainda).

## Etapa 2 — Fortalecer a Agenda (concluída)

Prioridade confirmada: a Agenda é o principal diferencial do projeto, então
evoluiu antes das páginas de perfil.

- [x] Visualização semanal tipo calendário — **padrão** ao abrir a Agenda, com contagem de eventos por dia e "Nenhum evento programado" nos dias vazios
- [x] Busca por texto (nome do evento, cidade, tipo, descrição, **e nome da marca**)
- [x] Filtros avançados: horário (manhã/tarde/noite), música (ao vivo/DJ) e **marca**
- [x] Preparação de dados para mapa interativo: `latitude`/`longitude` em cada local
- [x] Persistência de filtro na URL, incluindo o modo de visualização
- [x] Badges padronizadas nos cards (`.badge` + modificadores) para tipo de evento, forma de acesso e tipo de música
- [x] Estados vazios nunca "mortos": sempre oferecem uma ação (limpar filtros, ver o mês inteiro, ver amanhã)
- [x] Botão "Abrir no Google Maps" na página do evento, com fallback em cascata (coordenadas do local → coordenadas do próprio evento → busca por endereço)
- [x] Botão de acesso inteligente ("Ingressos" só quando há link; outros tipos mostram badge informativa mesmo sem botão)
- [x] Cards e hero preparados para imagem real (`loading="lazy"` nos cards; fallback ilustrativo quando `imagem` é `null`)
- [x] Modelo de evento com todos os campos necessários para uma futura sincronização com Google Calendar — mapeamento completo em `docs/MODELO_DE_DADOS.md`
- [x] Cards compactos na lista da Agenda — **substituído pela Grade** (ver Etapa 2.6 abaixo)
- [ ] Mapa interativo em si (fica para a Etapa 7)

### "Hoje tem forró?" — banner de destaque da Home

Resposta imediata à pergunta central do projeto, logo abaixo do H1: dia da
semana + data por extenso, contagem de eventos de hoje e as cidades onde
estão acontecendo — ou uma mensagem amigável convidando para ver amanhã,
quando não há nada hoje. Implementado em `criarBannerHoje()`
(`js/components.js`), consumindo `eventosService.listarPorJanela(0)`.

## Etapa 2.6 — Agenda como vitrine de descoberta (Grade)

Depois de testar, ficou claro que a Agenda deveria se parecer menos com um
calendário e mais com Sympla/Shotgun/Fever: uma grade de cards onde a pessoa
descobre eventos comparando-os lado a lado, não consultando dias vazios.

- [x] **Grade virou a visualização padrão**, substituindo a antiga lista agrupada por dia. Sem cabeçalhos de data — cada card já mostra data e horário, e a grade é contínua.
- [x] Grid responsivo: 1 coluna no mobile, 2 em tablet, 3 no desktop, 4 em telas largas (`.event-grid.is-grade`)
- [x] Card redesenhado com hierarquia fixa: **Marca → Nome do evento → Data/Horário → Cidade/Local → Valor → Botão "Ingressos"** (condicional — só aparece quando o evento tem link de compra, reaproveitando `botaoAcesso()`)
- [x] Imagem em `aspect-ratio: 4/3` (~40% da altura do card), grande o suficiente para ter presença visual sem competir com a informação
- [x] Removidas as badges de tipo/música do corpo do card (ficaram só na página de evento) — a forma de acesso quando relevante (couvert, pagamento no local) aparece direto ao lado do valor, mantendo o card enxuto
- [x] Visualização "Semana" (calendário) preservada como opção secundária, um clique de distância
- [x] Card único: a mudança vale para Home, Agenda e "Eventos relacionados" ao mesmo tempo — não existem dois designs de card divergentes no projeto
- [x] Removida a variante `.event-card--compact` (linha compacta), que ficou sem uso com a Grade substituindo a lista — não deixamos CSS morto no projeto
- [x] **Hierarquia do card invertida: Marca em destaque, evento em segundo plano.** A lógica: em dois anos a comunidade vai perguntar "hoje tem Deck?", não o nome de cada edição — é a Marca que fideliza, não o evento pontual. `.card-marca` (grande) → `.card-evento-titulo` (pequeno) substituiu o antigo eyebrow pequeno + título grande.
- [x] Modelo da Marca enriquecido: `frequencia` (semanal/quinzenal/mensal/eventual) e `desde` (ano de fundação) — nenhum dos dois aparece na interface ainda, mas já estão nos dados para quando a página da Marca existir
- [x] `ativo` na Marca — permite tirar um baile que parou de listagens futuras sem apagar seu histórico
- [x] `eventosService.listarHistoricoPorMarca()` — fecha o gap que a Etapa 3 já tinha sinalizado como pendente. "Próximo evento", "últimos eventos" e "eventos realizados" são sempre consultas sobre `eventos.json`, nunca campos armazenados na Marca — assim a Marca nunca fica "desatualizada" na tela
- [x] Campos futuros de avaliação (`mediaAvaliacoes`, `totalAvaliacoes`) documentados em `docs/MODELO_DE_DADOS.md`, mas **não adicionados ao JSON ainda** — dependem de login e de uma entidade `Avaliacao` que não existe; adicionar o campo antes da funcionalidade só criaria dado morto

## Etapa 2.5 — Entidade Marca (modelo de dados concluído)

Percebemos que um evento sozinho não representa a identidade de um baile —
"Deck 16" e "Deck 16 — Edição de Agosto" são conceitos diferentes, com ciclos
de vida diferentes. Detalhes do relacionamento em `docs/MODELO_DE_DADOS.md`.

- [x] `data/marcas.json` criado, com as 4 identidades de baile que antes viviam misturadas em `data/locais.json`
- [x] `data/locais.json` reescrito para representar só endereços físicos, sem identidade de baile
- [x] `evento.marcaSlug` (identidade) separado de `evento.localSlug` (endereço) em todos os eventos
- [x] `js/repositories/marcasRepository.js` + `js/services/marcasService.js`, seguindo o mesmo contrato dos demais
- [x] `eventosService.listarPorMarca(slug)` — pronto para alimentar "próximos eventos" na futura página da Marca
- [x] Cards mostram a Marca em destaque (`.card-eyebrow`) acima do título do evento — é o que gera reconhecimento repetido
- [x] Página de evento mostra a Marca no lugar do tipo como eyebrow principal (texto simples, não um link — a página da Marca ainda não existe, e não colocamos links mortos no ar)
- [ ] Página da própria Marca (listagem + perfil individual) — próxima etapa

## Etapa 3 — Marcas (página) — concluída

- [x] `marca.html?slug=...` — perfil individual, sem listagem "todas as marcas" ainda (não foi pedida; a página é alcançável via `.card-marca` nos cards e o eyebrow na página de evento, ambos agora links reais)
- [x] Cabeçalho: banner, logo (com fallback de iniciais quando não há imagem), nome, cidade, frequência, "desde", Instagram, WhatsApp
- [x] Próximos eventos — `eventosService.listarPorMarca(slug, { dias: 365 })`, sempre consultado ao vivo, nunca cacheado
- [x] Últimos eventos — `eventosService.listarHistoricoPorMarca(slug)`, lista leve (não cards) no espírito "✔ Julho ✔ Junho"
- [x] Vazio em "próximos eventos" não é tela morta: CTA "Ver na Agenda" já filtrado por essa marca (`agenda.html?marca=slug`)
- [x] Espaços reservados para Avaliações, Seguidores e Estatísticas — componente `criarFuturoRecurso()`, reutilizável nas futuras páginas de Professor e Banda, **sem nenhum número ou dado inventado**
- [x] Nenhuma mudança em `data/`, `repositories/` ou `services/` foi necessária — a preparação da Etapa 2.5 foi suficiente
- [x] Corrigido um bug latente do eyebrow da página de evento: `class="section-head eyebrow"` nunca aplicava estilo (o CSS esperava elementos aninhados, não a mesma classe combinada) e usava `--clay`, cor reservada ao marcador "Hoje". Virou `.eyebrow` standalone, em `--pine`.

## Etapa 3.5 — Evento de referência (Forró Deck 16) e ajustes de modelo

Cadastramos um evento real para validar a arquitetura ponta a ponta — Marca,
Local, Evento, ingresso, line-up e imagens — e usamos o que ele revelou para
corrigir três duplicações de dado que já existiam:

- [x] **`ingresso` estruturado** substitui `preco` (texto livre) + `entrada` + `acesso`: `{ tipo, precoAPartirDe, link, plataforma }`. `precoAPartirDe` é número, nunca texto fixo — ingresso antecipado sobe de lote, e um preço fixo digitado ficaria errado assim que o lote mudasse. `js/ingresso.js` (renomeado de `access.js`) é a única fonte de verdade para o texto de valor exibido (`formatarValorIngresso()`), o botão de ação (`botaoIngresso()`) e a badge informativa (`badgeIngresso()`).
- [x] Novo tipo de ingresso **`esgotado`** — funciona sem nenhum código especial: como todo estado inativo, `ativo: false` já suprime o botão mesmo com link presente.
- [x] **`lineup.bandas` / `lineup.djs`** (opcional) substitui o enum fixo `musica` para representar quem toca — um evento pode ter banda **e** DJ ao mesmo tempo (caso real do Deck 16), o que um enum de valor único não conseguia expressar. `formatoMusical()` deriva "Ao vivo" / "DJ" / "Bandas e DJ" a partir do line-up, com fallback pro campo legado nos eventos antigos (nenhuma migração retroativa foi necessária).
- [x] **Removidos `instagram`/`whatsapp` do Evento** — eram sempre uma cópia do Instagram/WhatsApp da Marca. A página do evento passou a ler `marca.instagram`/`marca.whatsapp` diretamente.
- [x] Filtro de entrada e de música na Agenda atualizados para derivar de `ingresso.tipo` e `formatoMusical()` — nenhuma duplicação de estado entre filtro e dado.
- [x] Banner da Marca cai automaticamente para a imagem do próximo evento quando a marca ainda não tem banner próprio (`marca.js`), sem inventar imagem nenhuma quando nem um nem outro existe.
- [x] Página do evento ganhou seção "Atrações" (bandas/DJs), reaproveitando `.chip`
- [x] `desde` e `whatsapp` da Marca agora são explicitamente opcionais (`null`) quando não informados — a UI omite o trecho correspondente em vez de inventar um valor
- [x] Coordenadas do novo Local (Cerimonial Espaço Praia) vieram de busca real (base OpenStreetMap), não inventadas
- ⚠️ **Logo da marca e imagem do evento ficaram `null`** — nenhum arquivo de imagem foi anexado à conversa nesta rodada. Assim que os arquivos existirem, basta preencher `marcas.json → logo` e `eventos.json → imagem`; nenhuma outra mudança é necessária (cards, Home, Agenda, página da Marca e relacionados já sabem exibir a imagem automaticamente).

## Etapa 3.6 — Refinamento de UX (Marca e página de evento)

- [x] Título e logo da Marca passaram a viver dentro do banner, sobre um gradiente escuro — antes o texto podia ficar ilegível dependendo da cor da foto de capa
- [x] Local físico removido da identidade da Marca (`.marca-subheader` mostra só cidade, frequência e "desde"). Uma marca pode trocar de casa e continuar sendo a mesma marca — o local mora no evento
- [x] "Eventos relacionados" movido pra fora do grid de duas colunas da página de evento — agora é sempre o último bloco, inclusive no mobile, onde antes aparecia empilhado antes dos botões de ação (ingresso, mapa, contato)
- [x] Rótulos de frequência reformulados para soar como identidade ("Eventos mensais") em vez de descrição de formulário ("Uma vez por mês")

## Etapa 3.7 — Filtros recolhíveis, aniversariantes e acesso à Marca

- [x] Filtros avançados da Agenda (cidade/tipo/entrada/horário/marca/formato) viraram um painel recolhível, fechado por padrão — busca, tabs de período e o seletor Grade/Semana continuam sempre visíveis. Botão "⚙️ Filtros" mostra a contagem de filtros ativos e abre sozinho quando a URL já chega com algum filtro.
- [x] Campo opcional `evento.aniversariantes` — não é uma entidade genérica de promoções, só esse recurso específico. Quando presente, a página do evento mostra uma seção logo após a descrição; sem o campo, nada aparece. Nenhum evento de exemplo do projeto usa esse campo (não inventamos conteúdo pra demonstrar).
- [x] Bloco de destaque pra Marca no fim da página de evento ("Gostou deste evento? Conheça mais sobre {marca}"), reaproveitando `.about-band` (o mesmo bloco da Home) em vez de criar um componente novo. Sem marca reconhecida, o bloco não aparece — mesma regra de sempre contra link morto.

## Etapa 4 — Locais

- Página de listagem + perfil individual de cada local físico
- Mostrar todas as marcas que já promoveram eventos ali (`local` 1:N `marca`, via eventos)

## Etapa 5 — Professores

## Etapa 6 — Bandas

## Etapa 7 — Notícias, Mapa, Busca global

- Blog simples (notícias, entrevistas, cobertura de eventos)
- Mapa interativo com todos os eventos (usa `latitude`/`longitude` já preparados)
- Busca global unificada (eventos + marcas + locais + professores + bandas)

## Etapa 8 — Sincronização com Google Calendar

- Novo repositório `googleCalendarEventosRepository.js`, mesmo contrato do atual — mapeamento completo já documentado em `docs/MODELO_DE_DADOS.md`

## Etapa 9 — Painel Administrativo

- CRUD de eventos, marcas, locais, professores, bandas, notícias
- Estados de evento: rascunho / publicado / cancelado (campo `status` já existe no modelo)
- É o momento natural para migrar `js/repositories/*` de JSON estático para uma API real

## Etapa 10 — Comunidade

- Login, favoritos, agenda personalizada, notificações
- Organizadores autocadastrando eventos (com moderação)
- Perfis com seguidores, avaliações, comentários, check-ins, fotos enviadas pela comunidade
- **Migração para Supabase (ou similar)**: troca-se a implementação de `js/repositories/*`; `js/services/*` e todas as páginas continuam iguais

## Decisões de arquitetura que não devem ser revertidas sem motivo forte

- **Camada de serviço obrigatória**: nenhuma página faz `fetch` direto de JSON. Sempre `eventosService` / `locaisService` / `marcasService`.
- **`.event-card` é único**: variações de conteúdo (CTA, badge, compacto) são parâmetros do componente (`criarEventCard(evento, contexto)`), nunca uma cópia dele.
- **`js/access.js` centraliza a lógica do botão de acesso**: novos estados (gratuito, couvert, pagamento local, lista de convidados) se ativam trocando `ativo: false → true`, sem tocar em `evento.js`.
- **Local, Marca e Evento são entidades distintas**: um Local é o endereço; uma Marca é a identidade permanente de um baile; um Evento é uma ocorrência temporária. Evento referencia Marca e Local diretamente — nunca por herança.
- **Sem links mortos no menu ou no conteúdo**: uma seção só vira link (no menu ou dentro de uma página) quando a página de destino existir de fato. Até lá, mostra-se como texto simples.
