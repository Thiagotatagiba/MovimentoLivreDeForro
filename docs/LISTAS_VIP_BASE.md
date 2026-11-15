# Listas VIP — configuração C1

Implementação em `codex/listas-vip-base`, 15/11/2026. Esta etapa entrega configuração no banco e serviço JavaScript. **Não há tela VIP, inscrição de pessoas, acompanhantes cadastrados ou exportação nesta entrega.** Nenhuma lista foi aberta para uso público em produção.

## Contrato entregue

Uma lista opcional por edição (`eventos.id`), com UUID estável. A edição não é o registro de uma versão publicada: republicar o mesmo evento não cria outra lista. Outra edição deve ser outro evento e não herda a configuração. A página pública com URL estável ainda será implementada; não há link navegável de inscrição nesta etapa.

`public.listas_vip` contém somente metadados do benefício: título, termos, prazo de inscrição, início/fim da validade, máximo de acompanhantes, revisão e encerramento. Título/termos obrigatórios, horários finitos, término do benefício posterior ao início e prazo de inscrição não posterior ao término. O prazo é independente do início do benefício. Zero acompanhantes representa modo individual; valores de 1 a 10 permitem esse máximo no futuro, sem obrigar o titular a preencher todas as vagas.

RPC `criar_lista_vip` exige `gerenciar_listas` ou administrador da marca/sistema, evento publicado, marca/local/evento ativos e situação confirmada. `consultar_listas`, edição ou publicação de eventos isoladamente não permitem criar/encerrar listas. Uma segunda criação para a mesma edição retorna PT409. Não existe atualização de termos/prazo nesta etapa: configuração criada não é editável pelos clientes.

RPC `encerrar_lista_vip` usa revisão esperada e chave de solicitação. Encerramento antecipado é definitivo e auditado. Criação e encerramento são transacionais e idempotentes; reenvio da mesma solicitação não duplica auditoria. Permissão é revalidada antes de devolver resultado anterior. Ordem de locks: evento e depois lista, compatível com publicação e trigger.

RPC `consultar_lista_vip` usa SECURITY INVOKER/RLS e devolve campos permitidos e estado calculado pelo relógio do servidor. O prazo encerra a leitura imediatamente, sem depender de cron, navegador ou alteração persistida da coluna `encerrada_em`. A configuração é imutável, portanto o término por prazo não pode ser revertido por um cliente. Escrita de inscrições ainda não existe e deverá aplicar o mesmo bloqueio no servidor.

Cancelamento/interrupção publicados atualizam permanentemente o encerramento, com auditoria transacional; confirmar o evento depois não reabre a lista. Adiamento sinaliza configuração suspensa. O catálogo atual tem situação `adiado`, mas não possui um sinal explícito de “nova data confirmada”; antes de liberar inscrições, a integração dessa distinção deve ser implementada. C1 não habilita inscrições de qualquer tipo, e não deve ser interpretado como conclusão desse caso de negócio.

RPC pública retorna somente benefício/identidade da lista. Eventos ocultos/inativos não tornam metadados públicos; uma edição pública de outra marca não libera a configuração oculta. Não existe tabela de participantes que possa ser exposta. Auditoria própria em `app_private.auditoria_listas_vip`, RLS habilitado e sem acesso direto de clientes, guarda anterior/novo, autor quando disponível, origem e instante. Trigger por escrita de servidor pode ter autor nulo, identificado por origem `evento`.

Serviço `services/listasVipService.js`: `consultar`, `criar` e `encerrar`, cliente injetável, chave obrigatória nas escritas, sem retries automáticos de conflitos e erros distintos. Nenhuma página existente importa esse serviço nesta etapa. Não há mudança de cache/PWA.

## Validação e instalação

Migração gerada por CLI 2.101.0: `20261115114508_listas_vip_configuracao.sql`, aplicada somente em `qmhrlexpnnbjntpecjis`, como versão remota `20261115114912`. Não reaplicar nem executar `db push/reset` sem reconciliação dos timestamps. Homologação passa a ter 14 migrações.

126 testes passaram: 108 anteriores, 15 novos de SQL/RLS e três do serviço. Cobrem permissões independentes por marca, metadados obrigatórios, idempotência, conflito de revisão, privacidade, prazo de servidor, cancelamento irreversível, suspensão, falha de auditoria com rollback e isolamento quando outra marca tem evento público.

Teste remoto em transação criou evento/benefício fictícios, executou criação como authenticated, leitura como anon, encerramento e auditoria. Todos os dados foram revertidos; as tabelas novas ficaram sem registros. Não houve teste no navegador nem de inscrições inexistentes.

Advisors: seis avisos INFO de tabelas privadas com RLS sem policies, intencionais com privilégios cliente revogados; aviso preexistente de proteção contra senhas vazadas desativada. Orientação: [Supabase password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). O desenho de leitura segue [RLS Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security).

Produção continua com sete migrações, 24 eventos e 24 versões, sem `listas_vip`. Não houve alteração de dados de usuários, favoritos ou ingressos.

## Próximo incremento concreto

Inscrição autenticada por titular, acompanhantes sem conta, uma inscrição ativa por conta/lista, alteração/cancelamento/reinscrição somente aberta; política de suspensão por adiamento com/sem nova data. Depois, correções pós-fechamento sem aumentar pessoas, duplicidades só ao produtor, consulta agrupada autorizada e exportação exclusivamente textual após fechamento. As telas pública/administrativa virão sobre esse contrato validado. Não implementar CSV ou mover inscrições entre edições.
