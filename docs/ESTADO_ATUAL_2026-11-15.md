# Estado do projeto — 15/11/2026

## Produção

Catálogo público lê Supabase, com IDs/slugs legados, horários de início/término e estados operacionais preservados. PR #7 publicado; main `671efef`, cache v8. Arte do Festival Praça Viva restaurada e verificada na publicação. Conferência somente leitura nesta rodada: 24 eventos, 24 versões e sete migrações. Painel novo, convites e listas VIP não foram publicados em produção.

## Homologação

Projeto separado `qmhrlexpnnbjntpecjis`, somente contas/dados fictícios. Base de papéis por marca, rascunhos, publicação versionada, conflitos e auditoria implementada. Painel permite editar eventos existentes e publicar conforme permissões. Convites por link exigem e-mail primário confirmado correspondente, token válido e aceitação explícita. Não há administração concedida por metadados editáveis do usuário.

Worker de e-mail preparado e implantado desativado, com reserva exclusiva, repetição limitada, chave estável e limpeza de tokens/corpos. Provedor não configurado; nenhum e-mail real foi enviado. Agendador GitHub preparado em branch, sem variável/secrets cadastrados ou agenda ativa. A existência do workflow em branch não o torna um agendamento em execução.

Listas VIP C1: configuração por edição, benefício/prazo/limite de acompanhantes, consulta de metadados protegida, encerramento e auditoria. Migração aplicada em homologação; sem listas persistidas após os testes. **Ainda não há inscrições ou tela VIP.** A suíte tem 126 testes aprovados.

## Como testar e o que falta

- [Guia de uso do painel e convites](GUIA_USO_PAINEL.md): ações disponíveis, permissões e solução de problemas.
- [Homologação de Auth](HOMOLOGACAO_AUTH.md): servidor e contas fictícias, com credenciais fora do repositório.
- [Envio](ENVIO_CONVITES.md) e [agendamento](AGENDAMENTO_CONVITES.md): configuração técnica pendente e pausa segura.
- [Listas VIP C1](LISTAS_VIP_BASE.md): contrato, testes e limites deste incremento.

Próximo desenvolvimento: inscrições VIP e acompanhantes com isolamento e prazo controlado pelo servidor. Em paralelo, ativação de e-mail depende de configurar provedor/remetente, segredo e testar caixa autorizada em homologação. Não é necessário bloquear as listas por esse serviço externo.

Antes de publicar administração: consolidar/revisar PRs empilhados, reconciliar histórico das migrações, validar fluxos completos e comunicar alterações/riscos. Não há nova data de publicação definida, nem liberação de administração em produção nesta rodada.
