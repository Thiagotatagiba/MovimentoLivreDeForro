# Administração publicada — 15/11/2026

Publicação autorizada expressamente pelo responsável após revisão do PR consolidado #13. Implementação publicada no commit `58ce308b1754b086efca4220853c0270fc5c09c6`, com candidata aprovada `99d5d1b9c82e3e9714df2328312fc7d705edc0fb`. Os PRs anteriores #3, #4, #5, #6, #8, #9, #10, #11 e #12 foram encerrados como substituídos; branches e histórico preservados. PR #1 permaneceu fora do escopo.

## Acesso

- [Gestão de eventos](https://vaiterforro.com.br/admin/gestao.html)
- [Equipe e convites](https://vaiterforro.com.br/admin/convites.html)
- [Listas VIP e desconto](https://vaiterforro.com.br/admin/listas.html)

Entrar com a conta confirmada indicada pelo responsável, usando o login existente. Essa conta recebeu o único papel de administrador do sistema; nenhuma outra conta foi promovida. A atribuição foi registrada no ledger privado de operações. Não foram criadas contas novas ou importadas contas de homologação.

## Banco publicado

As sete migrações foram aplicadas uma por vez no projeto de produção `hpemkfzqbhbzjepbxvwh`, sem reaplicar as sete históricas. Total atual: **14 migrações**.

| Arquivo local | Versão efetivamente aplicada em produção |
| --- | --- |
| `20261112000155_governanca_rascunhos_publicacao.sql` | `20261115174353` |
| `20261113214349_conflitos_administrativos_http409.sql` | `20261115174400` |
| `20261114220518_convites_equipe_verificados.sql` | `20261115174407` |
| `20261114223502_fila_entrega_convites.sql` | `20261115174413` |
| `20261115114508_listas_vip_configuracao.sql` | `20261115174420` |
| `20261115115907_listas_vip_inscricoes.sql` | `20261115174427` |
| `20261115172032_restringir_execucao_auto_rls.sql` | `20261115174434` |

Guardar esta correspondência antes de usar CLI: os timestamps do conector diferem dos nomes locais. **Não executar db push/reset/reaplicação às cegas.** As guardas de pré-verificação da instalação inicial agora recusam produção já instalada, como esperado; não removê-las para tentar instalar de novo.

Foram criadas as estruturas administrativas, convites, fila/auditoria e listas/inscrições, com RLS e funções de operação. O ajuste de EXECUTE manteve a função/trigger de ativação automática de RLS. O pós-voo confirmou um administrador ativo, zero tabelas novas sem RLS, zero wrappers públicos SECURITY DEFINER, zero helpers privados executáveis por anon e nenhuma permissão anon de leitura das inscrições.

## Preservação e publicação do site

As assinaturas e contagens de **perfis, interações, ingressos, eventos e versões** foram iguais antes/depois das migrações e bootstrap. O catálogo mantém 15 marcas, 16 locais, 24 eventos e 24 versões. Produção iniciou sem convites, listas ou inscrições; nenhum dado fictício foi importado. O backup protegido de aplicação foi reaberto/validado antes da publicação e permanece fora do Git; seu escopo e limitações estão no [plano de liberação](LIBERACAO_ADMINISTRATIVA.md).

HTTPS obrigatório foi habilitado no Pages antes da atribuição administrativa. HTTP responde **301** para a mesma rota HTTPS; HTTPS responde 200. Domínio/CNAME e fonte Pages main `/` foram preservados.

- [Pages do commit funcional](https://github.com/Thiagotatagiba/MovimentoLivreDeForro/actions/runs/43742929896): sucesso.
- [Validação do commit funcional](https://github.com/Thiagotatagiba/MovimentoLivreDeForro/actions/runs/43742930199): sucesso; suíte de **154 testes**.
- `verificar-publicacao.mjs --exigir`: **37/37 arquivos críticos** iguais aos arquivos aprovados, incluindo worker v9, páginas administrativas, módulos e arte do Festival.
- `comparar-catalogo.mjs --site`: compatível, sem divergências; leituras anônimas de perfis, rascunhos e ingressos recusadas ou sem linhas visíveis.
- API anon: inscrições e gestão das listas recusadas (401); consulta de metadados de lista inexistente respondeu null, sem dados pessoais.
- Navegador: páginas de gestão/convites/listas e modal de login abriram, agenda carregou, Festival exibiu horários e arte de 1088×1344 carregada. O primeiro modal usou texto de um módulo antigo em cache; após atualizar, mostrou o texto administrativo correto. Se o site já estava aberto, atualizar a página para carregar a versão nova.

Não foram usados senha, link mágico ou sessão forjada do administrador para o teste. O responsável deve entrar em sua própria conta para a primeira conferência autenticada em produção. Não houve escrita fictícia de evento/lista em produção. Os testes completos de operações autenticadas, concorrência, fluxo VIP e layout foram feitos antes em homologação.

## O que continua desativado

Envio automático de convites e processamento agendado. Não há Edge Function de entrega implantada em produção, e a variável de ativação do agendador GitHub permanece desativada. As funções/tabelas de fila preparadas não enviam e-mail por conta própria. Convites de equipe funcionam pelo compartilhamento manual do link.

Advisors não apontam mais os avisos de execução cliente do event trigger. Permanecem os seis INFO esperados das tabelas privadas com RLS sem policies (sem grants cliente) e o WARN preexistente de proteção contra senhas vazadas desativada. [Orientação Supabase](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Próximo trabalho: primeira conferência autenticada do responsável no painel; depois, configurar provedor/remetente de e-mail em homologação se desejar envio automático. Guias: [painel](GUIA_USO_PAINEL.md) e [listas VIP](GUIA_LISTAS_VIP.md).
