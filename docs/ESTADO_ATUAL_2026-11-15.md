# Estado do projeto — 15/11/2026

## Produção

Catálogo público lê Supabase, com IDs/slugs legados, horários de início/término e estados operacionais preservados. PR #7 publicado; main `671efef`, cache v8. Arte do Festival Praça Viva restaurada e verificada na publicação. Conferência somente leitura nesta rodada: 24 eventos, 24 versões e sete migrações. Painel novo, convites e listas VIP não foram publicados em produção.

## Homologação

Projeto separado `qmhrlexpnnbjntpecjis`, somente contas/dados fictícios. Base de papéis por marca, rascunhos, publicação versionada, conflitos e auditoria implementada. Painel permite editar eventos existentes e publicar conforme permissões. Convites por link exigem e-mail primário confirmado correspondente, token válido e aceitação explícita. Não há administração concedida por metadados editáveis do usuário.

Worker de e-mail preparado e implantado desativado, com reserva exclusiva, repetição limitada, chave estável e limpeza de tokens/corpos. Provedor não configurado; nenhum e-mail real foi enviado. Agendador GitHub preparado em branch, sem variável/secrets cadastrados ou agenda ativa. A existência do workflow em branch não o torna um agendamento em execução.

Listas VIP C2: fluxo completo implementado em homologação — configuração por edição, inscrição do titular/acompanhantes, alteração/cancelamento/reinscrição enquanto aberta, consulta do produtor, correções pós-fechamento e texto para copiar. Prazo e permissões são aplicados pelo servidor. Foram preservados evento/lista encerrada e dois grupos fictícios, totalizando cinco pessoas. A suíte tem 148 testes. Telas, Auth/PostgREST e PWA candidato v9 foram validados; produção mantém v8.

## Como testar e o que falta

- [Guia de uso do painel e convites](GUIA_USO_PAINEL.md): ações disponíveis, permissões e solução de problemas.
- [Homologação de Auth](HOMOLOGACAO_AUTH.md): servidor e contas fictícias, com credenciais fora do repositório.
- [Envio](ENVIO_CONVITES.md) e [agendamento](AGENDAMENTO_CONVITES.md): configuração técnica pendente e pausa segura.
- [Guia de listas VIP](GUIA_LISTAS_VIP.md) e [implementação C2](LISTAS_VIP_IMPLEMENTACAO.md): operação e evidências.

O tópico de listas VIP/desconto do escopo aprovado está implementado e verificado em homologação. Próximo trabalho de liberação: revisar/consolidar os PRs empilhados e reconciliar migrações antes de uma proposta de publicação administrativa. Ativação de e-mail depende de configurar provedor/remetente, segredo e testar caixa autorizada em homologação; não houve envio real.

Antes de publicar administração: consolidar/revisar PRs empilhados, reconciliar histórico das migrações, validar fluxos completos e comunicar alterações/riscos. Não há nova data de publicação definida, nem liberação de administração em produção nesta rodada.

Preparação consolidada em `codex/liberacao-administrativa`: sete migrações pendentes,
conta inicial indicada e confirmada (bootstrap ainda não executado), guardas e
reversão ensaiadas, manifesto com 37 arquivos e 154 testes. Homologação recebeu a
migração condicional de hardening e tem 16 registros. Produção permanece no mesmo
estado. O plano inclui tornar HTTPS obrigatório antes do acesso administrativo,
pois HTTP ainda responde sem redirecionamento. Ver [LIBERACAO_ADMINISTRATIVA.md](LIBERACAO_ADMINISTRATIVA.md).
