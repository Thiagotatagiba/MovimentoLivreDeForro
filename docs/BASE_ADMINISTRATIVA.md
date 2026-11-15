# Base administrativa - incremento B1

Estado atualizado: base e interface instaladas e verificadas apenas no projeto
separado de homologacao; NAO instaladas na producao. Ver docs/HOMOLOGACAO_SUPABASE.md. O admin/index.html
existente continua sendo o editor local de JSON e nao foi modificado.

Branch: codex/administracao-base, baseada em codex/supabase-leitura-publica.
O PR desta entrega tem a branch de leitura como base; nao mistura a revisao
administrativa com o PR da integracao publica.

## Alteracoes concretas

- Sete migracoes historicas remotas foram exportadas de
  supabase_migrations.schema_migrations, sem alterar o banco. Seus nomes e
  timestamps exatos agora estao em supabase/migrations/. Nao reaplicar.
- A migracao nova 20261112000155_governanca_rascunhos_publicacao.sql foi criada
  pelo Supabase CLI 3.1.0 (migration new), depois preenchida e validada localmente.
  O timestamp e UTC de 12/11; a data local da entrega e 11/11/2026.
- Novas tabelas propostas: administradores_sistema, membros_marca,
  permissoes_membro, auditoria_administrativa; schema privado app_private com
  registro de idempotencia e outbox_publicacoes. RLS e grants minimos.
- RPCs: salvar_rascunho_evento, publicar_evento, alterar_situacao_evento,
  alterar_membro_marca. Entradas publicas SECURITY INVOKER delegam a funcoes
  privadas com auth.uid(), permissoes revalidadas e search_path vazio.
- services/administracaoService.js usa o cliente Supabase existente, exige a
  chave da solicitacao e distingue conflito, autorizacao, validacao e falha
  operacional. Nao faz retry com nova chave nem sobrescreve conflitos.

## Regras verificadas

Editar e publicar sao permissoes independentes. O mesmo usuario pode ter
permissoes diferentes por marca. Administrador de marca tem ambas; administrador
global pode intervir com auditoria. user_metadata nao concede acesso.

Salvar exige a revisao atual (zero somente quando ainda nao existe rascunho).
Duas edicoes na mesma revisao nao sobrescrevem silenciosamente. A publicacao
incrementa a revisao do rascunho; ela nao volta a 1 em um novo ciclo, evitando
que um editor antigo reutilize por engano uma revisao numericamente igual.

Publicar exige inicio/termino validos e posteriores, inclusive virada do dia;
termino estimado precisa ser confirmado antes de republicar conteudo. IDs e
slugs vem do evento canonico, nao podem ser trocados pelo JSON do rascunho.
Situacao operacional nao pode ser editada nesse JSON: a RPC propria cria nova
versao, exige a versao atual e preserva o historico. Republicacao de conteudo
mantem a situacao atual em vez de reativar um evento cancelado.

Cada comando usa chave idempotente por autor, valida parametros e revalida
permissoes mesmo no replay. Publicacao grava nova versao, troca o ponteiro,
registra auditoria e enfileira a atualizacao da previa na mesma transacao.
O worker de envio/processamento do outbox ainda NAO esta implementado.

Mudancas de membros existentes sao serializadas por marca e nunca podem retirar
o ultimo administrador ativo, inclusive por intervencao global. Permissoes
anteriores/novas sao auditadas. Criacao de membros via cliente nao e permitida:
convites verificados e aceitos serao implementados no proximo incremento.
Nao ha bootstrap automatico de administrador pelo frontend ou por metadados.

## Testes reproduziveis

    npm ci --ignore-scripts
    npm test

37 testes: 17 de catalogo, 16 de SQL administrativo e 4 de contratos do servico.
O teste SQL executa PostgreSQL 18.6 real em WASM (PGlite 0.5.16, dependencia de
desenvolvimento com versao exata e lockfile). O banco e descartavel, em memoria.
Reconstroi o historico exato do catalogo e a migracao pendente. Usa roles
anon/authenticated e auth.uid() controlado apenas no fixture de teste.

Cobre RLS, isolamento entre marcas, permissao de editar/publicar, revisao,
idempotencia, rollback de publicacao invalida, situacao, ultimo administrador,
revogacao, auditoria, outbox e ausencia de escrita direta nas tabelas. Sentinelas
de perfis/favoritos/ingressos permanecem intactas.

Limitacoes explicitas:
- Nao e um Supabase completo: Auth/PostgREST/storage nao sao executados nesse
  fixture. Migracoes historicas de perfil/ingressos, que dependem do setup
  legado, estao versionadas mas nao sao reaplicadas no fixture minimo.
- PGlite usa uma conexao; corridas reais entre conexoes precisam de homologacao
  PostgreSQL/Supabase separada, alem das verificacoes sequenciais de revisao e
  dos locks transacionais implementados.
- O postgres remoto pode ter outra versao. Antes de aplicar, conferir a versao,
  executar em ambiente de homologacao e rodar Advisors nesse ambiente.
- SQL legado em sql/continua sendo pre-condicao para reconstruir um stack novo
  completo; os snapshots do historico nao prometem um bootstrap vazio de Auth.

## Implantacao futura - nao executada

1. Concluir login/PWA e ativacao comunicada da leitura Supabase. Nao habilitar
   escrita administrativa enquanto o publico continuar lendo JSON.
2. Comparar migration list local/remota: as sete versoes exportadas ja existem
   em producao; a base B1 e a correcao PT409 devem estar pendentes. Nunca usar reset ou
   reaplicar os snapshots no projeto remoto.
3. Conferir se app_private continua fora dos schemas expostos na Data API.
   Revisar RLS/grants, dependencias e permissoes do owner das funcoes privadas.
4. Testar RPCs pelo PostgREST com contas distintas e corridas entre conexoes.
   Definir e auditar o bootstrap do administrador global por um operador
   autorizado; nao atribuir esse papel automaticamente a uma conta.
5. Comunicar tabelas, grants e riscos antes de aplicar a migracao, registrar o
   resultado e conferir Advisors. Nao usar esta documentacao como ordem de deploy.

Reversao apos aplicacao: interromper chamadas administrativas e revogar EXECUTE
das quatro RPCs publicas; preservar tabelas, versoes e auditoria. Nao desfazer
publicacoes apagando dados. A leitura publica do Supabase continua valida.
Este incremento nao alterou nenhuma tabela, policy ou linha remotamente.

## Proximo trabalho

Interface de gestao com formulario de evento e comparacao de conflitos,
convites por e-mail verificado (aceitacao obrigatoria), solicitacoes,
criacao de eventos/locais provisorios e worker do outbox. Depois, listas VIP
segundo o handoff. Nenhuma dessas funcionalidades e declarada concluida aqui.
