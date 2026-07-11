# Roadmap — Movimento Livre de Forró

Este documento existe para que qualquer pessoa (inclusive eu, em uma sessão
futura) entenda em que pé o projeto está e o que vem a seguir, sem precisar
reconstruir o histórico de decisões a partir do zero.

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
evoluiu antes das páginas de perfil (Locais/Professores/Bandas).

- [x] Visualização semanal tipo calendário — e agora é o **padrão** ao abrir a Agenda, com contagem de eventos por dia e "Nenhum evento programado" nos dias vazios
- [x] Busca por texto (nome do evento, cidade, tipo, descrição)
- [x] Filtros avançados: horário (manhã/tarde/noite) e música (ao vivo/DJ)
- [x] Preparação de dados para mapa interativo: `latitude`/`longitude` em cada local
- [x] Persistência de filtro na URL, incluindo o modo de visualização
- [x] Badges padronizadas nos cards (`.badge` + modificadores) para forma de acesso e tipo de música
- [x] Estados vazios nunca "mortos": sempre oferecem uma ação (limpar filtros, ver o mês inteiro, ver amanhã)
- [x] Botão "Abrir no Google Maps" na página do evento, com fallback em cascata (coordenadas do local → coordenadas do próprio evento → busca por endereço)
- [x] Botão de acesso inteligente ("Ingressos" só quando há link; outros tipos mostram badge informativa mesmo sem botão)
- [x] Cards e hero preparados para imagem real (`loading="lazy"` nos cards; fallback ilustrativo quando `imagem` é `null`)
- [x] Modelo de evento com todos os campos necessários para uma futura sincronização com Google Calendar — mapeamento completo em `docs/MODELO_DE_DADOS.md`
- [ ] Mapa interativo em si (fica para a Etapa 4, junto com o restante da UI de mapa)

### "Hoje tem forró?" — banner de destaque da Home

Adicionado como resposta imediata à pergunta central do projeto, logo abaixo
do H1: dia da semana + data por extenso, contagem de eventos de hoje e as
cidades onde estão acontecendo — ou uma mensagem amigável convidando para ver
amanhã, quando não há nada hoje. Implementado em `criarBannerHoje()`
(`js/components.js`), consumindo `eventosService.listarPorJanela(0)`.

## Etapa 3 — Locais, Professores, Bandas

- Página de listagem + perfil individual para cada entidade
- Reaproveitar `.event-card` e `criarEventCard` para "eventos deste local/professor/banda"
- Entrada no menu principal só acontece quando as páginas existirem (nunca link morto)

## Etapa 4 — Notícias, Mapa, Busca global

- Blog simples (notícias, entrevistas, cobertura de eventos)
- Mapa interativo com todos os eventos (usa `latitude`/`longitude` preparados na Etapa 2)
- Busca global unificada (eventos + locais + professores + bandas)

## Etapa 5 — Painel Administrativo

- CRUD de eventos, locais, professores, bandas, notícias
- Estados de evento: rascunho / publicado / cancelado (campo `status` já existe no modelo)
- É o momento natural para migrar `js/repositories/*` de JSON estático para uma API real

## Etapa 6 — Conta de usuário e integrações externas

- Login, favoritos, agenda personalizada, notificações
- Organizadores autocadastrando eventos (com moderação)
- **Sincronização com Google Calendar**: os campos `inicio`, `fim`, `fusoHorario`, `origem` e `idExterno` já existem no modelo de evento para viabilizar isso sem quebrar o schema
- **Migração para Supabase (ou similar)**: troca-se a implementação de `js/repositories/*`; `js/services/*` e todas as páginas continuam iguais

## Decisões de arquitetura que não devem ser revertidas sem motivo forte

- **Camada de serviço obrigatória**: nenhuma página faz `fetch` direto de JSON. Sempre `eventosService` / `locaisService`.
- **`.event-card` é único**: variações de conteúdo (CTA, badge) são parâmetros do componente, nunca uma cópia dele.
- **`js/access.js` centraliza a lógica do botão de acesso**: novos estados (gratuito, couvert, pagamento local, lista de convidados) se ativam trocando `ativo: false → true`, sem tocar em `evento.js`.
- **Sem links mortos no menu**: uma seção só entra na navegação quando a página existir de fato.
