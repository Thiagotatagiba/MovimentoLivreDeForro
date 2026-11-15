# Entrega de convites — B6, 14/11/2026

Worker preparado em `codex/envio-convites`, sobre B5. Não há envio real ativo, provedor contratado/configurado ou agendamento. A implementação oferece um adaptador opcional Resend; isso não representa escolha do usuário nem teste de entrega em caixa postal.

## Comportamento

`supabase/functions/enviar-convites/worker.mjs` compartilha código entre Edge/Deno e testes Node, sem dependências externas. Processa até três tarefas por chamada. RPCs de entrega são executáveis somente por `service_role`; usuários e `anon` não podem reservar tarefas nem ler seus tokens. A função exige também `x-worker-secret`, independente do JWT exigido pelo gateway.

O banco reserva uma tarefa por 120 segundos, com UUID que impede um worker antigo de confirmar uma reserva nova. Antes de enviar, revalida estado, validade, marca ativa e autoridade do emissor. Congela o corpo completo do e-mail no banco: repetições usam o mesmo conteúdo e a mesma chave `convite-marca/<outbox_id>`, inclusive após perda da resposta de confirmação.

Falhas transitórias usam espera exponencial, até cinco tentativas. A janela máxima de repetição é 23 horas desde a primeira reserva, inferior à [retenção de idempotência de 24 horas do Resend](https://resend.com/docs/dashboard/emails/idempotency-keys). Isso reduz duplicação em respostas ambíguas; não constitui garantia global de entrega exatamente uma vez. Falha permanente ou limite seguro encerra a tarefa. Erros 401/403 do provedor pausam o lote. Não se deve gerar uma chave nova automaticamente para uma entrega incerta.

Tokens e corpos congelados são sensíveis. São removidos ao aceitar, revogar, expirar, confirmar envio ou encerrar por falha. Somente identificadores, contadores e códigos sanitizados permanecem nos resultados e histórico de tentativas. Não registrar mensagens, destinatários, tokens ou credenciais em logs. Se a revogação ocorrer entre a última verificação e a chamada HTTP, a mensagem pode sair; a aceitação continuará sendo recusada pelo banco.

## Instalação e ativação futura

A migração local `20261114223502_fila_entrega_convites.sql` foi aplicada somente em `qmhrlexpnnbjntpecjis`, como versão remota `20261114225052`. Homologação agora tem 13 migrações. Alterou `app_private.outbox_convites`, criou `app_private.execucoes_convites`, funções e trigger privados e quatro wrappers públicos restritos ao serviço. Não executar `db push/reset` sem reconciliar o histórico remoto, cujos timestamps diferem dos arquivos locais.

Edge Function `enviar-convites`, versão 1, implantada em homologação com `verify_jwt=true`. Sem configuração, responde HTTP 503 com `estado: desativado` e não acessa a fila. Produção não recebeu esta migração nem função.

Usar `supabase/functions/enviar-convites/CONFIGURACAO.example.env` somente como lista de nomes. Configurar valores reais como secrets no servidor, nunca no frontend ou no Git. O runtime fornece `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`. Exige referência explicitamente autorizada, segredo aleatório de ao menos 48 caracteres, URL HTTPS canônica do app e remetente verificado. Para o adaptador implementado, configurar `VTF_CONVITES_PROVEDOR=resend` e a credencial própria do provedor; a chave administrativa Supabase nunca é enviada ao Resend.

Antes de ativar: confirmar o provedor com o responsável, verificar domínio/remetente e custos, testar uma caixa de e-mail autorizada e o link na URL de homologação. Só então ativar `VTF_CONVITES_ENVIO_ATIVO=true`. Uma chamada POST deve conter JWT aceito pelo gateway e `x-worker-secret`; o corpo não pode substituir destinatário ou URL do provedor. Contrato do adaptador: [API de envio Resend](https://resend.com/docs/api-reference/emails/send-email).

`VTF_CONVITES_LIMPEZA_ATIVA=true` permite somente limpeza, sem credenciais de e-mail, quando envio permanece false. Homologação não tem `pg_cron` instalado: nenhum job foi criado. A limpeza só ocorre quando o worker autorizado é chamado. Agendamento e armazenamento seguro do segredo do chamador ainda precisam ser configurados e validados; não embutir segredo em SQL de cron ou no frontend.

Para pausar, desativar ambas as flags e verificar novamente a resposta desativada. Não apagar fila nem auditoria. Reativação após mudança de remetente/template preserva corpos já congelados. Antes de publicar administração em produção, revisar separadamente as migrações B1–B6 e os respectivos PRs; esta branch não autoriza essa publicação.

## Evidências e limites

- `npm test`: 102 testes passaram, incluindo 15 de SQL/fila e 10 de worker/provedor simulado. Cobrem permissões, reserva exclusiva, fencing, payload estável, repetição após confirmação perdida, cinco tentativas, prazo de 23 horas, revogação/aceitação, expiração e limpeza de conteúdo sensível.
- Banco remoto de homologação: transação com roles `authenticated` e `service_role` criou convite fictício, reservou uma vez, congelou mensagem, confirmou envio simulado e verificou remoção de token/corpo e registro da execução. Tudo foi revertido por `ROLLBACK`; nenhum e-mail foi enviado. Não é um teste ponta a ponta de Edge → provedor.
- Endpoint implantado invocado por HTTP: 503 e `{"estado":"desativado"}` confirmados. O caminho ativo da Edge ainda não foi exercitado remotamente.
- Advisors: cinco avisos INFO de RLS sem policies em tabelas privadas, intencionais com acesso cliente revogado; aviso preexistente de proteção contra senhas vazadas desativada. [Orientação Supabase](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Continuação B7: o chamador e workflow de agendamento estão preparados, desativados,
em [AGENDAMENTO_CONVITES.md](AGENDAMENTO_CONVITES.md). Nenhuma agenda foi instalada
ou executada remotamente. Próximo trabalho: configurar provedor/remetente e
segredos, validar limpeza e depois recebimento/aceitação em homologação. O painel
e listas VIP continuam fora da produção. Guia de uso: [GUIA_USO_PAINEL.md](GUIA_USO_PAINEL.md).
