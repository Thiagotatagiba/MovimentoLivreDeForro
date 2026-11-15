# Agendamento de convites em homologação — B7

Preparado em 14/11/2026, sem ativação remota. Não altera banco, Edge Functions, secrets ou produção. O script `scripts/acionar-fila-convites.mjs` chama exclusivamente o projeto `qmhrlexpnnbjntpecjis`. Produção é recusada antes de qualquer requisição. Não usa chave service_role.

## O que foi preparado

Workflow `.github/workflows/convites-homologacao.yml`, manual ou programado nos minutos 7, 22, 37 e 52 de cada hora UTC, com uma execução por vez e sem cancelar a execução anterior. Só executa se a variável **do repositório** `VTF_CONVITES_AGENDAMENTO_ATIVO` for exatamente `true`. Não recebe gatilhos de push ou PR.

O script faz um único POST, sem repetição automática, redirecionamentos ou URL fornecida pelo chamador. Uma perda de resposta é ambígua: a recuperação fica a cargo das reservas e idempotência do worker, não de uma nova chave de envio. Saída contém apenas contadores validados; corpos HTTP e exceções de rede não são registrados. Timeout HTTP de 150 segundos, job limitado a cinco minutos.

Agendamento e `workflow_dispatch` dependem do arquivo existir na branch padrão. Como este workflow está somente numa branch de desenvolvimento, não há agenda ativa e o botão de execução manual pode não aparecer. Segundo a [documentação do GitHub](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule), horários programados podem atrasar e workflows de repositórios públicos sem atividade podem ser desativados após 60 dias. Não é um serviço com garantia de pontualidade.

## Configuração quando for autorizada a ativação

1. Revisar o PR e o destino da implantação. Não mesclar a cadeia administrativa na main só para disponibilizar este workflow: a main publica o site. Planejar essa liberação separadamente.
2. Em **Settings → Environments**, criar `homologacao-convites`. Restringir branches de implantação às revisadas que poderão executar; se disponível, configurar revisores. Não permitir execução de código de branches não revisadas com os segredos. O workflow não aceita PRs, mas uma execução manual pode selecionar uma referência permitida.
3. Nesse environment, cadastrar os secrets `VTF_CONVITES_ANON_JWT` (JWT legado público anon **da homologação**, aceito pelo gateway atual) e `VTF_CONVITES_WORKER_SECRET` (igual ao segredo da Edge, aleatório, ao menos 48 caracteres). Nunca usar chave administrativa no chamador. O script verifica papel anon, referência e expiração; o gateway verifica a assinatura. Chaves modernas `sb_publishable_...` não substituem esse JWT no gateway configurado com `verify_jwt=true`. Consulte [autenticação de Edge Functions](https://supabase.com/docs/guides/functions/auth).
4. Configurar os secrets da Edge conforme [ENVIO_CONVITES.md](ENVIO_CONVITES.md). Para começar sem e-mails, usar envio false e limpeza true. Ambas false resultam em HTTP 503 e falha visível do job; não ativar a agenda nesse estado.
5. Criar a variável **do repositório**, não apenas do environment, `VTF_CONVITES_AGENDAMENTO_ATIVO=true`. O `if` do job é avaliado antes de carregar seu environment.
6. Executar manualmente uma vez e conferir os contadores no log. Na limpeza, a resposta deve incluir `envio: desativado`. Só habilitar envio após escolher provedor, verificar remetente, custos e testar uma caixa postal autorizada. Não enviar convites a pessoas reais como teste implícito.
7. Após a publicação do workflow na branch padrão, acompanhar uma execução programada. A cada chamada são processadas no máximo três tarefas; intervalo de quinze minutos dá capacidade nominal de doze por hora e exige revisão se o volume crescer. Consultar limites e eventual cobrança do GitHub Actions antes de ativar.

Nenhum desses cadastros ou ativações foi executado nesta entrega. Não existe chave de e-mail configurada. Configuração, execução remota manual e agendamento continuam pendentes.

## Pausar e recuperar

Definir a variável do repositório como `false` impede novos jobs, mas não interrompe um lote já em andamento. Para suspender novas chamadas na Edge, desativar suas duas flags e verificar a resposta desativada. Uma mensagem já entregue ao provedor não pode ser recolhida. Revogar convite impede sua aceitação, não desfaz um envio.

Se aparecer `worker_http_401`, conferir JWT e segredo privado. `worker_http_503` exige conferir flags/configuração e logs sanitizados da Edge. Não copiar respostas contendo dados sensíveis em issues. Falha de rede ou resultado incerto não autoriza recriar automaticamente o convite. Conferir execução e fila; o worker mantém chave e conteúdo congelados para repetição segura dentro dos limites documentados.

## Validação desta entrega

Seis testes do chamador cobrem desativação sem I/O, bloqueio de produção e credenciais privilegiadas, JWT expirado, segredo inválido, endpoint fixo, sigilo dos resultados, ausência de retries e respostas inconsistentes. Integram `npm test`, junto aos testes anteriores. Não houve chamada remota ativa, alteração de secrets, execução agendada ou teste de recebimento de e-mail.
