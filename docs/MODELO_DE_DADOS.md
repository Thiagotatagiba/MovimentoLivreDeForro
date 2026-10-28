# MODELO_DE_DADOS.md

Entidades:

- Marca
- Evento
- Local
- Categoria (atributo de Marca, não entidade própria)
- Perfil (dados do usuário logado — Supabase, não JSON; ver DECISOES_DE_ARQUITETURA.md, 2026-09-28)
- Interação (favoritar evento / seguir marca — Supabase, `sql/interacoes.sql`)

Relacionamento:

Marca
↓
Evento
↓
Local

Marca também referencia um Local diretamente via `localPadraoId` (seu local padrão/
fixo). Hoje uma Marca só pode ter 1 Local (`localPadraoId` único); no futuro poderá
ter mais de um. O `Evento.localId` precisa respeitar essa relação — checado em
`js/services/eventValidator.js` (ver DECISOES_DE_ARQUITETURA.md, 2026-08-26),
que desde 2026-10-28 também valida se o Local existe/está ativo.

Perfil tem relação 1:1 com o usuário autenticado (`auth.users` do Supabase — mesmo
`id`, é a própria FK/PK). Não referencia Marca/Evento/Local. O e-mail não é
duplicado em Perfil: é sempre lido da sessão de autenticação, nunca copiado pra
uma coluna própria.

Interação liga usuário a uma entidade do catálogo por texto (`entidade_tipo` +
`entidade_id`), porque o catálogo ainda não está no Postgres — por isso não há FK
para `eventos`/`marcas`.

## Eventos gerados (não existem mais)

Entre 2026-10-28 e a mesma data, `recorrenciaService.js` gerava ocorrências
semanais em memória (`virtual: true`, `slug: null`, título "Toda quinta"),
herdando dados do último evento real da Marca. O recurso foi **removido**:
hoje **todo evento da agenda é uma linha de `eventos.json`**, com slug e
página próprios. `frequencia` e `diasSemana` da Marca continuam no modelo,
mas são apenas informativos.

## Campos por entidade

**Marca:** `id`, `slug`, `nome`, `descricao`, `frequencia` (`semanal`/`mensal`),
`diasSemana[]`, `categorias[]`, `cidadeBase`, `localPadraoId`, `instagram`,
`whatsapp`, `site`, `logo`, `capa`, `ativo`.

**Evento:** `id`, `slug`, `marcaId`, `localId`, `titulo`, `data` (YYYY-MM-DD),
`horario`, `descricao`, `ingresso{precoAPartirDe, link, tipoEntrada}`,
`lineup{bandas[], djs[]}`, `imagemUrl`, `condicoesEspeciais[{tipo, descricao}]`,
`ativo`. (O campo legado `ingresso.plataforma` foi migrado para `tipoEntrada`.)

**Local:** `id`, `slug`, `nome`, `tipo`, `endereco{cep, logradouro, numero,
complemento, bairro, cidade, estado}`, `latitude`, `longitude`, `mapsLink`,
`fotoCapa`, `fotoPerfil`, `instagram`, `site`, `telefone`, `descricao`, `ativo`,
`origem`, `criadoEm`, `atualizadoEm`.

## Princípios

- IDs únicos e slugs estáveis (editáveis só no admin, não mudam ao renomear).
- Sem duplicação de dados (e-mail só em `auth.users`; endereço só em Local).
- `ativo: false` é soft-delete: o item some do site, mas o histórico permanece.
- Datas de Evento são strings `YYYY-MM-DD` e nunca `Date` no JSON.
