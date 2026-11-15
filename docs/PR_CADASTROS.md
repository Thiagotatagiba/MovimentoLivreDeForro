Adiciona cadastro oficial de marcas e locais pelo administrador global, integrado ao Supabase. A marca pode apontar para local padrão ativo ou ser itinerante; não cria membros, convites ou eventos. Não edita registros existentes nem endereços históricos.

Nova tela com busca de endereço Photon, mapa OpenStreetMap/Leaflet com pino arrastável e ajuste por teclado, revisão humana antes de publicação imediata, campos compatíveis com o catálogo e links HTTPS opcionais. Contexto administrativo informa papel global confirmado no banco; UI limpa dados ao trocar conta.

Migração cria auditoria_catalogo (RLS global-only) e duas RPCs públicas INVOKER que chamam helper privado DEFINER com search_path vazio e autorização global revalidada. IDs/slugs gerados no servidor; chave idempotente, serialização, bloqueio de duplicidade, validação e auditoria atômica. Sem escrita direta nas tabelas e sem permissões por user_metadata. Pausa administrativa inclui novas RPCs.

184 testes passaram. Auth/PostgREST real confirmou duas chamadas concorrentes retornando um local e uma auditoria, editor/anon recusados e auditoria oculta. Navegador de homologação criou local/marca, recarregou, confirmou o local padrão em Novo evento e largura móvel sem transbordamento. Papel global temporário removido; sessões fictícias encerradas. Migração aplicada apenas em homologação nesta preparação.

Guia: docs/GUIA_USO_PAINEL.md. Ativação aplica somente esta migração e publica o painel; reversão revoga EXECUTE das novas RPCs e restaura frontend, preservando cadastros/auditorias. Não usar db push/reset (históricos remotos têm timestamps diferentes). Upload, edição de registros existentes, solicitações de produtores e locais provisórios ficam para etapas seguintes.
