O painel cadastrava marcas/locais, mas não permitia selecionar registros existentes para edição. Adiciona seleção de ativos/inativos, formulários preenchidos, revisão, ativação/desativação e recarga explícita após conflito. IDs e slugs são mantidos, e somente campos alterados são enviados, preservando imagens/campos legados.

Nova revisão otimista em marcas/locais e RPCs globais INVOKER com autorização e auditoria transacionais. Repetição mantém a chave e revalida autoridade. Endereço/posição de local com qualquer versão publicada usa cópia para novo cadastro: vínculos/defaults e local anterior ficam intactos. Endereço sem publicação pode mudar no próprio ID. Publicação usa lock compartilhado do local, impedindo corrida com a edição.

Testes: isolamento, revisão/conflito, replay/revogação, identidade, legado, desativação/reativação, rollback de auditoria e preservação de eventos. API de homologação confirmou disputa real 200/409 e replay único; navegador salvou mudança de endereço com histórico e depois editou a marca/local padrão, sem equipe nova.

Ativação aplica somente esta migração; acrescenta metadado revisao com valor inicial 1 aos registros existentes, sem alterar conteúdo do catálogo. Reversão bloqueia as novas RPCs e restaura frontend; preservar registros e auditoria. Guia atualizado. Dados de homologação não são importados.
