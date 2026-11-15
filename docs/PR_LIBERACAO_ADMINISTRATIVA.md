Consolida os PRs #3–#6 e #8–#12 numa candidata administrativa completa contra main: gestão multi-marca de eventos, convites por link e listas VIP, preservando o catálogo público já publicado no PR #7. E-mails e agendamento continuam desativados; dados/contas de homologação não são importados.

Inclui sete migrações pendentes (seis funcionalidades e uma restrição de EXECUTE da função de event trigger de RLS), preparação local de artefatos privados com bootstrap da conta confirmada indicada pelo responsável, guardas de pré/pós-verificação, pausa de RPCs para incidente e manifesto de publicação ampliado a 37 arquivos. Nenhum e-mail pessoal ou credencial administrativa é versionado.

154 testes passaram; ensaio de migração+bootstrap/pausa conservou os registros existentes. Comparação real do catálogo público teve 24 eventos sem divergências. Seis arquivos SQL correspondem exatamente ao histórico de homologação, cuja migração de hardening adicional também foi registrada. O trigger de plataforma após revoke foi testado localmente, pois não existe em homologação.

Não houve alteração em produção. Publicação proposta: HTTPS obrigatório (atualmente HTTP ainda responde 200), sete migrações, administrador inicial autorizado, merge deste PR e conferência do Pages/37 arquivos. Não há data prometida ou liberação implícita de e-mail/cron. Riscos, sequência, reconciliação de timestamps, exigência de backup recuperável e reversão em docs/LIBERACAO_ADMINISTRATIVA.md.

Manter PR #1 fora do escopo. Os PRs antigos serão encerrados como substituídos somente após a publicação consolidada, sem apagar branches ou histórico.
