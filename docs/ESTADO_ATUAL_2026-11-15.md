# Estado do projeto — 15/11/2026, após publicação

Administração publicada com autorização pelo [PR #13](https://github.com/Thiagotatagiba/MovimentoLivreDeForro/pull/13), commit funcional `58ce308b1754b086efca4220853c0270fc5c09c6`.

## Produção

- Catálogo Supabase: 15 marcas, 16 locais, 24 eventos e 24 versões. Foto do Festival preservada e carregamento conferido.
- HTTPS obrigatório: HTTP redireciona à mesma rota HTTPS. Pages/CI passaram e 37 arquivos críticos foram verificados.
- Painel de eventos existentes, rascunhos/publicação versionada, papéis por marca e auditoria publicados.
- Convites por link com aceitação explícita/e-mail confirmado e listas VIP completas publicados.
- Sete migrações novas aplicadas, total 14; um único administrador global, na conta confirmada indicada pelo responsável. Nenhuma conta ou fixture de homologação foi importada.
- Perfis, interações, ingressos, eventos e versões tiveram contagens/assinaturas preservadas. Backup protegido de aplicação validado fora do Git.
- E-mails automáticos e processamento agendado continuam desativados. Não há função de entrega implantada em produção.

## Validação e primeiro acesso

154 testes passaram no commit publicado. Fluxos autenticados completos foram exercitados previamente em homologação. Após publicação, foram conferidos banco, atribuição de papel, bloqueio anônimo, site, arte, páginas administrativas e modal de login. O responsável deve fazer seu próprio primeiro login; não foram usadas suas credenciais nem enviada mensagem de autenticação pelo agente.

Abra [Gestão de eventos](https://vaiterforro.com.br/admin/gestao.html), [Equipe e convites](https://vaiterforro.com.br/admin/convites.html) ou [Listas VIP](https://vaiterforro.com.br/admin/listas.html). Se o site já estava aberto, atualize a página. Guias: [painel](GUIA_USO_PAINEL.md) e [listas VIP](GUIA_LISTAS_VIP.md).

## Homologação e próximos trabalhos

Projeto separado `qmhrlexpnnbjntpecjis`, com 16 migrações, contas/dados fictícios e lista VIP de teste encerrada. Continua adequado para testar mudanças; não confundir com o domínio de produção. A fonte e o catálogo públicos permanecem no projeto de produção.

Próximo trabalho: conferência autenticada do responsável e, depois, configuração de provedor/remetente em homologação para envio automático, caso desejado. Permanecem fora do escopo entregue: aniversariantes, CSV (não aprovado), criação de novas edições pelo painel e alteração posterior de termos/prazos de listas.

Os PRs administrativos antigos foram encerrados como substituídos, preservando branches/histórico. PR #1 continua independente. Evidências, migrações reais, limitações e reversão em [PUBLICACAO_ADMINISTRATIVA_2026-11-15.md](PUBLICACAO_ADMINISTRATIVA_2026-11-15.md).
