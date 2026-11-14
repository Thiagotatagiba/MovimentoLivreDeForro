# Convites de equipe — B5, 14/11/2026

Branch codex/convites-equipe, sobre a base administrativa B4. A main publicada
671efef foi incorporada com resolução dos conflitos: fonte pública Supabase,
worker v8, verificações de publicação e bypass de cache administrativo preservados.
Nenhuma alteração desta entrega foi aplicada à produção.

## Entrega funcional

admin/convites.html permite ao administrador ativo da marca ou administrador
global criar e revogar convites. Mostra somente marcas administradas e os
convites permitidos pelo RLS. Equipe com permissões de operação não vira
administrador, mesmo tendo todas as cinco permissões. O contexto agora distingue
explicitamente administrador=true, derivado do papel real no banco.

Criação e aceitação exigem confirmação separada, com e-mail, marca, papel e
permissões. Equipe recebe somente as permissões escolhidas; administrador recebe
a administração da marca, incluindo poder de convidar outros membros. O convite
não concede acesso antes da aceitação. O administrador pode copiar um link para
compartilhar; envio automático de e-mail ainda não está implementado.

O destinatário precisa autenticar com o e-mail primário confirmado correspondente.
A decisão usa auth.users dentro do banco; não confia em user_metadata, e-mail
fornecido pelo cliente ou alegações de verificação do JWT. Usuário anônimo, conta
com e-mail sem confirmação, outro e-mail e token incorreto são recusados.
O emissor ainda precisa ser administrador ativo no momento da aceitação e a
marca precisa estar ativa. Revogar sua autoridade impede aceitar convites antigos.

Vínculo já ativo nunca é promovido ou substituído silenciosamente por convite:
o comando retorna conflito. Um vínculo inativo pode ser reativado com aceitação
explícita, recebendo o papel/permissões do convite. Alteração de membros já ativos
continua usando alterar_membro_marca e suas proteções de último administrador.

## Banco e segurança

Migração criada pelo CLI 3.1.0:
supabase/migrations/20261114220518_convites_equipe_verificados.sql.
Aplicada apenas em qmhrlexpnnbjntpecjis pelo conector, versão remota
20261114221347. Homologação agora tem 12 migrações; produção continua com 7.
O histórico remoto de homologação tem timestamps próprios, conforme o relatório
B4. Não usar db push/reset sem reconciliar esse histórico.

Novas tabelas:

- public.convites_marca: metadados, papel, permissões, destinatário, validade e
  estados pendente/aceito/expirado/revogado. Leitura somente por administrador
  autorizado ou destinatário; sem escrita direta de clientes.
- app_private.tokens_convite: SHA-256 do token usado na verificação.
- app_private.outbox_convites: fila privada para futura entrega, sem grants para
  anon/authenticated e fora da Data API. Não há worker ou provedor conectado.

As três tabelas têm RLS. Entradas RPC públicas são SECURITY INVOKER e delegam
para implementações privadas com search_path vazio, identidade derivada de
auth.uid() e autorização revalidada a cada operação. Auxiliar de e-mail retorna
somente o e-mail primário verificado do próprio usuário. Nenhuma chave
administrativa é enviada ao frontend.

O cliente gera token de 32 bytes criptograficamente aleatórios. A verificação
usa seu hash; token não aparece na tabela pública, auditoria ou resposta de
idempotência. **A fila privada contém temporariamente o token em texto**, para
permitir futura entrega transacional. É um payload sensível: não exportar para
logs, analytics ou relatórios. O worker futuro deve revalidar estado/expiração,
usar URL canônica confiável e apagar o token ao concluir a entrega. Não alegar
que todos os tokens em repouso estão somente em hash.

Aceitar/revogar limpa o token da fila na mesma transação. Expiração é efetiva
imediatamente na validação da RPC e na tela; o estado expirado e a limpeza da fila
são materializados quando outro convite é criado para a marca. Limpeza periódica
de convites vencidos e retenção de fila ainda precisam do worker/rotina futura.

O link usa fragmento, sem token em query. A página remove o fragmento da URL e
guarda a entrada somente em sessionStorage da aba, com validade de retomada
de 15 minutos para login/OAuth na mesma aba. Aceitação, estado final ou entrada inválida
limpam essa entrada. A página trata também abertura de outro link sem recarregar
o documento. A checagem de validade do armazenamento ocorre ao ler a entrada;
não há temporizador de limpeza de uma aba abandonada. Referrer-Policy da página:
no-referrer. Tokens não são guardados em localStorage pelo fluxo de convites.
OAuth/Magic Link com convite não foi testado; se abrir outra aba, reabrir o link
original após autenticar. Não declarar esse retorno validado.

O prazo do convite é sete dias, calculado pelo servidor. Há um convite pendente
por e-mail/marca. Pedidos críticos são idempotentes por usuário/chave e payload;
repetir pedido igual retorna o resultado original, sem duplicar auditoria/fila.
Payload diferente com mesma chave é rejeitado. Marca e convite são bloqueados
em ordem consistente, com alteração de membros serializada pela mesma marca.
Conflito de negócio retorna PT409/HTTP 409, sem retry automático do SDK.

## Evidências

77 testes locais passaram: 17 catálogo, 2 publicação, 16 SQL administrativo,
8 serviço, 9 editor/demo, 7 verificador Auth, 14 SQL de convites e 4 modelo de link.
Os testes SQL executam as migrações reais no PostgreSQL/PGlite descartável.

Os 14 casos novos cobrem grants/RLS, marca errada, administrador global,
normalização, prazo, criação atômica, idempotência, token/e-mail errado,
e-mail não confirmado, identidade anônima, metadados forjados, uso único,
revogação, expiração, membro já ativo, reativação explícita, autoridade revogada,
permissões inválidas e rollback completo quando a fila falha.

No Auth/PostgREST real de homologação:

- Três contas fictícias autenticadas; criação e replay confirmados.
- Conta sem administração não criou convite. Outra conta não leu metadados nem
  aceitou o convite. Token errado foi recusado.
- Revogação/replay confirmados; tentativa posterior recebeu HTTP 409/PT409.
- Duas aceitações simultâneas produziram um sucesso e um conflito, um vínculo
  e uma auditoria. Replay do sucesso preservou o resultado. A conta PUBLICADOR
  recebeu somente consultar_listas na marca B, sem alterar seu vínculo da marca A.
- Navegador: administrador da marca B criou convite de edição, revisou os dados,
  destinatário EDITOR abriu o link, confirmou e aceitou. Recebeu somente
  gerenciar_eventos na marca B. Os controles de criação ficaram ocultos para ele.
- Reabertura de link aceito não ofereceu nova aceitação; URL foi limpa inclusive
  em navegação por hash no mesmo documento.
- Desktop e viewport móvel de 390 px conferidos; largura do conteúdo 375 px com
  barra de rolagem, sem overflow horizontal. Viewport temporário restaurado.

O botão Copiar link mostrou confirmação na UI, mas a leitura do clipboard pela
automação retornou vazia. Para continuar o teste de aceitação, o operador leu
o payload privado do convite fictício e transferiu o link temporariamente fora
do repositório; o arquivo temporário foi apagado. Não declarar verificação
independente do conteúdo da área de transferência. Copiar/colar no navegador
do usuário segue como conferência manual.

Estado final de teste: quatro convites (dois aceitos e dois revogados), cinco
membros, duas aceitações auditadas e zero tokens de entrega presentes na fila.
Não foram enviados e-mails. Não foram criados novos usuários ou administradores
globais nesta etapa. As contas fictícias agora possuem vínculos adicionais na
marca B; não remover esses vínculos automaticamente para repetir o teste.

Security Advisors após a migração: quatro INFO intencionais de RLS sem policies
nas tabelas privadas, sem acesso direto por clientes; [referência](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).
Continua o WARN preexistente de proteção contra senhas vazadas desativada;
[referência](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
Houve uma indisponibilidade transitória do conector ao consultar Advisors; a
consulta seguinte foi concluída. Não houve correção de segurança em produção.

## Reproduzir

```powershell
npm ci --ignore-scripts
npm test
node --env-file=C:\Users\thiag\AppData\Local\VaiTerForro\homologacao\qmhrlexpnnbjntpecjis.env scripts/homologar-convites.mjs
```

O comando padrão cria/revoga convites fictícios e não concede vínculos. A flag
--aceitacao também testa concessão concorrente para PUBLICADOR na marca B; esse
fixture já foi usado e não deve ser repetido sem preparar outro destinatário
isolado. O script recusa produção e exige confirmação do ref. A configuração
externa contém somente chave pública e senhas das contas fictícias.

Com o servidor local de homologação configurado, abrir
http://127.0.0.1:8768/__homologacao/login, entrar como OUTRA_MARCA e acessar
http://127.0.0.1:8768/admin/convites.html. Use contas adicionais de teste para uma
nova aceitação; EDITOR e PUBLICADOR já aceitaram os convites da marca B.

## Próximo trabalho e reversão

Integrar um provedor de e-mail transacional e implementar consumo seguro da fila,
cancelamento/revalidação antes de envio, retry e limpeza periódica. Não reutilizar
um convite do Auth como se fosse convite de marca. Não conceder acesso por envio
de e-mail ou por aprovação de solicitação sem aceitação. Solicitações de acesso,
novos eventos/locais e listas VIP continuam em incrementos posteriores.

Para suspender esta função em homologação, retirar a página e revogar EXECUTE
das três RPCs públicas; preservar convites, membros e auditoria. Desligar a tela
não revoga vínculos já aceitos: isso exige alterar_membro_marca e suas proteções.
Nunca apagar membros como rollback automático.

Produção foi somente consultada: 24 eventos, 24 versões, 7 migrações e ausência
de convites_marca. O catálogo publicado segue Supabase/cache v8. Nenhuma
autorização de publicação administrativa em produção é inferida desta entrega.
