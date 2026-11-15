# Liberação administrativa — candidata de 15/11/2026

**Plano aprovado e executado em produção em 15/11/2026 pelo PR #13.** Consulte o [registro da publicação](PUBLICACAO_ADMINISTRATIVA_2026-11-15.md) para versões reais, verificações e acesso. As seções abaixo preservam o plano e os valores de pré-verificação anteriores à execução; não representam o estado atual.

Branch `codex/liberacao-administrativa`, baseada na entrega C2. Consolida a implementação dos PRs #3, #4, #5, #6, #8, #9, #10, #11 e #12 para um único PR contra main. PR #7 já estava publicado; PR #1 é independente e permaneceu fora desta liberação.

## Escopo concreto proposto

- Painel de eventos existentes, rascunhos/publicação versionada, conflitos, papéis por marca e auditoria.
- Convites de equipe por link, aceitação explícita com e-mail confirmado, sem envio automático.
- Listas VIP completas, com titular/acompanhantes, privacidade, prazo, correções e texto pós-fechamento.
- Worker público v9 e verificação de **37 arquivos críticos** (os 19 públicos anteriores e 18 de administração/VIP/login).
- Sete migrações novas; as sete históricas já aplicadas não serão reaplicadas. Administrador inicial: somente a conta confirmada indicada pelo responsável, com atribuição e auditoria de bootstrap fora do frontend.
- HTTPS obrigatório no Pages **antes** da atribuição de administrador. E-mails, agendador, novas contas, fixtures e listas de teste não serão ativados/importados em produção. Nenhum serviço de e-mail foi contratado/configurado.

## Estado real conferido

Em 15/11, main/Pages continuam no commit `671efef597a4e94f5d3e4ac820b2e2bf9d824a65`, source main `/`, build legacy e status built. A variável GitHub `VTF_CONVITES_AGENDAMENTO_ATIVO` não está ativa. Domínio HTTPS responde 200; HTTP também responde 200 sem redirecionamento, com `https_enforced=false`. Esse estado preexistente deve mudar para redirecionar a HTTPS na liberação administrativa. Não foi alterado nesta preparação.

Produção: 15 marcas, 16 locais, 24 eventos e 24 versões, sete migrações, sem schema administrativo. A conta indicada existe uma única vez, tem e-mail confirmado e não é anônima. A verificação prévia gerada passou, sem escritas. Contagens/assinaturas de perfis, interações, ingressos, eventos e versões foram lidas para conferência de preservação; os relatórios operacionais e e-mail do bootstrap ficam fora do Git.

Comparação do catálogo servido no domínio com Supabase: 15 marcas ativas, 15 locais ativos, 24 eventos, sem divergências, além dos campos novos esperados. Leituras anônimas de perfis, rascunhos e ingressos recusadas ou sem linhas visíveis. Não houve modificação em produção nesta rodada.

## Migrações, ordem e reconciliação

| Arquivo local | Versão de homologação | Efeito |
| --- | --- | --- |
| `20261112000155_governanca_rascunhos_publicacao.sql` | `20261113213846` | Papéis, rascunhos/publicação, auditoria, idempotência e outbox. |
| `20261113214349_conflitos_administrativos_http409.sql` | `20261113214430` | Conflitos terminais PT409, sem repetição automática. |
| `20261114220518_convites_equipe_verificados.sql` | `20261114221347` | Convites, aceitação e tokens privados. |
| `20261114223502_fila_entrega_convites.sql` | `20261114225052` | Reservas/tentativas/limpeza para entrega futura. |
| `20261115114508_listas_vip_configuracao.sql` | `20261115114912` | Configuração e encerramento das listas. |
| `20261115115907_listas_vip_inscricoes.sql` | `20261115120845` | Grupos, permissões, correções, exportação e data confirmada por versão. |
| `20261115172032_restringir_execucao_auto_rls.sql` | `20261115172635` | Retira EXECUTE público/anon/authenticated da função de event trigger de RLS, se existir. |

Os seis primeiros arquivos foram comparados com os statements do histórico de homologação: MD5 do SQL normalizado corresponde exatamente. O manifesto preparado inclui também SHA-256 de cada arquivo. O sétimo foi aplicado em homologação e testado localmente com um event trigger real. Homologação tem 16 registros, incluindo dois bootstraps próprios; **não copiar seu histórico sobre produção**.

Em produção aplicar somente os sete novos arquivos, na ordem acima, via migração transacional por arquivo. O conector pode atribuir timestamps novos: registrar a correspondência real na publicação. Não rodar reset, reparar histórico às cegas ou reaplicar snapshots antigos. Se uma migração falhar, conferir o histórico/objetos antes de tentar outra vez; não publicar o frontend até todas estarem verificadas. O catálogo continua usando sua estrutura atual durante essa preparação de banco.

## Artefatos e verificações preparados

`node scripts/preparar-liberacao-administrativa.mjs` mostra um manifesto e não acessa rede nem aplica nada. Para congelar os arquivos de uma branch limpa, definir **localmente** `VTF_ADMIN_INICIAL_EMAIL` com o e-mail autorizado e executar:

```powershell
node scripts/preparar-liberacao-administrativa.mjs --saida="C:\Users\thiag\AppData\Local\VaiTerForro\liberacao\2026-11-15"
```

O destino deve estar fora do repositório. O e-mail não é impresso nem incluído no manifesto público. Os arquivos 01–10 incluem:

1. Pré-verificação somente leitura: exige exatamente o histórico publicado conhecido, nenhuma administração instalada, conta inicial confirmada e as contagens atuais do catálogo. Alteração legítima desses dados exige nova revisão, não desativação das guardas.
2. Sete cópias dos SQLs exatos com seus hashes no manifesto.
3. Bootstrap transacional da conta indicada: exige tabela global vazia, revalida a identidade, cria somente esse administrador e registra operação auditada privada. Repetição exata é idempotente; novo pedido com administrador existente ou replay após revogação é recusado. Não é RPC pública e não contém credencial administrativa.
4. Pós-verificação que reúne segurança e preservação em um único resultado: um administrador ativo, nenhuma leitura anon de inscrições, nenhum helper privado executável por anon, nenhum wrapper público privilegiado e nenhuma tabela nova sem RLS; contagens/assinaturas para comparação.

Recriar os artefatos se o commit ou qualquer arquivo mudar. A pré-verificação já passou em produção, mas precisa ser repetida imediatamente antes de uma publicação autorizada. Atividade legítima de usuários pode mudar assinaturas/contagens entre verificações; analisar diferenças sem restaurar dados automaticamente.

Uma cópia de aplicação foi salva fora do Git em `C:\Users\thiag\AppData\Local\VaiTerForro\liberacao\2026-11-15\backup-aplicacao`: oito tabelas, políticas anteriores e definição do helper de RLS, em 14 partes protegidas por DPAPI da conta Windows. A reabertura em memória, SHA-256 e contagens foram verificadas sem gravar JSON em claro. Verificar novamente com:

```powershell
powershell -NoProfile -File scripts/validar-backup-aplicacao.ps1 -Diretorio "C:\Users\thiag\AppData\Local\VaiTerForro\liberacao\2026-11-15\backup-aplicacao"
```

Extração em JSON exige `-DestinoJson` explícito fora do repositório e não sobrescreve arquivos; o padrão só valida e mostra metadados. Esse backup depende do perfil/chaves Windows que o protegeu. Não contém credenciais/sessões Auth nem arquivos Storage e não substitui backup completo do projeto ou recuperação após perda do perfil Windows. Não alegar cobertura desses itens. Nenhuma tabela Auth, bucket ou arquivo Storage será alterado por esta liberação. Atualizar a cópia antes da publicação se os dados tiverem mudado.

## Sequência de publicação após autorização

1. Confirmar SHA aprovado, CI e baseline da main; revalidar a cópia protegida de aplicação e registrar o estado antes da liberação. O conector disponível não consulta backups gerenciados: sua disponibilidade e um backup completo de Auth/Storage não foram confirmados. O snapshot de contagens/assinaturas, isoladamente, não é backup. A cópia de aplicação não autoriza operação destrutiva ou reset do projeto.
2. Habilitar `https_enforced=true` no Pages; verificar que HTTP redireciona para a mesma rota em HTTPS e HTTPS continua respondendo. Não alterar domínio/CNAME, fonte de publicação ou provedor de autenticação.
3. Repetir o pré-voo, aplicar as sete migrações e conferir seu histórico real e Advisors. Não importar dados de homologação. DDL pode tomar locks breves; se houver bloqueio prolongado, interromper e investigar antes de continuar.
4. Executar o bootstrap privado da conta indicada e validar seu único vínculo global/auditoria. Bootstrap e pausa têm timeouts locais; não presumir esses timeouts nas migrações originais.
5. Conferir o pós-voo e comparar o catálogo/assinaturas anteriores. Não publicar em caso de falha ou diferença não explicada.
6. Fazer merge preservando o histórico no PR consolidado e acompanhar Pages/CI até sucesso no SHA esperado. A main publica o site: aprovação de um PR preparatório não é uma execução de merge.
7. Rodar `node scripts/verificar-publicacao.mjs --exigir` para os 37 arquivos, comparar catálogo no domínio e verificar anon sem nomes/rascunhos. Conferir home, agenda, arte do Festival e páginas administrativas. A prova autenticada em produção depende do login do próprio administrador; não pedir senha nem criar sessão por chave de serviço para simular esse login.
8. Entregar os links HTTPS `/admin/gestao.html`, `/admin/convites.html`, `/admin/listas.html` e o guia. Reconfirmar que não há envio/agendamento ativo. Só então encerrar os PRs antigos substituídos, preservando branches/histórico e sem tocar no PR #1.

## Riscos e reversão

O administrador inicial terá autoridade sobre todas as marcas; as demais contas não recebem papéis. Novas inscrições/convites passam a tratar dados pessoais, protegidos por autorização/RLS e auditoria. HTTPS obrigatório evita servir essas telas por HTTP. O aviso preexistente de proteção contra senhas vazadas desativada continua registrado; não alteramos provedor/plano ou configuração de senha nesta preparação. [Orientação Supabase](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

`public.rls_auto_enable()` retorna event_trigger, pertence a postgres e é usada pelo trigger `ensure_rls`. A correção não apaga/redefine/desliga esse mecanismo: só remove permissões desnecessárias de clientes. Um teste com DDL após o revoke confirmou ativação automática de RLS. [Referência Postgres](https://www.postgresql.org/docs/current/sql-createeventtrigger.html).

Se o banco ficar parcialmente preparado, manter o site anterior e examinar o ponto de falha; não apagar tabelas. Depois do bootstrap/deploy, em incidente usar **somente mediante decisão operacional** `supabase/liberacao/pausar_administracao.sql`: revoga chamadas novas às RPCs administrativas/VIP/entrega sem tocar em tabelas, usuários, favoritos, ingressos ou políticas do catálogo. Chamadas já em andamento podem terminar. O ensaio confirmou que a leitura anônima do catálogo e os registros persistem.

Reverter o frontend com novo commit/PR para a versão pública revisada anterior, acompanhar Pages e hashes, preservando banco/auditoria/inscrições. Manter HTTPS habilitado. A pausa não desfaz publicação de conteúdo já confirmada por um produtor; qualquer correção de conteúdo exige revisão própria. Para retomar RPCs, revisar/restaurar os grants explícitos correspondentes, sem reaplicar DDL de criação.

## Evidências e limites

- 154 testes automatizados: 148 anteriores, dois de hardening do event trigger e quatro de ensaio/guardas/pausa da liberação.
- Ensaio do modelo de banco reconstruído: sete SQLs exatos aplicados sobre o catálogo anterior, criação inicial/replay do administrador, recusa de conta não confirmada/revogação e preservação integral de linhas sentinelas. O modelo isola o setup Auth legado; não é cópia física completa de produção.
- Verificações reais anteriores de Auth/PostgREST, navegador, concorrência e PWA continuam documentadas em [LISTAS_VIP_IMPLEMENTACAO.md](LISTAS_VIP_IMPLEMENTACAO.md).
- Nenhum DDL, bootstrap, merge, HTTPS obrigatório ou deploy foi executado em produção nesta preparação. A única nova migração desta rodada foi aplicada em homologação; a função de plataforma é ausente lá, portanto o teste real do trigger foi local.
- Validador Windows reabriu a cópia protegida de aplicação em memória e confirmou oito tabelas e SHA-256; nenhum JSON pessoal em claro foi criado pelo fluxo padrão.

Guia do responsável: [GUIA_USO_PAINEL.md](GUIA_USO_PAINEL.md) e [GUIA_LISTAS_VIP.md](GUIA_LISTAS_VIP.md).
