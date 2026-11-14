Candidata à primeira publicação da leitura pública pelo Supabase, incluindo a entrega do PR #2 e sua ativação. Base main; não inclui os PRs administrativos #3–#6. O merge deste PR é uma alternativa completa ao PR #2, dispensando duas publicações consecutivas.

Ativa FONTE_CATALOGO=supabase somente nesta branch, avança worker para v8 e inclui a arte original recuperada do Festival Praça Viva. Preserva IDs/slugs, isolamento da versão publicada, situação operacional e horários. Uma regra CSS corrige o estado vazio de favoritos que aparecia mesmo com hidden.

19 testes locais passaram, com paridade atual 15 marcas/15 locais ativos/24 eventos. Navegador: atualização real do worker v4 para v8, remoção do cache anterior e módulos Supabase pré-cacheados. Auth real em homologação: favoritar/listar e carteira por ID legado, com imagem sintética privada carregada. O verificador GET-only compara os arquivos críticos servidos no domínio, detectando deploy parcial ou antigo.

GitHub Pages confirmado como main / raiz, build legacy; domínio ainda no commit 60e87d4. Sem merge/deploy, migração ou escrita em produção. Detalhes, riscos, limitações de testes e reversão em docs/PUBLICACAO_CATALOGO.md. Instalação pelo sistema operacional e Google/Magic Link não foram reexecutados. HTTPS obrigatório está desativado no Pages e não foi alterado por esta branch.

Publicação depende de autorização explícita para main e conferência final de paridade/Pages. A administração e as listas VIP seguem separadas.
