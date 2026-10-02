# ROADMAP.md

Última atualização: 2026-09-30

Este documento existe pra responder uma pergunta simples: **o que vem depois?**
Prioridade é sempre de cima pra baixo — não pular etapa por parecer mais
interessante (ver `CLAUDE.md`).

---

## ✅ Concluído

- [x] Entidades Marca, Evento, Local — modelagem e relacionamento
- [x] Arquitetura em camadas (`data → repositories → services → páginas`)
- [x] Formulário de cadastro de evento (admin)
- [x] Redesign visual completo — paleta **Terra Acesa**, tipografia Fraunces/Work Sans
- [x] Site público reconstruído: Home, Agenda, Evento, Marca, Local, Sobre
- [x] Padrões de UI adotados do app Vibe (cards, pills, mini-card de localização, nav inferior)
- [x] **Painel administrativo (Cadastro Geral) reconstruído** com os tokens visuais da Terra
      Acesa — três abas (Eventos, Marcas, Locais), formulários em modal com validação,
      geração automática de slug, soft-delete via checkbox "Ativo", e trava do campo Local
      quando a Marca tem `localPadraoId`. Usa File System Access API para ler/escrever os
      JSONs direto do disco.
- [x] **Dados reais em produção**: `marcas.json`, `locais.json`, `eventos.json` já passaram
      por validação de integridade referencial e correção — zero referências quebradas
      confirmadas em todos os eventos.
- [x] **Login com Google + Magic Link (Supabase Auth)** — configurado de ponta a ponta e
      testado com sucesso nos dois ambientes (local e produção). Causa raiz de três bugs
      (foto não subia, dados não persistiam, login quebrava em produção) era o Site URL /
      Redirect URLs do Supabase nunca configurado — corrigido. Ver `DECISOES_DE_ARQUITETURA.md`
      (2026-09-28 e 2026-09-29).
- [x] **Entidade Perfil** completa — tabela `perfis` no Supabase (SQL em `sql/perfis.sql`,
      já executado), com gatilho de auto-criação no primeiro login, upload de foto via
      Supabase Storage, e dividida em duas páginas: `perfil.html` (visualização) e
      `perfil-editar.html` (edição) — Nome, Sobrenome, "Como gostaria de ser chamado"
      (autopreenche do Nome), e-mail somente-leitura, Cidade/Estado/País, Instagram,
      WhatsApp opcional, Data de nascimento, Gênero, Bio opcional.
- [x] **Navegação centralizada, fim da duplicação de HTML**: barra do topo
      (`js/barraTopo.js`), navegação inferior e menu lateral (ambos agora gerados por
      `js/pwa.js`) — nenhuma das 10 páginas do site público tem mais esse HTML
      hardcoded. 5 páginas nem tinham a barra do topo antes disso.
- [x] **Hardening de segurança no Supabase**: funções de gatilho (`criar_perfil_no_cadastro`,
      `atualizar_timestamp_perfil`) tiveram `EXECUTE` revogado de `PUBLIC`/`anon`/`authenticated`
      — eram chamáveis via API sem necessidade, achado pelo linter de segurança do Supabase.

---

## 🔧 Em andamento / pendência imediata

- [ ] **Documentação da pasta `docs/` desatualizada** — o repositório no GitHub está atrasado
      em relação ao projeto local (o próprio `ROADMAP.md` de lá ainda era a versão de 21/08
      até esta revisão). `ARQUITETURA.md`, `README.md` e `GUIA_SUPABASE_SETUP.md` precisam
      de revisão — o guia de setup do Supabase, em especial, não menciona a configuração de
      Site URL/Redirect URLs (causa dos bugs de login) e descreve uma tabela `interacoes`
      que ainda não existe no banco (só existe como arquivo `services/interacaoService.js`,
      não conectado a nada). Revisão em andamento.
- [ ] **Investigar por que o GitHub está atrasado em relação ao projeto local** — confirmar
      se o deploy do GitHub Pages (produção) reflete o código local mais recente.
- [ ] **`sw.js` cacheando localhost durante desenvolvimento** — cache-first do Service Worker
      mascarou correções de JS/CSS várias vezes durante os testes de auth. Considerar
      desativar cache quando `location.hostname === 'localhost'`.
- [ ] **`DECISOES_DE_ARQUITETURA.md` ficou grande (~37 KB)** — considerar arquivar entradas
      mais antigas num arquivo separado, mantendo só as recentes no principal.

---

## 📌 Próximos passos (ordem de prioridade)

1. **Tabela `interacoes` (favoritar evento / seguir marca)**
   Já desenhada em `GUIA_SUPABASE_SETUP.md` e como código em
   `services/interacaoService.js`, mas a tabela nunca foi criada no Supabase. É a
   peça que falta pra `favoritos.html` sair de placeholder — e agora que autenticação
   e Perfil já existem, não tem mais nada bloqueando essa etapa.

2. **Entidade Festival**
   Estrutura oficial: Marca → Festival → Dias do Festival → Eventos Diários.
   Nunca modelar Festival como um Evento único (ver `ARQUITETURA.md`).

3. **Fortalecer entidade Bandas/DJs**
   Hoje `lineup.bandas` e `lineup.djs` são só arrays de string dentro do Evento.
   Vira entidade própria quando precisarmos de perfil de banda/DJ (histórico de
   shows, redes sociais, etc.) — reaproveitar o padrão já usado em Marca.

4. **Integração com Google Agenda**
   Só como importador — a base oficial de dados continua sendo o próprio sistema
   (ver `CLAUDE.md`, seção Integrações Futuras).

5. **Página de detalhe de Local + mapa interativo**
   `local.html` hoje só linka pro Google Maps externo. Levar o mapa pra dentro
   da página é o próximo salto de UX aqui — já temos `latitude`/`longitude` no
   schema do Local.

---

## 💡 Ideias de inspiração registradas (ainda sem fase definida)

Levantadas a partir da análise do site forrozinho.com.br — ver
`IDEIAS_INSPIRACAO_FORROZINHO.md` para o racional completo de cada uma.
Nenhuma delas fura a fila acima; ficam aqui como banco de referência pra quando
a etapa correspondente chegar.

- **Selos curtos no card do evento** (`Grátis` / preço / `Colaborativo` / avisos
  como "pode cancelar com chuva") — candidata a entrar já, junto com qualquer
  revisão do card de Evento, por ser baixo esforço e alto ganho de clareza.
- **Página "Novo no Forró?"** — conteúdo estático de acolhimento pra quem nunca
  foi a um baile. Baixo esforço, encaixa bem como tarefa isolada.
- **Contador de comunidade** (eventos no mês, marcas ativas, etc. no rodapé/home)
  — só faz sentido quando tivermos volume de dados real que justifique mostrar.
- **Modelo de Colaborador regional** — curadoria descentralizada por cidade/região.
  Relevante quando sairmos da Grande Vitória; reforça a ideia de já modelar
  `regiao`/`cidade` como atributo de primeira classe em Local, pra não migrar
  dado depois.
- **Importador de evento via link do Instagram / flyer** — variante do
  importador já previsto em Integrações Futuras; entra na mesma conversa da
  integração com Google Agenda/Sympla/Onticket.
- **Página "Contratar Artistas"** — depende das entidades Banda/DJ existirem
  primeiro (item 3 acima).

---

## 🕒 Adiado deliberadamente (não é esquecimento)

- **Gamificação** (pontos, níveis, check-in, ranking) — vista no app Vibe, decidimos
  não trazer agora. Depende de entidade Usuário + autenticação, é Fase 2/3, não é
  tarefa de CSS. Registrado em `DECISOES_DE_ARQUITETURA.md` (2026-08-20).
- **Entidade Professores** — deprioritizada explicitamente.
- **Evolução do admin pra app desktop Python** — caminho recomendado é Flask
  reaproveitando o JS do admin atual, trocando só a camada de storage.
- **Acervo de Álbuns e Letras de Música, Jogos/quiz** (inspirados no Forrozinho) —
  fogem do objetivo central de agenda + comunidade; ver ressalvas em
  `IDEIAS_INSPIRACAO_FORROZINHO.md`, seção 3.

---

## 🗄️ Caminho de evolução de dados

JSON (agora, pro catálogo) → Supabase (já em uso pra Auth e `perfis` — tudo que é
dado de usuário, não catálogo; `interacoes` é o próximo a entrar).

Pendente à parte, sem prazo definido: adicionar checagem de integridade
referencial ao `eventValidator.js` (hoje só valida campo a campo, não valida
se `marcaId`/`localId` de um Evento realmente existe).

---

## Como usar este documento

Sempre que uma decisão de prioridade mudar, atualizar aqui — não só no
`DECISOES_DE_ARQUITETURA.md`. O `DECISOES` registra *por que* uma decisão foi
tomada; o `ROADMAP` registra *o que fazer agora*. Os dois se complementam.
