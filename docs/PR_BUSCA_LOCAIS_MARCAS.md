Reaplica o seletor com busca aprovado na Gestão aos cadastros de marcas/locais: selecionar local para editar, selecionar marca para editar e local padrão da marca. Também aplica ao local de uma nova edição e à marca do convite. Não modifica o painel antigo de importação JSON.

Reutiliza o componente existente, mantendo o select nativo como fonte dos IDs, FormData e validação. Busca não altera o cadastro; apenas escolher um local padrão emite a alteração do formulário. Mantém Sem local fixo, rótulos de inativos, seleção automática do local padrão da marca, limpeza/recarregamento e bloqueios de formulário/fieldset. IDs ARIA são únicos por instância.

Verificações: sintaxe dos três controladores e componente; regressões automatizadas; fixture com o componente real no navegador validou filtragem sem alteração, escolha do local, Sem local fixo, FormData, limpeza para padrão original, bloqueio por fieldset, rótulos inativos, IDs únicos e visual móvel. Fixture não usa credenciais nem salva cadastros. Não foi executado cadastro real nesta etapa.

Publicação apenas do frontend. Sem migração, alteração de permissões ou dados em produção. Reversão pelo frontend anterior.
