# Vai Ter Forró! — Resumo do Projeto

Documento de contexto rápido pra quem está entrando agora. Pra detalhes do
dia a dia e prioridades, ver `ROADMAP.md`. Pra entender as regras do jogo,
ver `CLAUDE.md`, `VISION.md`, `ARQUITETURA.md` e `MODELO_DE_DADOS.md`.

## O que é

Plataforma web pra descobrir eventos de forró pé de serra, começando pela
Grande Vitória (ES), com arquitetura pensada pra crescer pro Brasil todo e
evoluir de "calendário de eventos" pra comunidade digital do forró.

## Stack

Vanilla JS (sem build tools), HTML/CSS puro, servido localmente via Python.
Backend/Auth: Supabase. Deploy: GitHub Pages.

## O que já foi construído

- **Catálogo de eventos**: entidades Marca, Evento e Local, com dados reais
  validados (zero referências quebradas).
- **Painel administrativo** completo (cadastro de Marcas/Eventos/Locais, com
  validação e soft-delete), lendo/escrevendo os JSONs direto do disco.
- **Site público**: Home, Agenda, Evento, Marca, Local, Sobre — redesenhado
  na paleta "Terra Acesa".
- **Login** com Google e Magic Link (Supabase Auth), funcionando de ponta a
  ponta.
- **Perfil de usuário**: tela de visualização (`perfil.html`) e de edição
  (`perfil-editar.html`), com upload de foto, localização, Instagram,
  WhatsApp, data de nascimento, gênero e bio. Primeira funcionalidade da
  fase de comunidade.

## Onde queremos chegar

**Fase 1 — Catálogo (praticamente concluída):** agenda de eventos completa,
navegável, confiável.

**Fase 2 — Comunidade (começando agora):** login e perfil já prontos; próximo
é habilitar favoritar eventos e seguir marcas, e depois abrir espaço pra mais
gente participar (avaliações, seguidores).

**Depois disso:**
- Entidade **Festival** (Marca → Festival → Dias → Eventos Diários — nunca
  como Evento único)
- Bandas e DJs como entidades próprias (hoje são só texto solto no Evento)
- Importador de eventos via Google Agenda
- Mapa interativo na página de Local

A visão de longo prazo é ser a principal comunidade digital do forró pé de
serra no Brasil — conectando participantes, marcas, locais, festivais,
professores, bandas, DJs e organizadores num ecossistema só.

## Como contribuir

Antes de mexer em qualquer coisa, ler `CLAUDE.md` — define prioridades
(UX antes de tudo) e regras (nunca duplicar dado ou componente, sempre
documentar decisão estrutural em `DECISOES_DE_ARQUITETURA.md`).
