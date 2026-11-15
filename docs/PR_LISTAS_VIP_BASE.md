Implementa C1 das listas VIP: configuração opcional por edição, termos/benefício/prazos obrigatórios, limite de 0–10 acompanhantes, leitura de metadados por RLS, encerramento antecipado com revisão/idempotência e fechamento permanente por cancelamento/interrupção do evento. Inclui serviço JavaScript; nenhuma tela existente passa a usá-lo nesta etapa.

126 testes passaram, incluindo 15 de SQL/RLS e três de serviço novos. Transação remota em homologação validou criação, leitura anon de metadados, encerramento e auditoria, revertendo todos os dados. Migração aplicada somente em homologação; nenhuma alteração de produção, usuários, favoritos ou ingressos.

Não entrega inscrições, acompanhantes cadastrados, tela ou exportação. A sinalização de nova data em evento adiado será tratada antes de liberar inscrições; C1 apenas sinaliza configuração suspensa. Guia e próximos passos em docs/LISTAS_VIP_BASE.md, resumo consolidado em docs/ESTADO_ATUAL_2026-11-15.md.

Base empilhada codex/agendamento-guia-convites (PR #10). Sem autorização de publicação administrativa na main.
