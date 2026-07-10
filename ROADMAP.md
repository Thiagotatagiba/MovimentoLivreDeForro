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

## Etapa 2 — Fortalecer a Agenda (em andamento)

Prioridade confirmada: a Agenda é o principal diferencial do projeto, então
evolui antes das páginas de perfil (Locais/Professores/Bandas).

- [x] Visualização semanal tipo calendário (grade de 7 dias, com scroll horizontal no mobile)
- [x] Busca por texto (nome do evento, cidade, tipo, descrição) — `eventosService.listarComFiltros({ busca })`
- [x] Filtros avançados: horário (manhã/tarde/noite via `periodoDoDia`) e música (ao vivo/DJ)
- [x] Preparação de dados para mapa interativo: `latitude`/`longitude` adicionados a cada local em `data/locais.json`
- [x] Persistência de filtro na URL (`agenda.html?janela=semana&cidade=Serra&view=semana...`) — todo estado de filtro/visualização é lido e escrito na URL via `history.replaceState`, então qualquer configuração da agenda pode ser compartilhada por link
- [ ] Mapa interativo em si (fica para a Etapa 4, junto com o restante da UI de mapa)

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
