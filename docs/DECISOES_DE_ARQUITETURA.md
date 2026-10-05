# DECISOES_DE_ARQUITETURA.md

## 2026-07-18
- Criada entidade Marca.
- Eventos separados da Marca.
- JSON como fonte inicial.
- Mobile First.
- Componentização.
- Services separados da interface.

Toda decisão estrutural futura deve ser registrada neste documento.

## 2026-08-20 — Reconstrução do zero + Redesign visual

**Contexto:** ambiente anterior perdido (reset). Reconstrução feita 100% a partir dos
documentos de arquitetura (VISION, ARQUITETURA, MODELO_DE_DADOS, CLAUDE.md), mantendo
fielmente as decisões já registradas.

**Inspiração de UX:** Thiago trouxe prints do app "Vibe" como referência visual. Decisão
foi separar o que é *padrão estrutural de UI* do que é *identidade visual* e do que é
*camada de produto (gamificação)*:

- **Adotado**: cards de evento com Marca em destaque sobre a imagem, badge de data,
  pills de filtro por categoria, mini-card de localização com CTA de rota, botão de
  ação em pílula, navegação inferior fixa mobile-first.
- **Rejeitado por enquanto**: paleta rosa/magenta do app de referência (não combina com
  a identidade cultural do projeto) e todo o sistema de gamificação (pontos, níveis,
  check-in, carteira, ranking) — isso depende de entidade Usuário + autenticação e é
  Fase 2/3, não uma tarefa de redesign.

**Paleta escolhida: "Terra Acesa" (Opção B).** Evolução direta do pine/clay/paper
original — verde-pinho profundo (#1E4638), terracota queimada (#BD5A34) e areia
(#F5EFE1), com dourado (#D89A3E) como terciário. Preferida por Thiago entre 3 opções
apresentadas (a outra era uma direção noturna vinho/âmbar e outra era azul-coral
costeiro). Tokens em `css/tokens.css`.

**Tipografia mantida:** Fraunces (display) + Work Sans (corpo), carregadas via Google Fonts.

**Roteamento:** sem framework, sem build tool. Páginas de detalhe (`evento.html`,
`marca.html`, `local.html`) recebem o slug via query string (`?slug=...`) e resolvem
tudo client-side via `services/`. Funciona em qualquer hospedagem estática.

**Nota sobre `file://`:** as páginas públicas usam ES modules (`type="module"`), que o
Chrome bloqueia ao abrir arquivo diretamente por `file://`. Para desenvolvimento local,
usar servidor HTTP simples (`python3 -m http.server`), não abrir o HTML direto. O mesmo
problema que exigiu o padrão `window.MLFAdmin` no admin se aplica aqui — mas como o
site público sempre roda em um servidor real (produção), não há necessidade do
workaround de namespace global nas páginas públicas, só durante testes locais.

**Bug corrigido (achado por Thiago testando via `file://` no Chrome/Windows):**
os repositórios usavam caminho absoluto (`/data/eventos.json`), que aponta pra
raiz do sistema de arquivos e nunca funcionaria fora de um servidor configurado
na raiz certa. Corrigido para caminho relativo (`data/eventos.json`) nos três
repositórios. Mesmo corrigido, o site público continua exigindo um servidor
HTTP local pra rodar — abrir por `file://` sempre vai falhar no `fetch()`,
navegador nenhum permite isso por padrão. Documentado no README com comandos
específicos pra Windows.

**Pendente para a próxima sessão:**
- Página/painel do Cadastro Geral (admin) ainda não reconstruída neste pacote — só o
  site público (Home, Agenda, Evento, Marca, Local, Sobre).
- Filtro de categoria na Agenda é derivado de `marca.categorias`; ainda não há entidade
  Categoria formal (ver MODELO_DE_DADOS.md — fica como próximo passo se o volume de
  categorias crescer).

## 2026-08-26 — Marca ganha `localPadraoId` + checagem de integridade referencial

**Contexto:** Thiago trouxe `marcas.json` e `locais.json` reais (curados à mão, com
campos novos: `frequencia`, `localPadraoId`, `site`, `logo` na Marca; `tipo`,
`mapsLink`, `fotoCapa`, `fotoPerfil`, `instagram`, `site`, `telefone`, `descricao`,
`origem`, `criadoEm`, `atualizadoEm` no Local).

**Decisão de modelo:** Marca agora tem `localPadraoId`, referenciando o Local onde ela
normalmente acontece. Por enquanto uma Marca só pode ter **um** Local (`localPadraoId`
único). O `Evento.localId` continua existindo como campo independente (não foi
substituído por uma derivação automática do `localPadraoId`), porque:
1. Preserva a integridade histórica — se uma Marca mudar de Local no futuro, eventos
   passados continuam apontando pro Local onde realmente aconteceram.
2. Prepara terreno pra quando uma Marca puder ter mais de um Local (dito explicitamente
   por Thiago como próximo passo) — nesse momento a regra vira "evento.localId precisa
   estar entre os locais da marca", não mais igualdade direta.

**Checagem de integridade referencial implementada:** criado `js/services/eventValidator.js`
com `validarLocalDoEvento(evento, marca)` — valida que `evento.localId` bate com
`marca.localPadraoId` quando este existir. Ligado em `eventoService.js` (roda a cada
evento resolvido, gera `console.warn` sem quebrar a renderização). Isso fecha o item que
já estava pendente na documentação anterior sobre integridade referencial no
`eventValidator.js`.

**`data/eventos.json` reescrito** com os novos IDs reais de Marca/Local — os 6 eventos
de exemplo agora respeitam a regra acima (testado programaticamente antes da entrega).

**Campos novos exibidos na interface:**
- Marca (`marca.html`): frequência do baile ("Baile mensal"/"Baile semanal"), Local
  padrão (nome + bairro/cidade, linkando pra `local.html`), botão de Site quando existir.
- Local (`local.html`): tipo (exibido no eyebrow, ex. "Local · Bar Aberto"), descrição
  (campo que existia no schema mas nunca era exibido), botão "Ligar" quando há telefone,
  e o `mapsLink` curado manualmente passa a ter prioridade sobre o link gerado a partir
  de latitude/longitude (mais preciso).

## 2026-08-27 — Projeto preparado como PWA + menu lateral

**PWA:** adicionado `manifest.json` (nome, cores da paleta Terra Acesa, ícones) e
`sw.js` (service worker). Estratégia do service worker: cache-first pra estático
(HTML/CSS/JS/ícones), network-only pra `data/*.json` — agenda desatualizada em cache
seria pior que não ter cache nenhum. Ícones em `assets/icons/` gerados como
placeholder sólido (cor `--cor-paper`) nos 5 tamanhos padrão de PWA — ver README
na própria pasta pra saber o que substituir depois.

**Menu lateral (drawer):** o ícone de "Sobre" na navegação inferior virou um botão de
Menu (☰). Ele abre um painel lateral com "Bem vindo, Forrozeiro" no topo (mesmo texto/
estilo que a Home usava antes de virar a barra superior — reaproveitado aqui) e os
links Sobre e Configurações embaixo. Lógica compartilhada em `js/pwa.js`, carregado
como script comum (não módulo) em todas as páginas, pra funcionar de forma idêntica em
qualquer uma sem duplicar código de página em página.

**Nova página `configuracoes.html`:** tem o botão "Instalar aplicativo", que só aparece
quando o navegador dispara o evento `beforeinstallprompt` (capturado globalmente em
`js/pwa.js` e guardado em `window.deferredInstallPrompt`). Em navegadores/situações que
não suportam esse evento (ex. Safari iOS), mostra instrução manual de "Adicionar à Tela
de Início" em vez de esconder a funcionalidade sem explicação.

**Nota de teste:** o jsdom usado nos testes automatizados deste projeto não dispara
`DOMContentLoaded` do jeito que um navegador real dispara ao analisar uma string HTML
estática — isso gerou um falso negativo ao testar o menu lateral. Comportamento real
confirmado chamando a função de setup manualmente (equivalente ao que o navegador faz
sozinho). Vale lembrar disso se um teste futuro do menu "falhar" de forma estranha.

## 2026-08-28 — Tira de Dias vira filtro de verdade

**Decisão de UX (discutida antes de implementar):** tocar num card da Tira de Dias
filtra "Bailes de [dia]" **na própria Home**, não navega pra outra página — bate com a
prioridade de "poucos cliques" do `CLAUDE.md`. Seleção é exclusiva (só um dia ativo por
vez), "Hoje" vem selecionado por padrão — o que efetivamente traz de volta a resposta
direta a "onde tem forró hoje?" (a missão declarada do produto), só que pelo mecanismo
do card em vez de um banner fixo como era antes da Tira de Dias existir.

**Decidido explicitamente que NÃO entra agora:** indicador visual de "esse dia tem
evento" nos cards (custaria esperar os dados carregarem antes de desenhar a tira, ou
atualizar os cards depois — mais código pro momento). Estado vazio é uma mensagem
simples, sem atalho de volta pro "Hoje".

**Acessibilidade:** os cards deixaram de ser `<div role="listitem">` decorativos e
viraram `<button>` de verdade, com `aria-pressed` refletindo qual dia está selecionado.
Antes disso não dava pra navegar a Tira de Dias por teclado.

**Novo em `eventoService.js`:** `listarEventosPorData(isoData)` — compara a data como
string ("YYYY-MM-DD"), sem reconstruir objetos `Date`, porque tanto `eventos.json`
quanto `gerarCardsSemana()` já usam esse formato.

**Ajuste no card de evento da Home:** o badge mostrava a data (`28 ago`), mas agora que
a seção inteira já é sobre um dia específico isso virou redundante — trocado pra
mostrar o horário do evento, informação nova que o usuário não tinha ali antes.

## 2026-08-28 (correção) — Tira de Dias não filtra, abre um Story de verdade

A implementação acima (filtro inline em "Bailes de [dia]") foi um entendimento errado
do pedido original. O comportamento certo, esclarecido por Thiago: tocar num dia abre
um **visualizador em tela cheia, estilo Stories do Instagram**, mostrando os eventos
daquele dia um de cada vez — arte, dados (dia/local/marca) e botão "Ir para evento".
Toque na tela avança pro próximo evento do dia; quando acabam, fecha sozinho e volta
pra Home exatamente como estava.

**Revertido:** "Próximos bailes" voltou a ser a lista genérica dos próximos eventos
(não mais filtrada por dia selecionado) — o conceito de "dia selecionado" não existe
mais, já que o clique agora abre um overlay temporário em vez de mudar o estado da
página. Badge do card de evento voltou a mostrar a data.

**Implementado:**
- `#story-viewer`: overlay fixo em tela cheia (`position: fixed; inset: 0`), com barra
  de progresso segmentada (1 segmento por evento do dia, preenchendo conforme avança) —
  o mesmo padrão visual do Instagram, mas nas cores da Terra Acesa.
- Clique na tela avança; clique no botão "Ir para evento" navega pro evento (não avança
  o slide); clique no X ou tecla Esc fecha a qualquer momento.
- Dia sem evento: o card simplesmente não abre nada — não existe story vazio.
- `document.body.style.overflow = 'hidden'` enquanto o viewer está aberto, pra evitar
  scroll da página por trás.
- Reaproveita `listarEventosPorData()` (criada na tentativa anterior) sem mudança —
  a função em si já estava certa, só o que eu fazia com o resultado dela mudou.

**Testado especificamente:** como nenhum dos eventos de exemplo em `eventos.json`
compartilha a mesma data, o avanço entre múltiplos eventos foi testado com dados
fabricados no teste (2 eventos no mesmo dia) — confirmado abrir no 1º, avançar pro 2º,
e fechar sozinho ao chegar no fim.

## 2026-08-28 — Badge de contagem na Tira de Dias

Cada card de dia ganhou um badge circular no canto superior esquerdo mostrando quantos
eventos existem naquele dia (`9+` acima de 9). Só aparece quando há pelo menos 1 evento
— um badge com "0" seria só ruído visual.

**Ordem de execução importa aqui, de novo:** os cards renderizam de forma síncrona
(sem esperar a contagem), exatamente como decidido antes quando esse mesmo tipo de
problema apareceu na seta/controle direita. A contagem (`contarEventosPorData`, nova
em `eventoService.js`) roda depois, de forma assíncrona, e só *preenche* os badges já
existentes no DOM — nunca re-renderiza os cards. Isso evita repetir o bug de medir
`scrollWidth` de um container vazio.

`contarEventosPorData` não faz o join com Marca/Local (usa `listarEventos()` puro, não
o `enriquecer()`) — pra só contar, esse join seria trabalho desperdiçado.

**Testado:** confirmado com dados reais que o badge aparece certo nos dias com evento
e fica escondido nos dias sem. Como nenhum dia da amostra real tem mais de 1 evento,
usei dados fabricados no teste pra confirmar a contagem "3" e o truncamento "9+" (com
12 eventos fictícios). Também confirmei — com um `fetch` propositalmente atrasado,
simulando latência de rede de verdade — que o comportamento "cards aparecem primeiro,
números chegam depois" funciona como esperado (um teste com fetch instantâneo demais
dava falso positivo de bug por causa do timing de microtask do Node, não do app).

## 2026-08-29 — Bug: hero de evento sem imagem ficava sem fundo

`.midia` e `.marca-nome` só tinham estilo definido como seletor descendente
(`.card-evento .midia`, `.card-evento .marca-nome`) — funcionava nos cards pequenos
(Home, Agenda, Marca, Local, todos usam `<a class="card-evento">` como wrapper), mas o
hero da página de evento (`evento.js`) usa esses elementos soltos, sem esse wrapper.
Resultado: evento sem `imagemUrl` (comum, já que a maioria dos dados ainda usa "em
breve") ficava sem o fundo clay de fallback, e o nome da marca aparecia sem estilo,
empurrado pro topo da página em vez de alinhado embaixo do banner.

**Correção:** movidas as propriedades que fazem sentido sempre (fundo clay, alinhamento
flex, cor branca do texto, sombra) pra regras base `.midia`/`.marca-nome`; só o que é
mesmo específico do card pequeno (altura de 140px, tamanho de fonte menor) ficou na
versão `.card-evento .midia`/`.card-evento .marca-nome`, que continua vencendo por
especificidade. Cards pequenos ficam idênticos a antes; o hero da página de evento
passa a herdar o visual correto mesmo sem o wrapper.

## 2026-09-06 — Marca/Local atualizados com dados reais + arquivo de eventos de teste

**Contexto:** ambiente de trabalho foi resetado no meio desta sessão (a pasta do
projeto sumiu do sandbox). Reconstruído a partir do zip mais recente (`vai-ter-forro-pwa.zip`)
com as versões mais novas de cada arquivo sobrepostas por cima — validado que nenhuma
feature recente (story viewer, badge de contagem, abreviação de mês, correção do hero)
se perdeu na reconstrução.

**`marcas.json`/`locais.json` atualizados** com os dados reais e mais completos que
Thiago já vinha usando: `mrc-004` deixou de ser "Sanfona Elétrica" e virou "Forró na
Wine | Jardim da Penha" (mesmo ID, marca diferente — o antigo evento que apontava pra
Sanfona Elétrica teria quebrado a integridade referencial se não fosse corrigido).
Nova `mrc-005` ("Forró na Wine | Jardim Camburi") e novo `loc-008` (WineBeer JC).

**`eventos.json` reescrito** com as 5 Marcas reais, cada evento respeitando o
`localPadraoId` da sua Marca — verificado programaticamente contra `eventValidator.js`
antes de entregar. As datas foram calculadas relativas ao dia real da máquina no
momento da criação do arquivo, não fixas — o relógio do sandbox já mudou mais de uma
vez durante o projeto (inclusive dentro desta mesma sessão), então qualquer data
fixa vira passado rápido demais pra ser útil como dado de exemplo.

**Novo: `data/eventos.teste.json`** (não usado pelo site — `eventoRepository.js`
sempre lê `eventos.json`). Massa de 20 eventos fictícios cobrindo casos de borda que
antes só eram testados fabricando dado na hora dentro de scripts de teste: lineup
vazio (a seção deve sumir), lineup misto, 3 e 12 eventos no mesmo dia (badge "9+" e
story de múltiplos slides), evento no último card da Tira de Dias, evento fora da
janela de 7 dias, e um caso **proposital** de integridade quebrada pra verificar que
o aviso do `eventValidator.js` realmente aparece no console. Documentado em
`data/eventos.teste.README.md`, incluindo o procedimento de troca manual do arquivo.

## 2026-09-06 (continuação) — Painel admin com File System Access API

Primeira versão do Cadastro Geral (`admin/`), decidida como próximo passo em vez de
seguir a ordem original do roadmap (Festival) — o cadastro manual via chat já tinha
mostrado fragilidade nesta mesma sessão (a troca de `mrc-004` de Sanfona Elétrica pra
Forró na Wine quase passou despercebida).

**Decisão técnica central:** sem backend, a única forma de ler E escrever os JSON
direto do disco sem servidor é a File System Access API — funciona em Chrome/Edge
(que é o navegador que Thiago usa), não funciona em Firefox/Safari nem em `file://`
(precisa de contexto seguro, então o servidor local continua obrigatório). Isso é
verificado em runtime (`apiDisponivel()`) e mostra aviso claro em vez de quebrar
silenciosamente em navegador sem suporte.

**Arquitetura do admin, separada do site público:**
- `fileAccess.js` — única camada que toca disco de verdade (abrir pasta, ler/escrever
  JSON). Isolada de propósito, pra nenhum outro módulo precisar saber como a
  persistência funciona por baixo.
- `estado.js` — objeto mutável simples compartilhado entre as 3 abas. Sem framework,
  sem store complexo — combina com a filosofia "sem build tools" do projeto.
- `eventos.js` / `marcas.js` / `locais.js` — um módulo por aba, cada um cuida da
  própria lista + formulário + salvamento.
- `eventValidator.js` do site público é **reaproveitado direto** (import relativo
  `../../js/services/eventValidator.js`) como camada extra de segurança antes de
  gravar.

**Decisão de UX importante:** em vez de deixar escolher o Local livremente e só
avisar depois se bateu errado com a Marca, a UI **já trava o campo** — se a Marca
tem `localPadraoId`, o campo de Local vira somente-leitura mostrando o nome do Local
certo; se não tem, vira um select livre. Isso prova a regra na origem, em vez de só
policiar depois. O `eventValidator.js` continua rodando mesmo assim, como camada
redundante de segurança (defesa em profundidade).

**Soft delete:** não existe botão de excluir em lugar nenhum — só o checkbox "Ativo",
consistente com o padrão já estabelecido antes neste projeto (histórico nunca é
apagado, só desativado).

**IDs e slugs automáticos:** `proximoId()` olha o maior número já usado no padrão
`prefixo-NNN` e soma 1 — não depende de contagem de itens (evita colisão se algum
registro antigo foi removido). Slug de Evento é sugerido automaticamente a partir de
Marca + Data, mas para de sugerir sozinho assim que a pessoa edita o campo manualmente.

**Testado:** simulei a File System Access API com um módulo fake (trocando o import
`./fileAccess.js` temporariamente durante o teste, revertendo depois e conferindo que
não sobrou rastro) pra confirmar criar, editar e desativar eventos de verdade, e
editar Marca preservando os campos não tocados no formulário. Confirmei também que o
Local salvo num Evento sempre vem do `localPadraoId` da Marca no estado em memória —
nunca do campo de exibição (mesmo que alguém adultere esse campo via DevTools, não
teria efeito no valor realmente gravado).

## 2026-09-19 — Marca ganha `diasSemana`

Campo novo em Marca: `diasSemana` (array de strings, ex: `["sábado"]`), separado de
`frequencia` (que continua sendo "semanal"/"mensal"/null). Os dois se complementam —
Forró Deck 16 é `frequencia: "mensal"` + `diasSemana: ["sábado"]`, ou seja, uma vez
por mês, sempre num sábado.

No admin (`admin/js/marcas.js`, `admin/index.html`), o campo é um grupo de 7
checkboxes em formato de pílula (permite selecionar mais de um dia, ex: um baile que
acontece toda quinta E domingo). Usa o seletor CSS `:has()` pra destacar visualmente
o dia marcado — recurso só suportado em navegadores Chromium, o que não é problema
aqui já que o admin inteiro já depende da File System Access API (Chrome/Edge only).

`data/marcas.json` atualizado só onde havia informação confirmada: Forró Deck 16
(`["sábado"]`, dito explicitamente por Thiago). As outras 4 Marcas ficaram com
`diasSemana: []` — os eventos de exemplo já cadastrados sugerem um padrão (o Bombar
Carioca sempre com título "Noite de Quinta"), mas isso é dado fabricado por mim como
exemplo, não confirmado como fato real da Marca, então não foi usado pra preencher.

Site público (`marca.html`) ainda não exibe esse campo — só o admin, por enquanto.

## 2026-09-19 (continuação) — Duplicar evento + Condições especiais

**Duplicar:** botão novo na lista de Eventos do admin, ao lado de "Editar". Abre o
mesmo modal de sempre, pré-preenchido com todos os campos do evento original —
**exceto a data, que nasce em branco de propósito**, forçando escolher uma nova antes
de salvar (evita duas edições idênticas na mesma data sem querer). O evento duplicado
sempre nasce "Ativo", mesmo que o original estivesse desativado. Reaproveita a mesma
função `abrirFormulario()` de sempre — só ganhou um segundo parâmetro opcional
(`{ duplicarDeId }`), sem duplicar lógica entre os três modos (criar/editar/duplicar).

**Condições especiais:** campo novo em Evento — `condicoesEspeciais: [{ tipo, descricao }]`,
com `tipo` sendo `"aniversariante"` ou `"outros"`. No formulário, um botão "+
Adicionar" abaixo da Descrição insere uma linha (select de tipo + campo de texto +
botão de remover), podendo adicionar quantas quiser. Linhas com descrição vazia são
filtradas antes de salvar — não sobra objeto `{descricao: ""}` no JSON. Texto da
descrição passa por um escape antes de entrar no HTML gerado dinamicamente (aspas e
`&` não quebram a renderização — testado com um caso real desses caracteres juntos).

Site público ainda não exibe `condicoesEspeciais` em lugar nenhum — só o admin, por
enquanto (mesma situação do `diasSemana` da Marca).

## 2026-09-19 (continuação 2) — Site público passa a exibir diasSemana e condicoesEspeciais

Os dois campos novos (Marca.diasSemana, Evento.condicoesEspeciais) ficaram só no admin
quando foram criados — agora o site público também mostra os dois.

**Marca (`marca.html`):** tag nova ao lado de "Baile mensal/semanal" mostrando os dias
por extenso ("Sábados", "Quintas e Domingos", "Segundas, Quartas e Sextas"). Novo
helper `formatarDiasSemana()` em `format.js` — pluraliza por "+s", que funciona certo
pros 7 dias da semana em português. Marca sem `diasSemana` não mostra nada extra
(testado).

**Evento (`evento.html`):** nova seção "Condições especiais" entre Line-up e Ingresso
— faz sentido próxima de tudo que envolve acesso ao evento. Cada condição vem com um
emoji (🎂 aniversariante, ℹ️ outros) + a descrição. Evento sem `condicoesEspeciais`
não mostra a seção (testado). Descrição com aspas e "&" testada especificamente, já
que o texto vem direto do que foi digitado no admin.
## 2026-09-28 — Login com Google + entidade Perfil (primeira feature de Fase 2)

**Contexto:** login com Google via Supabase Auth já estava desenhado (ver
`GUIA_SUPABASE_SETUP.md`); esta sessão finalizou a configuração (Google Cloud +
Supabase Providers) e testou o fluxo de ponta a ponta. Depois, Thiago pediu uma
página de Perfil (Foto, Nome, Sobrenome, apelido, e-mail, cidade/estado/país,
Instagram, data de nascimento, gênero).

**Bugs corrigidos na configuração de auth:**
- `authService.js` usava `window.location.origin` no `redirectTo`/`emailRedirectTo` —
  quebraria em produção no GitHub Pages, porque o site não vive na raiz do domínio
  (`.../MovimentoLivreDeForro/`, não `https://thiagotatagiba.github.io/`). Trocado
  para `window.location.href`, que preserva o path em qualquer ambiente.
- `data/supabaseClient.js` ainda tinha os placeholders `COLOQUE_SUA_URL_AQUI` /
  `COLOQUE_SUA_ANON_KEY_AQUI` — nunca preenchidos. Preenchidos com a URL e a anon key
  reais do projeto.
- `components/loginModal.js` já existia (Google + Magic Link, funcional), mas nunca
  tinha sido conectado a nada na interface, e seu CSS (`components/modal-login.css`)
  usava nomes de variável "prováveis" (`--sand`, `--pine`, `--clay`) que não existiam
  em `tokens.css`, e nunca estava linkado em nenhuma página HTML. Corrigido pros tokens
  reais (`--cor-paper`, `--cor-pine`, `--cor-clay`) e linkado nas 9 páginas públicas.
- Erro real de configuração no Google Cloud: o Client Secret colado no Supabase estava
  corrompido (valor tipo `w%c5jNw5×9xRUJ&`, não o formato `GOCSPX-...` do Google) —
  causava "Unable to exchange external code" na troca do código OAuth. Corrigido
  colando o secret certo, conferido contra o JSON baixado na criação do client.

**Duplicação resolvida:** o painel "Bem vindo, Forrozeiro" do menu lateral estava
com HTML idêntico fixo em 8 páginas. Criado `components/painelUsuario.js` — único
lugar que decide o conteúdo (nome real ou "Entrar"/"Sair") — carregado
automaticamente por `js/pwa.js` (que já roda em toda página) via `import()`
dinâmico, já que `pwa.js` é script clássico, não módulo. As 8 páginas só ganharam
`id`s e um botão no HTML; nenhuma lógica foi duplicada.

**Decisão de modelo — entidade Perfil, em Supabase (não JSON):** diferente de
Marca/Evento/Local (catálogo, editado só pelo admin), dados de perfil são privados
por usuário e mudam a qualquer momento pelo próprio dono — exatamente o tipo de
dado que o `ROADMAP.md` já reservava pra Fase 2 (comunidade). Tabela `perfis`,
relação 1:1 com `auth.users` (mesmo `id`, FK), RLS restringindo select/update ao
próprio dono — mesmo padrão já usado em `interacoes`. SQL completo em `sql/perfis.sql`.

**E-mail não duplicado:** o formulário de Perfil mostra o e-mail como campo
somente-leitura, lido da sessão (`auth.users`), em vez de copiar pra uma coluna
separada em `perfis` — evita desatualização se o usuário trocar o e-mail de login
(mesmo princípio de "Evento não copia Instagram" do `MODELO_DE_DADOS.md`).

**Perfil nasce pré-preenchido:** gatilho `criar_perfil_no_cadastro()` em
`auth.users` cria a linha em `perfis` automaticamente no primeiro login, com
`nome`/`sobrenome`/`apelido` extraídos de `full_name` do Google e `avatar_url` da
foto do Google. A tela de Perfil nasce como "editar", nunca "criar do zero". Um
backfill no mesmo script cobre quem já tinha logado antes dessa migração existir.

**Campo "Como gostaria de ser chamado" (apelido):** por pedido de Thiago, é esse
apelido — não o nome completo do Google — que aparece no painel "Bem vindo," do
menu lateral. `painelUsuario.js` busca o perfil via `perfilService.obterPerfil()`
depois do login; o nome do Google fica como fallback imediato enquanto isso carrega.

**Campos adicionados além do pedido original**, coerentes com a visão de "conectar
participantes" do `VISION.md`: `telefone` (WhatsApp, opcional — útil pra
organizadores no futuro) e `bio` (frase curta, opcional). Ambos claramente
marcados como opcionais no formulário.

**Upload de foto — Supabase Storage:** bucket `avatares` (público pra leitura,
já que o app precisa exibir as fotos pra qualquer visitante), com policies de
insert/update/delete restritas à própria pasta (`{usuario_id}/avatar.*`). URL
pública salva em `perfis.avatar_url`, com cache-bust (`?v=timestamp`) porque o
nome do arquivo não muda entre uploads.

**Sem repository pro Perfil:** seguindo o padrão já estabelecido em
`interacaoService.js` (dado vindo do Supabase, com RLS garantindo isolamento),
`perfilService.js` fala direto com o `supabase` client — não há camada de
repository intermediária, que só faz sentido pros dados ainda em JSON
(Marca/Evento/Local).

**Pendente pra próxima sessão:** rodar `sql/perfis.sql` no SQL Editor do Supabase
(ainda não executado nesta sessão); revisar `sw.js` pra desativar cache-first em
`localhost` durante desenvolvimento — o cache do Service Worker mascarou as
correções de auth durante os testes desta sessão, e vai se repetir a cada mudança
de JS/CSS local até ser resolvido.

## 2026-09-28 (continuação) — Perfil dividido em Visualizar / Editar

Ajuste imediato depois do primeiro teste real da tela de Perfil: Thiago apontou que
misturar visualização e edição numa página só deixava a tela sempre cheia de campos,
mesmo pra quem só queria conferir os próprios dados.

**Decisão:** duas páginas, cada uma com uma responsabilidade:
- `perfil.html` — visualização, somente leitura. É o destino de todo link "Meu Perfil"
  e do clique no nome no menu lateral (nenhuma outra página precisou mudar por causa
  disso). Mostra apelido como nome principal, foto, localização, Instagram (como link
  clicável), WhatsApp, data de nascimento, gênero e e-mail — só os campos preenchidos
  aparecem. Botão "Editar perfil" leva pra `perfil-editar.html`.
- `perfil-editar.html` (renomeada a partir do `perfil.html` original) — o formulário
  completo. O ícone de voltar na barra do topo passou a apontar pra `perfil.html`
  (visualização), não mais pra Home.

`js/pages/perfil.js` foi reescrito do zero pra visualização; a lógica de formulário
que estava lá virou `js/pages/perfil-editar.js`. `services/perfilService.js` não
mudou — as duas páginas o usam igual.

**Ajuste de UX também pedido nessa rodada:** "Como gostaria de ser chamado" agora
autopreenche a partir do campo Nome no evento `blur` (ao sair do campo), não só no
carregamento inicial — e para de sincronizar automaticamente assim que a pessoa edita
o apelido manualmente (flag `apelidoTocadoPeloUsuario` em `perfil-editar.js`).

## 2026-09-29 — Causa raiz dos bugs de login (Site URL do Supabase nunca configurado)

Thiago reportou 3 sintomas depois de trazer um colaborador pro projeto: foto não
sobe, dados não persistem entre logins, e login quebra em produção (GitHub Pages),
redirecionando pra `http://localhost:3000` — inclusive testado do celular, onde
obviamente não existe nada rodando nesse endereço.

**Investigação via Supabase MCP** (conectado nessa sessão): tabela `perfis`, RLS e
bucket `avatares` estavam todos corretos — inclusive havia uma foto real já enviada
com sucesso em sessão anterior, e uma edição salva às 11:47 do mesmo dia. Os logs de
auth (`auth_logs`) mostraram a causa real: toda vez que o OAuth do Google completa
(`/callback`), o Supabase redireciona pra `http://localhost:3000` — mesmo quando o
login começou em `http://localhost:8000/perfil-editar.html` ou em produção.

**Causa raiz:** o campo **Site URL** em Authentication → URL Configuration nunca foi
alterado do valor padrão de fábrica do Supabase (`http://localhost:3000`), e a lista
de **Redirect URLs** permitidos nunca incluiu nem `http://localhost:8000/**` nem a
URL de produção. Quando o `redirectTo` que o app envia não bate com nenhuma entrada
dessa lista, o Supabase ignora silenciosamente o valor enviado e usa o Site URL —
por isso login novo nunca chegava de volta no app de verdade. O que continuou
"funcionando" até agora era uma sessão antiga (refresh token) obtida antes desse
problema aparecer, sendo renovada silenciosamente — mascarando o problema até um
login novo (ex: no ambiente do colaborador, ou em produção) expor a falha.

**Correção:** ajuste manual no dashboard (não exposto via ferramentas MCP) —
Site URL trocado pra URL de produção; adicionadas `https://thiagotatagiba.github.io/
MovimentoLivreDeForro/**` e `http://localhost:8000/**` em Redirect URLs.

**Endurecimento de segurança feito na mesma sessão** (via `get_advisors`, depois
`apply_migration` direto no Supabase): `criar_perfil_no_cadastro()` e
`atualizar_timestamp_perfil()` são funções de gatilho e não deveriam ser chamáveis
via API/RPC por ninguém — o Postgres concede `EXECUTE` a `PUBLIC` por padrão na
criação, o que as deixava invocáveis por `anon`/`authenticated` via
`/rest/v1/rpc/...`. Revogado explicitamente (`REVOKE EXECUTE ... FROM PUBLIC, anon,
authenticated`) — trigger continua funcionando normalmente, só a chamada direta via
API é que fica bloqueada. `atualizar_timestamp_perfil()` também ganhou
`set search_path = public` (mesmo padrão já usado em `criar_perfil_no_cadastro()`).
`sql/perfis.sql` atualizado pra já nascer com esse endurecimento numa configuração
nova (ex: ambiente do colaborador).

**Não corrigido nessa sessão** (fora do escopo do que criamos): função
`public.rls_auto_enable()` tem o mesmo problema de EXECUTE público, mas não foi
criada por nós — origem desconhecida, não mexido sem entender o propósito. Proteção
contra senha vazada (HaveIBeenPwned) está desativada nas configurações de Auth —
recomendação geral do Supabase, não ligada a esse trabalho.

## 2026-09-29 (continuação) — Barra do topo unificada via JS (fim da duplicação)

Thiago pediu que a barra do topo da Home (logo + favoritos + ação da direita)
aparecesse em todas as páginas, sem duplicar código. Levantamento mostrou que
5 páginas (`agenda.html`, `evento.html`, `local.html`, `marca.html`, `sobre.html`)
nem tinham a barra, e as outras 5 que tinham duplicavam o HTML inteiro, cada uma
com pequenas variações no ícone da direita (busca na Home; "voltar" nas demais;
`perfil-editar.html` volta pro perfil, não pra Home).

**Decisão:** `js/barraTopo.js` — fonte única que gera o HTML da barra via
`insertAdjacentHTML`. Cada página passa a ter só uma linha:
`<script src="js/barraTopo.js"></script>`, como primeiro elemento dentro de
`<body>`, mais um atributo opcional pra customizar (`data-busca-topo` na Home;
`data-voltar-topo="perfil.html"` em `perfil-editar.html`; nenhum atributo =
volta pra `index.html`, o padrão).

**Por que não seguiu o padrão do `painelUsuario.js` (import dinâmico via
`pwa.js`, disparado em `DOMContentLoaded`):** `home.js` lê `#botao-busca` de
forma síncrona, no topo do módulo, sem esperar nenhum evento. Scripts
`type="module"` são adiados pelo navegador e só rodam depois que todo o HTML
foi parseado — mas ainda ANTES do evento `DOMContentLoaded` disparar. Se a
barra fosse injetada de forma assíncrona (import dinâmico ou callback de
`DOMContentLoaded`, como `painelUsuario.js` faz), ela nasceria tarde demais:
`home.js` já teria rodado e `#botao-busca` ainda nem existiria no DOM.
Por isso `barraTopo.js` é um script **clássico** (sem `type="module"`),
colocado como primeira linha do `<body>` — roda de forma síncrona, bloqueando
o parser ali mesmo, garantindo que a barra já existe antes de qualquer script
de página (inclusive módulos) executar.

Nenhum CSS novo foi necessário — as classes (`barra-topo`, `barra-topo-icone`,
`barra-topo-marca`) já existiam em `components.css`, só o HTML duplicado foi
removido das 5 páginas que já tinham a barra hardcoded.

## 2026-09-30 — Varredura de duplicação: nav-inferior e menu-lateral centralizados

Thiago pediu uma varredura geral por HTML duplicado desnecessariamente no projeto,
depois da unificação da barra do topo. Achados (comparando hash de cada bloco entre
as 10 páginas):

- **`<nav class="nav-inferior">`**: idêntica em 8 das 10 páginas; Home e Agenda só
  diferiam por um atributo (`aria-current="page"` na aba ativa).
- **`<div class="menu-overlay">` + `<aside class="menu-lateral">` inteiro**:
  byte-a-byte **idêntico nas 10 páginas**, incluindo o `<nav class="menu-lateral-links">`
  — a maior duplicação encontrada.
- **`<head>` (fontes, tokens.css, base.css, components.css, manifest, ícones)**:
  também duplicado, mas isso é aceito de propósito — é a única forma de garantir CSS
  sem flash de conteúdo sem estilo (FOUC), dado que o projeto decidiu não usar build
  tools (`DECISOES_DE_ARQUITETURA.md`, 2026-07-18). Diferente de HTML de corpo (que
  pode nascer via JS sem o usuário notar), CSS carregado tarde demais gera uma piscada
  visível. Não mexido.

**Correção:** as duas duplicações de corpo passaram a ser geradas por
`gerarNavInferior()` e `gerarMenuLateral()`, novas funções em `js/pwa.js` (mesmo
arquivo que já gerava o conteúdo do painel de usuário). Diferente de
`barraTopo.js` (que precisou ser um script síncrono à parte, por causa do
`#botao-busca` lido de forma síncrona por `home.js`), aqui não havia nenhum script
de página lendo `#botao-menu`/`#menu-lateral`/links da nav de forma síncrona —
confirmado via busca em todos os `js/pages/*.js` antes de mexer. Por isso deu pra
simplesmente estender `inicializarPwa()` (que já roda em toda página) em vez de
criar mais um arquivo/script novo — **zero linhas novas em qualquer HTML**, só a
remoção do que já existia.

Resultado: as 10 páginas ficaram sem nenhum HTML de navegação hardcoded — barra do
topo, nav inferior e menu lateral nascem inteiramente de `js/barraTopo.js` e
`js/pwa.js`. Qualquer mudança de navegação futura (novo item de menu, mudar um
ícone) é feita em um lugar só.

## 2026-10-01 — sw.js desativa cache em localhost

Pendência registrada desde 2026-09-28 (o cache-first do Service Worker mascarou
correções de JS/CSS várias vezes durante o desenvolvimento, exigindo limpeza
manual — DevTools → Application → Unregister + Clear site data — repetidas vezes,
inclusive mascarando a ausência da barra do topo em `sobre.html` que acabou
gerando um susto desnecessário).

**Correção:** `EH_LOCALHOST` checa `self.location.hostname` (o endereço de onde o
próprio service worker foi registrado — não precisa de configuração extra). Com
isso verdadeiro: o `install` pula o pré-cache inteiramente, e o `fetch` sempre
busca da rede, sem ler nem escrever no cache. Produção (GitHub Pages) continua
com o comportamento cache-first de sempre, sem nenhuma mudança.

Aproveitado pra completar `ARQUIVOS_ESTATICOS` (lista de pré-cache), que estava
desatualizada desde antes do login/perfil existirem — faltavam `evento.html`,
`marca.html`, `local.html`, `perfil.html`, `perfil-editar.html`,
`js/barraTopo.js`, `css/perfil.css`, `css/perfil-visualizar.css` e
`components/modal-login.css`.

## 2026-10-02 — Visualização de perfil redesenhada (chips, não lista plana)

Thiago pediu mais organização visual na tela de visualização do perfil — até
então era uma lista `<dl>` plana (rótulo em cima, valor embaixo, repetido).

**Decisão:** reaproveitar padrões visuais já existentes no site, em vez de
criar um estilo novo:
- Localização vira uma pílula no estilo do filtro "Grande Vitória" da Home
  (`--cor-pine-claro`, `--raio-pilula`), com o mesmo ícone de pin já usado lá.
- Instagram e WhatsApp viram **chips clicáveis** lado a lado (estilo
  `--sombra-card` + `--raio-campo`, o mesmo tratamento do `.local-mini` usado
  em `evento.html`) — Instagram abre o perfil, WhatsApp abre uma conversa via
  `wa.me` (número formatado como `(DD) 99999-9999` pra exibição, mas o link
  usa só dígitos com prefixo `55`).
- Ícones são SVG de traço simples (mesmo estilo do resto do site), não os
  logos oficiais do Instagram/WhatsApp — evita copiar identidade visual de
  terceiros (mesmo princípio do `CLAUDE.md` sobre não copiar identidade das
  plataformas de inspiração).
- Nascimento/Gênero viram "detalhes" discretos lado a lado, separados por uma
  linha fina — informação que existe mas não precisa de destaque.
- E-mail passou a ser a informação menos destacada da tela (é dado de conta,
  não dado social) — texto pequeno, sem chip.

Esse padrão de chip (ícone + texto + link, cartão com sombra leve) é
reaproveitável no futuro pra qualquer perfil público (Marca, Local, Banda/DJ
quando existirem) — não foi pensado só pra essa tela.

## 2026-10-02 (continuação) — Interações (favoritar/seguir) implementadas

Primeiro item da fila de "Próximos passos" do ROADMAP. Tabela `interacoes` criada
(`sql/interacoes.sql`) — polimórfica, mas com uma constraint que a versão do
`GUIA_SUPABASE_SETUP.md` não tinha: `favorito` só em `evento`, `seguindo` só em
`marca` (reflete o que `services/interacaoService.js`, já escrito antes, já
esperava via `TIPO_POR_ENTIDADE`). Sem policy de `update`: alternar sempre
insere ou remove, nunca edita uma linha — mesma simplicidade de `perfis.sql`.

**Componente compartilhado**: `components/botaoInteracao.js` — liga qualquer
botão (coração em `evento.html`, "Seguir" em `marca.html`) ao
`interacaoService.js`. Se a pessoa não estiver logada, o clique abre o modal
de login em vez de tentar alternar — mesmo padrão de proteção já usado em
outros lugares do app.

**Descoberta de duplicação durante o trabalho**: ao montar `favoritos.html`,
achei `cardEventoHtml` copiada (quase) igual em 4 páginas (`agenda.js`,
`home.js`, `local.js`, `marca.js`), cada uma com pequenas variações (mostrar
marca ou não, mostrar local ou não, badge "Hoje" especial ou não). E
`capitalizar`, copiada em 3 delas. Consolidado em `js/utils/cardEvento.js`
(função pura, com opções: `mostrarMarca`, `mostrarLocal`, `mostrarDiaSemana`,
`badgeHojeEspecial`) e `capitalizar` movida pra `js/utils/format.js`. As 4
páginas e a nova `favoritos.js` usam a mesma função agora.

`favoritos.html` deixou de ser placeholder: duas seções (Eventos favoritados,
Marcas que você segue), cada uma com estado vazio próprio. Resolve pela
`entidade_id` guardada em `interacoes` contra o catálogo JSON via
`eventoService.listarEventosPorIds()` / `marcaService.listarMarcasPorIds()`
(funções novas, mesmo padrão de `buscarMarcaPorId` já existente).
