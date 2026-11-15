Prepara o processamento da fila privada de convites: reserva exclusiva, revalidação antes do envio, corpo congelado e chave estável por tarefa, repetição limitada, expiração e remoção de tokens/mensagens sensíveis. Inclui adaptador opcional Resend, sem configurar conta ou ativar envio real. Edge exige JWT e segredo adicional; RPCs são restritas a service_role.

102 testes passaram. Testes locais integram SQL e worker com provedor simulado, inclusive perda de confirmação e recuperação sem trocar chave/conteúdo. Transação no banco de homologação validou reserva, congelamento, confirmação simulada e limpeza, revertendo todos os dados. Endpoint Edge implantado confirmou 503 desativado. Não houve teste remoto do caminho ativo ou de caixa postal.

Migração aplicada exclusivamente em homologação, versão 20261114225052; função enviar-convites versão 1, verify_jwt=true, desativada por padrão. Nenhuma alteração em produção. Sem cron/agendamento e sem envio real. Guia, riscos e ativação futura em docs/ENVIO_CONVITES.md.

Base empilhada: codex/convites-equipe (PR #8). Não publicar este incremento administrativo em produção sem revisão e autorização próprias.
