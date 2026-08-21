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
- Dados são seed de exemplo (`data/*.json`) — substituir pelos dados reais das Marcas/
  Locais/Eventos existentes.
- Filtro de categoria na Agenda é derivado de `marca.categorias`; ainda não há entidade
  Categoria formal (ver MODELO_DE_DADOS.md — fica como próximo passo se o volume de
  categorias crescer).
