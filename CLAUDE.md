# CLAUDE.md

# Vai ter Forró!

Bem-vindo ao projeto **Vai ter Forró!**

Objetivo: construir a maior plataforma brasileira para descoberta de eventos de forró.

## Prioridades
1. Simplicidade
2. Performance
3. Mobile First
4. Dados organizados
5. Código reutilizável

Leia antes de alterar:
- docs/VISION.md
- docs/ARQUITETURA.md
- docs/MODELO_DE_DADOS.md
- docs/DECISOES_DE_ARQUITETURA.md
- docs/GUIA_SUPABASE_SETUP.md (se mexer em login, Perfil ou qualquer dado de usuário)
- ROADMAP.md (pra saber o que fazer agora — fica na raiz, não em docs/)

Nunca duplique componentes ou altere JSON sem justificar.
Sempre documente mudanças importantes em docs/DECISOES_DE_ARQUITETURA.md.

Exemplo do princípio de não duplicar aplicado: a barra do topo, a navegação
inferior e o menu lateral do site público não existem como HTML repetido em
cada página — são gerados por `js/barraTopo.js` e `js/pwa.js`, uma vez só.
Qualquer HTML que se repete de forma idêntica em 3+ páginas é candidato a
virar isso também.
