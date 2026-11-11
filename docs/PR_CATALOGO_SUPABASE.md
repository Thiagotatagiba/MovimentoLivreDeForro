O site continua lendo JSON por padrao. Esta alteracao prepara a leitura publica do catalogo Supabase com IDs legados, slugs, versao publicada por FK composta, paginacao e fontes json/comparacao/supabase, sem fallback automatico.

Inclui horarios de inicio/termino e estimativas, avisos de cancelamento/adiamento/interrupcao, ICS corrigido, Stories/cards/detalhe, pre-cache dos novos modulos, geracao de previas JSON ou Supabase e sete paginas que estavam ausentes.

Automacao:
- GitHub Actions executa testes, integridade, sintaxe e reproducibilidade das previas em push/PR.
- scripts/publicar-branch.ps1 valida, envia a branch e abre ou reutiliza um PR em rascunho usando a autenticacao existente do Git; nunca faz merge ou deploy.
- Comparacao remota opcional via workflow_dispatch ou -CompararRemoto.

Validacao executada em 11/11/2026:
- 17 testes automatizados passaram, incluindo servidor de homologacao com protecao de caminhos privados e flag versionada preservada.
- API anonima contra checkout e JSONs do dominio: 15 marcas, 15 locais ativos e 24 eventos, sem divergencias nos campos legados.
- Rascunhos/perfis/ingressos sem dados visiveis para anon; 24 versoes publicas.
- Geradores JSON e Supabase, validador de dados, sintaxe e git diff --check executados.

Homologacao no navegador concluida para Home, Stories, busca (marca/eventos), agenda/filtro Festival, detalhe, marca e local, usando Supabase real via servidor local. Layouts de 320, 390 e 1280 px sem overflow horizontal no detalhe; sem erros/warnings de console na pagina verificada. Favoritar sem sessao abriu o modal de login, sem escrever interacoes. Download real do ICS confirmou UID evt-015, inicio 20261113T220000 e fim 20261114T020000, revisao 1.

Pendente: login com conta real e instalacao/atualizacao real do PWA. A homologacao no navegador foi retomada com autorizacao posterior do usuario; a recusa inicial permanece apenas como historico. Avisos preexistentes do Supabase permanecem documentados.

Para homologar sem editar arquivos de configuracao: node scripts/servidor-homologacao.mjs --fonte=supabase --porta=8766. O servidor e limitado ao loopback, nao cacheia respostas e bloqueia caminhos ocultos como .git/config. Tambem aceita json/comparacao. Nao usar como servidor de producao.

Sem migracao, escrita no Supabase, merge ou deploy. JSON permanece como fonte padrao. Criterios de ativacao/reversao em docs/INTEGRACAO_CATALOGO_SUPABASE.md. Administracao multi-marca e VIP continuam nas entregas seguintes.


Correcao da arte do Festival Praca Viva (evt-024):
- A URL original preservada no JSON/Supabase retornava 403 "URL signature expired".
- JPEG original recuperado do post publico do organizador DfHluSKx7pf e versionado em assets/eventos/festival-praca-viva-2026-12.jpg.
- Resolver de midia usa essa copia apenas para o mesmo arquivo de origem; uma nova arte publicada nao e sobrescrita.
- Detalhe/cards/Stories e previews compartilham a resolucao. Previa OG regenerada, service worker v6.
- Conferido no navegador: lightbox carregou o JPEG local completo, 1088 x 1344.
- JSONs e versoes Supabase nao foram alterados; paridade continua sem divergencias.
