O site continua lendo JSON por padrao. Esta alteracao prepara a leitura publica do catalogo Supabase com IDs legados, slugs, versao publicada por FK composta, paginacao e fontes json/comparacao/supabase, sem fallback automatico.

Inclui horarios de inicio/termino e estimativas, avisos de cancelamento/adiamento/interrupcao, ICS corrigido, Stories/cards/detalhe, pre-cache dos novos modulos, geracao de previas JSON ou Supabase e sete paginas que estavam ausentes.

Automacao:
- GitHub Actions executa testes, integridade, sintaxe e reproducibilidade das previas em push/PR.
- scripts/publicar-branch.ps1 valida, envia a branch e abre ou reutiliza um PR em rascunho usando a autenticacao existente do Git; nunca faz merge ou deploy.
- Comparacao remota opcional via workflow_dispatch ou -CompararRemoto.

Validacao executada em 11/11/2026:
- 15 testes automatizados passaram.
- API anonima contra checkout e JSONs do dominio: 15 marcas, 15 locais ativos e 24 eventos, sem divergencias nos campos legados.
- Rascunhos/perfis/ingressos sem dados visiveis para anon; 24 versoes publicas.
- Geradores JSON e Supabase, validador de dados, sintaxe e git diff --check executados.

Pendente: validacao visual/mobile, login real e instalacao/atualizacao do PWA. A abertura do servidor local foi recusada pelo mecanismo de autorizacao do navegador na primeira rodada. Avisos preexistentes do Supabase permanecem documentados.

Sem migracao, escrita no Supabase, merge ou deploy. JSON permanece como fonte padrao. Criterios de ativacao/reversao em docs/INTEGRACAO_CATALOGO_SUPABASE.md. Administracao multi-marca e VIP continuam nas entregas seguintes.
