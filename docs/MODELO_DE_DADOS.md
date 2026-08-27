# MODELO_DE_DADOS.md

Entidades:

- Marca
- Evento
- Local
- Categoria

Relacionamento:

Marca
↓
Evento
↓
Local

Marca também referencia um Local diretamente via `localPadraoId` (seu local padrão/
fixo). Hoje uma Marca só pode ter 1 Local (`localPadraoId` único); no futuro poderá
ter mais de um. O `Evento.localId` precisa respeitar essa relação — checado em
`js/services/eventValidator.js` (ver DECISOES_DE_ARQUITETURA.md, 2026-08-26).

Princípios:
- IDs únicos
- Slugs
- Sem duplicação de dados
