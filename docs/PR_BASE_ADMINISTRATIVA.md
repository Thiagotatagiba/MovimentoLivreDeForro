Prepara a base administrativa no banco sem habilitar escrita em producao. O admin local de JSON e o site publicado permanecem como estao.

Inclui:
- Sete migracoes historicas exportadas do Supabase com os nomes/timestamps reais, sem reaplicacao.
- Migracao pendente para papeis/permissoes por marca, auditoria, idempotencia e outbox privado.
- RPCs de salvar rascunho com revisao, publicar versao, alterar situacao operacional e alterar membros existentes protegendo o ultimo administrador.
- Servico JS reutilizando o unico cliente Supabase, sem chave administrativa no frontend.
- CI com dependencia de teste exata/lockfile e PostgreSQL descartavel em memoria.

Validacao: 37 testes passaram localmente (17 catalogo, 16 SQL/RLS administrativo e 4 contratos JS). O fixture SQL usa PostgreSQL 18.6/PGlite, roles anon/authenticated e usuarios sinteticos; nao utiliza o projeto remoto. Testa isolamento, separacao editar/publicar, conflito de revisao, retry idempotente, rollback, versoes, ultimo administrador, revogacao, auditoria/outbox e preservacao de sentinelas de usuario.

Limitacoes: sem UI multi-marca, convites, criacao de eventos/locais provisorios ou worker do outbox ainda. PostgREST/Auth reais e corridas entre conexoes precisam de homologacao separada. Nenhuma migracao, grant, policy ou registro foi alterado em producao.

Este PR e baseado em codex/supabase-leitura-publica, para revisar apenas o incremento administrativo. Aplicacao futura depende do cutover publico validado e comunicacao previa. Comandos, riscos e reversao conservadora em docs/BASE_ADMINISTRATIVA.md.
