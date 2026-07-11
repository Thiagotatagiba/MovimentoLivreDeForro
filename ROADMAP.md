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

1. **Finalizar a Agenda** (UX refinada) — concluída nesta rodada
2. **Marcas** — modelo de dados pronto nesta rodada; página ainda por construir
3. Locais
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
- [x] **Cards compactos na lista da Agenda** (`.event-card--compact`) — imagem vira miniatura, informação em primeiro plano, mais eventos visíveis por tela. A imagem grande fica reservada à Home e à página do evento.
- [ ] Mapa interativo em si (fica para a Etapa 7)

### "Hoje tem forró?" — banner de destaque da Home

Resposta imediata à pergunta central do projeto, logo abaixo do H1: dia da
semana + data por extenso, contagem de eventos de hoje e as cidades onde
estão acontecendo — ou uma mensagem amigável convidando para ver amanhã,
quando não há nada hoje. Implementado em `criarBannerHoje()`
(`js/components.js`), consumindo `eventosService.listarPorJanela(0)`.

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

## Etapa 3 — Marcas (página)

- Listagem de marcas + página de perfil individual (`marca.html?slug=...`)
- Conteúdo da página: nome, descrição, logo/banner, Instagram, WhatsApp, cidade, local principal, próximos eventos (`eventosService.listarPorMarca`), histórico de eventos passados (**novo**: vai exigir um método de histórico, já que hoje o serviço só lista eventos futuros), galeria de fotos, estatísticas
- Reaproveitar `.event-card` e `criarEventCard` para "próximos eventos desta marca"
- Entrada no menu principal só acontece quando a página existir (nunca link morto)

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
