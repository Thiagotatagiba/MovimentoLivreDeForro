Prepara um chamador e workflow GitHub Actions para processar a fila em homologação, com ativação explícita por variável, environment para segredos e destino fixo. O chamador aceita somente JWT público anon da homologação, exige segredo separado e não usa service_role. Faz uma chamada sem retries e registra somente contadores validados.

Inclui guia de uso do painel: acesso, permissões, criar/aceitar/revogar convites, editar rascunhos, publicar, situações do evento e conflitos. Distingue funções disponíveis de telas ainda pendentes e do envio desativado. Guia técnico explica configuração, pausa, limites de capacidade e restrições do agendamento em branches.

Validação: suíte de 108 testes, incluindo seis novos para proteção do destino/credenciais, desativação sem I/O, resposta ambígua sem retry e sigilo dos resultados; integridade do catálogo e sintaxe. Não houve alteração de banco, Edge Functions, secrets ou produção, nem envio de e-mail ou execução remota do agendador.

O workflow permanece inativo: depende da branch padrão e da variável de ativação. Nenhum provedor foi criado/configurado. Próximo passo externo: configurar provedor/remetente e segredos, testar manualmente limpeza e recebimento em homologação antes de habilitar agenda. Base empilhada codex/envio-convites (PR #9); não mesclar em main apenas para ativar cron, pois main publica o site.
