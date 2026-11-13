Prepara homologação de Auth/PostgREST em um Supabase separado, sem criar recursos ou modificar produção.

Inclui verificador CLI com três contas fictícias, confirmação de identidade/e-mail, permissões por marca e isolamento de rascunhos. O modo padrão não chama RPCs administrativas. O modo de escrita exige confirmação do ref e evento fictício, verifica CAS concorrente, replay, limites editor/publicador e publicação com preservação de situação. Tokens ficam em memória e as sessões de teste são encerradas individualmente.

O servidor local aceita --supabase-homologacao para substituir o único cliente compartilhado com URL/chave pública do projeto separado e armazenamento de sessão próprio. Não aceita produção como destino, chave administrativa nem combinação com a demonstração. Nenhuma senha é enviada ao frontend.

Validação: 55 testes locais, incluindo sete novos casos com APIs simuladas e servidor HTTP real local. Não há comprovação de Auth/PostgREST ou concorrência remota: só foi encontrado o projeto de produção, sem branches. O projeto proposto Vai Ter Forró! — Homologação ainda precisa ser disponibilizado e preparado. Procedimento e limitações em docs/HOMOLOGACAO_AUTH.md.

Base: codex/painel-eventos (PR #4). Nenhuma migração, alteração de dados ou implantação em produção.
