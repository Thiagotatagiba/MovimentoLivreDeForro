Implementa a interface de gestão de eventos sobre a base administrativa do PR #3, sem aplicar migrações nem habilitar escrita em produção.

O formulário separa salvar rascunho, publicar e alterar situação. Publicador não edita; editor sem permissão não publica. Há validação de início/término, confirmação de horários estimados, revisão antes de publicar, preservação de identidade/dados não editáveis e aviso de alterações não salvas.

Conflitos de revisão preservam o conteúdo local e mostram comparação de três versões com escolha explícita; preparar a revisão não salva automaticamente. A ordem das chaves JSONB não gera falsos conflitos. Repetições de rede usam a mesma chave idempotente.

Inclui demonstração local explicitamente sinalizada, com usuários/eventos fictícios e PostgreSQL/PGlite descartável executando as mesmas RPCs do B1. A opção --admin-demo é obrigatória no servidor; a query de perfil não concede acesso na dependência real. Rotas administrativas ficam fora do cache do PWA.

Validação: 48 testes passaram (17 catálogo, 16 SQL/RLS, 6 serviço, 9 editor/API). Homologação no navegador: conflito em duas abas, resolução/salvamento, editor/publicador, publicação, cancelamento, outra marca e layouts de 390/1280 px. A página sem demo exigiu login; requisição externa ao demo retornou 403 e rota demo no modo normal retornou 404.

Escopo pendente: integração com contas reais em staging, convites, criação de eventos/locais provisórios, upload, edição de condições especiais e worker do outbox. Nenhuma alteração em produção. Detalhes e reprodução em docs/PAINEL_EVENTOS.md.

Este PR é baseado em codex/administracao-base; admin/index.html local e o PR de leitura pública foram preservados.
