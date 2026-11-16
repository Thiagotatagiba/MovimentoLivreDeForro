# Estado do projeto — 15/11/2026

## Produção

Site: https://vaiterforro.com.br/. Painel: https://vaiterforro.com.br/admin/gestao.html.

- Catálogo Supabase: 15 marcas, 16 locais (15 ativos), 24 eventos e 24 versões publicadas. Foto do Festival preservada.
- HTTPS obrigatório, worker v9 e 38 arquivos críticos conferidos por hash após o PR #19.
- Administrador global cria eventos sem produtores/equipes. Marca e local devem existir; o local padrão vem selecionado e pode ser trocado para a edição.
- Campo de marca aceita digitação e sugestões das marcas autorizadas.
- Início/término explícitos obrigatórios, rascunho privado e publicação separada, versionada e auditada.
- Condições especiais: Aniversariante ou Outros, descrição, inclusão/remoção e comparação de conflitos. Aparecem no site após publicar. Não cadastram aniversariantes automaticamente.
- Convites por link, aceitação/e-mail confirmado, papéis por marca e listas VIP publicados. E-mails automáticos e agendamento desativados.
- Um administrador global autorizado. Dados fictícios não foram importados.
- Perfis, interações, ingressos, eventos e versões preservados por contagem/hash nas migrações recentes.

## Entregas e migrações

| PR | Entrega | Migração real em produção |
| --- | --- | --- |
| #13 | Administração, convites e listas VIP | Sete migrações; histórico chegou a 14 |
| #15 | Criação de eventos | 20261115190551 |
| #17 | Local padrão na criação | Sem migração |
| #18 | Busca digitada de marca | Sem migração |
| #19 | Condições especiais | 20261115193652 |

Produção tem **16 migrações**. Os timestamps remotos diferem dos nomes locais; não executar db push/reset sem reconciliar o histórico. Main funcional do PR #19: e4d4eb8839c29178128670e97a5bb4cc2d049db2.

## Validação e acesso

**173 testes passaram** na última entrega. Navegador local confirmou inclusão, salvamento e recarga de condição especial. Criação/publicação autenticadas validadas em homologação; em produção, conferidos banco, permissões, preservação, arquivos publicados e paridade pública. Não foram usadas credenciais do responsável nem criados eventos fictícios em produção.

Atualize abas antigas com Ctrl + Shift + R. Guias: [painel](GUIA_USO_PAINEL.md) e [listas VIP](GUIA_LISTAS_VIP.md).

## Homologação e pendências

Projeto qmhrlexpnnbjntpecjis: **18 migrações, quatro eventos e cinco versões**, conferidos em 15/11/2026. Contas/dados fictícios; não importar para produção.

Pendentes no novo painel: envio de imagem por arquivo (hoje há URL HTTPS na criação), substituição de imagem existente, edição de marcas e locais existentes, cadastro específico de aniversariantes e alteração posterior de termos/prazos de listas. CSV não aprovado. E-mail automático depende de provedor/remetente a configurar em homologação.

O administrador antigo que grava arquivos locais não substitui o painel Supabase. PRs administrativos substituídos encerrados preservando histórico; PR #1 independente.

Registros: [publicação inicial](PUBLICACAO_ADMINISTRATIVA_2026-11-15.md), [criação](CRIACAO_EVENTOS.md) e descrições dos PRs #17–#19.

## Incremento de cadastros oficiais

Cadastro de novas marcas e locais implementado e validado com 184 testes. A ativação deste incremento leva produção de 16 para 17 migrações e de 38 para 43 arquivos críticos. Somente global cria; não concede acesso a produtores. Inclui busca e mapa com pino, local padrão e revisão antes de tornar público. Ver [contrato/validação/reversão](CADASTROS_MARCAS_LOCAIS.md) e [guia](GUIA_USO_PAINEL.md#cadastrar-marcas-e-locais). Homologação recebeu a migração 20261115204655, total 19; fixtures desta rodada permanecem somente nesse projeto.

## Edição de marcas e locais

Incremento de edição global na mesma tela, com seleção, revisão, auditoria e conflito sem sobrescrita. Novo endereço de local com publicação gera outro cadastro para preservar eventos/defaults anteriores. A ativação leva produção a 18 migrações; a coluna revisao é metadado novo nas marcas/locais, sem alteração do conteúdo anterior. Validação total esperada: 192 testes, 43 arquivos críticos. Ver CADASTROS_MARCAS_LOCAIS.md e GUIA_USO_PAINEL.md.

## Menu da Gestão — 16/11/2026

Menu compartilhado e cinco atalhos para eventos, locais, marcas, listas e gerentes de marcas. Acessos de listas preservados no contexto; permissões e autorização no banco não mudam. Sem migração. Validação: 196 testes e manifesto de 46 arquivos críticos. Guia em GUIA_USO_PAINEL.md.
