Adiciona Gestão ao menu lateral público, após Carteira de ingressos. O link começa oculto e só aparece depois de consultar as permissões atuais pelo serviço administrativo existente. Contas com acesso apenas a listas vão diretamente para listas; contas sem acesso e visitantes não veem o atalho.

Ao sair ou trocar de conta, invalida consultas pendentes e remove imediatamente o destino. Abrir o menu consulta novamente os acessos. Falha de rede mantém o atalho oculto. As regras de acesso do painel e do banco continuam sendo a autoridade; nenhuma permissão é concedida pelo menu.

Testes cobrem destinos por permissão, ausência de acesso, metadados forjados, logout durante consulta, troca de conta, falha de rede e revogação. Navegador móvel de homologação confirmou link visível para editor, abertura do painel e ocultação ao sair. Atualiza worker para v10, manifesto e guia. Sem migração ou alteração de dados em produção; reversão pelo frontend anterior.
