O editor era um formulário contínuo, e Tipo de entrada usava um datalist que misturava digitação e seleção. Reorganiza em cinco blocos: Sobre o evento, Data e horários, Atrações, Entrada e benefícios, Arte e visibilidade. Mantém a identidade de papel/pinho e tipografia do site, adiciona atalhos para as seções, agrupamento Começa/Termina, indicação de campos obrigatórios/opcionais e barra de ações acessível durante a rolagem.

Tipo de entrada passa a ser select nativo com opções claras e Outro tipo com campo próprio. Valores personalizados existentes são recuperados e preservados literalmente; opções padrão mantêm os mesmos valores usados pelo catálogo. Não altera preço ou link ao trocar de tipo. Mantém IDs, edição de rascunho, confirmação de horários, validação, revisão e publicação separada.

Verificações: teste de round-trip para vazio, quatro tipos padrão e textos personalizados; sintaxe; navegador real em homologação no desktop e em 390px validou seções, navegação, select, campo personalizado, retorno ao valor original sem edição pendente e ausência de overflow horizontal. Nenhum evento foi salvo ou publicado no teste desta etapa; sessão fictícia encerrada.

Frontend apenas: HTML/CSS do editor, controlador, entradaEvento.js, manifesto, CI, teste e guia. Sem migração ou mudança de dados/permissões em produção. Reversão pelo frontend anterior.
