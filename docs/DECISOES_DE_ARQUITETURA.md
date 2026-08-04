# DECISOES_DE_ARQUITETURA.md

## 2026-07-18
- Criada entidade Marca.
- Eventos separados da Marca.
- JSON como fonte inicial.
- Mobile First.
- Componentização.
- Services separados da interface.

## 2026-07-XX (preencher datas reais)
- MVP das páginas Home, Agenda e Evento implementado.
- Grid de descoberta estilo Sympla criado para a Agenda.
- Feed de descoberta em blocos criado para a Home.
- Painel administrativo criado para gerenciar Marca, Evento e Local.
- Ferramenta HTML standalone de cadastro construída para `locais.json`
  (primeira das três — marcas e eventos ainda pendentes).
- Função `normalizarLocalAntigo` criada para migrar endereços legados em
  formato de string única para o schema estruturado atual.
- Padrão de soft-delete adotado: entidades nunca são apagadas, apenas
  alternadas entre ativo/inativo.
- Camada `arquivoStorage.js` criada como abstração de armazenamento,
  desenhada para ser trocada por um backend real sem alterar a UI.
- Motor de formulário genérico (`formularioGenerico.js`) criado: novos
  formulários de entidade exigem apenas um novo schema, não novo código de UI.
- `EventCard` unificado como componente único, usado em todos os contextos
  via parâmetros, evitando variantes duplicadas.
- Campos de latitude/longitude adicionados a Local, preparando o terreno
  para o mapa interativo futuro.

## 2026-08-03
- Entidade "Categoria" removida de MODELO_DE_DADOS.md por nunca ter sido
  implementada. Caso volte a ser necessária, deve entrar como campo
  estruturado em Evento/Marca, não como entidade solta sem justificativa.

Toda decisão estrutural futura deve ser registrada neste documento.
