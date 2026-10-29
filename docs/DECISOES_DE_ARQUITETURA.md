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

## 2026-10-02 (continuação) — "Marca" continua Marca no código; "Segue o Baile" é só rótulo

Avaliado o impacto de renomear a entidade Marca pra "Baile" (pedido de Thiago).
Levantamento real: 133 ocorrências de "marca" só no painel admin (52 em
`admin/js/marcas.js`, 43 em `admin/js/eventos.js`, 25 em `admin/index.html`, 12
em `admin/js/main.js`), fora rotas (`marca.html`), nomes de arquivo, funções
(`listarMarcas`, `buscarMarcaPorId` etc.), e o campo `evento.marca` que
atravessa praticamente toda página pública.

Problema conceitual também identificado: "baile", em português coloquial, serve
tanto pra marca quanto pro evento específico — renomear só Marca reintroduz a
ambiguidade que a separação Marca/Evento existe pra evitar.

**Decisão:** não renomear a entidade. Código, banco, rotas e admin continuam
"Marca". Apenas a seção "Marcas que você segue" em `favoritos.html` passou a
se chamar **"Segue o Baile"** na interface — rótulo de produto, não mudança de
modelo. Mantém a linguagem natural do forró sem o custo/risco de um rename
completo.

## 2026-10-04 — evento.html: descrição com quebra de linha, ingresso no topo, "Conheça a Marca" no fim

Thiago comparou nossa página de evento com a do Sympla (fonte original de onde
o texto é colado) e pediu três ajustes:

1. **Descrição sem quebra de linha** — `evento.descricao` tem `\n` reais
   quando colada do Sympla/Instagram, mas HTML colapsa isso por padrão.
   Corrigido com `white-space: pre-line` no parágrafo — sem precisar separar
   em múltiplos `<p>` nem mexer no dado salvo.
2. **Botão de ingresso movido pra logo após "Quando"** — antes só existia no
   fim da página. A seção "Ingresso" (preço + botão) duplicada no fim foi
   removida — um só lugar agora, igual ao padrão do Sympla.
3. **Nova seção "Conheça a Marca" no final** — inspirada no card "Sobre o
   produtor" do Sympla. Mostra nome + descrição da Marca, um botão **Seguir**
   (reaproveita `components/botaoInteracao.js`, mesmo componente de
   `marca.html` — zero lógica nova) e um link "Ver página →". Reforça o
   objetivo do produto de incentivar conhecer novas Marcas, direto no
   momento em que a pessoa está mais engajada (decidindo ir ao evento).

Isso expôs um bug que eu mesmo causei ao corrigir o contraste do botão Seguir
na sessão anterior: o `.botao-seguir.ativo` genérico tinha sido substituído
por uma versão só para dentro de `.perfil-header` (fundo escuro). O novo
card "Conheça a Marca" tem fundo claro — precisa do estilo genérico de volta.
Agora os dois existem: `.botao-seguir.ativo` (fundo claro, preenche pine) e
`.perfil-header .botao-seguir.ativo` (fundo escuro, preenche clay),
coexistindo por especificidade de CSS.

## 2026-10-06 — "Plataforma" virou "Tipo de entrada" (vocabulário fechado)

O campo `ingresso.plataforma` no admin era texto livre (placeholder "Na porta,
Sympla...") e já estava sendo usado informalmente pra indicar tipo de acesso,
não a plataforma de venda em si. Thiago pediu pra formalizar isso como um
vocabulário fechado: Ingresso Online, Ingresso no Local, Cover, Gratuito.

**Mudança:** campo renomeado de `plataforma` pra `tipoEntrada` (nome mais
honesto pro que ele guarda agora), e o input de texto virou `<select>` com as
4 opções — reforça o princípio de "Dados Estruturados" do `CLAUDE.md` (evitar
texto livre quando um vocabulário fechado resolve melhor).

Em `evento.html`, criei `textoIngresso()` pra evitar redundância: quando
`tipoEntrada === 'Gratuito'`, `formatarPreco()` já retorna "Entrada gratuita"
sozinho — não repete "· Gratuito" depois.

**Dados existentes não migrados automaticamente** (os ~7-8 eventos já
cadastrados têm `ingresso.plataforma`, não `ingresso.tipoEntrada` — ficam sem
a tag de tipo até serem reabertos e salvos de novo pelo admin). Decisão
deliberada: a cópia do `data/eventos.json` que uso pra trabalhar está
desatualizada em relação ao projeto real (Thiago cadastra eventos direto no
admin, sem me enviar o JSON atualizado) — reescrever esse arquivo aqui
arriscaria apagar eventos reais que eu não tenho visibilidade. Degrada bem:
sem `tipoEntrada`, a tela só mostra o preço, sem quebrar nada.

## 2026-10-07 — Produção travando ("Carregando Marca...") por cache nunca invalidado

Thiago reportou `marca.html` travado em "Carregando Marca..." pra sempre, em
produção (GitHub Pages) — e um visual estranho de barra do topo/navegação
parecendo duplicada na tela.

**Causa raiz:** o fix de 2026-10-01 (desativar cache em `localhost`) só
resolveu o ambiente de dev. Em produção, o `sw.js` continua cache-first — e
arquivos como `js/pages/marca.js`, `js/services/marcaService.js`,
`components/botaoInteracao.js`, `js/utils/cardEvento.js` **nunca estiveram em
`ARQUIVOS_ESTATICOS`** (a lista de pré-cache): eles são cacheados de forma
"preguiçosa", na primeira vez que alguém os pede, e ficam assim **pra
sempre**, porque o nome do cache (`vai-ter-forro-v1`) nunca mudou desde que
o `sw.js` foi criado. Sem mudar esse nome, o navegador nunca sabe que precisa
descartar o cache velho. Como esses arquivos mudaram bastante nos últimos
dias (interações, consolidação do card de evento), visitantes anteriores
provavelmente estavam com uma mistura incompatível de arquivos novos e
velhos — o tipo de inconsistência que trava uma página no meio do
carregamento sem erro visível óbvio.

**Correção:** `CACHE_NOME` bump de `v1` para `v2`. Com `skipWaiting()` +
`clients.claim()` já em vigor desde antes, isso força o cache antigo a ser
descartado por inteiro (`activate` já limpa qualquer cache com nome diferente
do atual) na próxima visita de cada pessoa.

**Pendência pra decidir depois, não resolvida agora:** esse problema volta a
acontecer a cada novo deploy que mude um arquivo fora de `ARQUIVOS_ESTATICOS`,
a menos que o nome do cache suba de novo manualmente. Duas saídas possíveis:
(1) checklist — sempre bump o `CACHE_NOME` ao fazer deploy de mudança em
JS/CSS; (2) mudar a estratégia de cache de arquivos `.js`/`.css` de
cache-first pra network-first-com-fallback-pra-cache — mais tráfego de rede,
mas nunca mais fica desatualizado sem um bump manual. Thiago não decidiu
ainda qual caminho seguir.

## 2026-10-08 — Imagens da Marca (logo + capa), nome repetido em evento.html, compartilhar

**Nome da Marca repetido em evento.html:** aparecia duas vezes — sobreposto ao
banner (`.marca-nome`) e como link acima do título. Removido o do banner; o
link acima do título é o que fica (é funcional: leva à página da Marca).

**Logo e Capa na Marca:** `marca.logo` já existia no schema (sem campo no admin,
só editável à mão no JSON); agora ganhou campo no formulário, e `marca.capa` é
novo. Mesmo padrão de `evento.imagemUrl`: texto livre, caminho local
(`assets/marcas/...`) ou URL. Opcionais — Marca sem imagem continua igual.
- `marca.html`: capa vira fundo do cabeçalho (gradiente escuro por cima pra
  manter o texto legível), logo circular ao lado do título.
- `evento.html`: mini-logo no link da Marca.
- **Capa como imagem reserva do evento** (`imagemDoEvento()` em `format.js`):
  evento sem arte própria usa a capa da Marca no banner, nos cards e nos
  stories da Home, em vez do fundo liso de cor sólida. Só vale onde o evento
  vem enriquecido com `.marca`. Fácil de reverter se não for desejado (é uma
  função só).

**Compartilhar (evento.html):** `components/compartilhar.js`, reutilizável.
Web Share API no celular (menu nativo: WhatsApp etc.); onde não existe,
copia o link e mostra aviso "Link copiado!". Botão de ícone no banner, ao
lado do coração (`.midia-acoes` + `.botao-midia` substituíram o antigo
`.botao-favoritar` absoluto).

**Limitação conhecida do compartilhar:** o link compartilhado abre certo, mas
a *prévia* (título/imagem que o WhatsApp mostra) será genérica — as páginas
são montadas por JavaScript no navegador, e os robôs que geram prévias não
executam JS. Resolver exige HTML por evento com meta tags Open Graph
(gerado no deploy, ou servido por uma Edge Function do Supabase). Não feito.

`CACHE_NOME` do `sw.js` foi para `v3` (mesma razão do bump de 2026-10-07:
vários arquivos fora do pré-cache mudaram).

## 2026-10-09 — Upload de logo/capa da Marca no admin (em vez de digitar caminho)

Thiago pediu um botão de enviar imagem no lugar dos campos de texto de logo e
capa: o arquivo é copiado pra pasta da marca com o slug no nome, e enviar outra
imagem substitui a anterior.

**Convenção de nomes:** `assets/marcas/{slug}-logo.{ext}` e
`assets/marcas/{slug}-capa.{ext}` — a mesma que já existia
(`forro-deck-16-logo.jpg`), então nada precisou migrar. Formatos aceitos: JPG,
PNG, WebP, GIF, SVG e AVIF (HEIC de iPhone é recusado com aviso claro).

**Gravação em duas fases, só ao clicar em "Salvar marca":** escolher a imagem
apenas mostra uma prévia (fica em memória); cancelar o formulário nunca altera
arquivos. Ao salvar: (1) grava a imagem nova, (2) salva o `marcas.json`,
(3) só então apaga as versões antigas. Assim, se algo falhar no meio, nunca
sobra um JSON apontando pra arquivo que já foi apagado.

**"Substituir" de verdade:** trocar `logo.jpg` por `logo.png` gravaria um
nome diferente e deixaria o `.jpg` órfão — a limpeza do passo (3) apaga
qualquer `{slug}-logo.*` que não seja o novo. Não confunde com a logo de outra
marca nem com arquivos parecidos (ex: `{slug}-logo-antiga.png`).

**Cache:** o caminho salvo no JSON leva `?v=<timestamp>` (mesma técnica da foto
de perfil). O site em produção guarda imagens em cache; sem isso, quem já
visitou continuaria vendo a imagem antiga, pois o nome do arquivo não muda.

**Maiúsculas/minúsculas (Windows × GitHub Pages):** se já existir `x-logo.JPG`
e for enviado um `.jpg`, o Windows manteria o nome antigo em maiúsculas e o
GitHub Pages (que diferencia) não acharia o arquivo. Antes de gravar, o código
remove a variação que difere só na caixa.

**Arquitetura:** `fileAccess.js` continua sendo a única porta pro disco (ganhou
`salvarArquivo`, `listarArquivos`, `removerArquivo`); regras de nome e
substituição em `imagensMarca.js`; widget do campo em `campoImagem.js`;
`marcas.js` só orquestra. Aviso (não bloqueio) quando o arquivo passa de 2 MB:
imagens grandes demais deixam o site lento no celular.

**Validação:** a API de pastas do navegador não roda fora de um navegador real,
então a lógica foi testada contra uma simulação em memória dessa API e a tela
contra o `admin/index.html` real num navegador simulado (jsdom): envio,
substituição com troca de extensão, cancelar, remover, edição sem tocar nas
imagens, outras marcas intactas, caso Windows de maiúsculas/minúsculas, formato
inválido. Falta o teste final no Chrome de verdade.

**Possível próximo passo:** o mesmo botão para `imagemUrl` do Evento
(`assets/eventos/{slug}.{ext}`) — o `campoImagem.js` foi escrito de forma a
poder ser reaproveitado.

## 2026-10-14 — Carteira de ingressos

Ideia de um amigo de Thiago: depois de logar, uma página no Menu onde a pessoa
guarda o print do ingresso (com QR code), marca como usado e vê os passados
arquivados. Fluxo: Menu > Carteira de ingressos > Adicionar (nome do evento com
sugestão da agenda, data, anexo do print) > tocar no ingresso abre a imagem com
Usado/Desfazer e Excluir.

**Privacidade é a decisão central.** O QR code de um ingresso funciona como uma
senha de entrada: quem tiver a imagem consegue usá-lo. Por isso o padrão do
bucket de fotos de perfil (público) NÃO foi reaproveitado. O bucket `ingressos`
é privado (`public = false`), com RLS em tabela e storage: só o dono lê, envia
ou apaga. A imagem só é exibida por link assinado de 10 minutos. Limite de 5 MB
e tipos JPG/PNG/WebP valem no servidor (no bucket), não só no JavaScript.

**Validado no banco antes de aplicar** (transação desfeita no fim, com 2
usuários reais): dono vê/cria/marca usado/desfaz; outro usuário não vê, não
altera, não apaga, não cria em nome de outro nem transfere; visitante sem login
não alcança tabela nem arquivos; título vazio/gigante e imagem fora da pasta do
dono são barrados. O Supabase proíbe apagar arquivo de Storage por SQL, então a
regra de apagar foi conferida pela definição da política (idêntica à de leitura).

**Modelo de dados** (`sql/ingressos.sql`): `evento_id` opcional (NULL = evento
fora da agenda); `titulo` e `data_evento` sempre preenchidos. Quando há
`evento_id`, o catálogo manda na tela (evento remarcado, título corrigido) e a
cópia guardada fica só como reserva — se o evento sair do catálogo, o ingresso
continua inteiro. É duplicação deliberada, só como cópia de segurança.
"Arquivado" não é gravado: é calculado pela data (nunca fica desatualizado).

**Tolerância de madrugada:** o ingresso só é arquivado 6 horas depois da virada
do dia (`TOLERANCIA_MADRUGADA_HORAS`). Baile vai até de madrugada; sem isso, à
1h da manhã o ingresso sumiria da lista justo quando ainda é preciso na porta.
Foge da regra literal "anterior a hoje", de propósito — é uma constante só.

**Ordem das operações (nunca sobra lixo):** ao adicionar, sobe a imagem e só
depois grava a linha; se a linha falha, apaga a imagem. Ao excluir, apaga a
imagem primeiro e a linha depois (se a linha falhar, o ingresso continua
visível e dá pra tentar de novo; o contrário deixaria imagem invisível pra
sempre). Texto digitado pela pessoa é sempre inserido com `textContent`
(`js/utils/dom.js`), nunca como HTML.

**Arquitetura:** mesmo padrão de perfil/interações (service direto no Supabase,
sem Repository). Componentes só cuidam de tela (`modalIngresso.js`,
`detalheIngresso.js`) e recebem as operações por callback, o que os deixa
testáveis sem Supabase. A Carteira só aparece no menu logado
(`painelUsuario.js`); abrir a URL direto sem login mostra o convite de entrar.
Ao sair da conta, os cartões são removidos da tela.

**Fora do escopo desta versão (limitações conhecidas):**
- **Sem internet na porta do evento a imagem não abre.** Para funcionar offline
  é preciso guardar a lista e as imagens no aparelho (IndexedDB) e limpar no
  logout. É o próximo passo mais valioso; hoje o print na galeria do celular é
  a reserva. Atenção: o `activate` do `sw.js` apaga qualquer cache com nome
  diferente do atual, então o cache offline dos ingressos deve usar IndexedDB.
- Só imagens (não PDF — Sympla envia PDF); sem limite de ingressos por pessoa
  (1 GB de Storage no plano grátis; vale um teto, ex.: 50 por pessoa).
- Excluir a conta (ainda não existe) apagaria as linhas por cascata, mas NÃO os
  arquivos do Storage: quando essa função existir, ela precisa apagar a pasta
  `{usuario_id}/` do bucket `ingressos`.
- Tela com brilho máximo / impedir a tela de apagar na porta (Wake Lock).

**Cache:** `CACHE_NOME` do `sw.js` foi para `v4`; `carteira.html` e
`css/carteira.css` entraram no pré-cache.

**Verificação:** 194 verificações automáticas (lógica de datas e fuso, serviço
com falhas injetadas, componentes, página inteira e menu) em navegador e
Supabase simulados. Não testado num navegador/aparelho de verdade nem com a API
real do Supabase Storage (link assinado, remoção): conferir no primeiro uso.

## 2026-10-28 — Rodada de melhorias: busca, recorrência, design e cache

Rodada feita a partir da auditoria em `MELHORIAS.md` (P0/P1). Nada mudou de
schema no Supabase; as decisões de produto estão abaixo.

**Busca (PRD-01).** O campo de busca da Home existia, abria e não buscava nada.
Agora `js/services/buscaService.js` busca em memória (9 marcas, 12 locais, 15
eventos + virtuais), normaliza acento com `normalizar()` e ordena por
relevância (exato → prefixo → contém), limitando a 8. **Por que client-side:**
o catálogo é estático e pequeno; endpoint/índice seria complexidade sem
benefício. A interface só mostra resultados a partir de 2 caracteres e usa
`role="status"` para anunciar a contagem.

**Recorrência semanal (PRD-02).** A maior lacuna de produto: `Marca` guardava
`frequencia`/`diasSemana`, mas a agenda só tinha datas únicas — 3 eventos
futuros, nenhum na semana corrente. `recorrenciaService.js` **materializa em
memória** as próximas ocorrências semanais (até 4 por Marca, 4 semanas),
herdando horário/preço/imagem do evento real mais recente. **Decisão:** não
mudar o schema nem gravar no JSON (o admin continua a fonte de verdade) e não
gerar `mensal` (não há como saber "qual sábado do mês" sem perguntar ao
admin). Evento real sempre tem prioridade: data já cadastrada não é duplicada.
O virtual tem `virtual: true`, `slug: null` e o card aponta para a Marca.
Efeito: 3 → 22 eventos futuros; a Tira de Dias passou a ter badge em 5 dos 7
dias. **Limitação conhecida:** horário/preço herdados podem estar
desatualizados — por isso o card aponta para a Marca, e não para uma página de
detalhe da ocorrência. (Na revisão 3 o selo "Semanal" foi removido do card: ele
podia sugerir recorrência garantida. **A geração inteira foi removida em
seguida — ver continuação 3.**)

**Soft-delete (TEC-03).** Desativar Marca ou Local agora esconde os eventos: o
`eventoService` descarta o evento quando o join não resolve (antes aparecia
como "Marca em breve" para sempre). `obterEventoCompleto` também devolve
`null`.

**Validador (TEC-05).** `validarLocalDoEvento` ganhou o terceiro parâmetro
`local` e passa a acusar Local inexistente/inativo — antes um `localId`
quebrado era silencioso.

**Design e acessibilidade.** Substituímos o card de evento por uma anatomia
com horário, preço (selo) e título de 2 linhas; a imagem virou `<img
loading="lazy" decoding="async">` com `aspect-ratio`, em vez de
`background-image`. Contraste: `--cor-texto-fraco` de `#9C8E76` (2,8:1) para
`#7A6B55` (4,5:1); badge de data passou a clay-forte com branco (5,6:1) e
criamos `--cor-clay-forte` porque o clay puro dava 4,49:1. Alvos de toque
foram para 44px (`--toque-min`), a barra do topo ganhou ícone de download de
calendário? não — ganhou logo, nav desktop e chevron de voltar. O modal de
login passou a fechar com Esc, prender o foco e devolver o foco; o drawer
fechado usa `inert` (antes os links continuavam focáveis). `prefers-reduced-
motion` já existia e continua respeitado.

**Carrossel do dia (UX-09).** A antiga "story" tinha barra de progresso sem
timer, o que prometia auto-advance inexistente. Decisão: **carrossel paginado**
(contador "1 de 3", setas, swipe por Pointer Events e teclado ←/→/Esc), sem
timer — mais simples, acessível e coerente com o resto do site. O foco vai
para o fechar ao abrir e volta ao card de origem ao fechar.

**Service worker (TEC-01/TEC-02).** Resolve a pendência registrada em
2026-10-07. O estático same-origin virou **stale-while-revalidate** (serve
cache e atualiza em background), o que elimina o bump manual de `CACHE_NOME` a
cada deploy; `/data/` continua network-only; **cross-origin passou a ser
network-only** (antes todo GET era cacheado, incluindo chamadas do Supabase
cuja cache key é só a URL — risco de resposta de sessão antiga). O pré-cache
agora inclui os módulos JS (pages/services/utils/components), então o app
instalado abre offline. `CACHE_NOME` foi para `v4` uma última vez.

**Navegação (UX-10).** O ícone de "voltar" era uma casa (parecia início) e
levava a uma URL fixa; virou chevron com `history.back()` quando o referrer é
do site, com fallback pro `data-voltar-topo`. Favoritos e Privacidade entraram
no drawer; a partir de 900px a nav inferior some e a barra do topo ganha links
(Início/Agenda/Favoritos/Perfil) e container de 960px. **Por que só isso de
desktop:** o produto é mobile-first; um redesign desktop completo não é
prioridade, mas a coluna de 640px com bottom nav era um artefato visível.

**SEO (SEO-01/02/03).** Metatags, Open Graph, Twitter e canonical em todas as
páginas públicas; `robots.txt` com `Disallow: /admin/`; `sitemap.xml` gerado a
partir dos JSONs (40 URLs); `noindex` no admin. **Limitação mantida:** páginas
de evento/marca/local são montadas por JS — robôs de prévia não veem o
conteúdo. `utils/meta.js` atualiza as tags quando há JS, mas a prévia correta
no WhatsApp continua exigindo pré-render (registrado no ROADMAP).

**LGPD (SEC-01).** Criada `privacidade.html` (o que coletamos, onde fica, como
pedir exclusão) e link no drawer. **Pendente:** exclusão automática de conta
(Edge Function) — hoje é pedido por contato, com prazo de 30 dias declarado.

**Dados (DAT-01/TEC-10).** WhatsApp de `mrc-008` normalizado para `wa.me`
(estava como telefone cru e virava link relativo quebrado); `mrc-002` corrigido
para 13 dígitos. Os 6 eventos com `ingresso.plataforma` foram migrados para
`tipoEntrada` (mapa: "Na porta" → "Ingresso no Local"). Imagens de Marca
convertidas para WebP (a capa do Forró do Canto tinha 1,19 MB e era
byte-idêntica à logo: 68 KB + 15 KB agora); `logo-64.png` novo para a barra.

**Operação e documentação.** `scripts/validar-dados.js` (sem dependências):
JSON válido, IDs/slugs únicos, refs, `localPadraoId`, schema do ingresso,
formato de links e existência dos arquivos de imagem — usado nesta rodada.
Criados `README.md` na raiz, `.gitignore`, `robots.txt`, `sitemap.xml`; removidos
`Teste.html` e `old.zip`. `MELHORIAS.md` virou o backlog oficial; ROADMAP,
GUIA_SUPABASE, ARQUITETURA, MODELO_DE_DADOS e README de docs foram atualizados.

**O que ficou de fora de propósito:** contagem social ("X pessoas vão") e
revisão da policy pública de `interacoes`; exclusão de conta automática; prévia
OG pré-renderizada; lint/CI; Festival, Bandas/DJs, importadores e mapa (P3).

## 2026-10-28 (continuação 2) — Capa curta e página de evento em duas colunas

Feedback depois do teste no navegador: *"a capa da marca ou evento ficaram
enormes quando acessadas do computador, a ideia é ficar pequena a altura; na
capa tem que ter a foto de perfil da Marca e a marca a que pertence; a página
de evento é a que mais precisa ser melhorada."*

**Causa:** a página de evento usava `aspect-ratio: 16/10` em largura total —
**791px de altura no desktop** (medido). Marca e Local usavam a capa como fundo
de um cabeçalho de 261px, com a identidade da Marca *abaixo* da imagem.

**Decisões:**
- **Capa do evento:** altura `clamp(180px, 24vw, 280px)`; foto de perfil da
  Marca (ou inicial, quando não há logo) + rótulo "Marca" + nome sobrepostos,
  e as ações (compartilhar/favoritar) no canto direito.
- **Capa de Marca/Local:** `clamp(160px, 20vw, 220px)`, mesma identidade
  sobreposta à esquerda. Descrição, tags e ações desceram para uma faixa clara
  (`.perfil-resumo`) — a capa deixou de ser um cabeçalho alto.
- **Página de evento em duas colunas** a partir de 900px: conteúdo à esquerda e
  cartão de ingresso `sticky` à direita. No celular o cartão vem **antes** da
  descrição (`order: -1`), porque é a informação de decisão.
- **Hierarquia do topo:** data/hora em eyebrow → título → selos de preço e tipo
  de entrada. O cartão repete data/hora, local e preço com o CTA.
- **"Como chegar"** na seção de localização (usa `mapsLink` ou lat/long).
- **Atalho "Ver local" no cartão de ingresso:** quem não conhece o espaço abre a
  rota no Google Maps direto do cartão, sem passar pela página do Local. O
  destino é `linkRota()` — coordenadas quando existem, endereço completo como
  fallback e, por último, o `mapsLink`. O link "Ver Local" (perfil completo)
  continua na seção de Localização, e a página do Local ganhou "Como chegar"
  como ação primária + "Ver no mapa".
- **Véu único:** `estiloMidia`/`estiloCapa` passaram a devolver só a imagem; o
  gradiente de legibilidade é um `::after` no CSS. Antes o gradiente entrava
  duas vezes (helper + CSS) e a capa ficava escura demais.
- **Botões de ação inline:** Seguir/Compartilhar/Ver rota/Ligar não ocupam mais
  a linha inteira (eram dois botões gigantes empilhados em Marca/Local).
- **Card de evento (revisão 3):** o selo sobre a foto passou a mostrar a
  **data** (ou "Hoje"); o **preço** desceu para a linha de informação, sempre
  como "A partir de R$ X" (o campo é mínimo, não preço fechado). O selo
  **"Semanal" foi removido** — podia sugerir recorrência garantida. A **foto de
  perfil da Marca** agora aparece antes do nome sobre a capa (com inicial como
  fallback quando não há logo).
- **Evento gratuito sem link:** o cartão mostra apenas "Entrada gratuita" (sem
  aviso de venda) e o topo tem um selo só ("Grátis"), sem duplicar "Gratuito".
  Evento com ingresso no local mostra "Ingresso vendido na portaria." Se o link
  de ingresso for do WhatsApp (`wa.me`), o botão diz "Garantir ingresso no
  WhatsApp".

**Arquivos:** `css/components.css` (blocos "Capa do evento" e "Capa de
Marca/Local"), `js/pages/evento.js`, `js/pages/marca.js`, `js/pages/local.js`,
`js/utils/format.js`.

**Verificação:** alturas medidas em Chrome headless — evento 280px (desktop) /
180px (mobile); Marca e Local 220px / 160px. Botões de ação medindo 92–176px
(inline) em vez de ~100% da largura.

## 2026-10-28 (continuação 3) — Ocorrências semanais geradas foram removidas

Depois de ver o site, o Thiago pediu: *"esses eventos testes que você criou, que
tá escrito 'Toda Quinta', pode excluir — não encontrei ele no código para
remover."*

**Por que não achava:** as ocorrências não existiam no JSON. Eram geradas em
memória por `js/services/recorrenciaService.js` a partir de
`Marca.frequencia`/`diasSemana`, com `virtual: true`, `slug: null` e título
"Toda quinta". Nada era gravado no disco, então não havia linha para editar ou
apagar.

**Decisão:** remover a geração e o arquivo. A agenda volta a listar **somente
eventos reais**. Motivos:
1. a ocorrência não é confirmada pela Marca — podia prometer baile que não
   acontece (mesmo risco que o selo "Semanal" já tinha);
2. não é editável/excluível no admin, o que gera confusão legítima;
3. o volume artificial (19 virtuais) distorcia a leitura da agenda.

**Consequência:** agenda mais honesta, mas volta a esvaziar entre edições (hoje
são 5 eventos futuros reais). Se a recorrência voltar, tem que ser com
confirmação explícita por edição (campo no admin, ex. "confirmar próximas
datas") ou importação de flyer — nunca por inferência de `frequencia`.

**Arquivos:** removido `js/services/recorrenciaService.js`; limpeza em
`eventoService.js`, `marcaService.js`, `localService.js`,
`js/utils/cardEvento.js`, `js/pages/home.js`, `js/pages/marca.js`, `sw.js`;
docs atualizados (ARQUITETURA, MODELO_DE_DADOS, ROADMAP, MELHORIAS,
RESUMO_PROJETO, README).

## 2026-10-28 (continuação 4) — Setas da Tira de Dias passaram a flutuar

As duas setas ficavam no fluxo do flex e consumiam ~90px (44px cada + gaps),
deixando só ~4 dias visíveis no celular. Agora são `position: absolute` sobre
as bordas da Tira (36px visíveis, com área de toque de 44px via `::after`) e
cada uma só aparece quando há conteúdo para aquele lado:

- no início, só a seta direita aparece;
- no fim, só a esquerda;
- se os 7 dias couberem na largura (≥ ~500px de área útil), **nenhuma** seta
  aparece — no desktop a Tira já mostra a semana inteira.

O antigo botão "Ver mais" que virava pill no fim foi removido; a página já tem
o botão "Ver agenda completa" logo abaixo.

**Arquivos:** `index.html`, `js/pages/home.js`, `css/components.css`.

## 2026-10-29 — Lightbox da capa + prévia de compartilhamento com a arte

Pedido do Thiago: clicar no banner do evento deve abrir a imagem completa; e o
compartilhamento mostrava o ícone do site, não a arte do evento.

**Lightbox da capa.** A capa ganhou um botão de ampliar (ícone de expandir) e a
área livre da capa também abre. O overlay mostra a imagem inteira
(`object-fit: contain`), fecha com Esc, botão e clique fora, prende o foco no
fechar e devolve ao elemento de origem, com o scroll do body travado. Só existe
quando o evento tem imagem (própria ou capa da Marca).

**Compartilhamento — por que precisou de página estática.** WhatsApp, Facebook
e Telegram **não executam JavaScript**. `evento.html?slug=` é uma única página
estática para todos os eventos; as metatags que `utils/meta.js` atualiza depois
do render nunca são lidas pelos robôs — por isso a prévia caía no ícone padrão.
A solução foi gerar, para cada evento ativo, `compartilhar/{slug}.html` com
`og:title`, `og:description` e `og:image` daquele evento, `canonical` para a
página real e redirect (meta refresh + JS). O botão de compartilhar usa essa
URL **quando ela existe** (HEAD na carga da página; se não existir, mantém o
link normal, sem 404). No celular, quando suportado, o Web Share também envia a
**própria imagem** como arquivo (`files`), então o banner aparece no WhatsApp
mesmo antes do crawler.

**Fallbacks:** evento sem banner usa a capa da Marca; sem nenhuma das duas, usa
o ícone do site (comportamento anterior). Páginas de compartilhamento têm
`noindex` e `canonical`, para não competir com a página real na busca.

**Operação:** `scripts/gerar-compartilhamento.js` precisa rodar quando
`data/*.json` mudar (antes do deploy). `scripts/validar-dados.js` avisa quando
falta página para algum evento ativo. Eventos novos, enquanto a página não for
gerada, compartilham o link normal (prévia genérica) — nunca um 404.

**Limitação conhecida:** se a pessoa copiar o endereço da página do evento e
colar no WhatsApp (em vez de usar o botão), a prévia continua genérica, porque
o endereço é o `evento.html?slug=`. Para resolver isso seria preciso mudar o
esquema de URLs para páginas estáticas por evento (ou Edge Function), o que não
foi feito agora.

**Arquivos:** `js/pages/evento.js`, `components/compartilhar.js`,
`css/components.css`, `scripts/gerar-compartilhamento.js`,
`compartilhar/*.html` (gerados), `scripts/validar-dados.js` e docs.

