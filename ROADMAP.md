# ROADMAP.md

Última atualização: 2026-10-28

Este documento existe pra responder uma pergunta simples: **o que vem depois?**
Prioridade é sempre de cima pra baixo — não pular etapa por parecer mais
interessante (ver `CLAUDE.md`).

O backlog completo, com tudo que foi auditado e o que ficou pendente, vive em
[`docs/MELHORIAS.md`](docs/MELHORIAS.md). Aqui fica só o que está **em jogo agora**.

---

## ✅ Concluído

- [x] Entidades Marca, Evento, Local — modelagem e relacionamento
- [x] Arquitetura em camadas (`data → repositories → services → páginas`)
- [x] Formulário de cadastro de evento (admin)
- [x] Redesign visual completo — paleta **Terra Acesa**, tipografia Fraunces/Work Sans
- [x] Site público: Home, Agenda, Evento, Marca, Local, Sobre
- [x] Painel administrativo (Cadastro Geral) com os tokens da Terra Acesa
- [x] Dados reais em produção, com integridade referencial validada
- [x] Login com Google + Magic Link (Supabase Auth), nos dois ambientes
- [x] Entidade Perfil completa (Supabase + Storage)
- [x] Navegação centralizada (`js/barraTopo.js`, `js/pwa.js`)
- [x] Hardening de segurança no Supabase (RLS + `revoke execute`)
- [x] Interações (favoritar evento / seguir marca) — tabela `interacoes` criada
      (`sql/interacoes.sql`), `favoritos.html` funcional
- [x] **2026-10-28 — Rodada de melhorias (P0/P1 do MELHORIAS.md):**
      - **Busca funcional** na Home (marca, local e evento, tolerante a acento)
      - **Recorrência semanal — tentada e revertida**: as ocorrências geradas em
        memória foram removidas no mesmo dia (não são confirmadas pela Marca e
        não são editáveis no admin). Hoje a agenda mostra só eventos reais.
      - **Bloco "Hoje"** na Home respondendo "onde tem forró hoje?" — inclusive
        quando não tem baile (mostra o próximo)
      - **Card de evento** com horário, preço e título de 2 linhas
      - **Acessibilidade**: contraste AA nos tokens, alvos de 44px, foco visível
        no campo de busca, `inert` no menu fechado, modal com Esc/foco preso
      - **Carrossel do dia** paginado (contador, setas, swipe, teclado) no lugar
        da barra de progresso sem timer
      - **Service worker**: stale-while-revalidate no estático, network-only em
        cross-origin (Supabase/fontes) e pré-cache dos módulos JS
      - **Navegação**: chevron real de voltar, Favoritos/Privacidade no menu,
        nav de desktop a partir de 900px
      - **SEO**: metatags + Open Graph + canonical em todas as páginas,
        `robots.txt`, `sitemap.xml`
      - **Dados**: WhatsApp normalizado, `plataforma` migrado para
        `tipoEntrada`, imagens em WebP (3,6 MB → ~0,2 MB de capas)
      - **Capa curta com identidade:** Evento 180–280px de altura e Marca/Local
        160–220px, com foto de perfil + nome da Marca sobrepostos (antes o hero
        do evento tinha 791px no desktop)
      - **Página de evento em duas colunas** no desktop (conteúdo + cartão de
        ingresso sticky), cartão antes da descrição no mobile, e "Como chegar"
      - **Operação**: `scripts/validar-dados.js`, `README.md`, `.gitignore`,
        limpeza de `Teste.html`/`old.zip`, página de Privacidade (LGPD)

---

## 🔧 Em andamento / pendência imediata

- [ ] **Validar a rodada no Chrome real** (o levantamento e os ajustes foram
      feitos com render headless + testes de lógica em Node):
      - menu lateral/drawer (foco, `inert`, Esc)
      - login Google e magic link em produção
      - admin gravando JSON (File System Access)
      - instalação do PWA e cache offline
- [ ] **Revisar a contagem social**: a política `select using (true)` de
      `interacoes` permite listar quem favoritou o quê. Decidir entre view
      agregada (só números) ou leitura pública documentada.
- [ ] **Exclusão de conta** (LGPD): a página `privacidade.html` já explica e dá
      canal, mas o fluxo automático (Edge Function) ainda não existe.

---

## 📌 Próximos passos (ordem de prioridade)

1. **Entidade Festival** — Marca → Festival → Dias do Festival → Eventos
   Diários. Nunca modelar Festival como Evento único (ver `ARQUITETURA.md`).
2. **Bandas/DJs como entidade** — hoje `lineup.bandas`/`djs` são arrays de
   string; virar entidade quando houver perfil/histórico.
3. **Prévia de compartilhamento por evento** — Open Graph estático já existe;
   falta HTML pré-renderizado (ou Edge Function) para a prévia mostrar o baile.
4. **Importador de eventos** (Google Agenda, Instagram/flyer, Sympla/Onticket).
5. **Mapa interativo na página de Local** — `latitude`/`longitude` já existem.
6. **Colaborador regional** — exige `regiao`/`cidade` como atributo de primeira
   classe em Local antes de abrir curadoria.

---

## 💡 Ideias registradas (sem fase definida)

Referência: [`docs/MELHORIAS.md`](docs/MELHORIAS.md) (P3) e `docs/IDEIAS.MD`.

- **Página "Novo no Forró?"** — conteúdo de acolhimento pra quem nunca foi.
- **Contador de comunidade** (eventos no mês, marcas ativas).
- **Avaliações de Marca/Local** (estrutura, som, piso, banheiro).
- **Página "Contratar Artistas"** — depende da entidade Banda/DJ.
- **Compartilhar também em Marca e Local** (o componente já é reutilizável).
- **Importador de flyer do Instagram** — variante do importador.

---

## 🕒 Adiado deliberadamente (não é esquecimento)

- **Recorrência automática (ocorrências geradas)** — implementada em
  2026-10-28 e removida no mesmo dia: não é confirmada pela Marca e não é
  editável no admin (o Thiago não a encontrava no JSON). Só volta com
  confirmação explícita por edição (campo no admin) ou importação de flyer.
- **Gamificação** (pontos, níveis, check-in, ranking) — Fase 2/3, não é tarefa
  de CSS. Registrado em `DECISOES_DE_ARQUITETURA.md` (2026-08-20).
- **Entidade Professores** — deprioritizada explicitamente.
- **Evolução do admin pra app desktop Python** — caminho recomendado é Flask
  reaproveitando o JS do admin atual.
- **Álbuns, letras de música e jogos/quiz** — fogem do objetivo central.

---

## 🗄️ Caminho de evolução de dados

JSON (catálogo, hoje) → Supabase (Auth, `perfis` e `interacoes` já lá) →
catálogo no Supabase quando o admin precisar de multiusuário/colaboradores.

O `scripts/validar-dados.js` roda a checagem de integridade referencial que
antes era manual (IDs, slugs, refs, `localPadraoId`, schema do ingresso,
existência dos arquivos de imagem).

---

## Como usar este documento

Sempre que uma decisão de prioridade mudar, atualizar aqui — não só no
`DECISOES_DE_ARQUITETURA.md`. O `DECISOES` registra *por que* uma decisão foi
tomada; o `ROADMAP` registra *o que fazer agora*; o `MELHORIAS` guarda o
backlog completo. Os três se complementam.
