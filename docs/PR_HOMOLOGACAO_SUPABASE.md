Corrige o conflito administrativo que expirava no PostgREST 14: salvar/publicar/alterar situação usavam 40001, causando repetições internas. A nova migração retorna PT409; o serviço traduz para CONFLITO e desativa retry automático nas RPCs quando disponível no SDK.

Validação real no projeto separado qmhrlexpnnbjntpecjis (plano Free, cotação US$ 0/mês): login de três contas fictícias, permissões por marca, isolamento de rascunhos, duas requisições concorrentes com um sucesso/um HTTP 409, replay, publicação e preservação de Cancelado. No navegador, editor salvou e publicador publicou a versão 3 com campos bloqueados para edição. Sessões finais: zero.

Inclui fixture de homologação, template de provisionamento desativado por padrão e login auxiliar somente no servidor local/projeto de teste. O provisionamento remoto já foi substituído por HTTP 410. Nenhuma credencial administrativa é enviada ao frontend ou versionada.

56 testes locais passaram. Documentação em docs/HOMOLOGACAO_SUPABASE.md registra instalação, timestamps remotos distintos, resultado dos Advisors e limitações. Produção continua com 7 migrações e 24 versões, sem administração instalada; nenhuma alteração na main ou no site.

Base: codex/homologacao-auth (PR #5). Esta migração foi aplicada somente em homologação; continua pendente em produção junto da base administrativa.
