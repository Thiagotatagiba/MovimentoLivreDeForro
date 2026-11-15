O administrador só conseguia editar eventos existentes. Adiciona Novo evento: selecionar marca/local existentes, preencher a edição e criar um rascunho, com publicação explícita posterior e link para conferir no site. Administrador global não precisa de equipe/produtor cadastrado; gerenciar_eventos fica limitado às marcas autorizadas.

RPC transacional/idempotente com IDs/slug gerados no servidor, início/término obrigatórios, auditoria e proteção contra duplicação. Imagem opcional por URL HTTPS; upload e criação de marcas/locais não integram esta entrega. Mantém edição/publicação de eventos existentes.

172 testes passaram. Auth/PostgREST real confirmou duas chamadas concorrentes com mesma chave → um evento/uma auditoria, rascunho privado e publisher recusado. Navegador confirmou criação sem equipe, recarga, primeira publicação, página pública e layout móvel. Papel global temporário removido e sessões encerradas.

Migração somente em homologação (versão 20261115181715). Produção não foi alterada. Ativação: aplicar somente a nova migração e publicar este PR; manifesto de 38 arquivos. Guia/reversão em docs/CRIACAO_EVENTOS.md.
