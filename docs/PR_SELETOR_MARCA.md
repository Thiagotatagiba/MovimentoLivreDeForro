O datalist misturava texto de busca com marca selecionada e trocava a marca ao reconhecer um nome exato. Substitui por seletor explícito: botão mostra a seleção, lista abre com busca separada e opção atual marcada. Digitar filtra sem trocar; clique ou Enter confirma a escolha. Escape, Tab e clique externo fecham sem mudar a seleção.

Busca ignora acentos, caixa e espaços; mostra contagem e ausência de resultados. Mantém IDs, rótulos com slug para nomes duplicados, permissões, bloqueio durante operações e confirmação existente para descartar alterações. Suporta setas/Enter e ARIA combobox/listbox.

Teste automatizado de filtragem e regressões do editor. Navegador em homologação confirmou busca, seleção por clique/Enter/setas, busca vazia, nenhum resultado, Escape e apresentação móvel. A tentativa de validar cancelamento da troca com edição pendente abriu a confirmação existente, mas o controle do navegador travou no diálogo nativo; o cancelamento não foi confirmado visualmente. Nenhum rascunho foi salvo, e a sessão fictícia foi revogada ao encerrar o teste.

Publicação só de frontend, sem migração ou alteração de dados em produção. Reversão pelo frontend anterior.
