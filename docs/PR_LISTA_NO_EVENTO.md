A criação de lista ficava separada do evento. Adiciona a seção Lista VIP e desconto no próprio editor: depois de publicar, o administrador abre e preenche o formulário ali mesmo, revisa a edição e confirma. Lista existente oferece gerenciamento/consulta; o menu Listas permanece como visão geral.

Reutiliza as RPCs, validação, auditoria, idempotência e permissões atuais. Confirmação mostra título/data do evento; não preenche prazos automaticamente. Estado bloqueia criação antes de publicar, com alterações pendentes ou evento não confirmado. Dados não salvos da lista participam da proteção de saída/troca de evento.

Gestão por listas.html?evento=UUID fixa a edição e oferece retorno ao mesmo evento. Destino ausente/inacessível/inválido não cai no primeiro evento disponível. Leitura não carrega participantes no editor. Resultado de criação é registrado localmente antes de atualizar metadados, evitando duplicação em falha da leitura posterior.

200 testes passaram. Navegador de homologação criou uma lista dentro do evento, conferiu uma auditoria e a edição correta, abriu gestão com seletor fixado e voltou ao evento. Sem migração ou criação de listas de teste em produção. Guia atualizado; reversão pelo frontend anterior.
