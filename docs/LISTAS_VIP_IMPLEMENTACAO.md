# Listas VIP — entrega C2, 15/11/2026

Conclui o escopo funcional de listas VIP/desconto em homologação sobre C1: inscrição por titular, acompanhantes, gestão/consulta, correções pós-fechamento e texto simples. **Não é publicação em produção nem validação de entrega de e-mails.**

## Banco e autorização

Migração local `20261115115907_listas_vip_inscricoes.sql`, aplicada exclusivamente em `qmhrlexpnnbjntpecjis` como `20261115120845`. Homologação tem 15 migrações; timestamps locais/remotos devem ser reconciliados antes de qualquer `db push/reset`. C1 criou configuração/auditoria; C2 acrescenta `public.inscricoes_vip`, a confirmação de data por versão em `listas_vip` e RPCs. Produção continua com sete migrações, 24 eventos e 24 versões, sem tabelas VIP.

Uma linha por `(lista_id,usuario_id)` conserva a identidade da inscrição ao cancelar/reinscrever; revisão cresce sempre. O titular é derivado de `auth.uid()`, nunca enviado pelo cliente. Exige usuário Auth existente e não anônimo. Acompanhantes são nomes, sem contas; nomes são limitados e rejeitam controles/quebras de linha. Zero acompanhantes é permitido; máximo configurável até dez. Aceitação dos termos é exigida pelo servidor e registrada com instante. Avatar vem do próprio perfil, apenas HTTPS, e pode ser nulo; a tela usa inicial como alternativa.

RLS permite SELECT direto apenas do próprio grupo; anon não tem acesso à tabela. Produtores usam RPC autorizada por marca e por `gerenciar_listas`/`consultar_listas`. Ler grupo completo não depende de acesso a rascunhos ou edição de eventos. Metadados editáveis da conta não concedem acesso. Public wrappers usam SECURITY INVOKER; funções privilegiadas ficam privadas, com search_path vazio e concessões explícitas.

Todas as escritas são transacionais e idempotentes, com revisão esperada e ordem evento → lista → inscrição, depois da serialização de chave por usuário. O contexto revalida publicação, visibilidade, marca/local ativos, situação e relógio do servidor sob lock. Prazo, suspensão ou encerramento impedem mutações do titular. Idempotência de um pedido já confirmado pode devolver seu resultado anterior após o fechamento; isso não cria uma nova escrita.

Cancelamento e interrupção fecham definitivamente pelo trigger de C1. Adiamento suspende até `confirmar_data_lista_vip` registrar a revisão/versão publicada explicitamente revisada por um gestor. Só a versão exata confirmada libera a suspensão; republicação adiada invalida a confirmação. A ação não estende prazo nem altera benefício e não reabre lista encerrada. A UI mostra data/hora e os prazos na confirmação.

Após encerramento, somente `gerenciar_listas` permite corrigir nomes, conservando exatamente o número de acompanhantes e a situação ativa do grupo. A auditoria privada registra anterior/novo, autor e instante. Não há inclusão pelo produtor após fechamento. Duplicidades são calculadas somente na RPC de produtor, por nome com caixa/espaços normalizados, sem bloquear inscrições; não são uma prova de identidade.

`exportar_lista_vip` exige produtor autorizado e estado encerrado **no servidor**. Retorna texto com grupos numerados, acompanhantes A–J e total; sem fotos, UUIDs ou CSV. Antes do fechamento a RPC recusa, mesmo se chamada diretamente. A consulta completa continua necessária ao produtor em tempo real; a restrição impede a função de exportação do sistema, não pode impedir alguém de transcrever manualmente uma tela autorizada. Cópias anteriores não mudam após correção.

## Telas e cache

`lista-vip.html?id=UUID` é URL pública estável. Só carrega metadados para visitante sem login e, autenticado, o grupo próprio. `admin/listas.html` permite criação, revisão dos grupos, encerramento, confirmação de nova data, correção e texto pós-fechamento conforme permissões. Conteúdo pessoal é montado com textContent/value, sem inserir HTML de nomes. Há guardas contra respostas de conta/edição anterior, duplo clique e perda de resposta; dados não são gravados em localStorage. Sessões usam o mecanismo Auth existente.

Atualização automática a cada cinco segundos com a aba visível; formularários em edição e texto de exportação exibido preservam seu conteúdo. Não foi ativada publicação Realtime no banco. Polling não oferece notificação instantânea, mas toda escrita aplica o estado atual no servidor. Falhas de acesso limpam os grupos do painel.

O evento recebe link opcional para sua lista apenas no modo catálogo Supabase. Falha nessa leitura não impede o evento público de abrir. Worker candidato v9 renova os arquivos públicos e deixa shell/módulo de lista VIP, administração, dados e requisições externas fora do cache. Nenhuma alteração foi publicada no worker v8 de produção.

## Verificações

- Suíte: 148 testes, incluindo 17 testes SQL de inscrições, quatro de modelo de interação e quatro do serviço VIP (um novo nesta rodada). Cobrem isolamento, consentimento, limite, CAS, idempotência, prazo, correções sem alterar quantidade, duplicidade restrita, falha atômica de auditoria e exportação.
- Auth/PostgREST reais: `scripts/homologar-listas-vip.mjs` usa somente fixture com legado `evt-homologacao-vip-2026-11-15`. Duas escritas concorrentes com a mesma revisão tiveram um sucesso e um HTTP 409; uma inscrição por conta; replay; cancelamento/reinscrição; acesso anon/conta sem permissão recusado. Após fechamento, alterações/cancelamento do titular recusados e exportação com cinco pessoas validada.
- Navegador: criação/revisão, inscrição com dois acompanhantes, grupos e alerta de duplicidade, encerramento, correção mantendo quantidade, texto e clipboard conferido. Página de evento mostrou o link. Sem login, grupo oculto. Titular após fechamento com campos e cancelamento desabilitados.
- Responsivo: produtor em viewport 390px teve transbordamento de e-mail corrigido; documento 375px/conteúdo 375px. Público sem login: 390px/390px.
- PWA real em loopback: v4 → candidata v9, cache antigo removido, fonte Supabase mantida, sem dados privados ou recursos VIP no cache após buscá-los. Não houve instalação no sistema operacional ou teste de atualização em produção.
- Advisors mantêm seis INFO de tabelas privadas sem policies (intencional) e o WARN preexistente de proteção contra senhas vazadas desativada. [Orientação de senhas Supabase](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Todos os dados dessa validação são fictícios. Foram preservados uma edição de teste, uma lista encerrada e dois grupos (cinco pessoas), além da auditoria. Contas não foram criadas/promovidas neste incremento e as sessões de teste foram encerradas. Não houve envio de mensagens ou e-mails. Testes de navegador usaram login por senha de contas fictícias; OAuth/Magic Link e carga de grande volume não foram exercitados nesta rodada.

## Ativação e reversão

Revisar a cadeia de PRs administrativos e reconciliar migrações antes de publicar; ainda não há autorização nova para modificar main/produção. Aplicar esquema e permissões antes das telas. Validar um evento/lista de homologação, papéis separados e bloqueio por prazo, e só depois comunicar o plano de liberação. A leitura opcional da lista no evento falha sem derrubar o detalhe público.

Em reversão, retirar os links/telas da nova publicação e restaurar os arquivos/worker públicos da versão anterior revisada. Não apagar inscrições, auditoria, usuários, favoritos ou ingressos. Para suspender inscrições de uma lista, encerrar somente mediante decisão do responsável — é definitivo; falha temporária de interface não justifica fechamento automático. E-mail e cron permanecem independentes e desativados.

Guia operacional: [GUIA_LISTAS_VIP.md](GUIA_LISTAS_VIP.md). Ainda fora desta entrega: aniversariantes, CSV (não aprovado), criação de novas edições pelo painel e edição posterior dos termos/prazos; não são necessários para operar as listas do escopo aprovado.
