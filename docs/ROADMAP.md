# ROADMAP.md

Última atualização: 2026-08-21

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

---

## 🔧 Em andamento / pendência imediata

- [ ] **Reconstruir o painel administrativo (Cadastro Geral)** com os novos tokens visuais
      da Terra Acesa — hoje o admin ainda não existe neste ambiente reconstruído.
      Sem isso, não dá pra cadastrar dados reais confortavelmente.
- [ ] Substituir os dados de seed (`data/*.json`) pelos dados reais de Marcas/Locais/Eventos

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
   a Fase 1 (catálogo) da Fase 2 (comunidade).

---

## 🕒 Adiado deliberadamente (não é esquecimento)

- **Gamificação** (pontos, níveis, check-in, ranking) — vista no app Vibe, decidimos
  não trazer agora. Depende de entidade Usuário + autenticação, é Fase 2/3, não é
  tarefa de CSS. Registrado em `DECISOES_DE_ARQUITETURA.md` (2026-08-20).
- **Entidade Professores** — deprioritizada explicitamente.
- **Evolução do admin pra app desktop Python** — caminho recomendado é Flask
  reaproveitando o JS do admin atual, trocando só a camada de storage. Fica pra
  quando o admin voltar a existir neste ambiente.

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
