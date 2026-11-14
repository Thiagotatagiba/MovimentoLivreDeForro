Implementa convites por link para equipes de marca, com papel/permissões explícitos e aceitação obrigatória por conta com e-mail primário confirmado correspondente. Administrador ativo/global pode criar/revogar; equipe operacional não pode. Vínculo ativo não é promovido silenciosamente. Token é de uso único, válido por sete dias, com verificação em SHA-256.

Inclui tela de criar/revisar/copiar/aceitar/revogar, metadados protegidos por RLS, RPCs transacionais/idempotentes, auditoria e fila privada para futura entrega. A fila contém temporariamente token sensível e não é acessível pelo cliente; uso/revogação limpam o payload. O envio automático de e-mails e seu worker ainda não foram implementados. O compartilhamento é manual.

77 testes locais passaram. Auth/PostgREST real em qmhrlexpnnbjntpecjis confirmou RLS, token/e-mail errado, revogação, replay e duas aceitações concorrentes com um vínculo/uma auditoria. Navegador confirmou criação e aceitação com a permissão de edição escolhida, ausência de controles administrativos para equipe e layout móvel sem overflow.

A migração foi aplicada somente em homologação (versão remota 20261114221347). Nenhum novo deploy, DDL ou escrita em produção; mantém fonte Supabase e cache v8. A main publicada foi incorporada à branch com resolução de conflitos, por isso este PR sobre codex/homologacao-supabase também contém a reconciliação com a publicação do PR #7.

Limitações documentadas em docs/CONVITES_EQUIPE.md: provedor/envio de e-mails, limpeza periódica, retorno OAuth/Magic Link e validação manual de copiar/colar. O botão mostrou confirmação, mas o clipboard da automação retornou vazio; o teste de aceitação usou o payload privado do convite fictício sem expor token em relatório. Advisors mantém os avisos de tabelas privadas sem policies e proteção contra senhas vazadas desativada.

Base empilhada: codex/homologacao-supabase (PR #6). Não é uma autorização ou proposta de deploy administrativo em produção nesta etapa.
