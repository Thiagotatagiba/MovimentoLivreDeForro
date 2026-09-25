# ROADMAP.md

Última atualização: 2026-09-25

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

---

## 🔧 Em andamento / pendência imediata

- [ ] **Camada de autenticação e interação (Supabase)** — desenhada e parcialmente
      implementada: Magic Link + Google OAuth via Supabase Auth, tabela polimórfica
      `interacoes` (favoritar evento / seguir marca) com constraint no banco, políticas RLS,
      e services seguindo a arquitetura em camadas.
  - [ ] Falta implementar o listener global `onAuthStateChange` em `main.js` pra atualizar a UI
        depois do login — testar o fluxo de login isolado antes.

---

## 📌 Próximos passos (ordem de prioridade)

1. **Entidade Festival**
   Estrutura oficial: Marca → Festival → Dias do Festival → Eventos Diários.
   Nunca modelar Festival como um Evento único (ver `ARQUITETURA.md`).

2. **Fortalecer entidade Bandas/DJs**
   Hoje `lineup.bandas` e `lineup.djs` são só arrays de string dentro do Evento.
   Vira entidade própria quando precisarmos de perfil de banda/DJ (histórico de
   shows, redes sociais, etc.) — reaproveitar o padrão já usado em Marca.

3. **Integração com Google Agenda**
   Só como importador — a base oficial de dados continua sendo o próprio sistema
   (ver `CLAUDE.md`, seção Integrações Futuras).

4. **Página de detalhe de Local + mapa interativo**
   `local.html` hoje só linka pro Google Maps externo. Levar o mapa pra dentro
   da página é o próximo salto de UX aqui — já temos `latitude`/`longitude` no
   schema do Local.

5. **Funcionalidades de comunidade com Supabase**
   Multiusuário, camada social. Depende de autenticação — é o marco que separa
   a Fase 1 (catálogo) da Fase 2 (comunidade). A base de auth já está em andamento
   (ver seção acima); esta etapa é sobre construir as features sociais em cima dela.

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
  primeiro (item 2 acima).

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

JSON (agora) → Google Sheets (só se precisarmos de edição remota antes da hora)
→ Supabase (quando entrarem as funcionalidades de comunidade).

Pendente à parte, sem prazo definido: adicionar checagem de integridade
referencial ao `eventValidator.js` (hoje só valida campo a campo, não valida
se `marcaId`/`localId` de um Evento realmente existe).

---

## Como usar este documento

Sempre que uma decisão de prioridade mudar, atualizar aqui — não só no
`DECISOES_DE_ARQUITETURA.md`. O `DECISOES` registra *por que* uma decisão foi
tomada; o `ROADMAP` registra *o que fazer agora*. Os dois se complementam.