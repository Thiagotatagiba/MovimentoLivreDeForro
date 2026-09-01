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