# MODELO_DE_DADOS.md

Entidades:

- Marca
- Evento
- Local
- Categoria
- Perfil (dados do usuário logado — Supabase, não JSON; ver DECISOES_DE_ARQUITETURA.md, 2026-09-28)

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

Perfil tem relação 1:1 com o usuário autenticado (`auth.users` do Supabase — mesmo
`id`, é a própria FK/PK). Não referencia Marca/Evento/Local. O e-mail não é
duplicado em Perfil: é sempre lido da sessão de autenticação, nunca copiado pra
uma coluna própria.

Princípios:
- IDs únicos
- Slugs
- Sem duplicação de dados
