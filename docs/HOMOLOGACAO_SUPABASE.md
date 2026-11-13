# Homologação Supabase real — 13/11/2026

Projeto: [Vai Ter Forró! — Homologação](https://supabase.com/dashboard/project/qmhrlexpnnbjntpecjis).
Ref qmhrlexpnnbjntpecjis, organização Movimento Livre de Forró, região sa-east-1,
PostgreSQL 17.11.0.019. Cotação do conector: **US$ 0/mês**, plano Free.
Não houve upgrade, criação de branch paga ou alteração do projeto de produção.

## Instalação e dados

Antes da instalação, o projeto tinha zero usuários e zero tabelas em public.
Foram aplicados, nessa ordem, sql/perfis.sql, sql/interacoes.sql e os oito arquivos
então existentes de supabase/migrations/. Depois foi aplicada a correção de
conflitos 20261113214349_conflitos_administrativos_http409.sql.

Os arquivos históricos foram usados somente para reconstruir o projeto vazio,
sem copiar dados de produção. O conector atribuiu timestamps novos às aplicações:

| Origem | Versão em homologação |
| --- | --- |
| sql/perfis.sql | 20261113213824 |
| sql/interacoes.sql | 20261113213826 |
| 20260929205228_endurecer_funcoes_perfil | 20261113213829 |
| 20260929205247_revogar_execute_public_funcoes_perfil | 20261113213831 |
| 20261015113927_carteira_de_ingressos | 20261113213834 |
| 20261111220010_vaiterforro_catalogo_base_seguro | 20261113213836 |
| 20261111220300_vaiterforro_horarios_termino_obrigatorios | 20261113213838 |
| 20261111220330_vaiterforro_corrige_validacao_horarios | 20261113213840 |
| 20261111220535_vaiterforro_leitura_publica_rls | 20261113213843 |
| 20261112000155_governanca_rascunhos_publicacao | 20261113213846 |
| 20261113214349_conflitos_administrativos_http409 | 20261113214430 |

**Não executar db push/reset nesse projeto sem reconciliar o histórico.** Os
timestamps remotos novos não correspondem aos nomes originais dos arquivos.
Não usar esse histórico de homologação para reparar ou alterar a produção.

Criadas três contas fictícias pelo Auth Admin API, com confirmação de e-mail
administrativa e senhas aleatórias fortes: editor, publicador e outra marca.
Nenhum e-mail foi enviado; nenhum registro foi inserido diretamente em auth.users.
Os três perfis nasceram pelo gatilho existente. Nenhum administrador global foi criado.

O provisionamento usou uma Edge Function temporária restrita a esse ref e às três
identidades fictícias, com JWT obrigatório e capacidade aleatória adicional.
A chave administrativa ficou exclusivamente no ambiente servidor. Após a criação,
a função foi substituída por um handler HTTP 410, sem código de criação de usuários.
O HTTP 410 foi confirmado; a capacidade local temporária foi removida.
O template versionado supabase/homologacao/provisionar-contas.ts fica desativado
por padrão e não integra nenhum deploy automático ou frontend.

supabase/homologacao/fixture.sql criou um local, duas marcas e um evento fictício.
Não é migração de produção nem script idempotente; recusa catálogo/membros já
preenchidos. Seus vínculos de equipe são preparação de teste pelo operador, não
uma implementação de convites. Marca A deliberadamente isola editor/publicador;
essa preparação não representa o fluxo final de criação e administração de marcas.

Credenciais ficam somente no arquivo externo ao checkout e ao OneDrive:
C:\Users\thiag\AppData\Local\VaiTerForro\homologacao\qmhrlexpnnbjntpecjis.env.
O arquivo não contém service_role, chave secreta do projeto ou token de produção.
Não copiar esse arquivo para o repositório, screenshots ou mensagens.

## Falha encontrada e corrigida

O primeiro teste concorrente salvou uma revisão, mas a resposta perdedora expirou
após 20 segundos. A segunda execução com rastreamento sanitizado confirmou o mesmo
padrão. Logs mostraram conflito_revisao repetido e sessões PostgREST 14.18 presas.

O SQL anterior usava 40001 para revisão desatualizada. Esse código significa
falha de serialização e pode provocar repetição automática no PostgREST 14,
conforme a [orientação oficial do Supabase](https://supabase.com/kb/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions-77326b).
A nova migração substitui as três funções privadas de salvar, publicar e situação,
usando PT409 somente para os conflitos de revisão/versão. Preserva assinaturas,
grants, verificações, locks, idempotência, auditoria e transações.
As duas conexões presas identificadas no teste foram encerradas apenas em homologação.

O serviço reconhece PT409 e mantém compatibilidade com o código antigo.
Desativa retry nas RPCs administrativas quando o SDK oferece essa configuração:
SDKs recentes também podem repetir HTTP 409, conforme a
[documentação do cliente](https://supabase.com/docs/guides/api/automatic-retries-in-supabase-js).
A comparação explícita do usuário continua sendo necessária; não há retry com
chave ou revisão novas que sobrescreva o trabalho de outra pessoa.

## Resultados confirmados

- CLI padrão: cinco verificações reais de Auth/PostgREST passaram, sem RPC administrativa.
- CLI --escrita após a correção: seis verificações passaram. Duas requisições
  concorrentes com a mesma revisão produziram um sucesso e um HTTP 409/PT409.
- Replay retornou o mesmo resultado e apenas um incremento de revisão; salvar
  manteve a versão pública intacta até a publicação.
- Publicador/outra marca não salvaram; editor não publicou. Publicador publicou
  uma nova versão, preservando Cancelado. Outra marca não leu o rascunho.
- Chamadas adicionais com revisão/versão antigas confirmaram HTTP 409/PT409 em
  publicar_evento (119 ms) e alterar_situacao_evento (190 ms).
- Navegador com SDK compartilhado e login real: editor salvou revisão 5; publicador
  abriu formulário desabilitado, revisou a confirmação e publicou versão 3,
  avançando o rascunho para 6 e preservando Cancelado. Logout foi confirmado na tela.
- Estado final do fixture: 2 marcas, 1 local, 1 evento, 3 versões, 1 rascunho na
  revisão 6, 6 registros de auditoria e 2 itens de outbox ainda não processados.
  Os dois salvamentos iniciais anteriores à correção explicam registros adicionais.
- Sessões finais de Auth: zero. A sessão de editor substituída no navegador também
  foi revogada, exclusivamente na conta fictícia deste projeto.
- Todas as 14 tabelas da aplicação/privadas têm RLS. app_private foi recusado pela
  Data API com HTTP 406. A função de provisionamento retorna HTTP 410.
- npm test: **56 testes passaram**. Inclui regressão do SQLSTATE e retry do SDK.

O servidor local foi iniciado com configuração externa:

```powershell
node --env-file=C:\Users\thiag\AppData\Local\VaiTerForro\homologacao\qmhrlexpnnbjntpecjis.env scripts/servidor-homologacao.mjs --supabase-homologacao --fonte=supabase --porta=8768
```

Login auxiliar: http://127.0.0.1:8768/__homologacao/login. Exige servidor local e
confere o ref do cliente antes de habilitar a entrada. Só usa signInWithPassword
normal; não incorpora senhas, não concede papéis e não habilita senha no login público.
Não substitui testes futuros de Google/Magic Link. Senha é limpa do formulário
após a tentativa; encerramento usa scope=local.

## Advisors e limites

Security Advisors retornou dois INFO intencionais: tabelas privadas de idempotência
e outbox com RLS sem policies. Elas não têm acesso direto pelo cliente, conforme
o [diagnóstico de RLS sem policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).
Também retornou WARN de proteção contra senhas vazadas desativada, configuração
do Auth ainda pendente; [referência](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
Não declarar a segurança sem pendências. Health Advisors não encontrou achados
no momento da investigação.

Google/Magic Link, atualização de PWA, concorrência de revogação de permissões,
convites, novos eventos/locais, processamento do outbox e listas VIP ainda não
estão validados por esta entrega. O próximo incremento funcional são convites
com aceitação e e-mail verificado. Nenhuma escrita administrativa em produção
está autorizada por este documento.

Produção foi consultada somente para conferência: 15 marcas, 16 locais, 24 eventos,
24 versões, 7 migrações e ausência de membros_marca. Não houve merge na main,
migração remota de produção, ativação do catálogo ou deploy do site.
