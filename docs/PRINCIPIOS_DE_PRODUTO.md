# Movimento Livre de Forró
## Princípios de Produto

Este documento descreve os princípios que devem orientar todas as decisões do projeto.

Eles têm prioridade maior do que qualquer decisão estética.

---

# 1. O usuário vem antes da tecnologia

Nunca escolher uma solução apenas porque ela é mais moderna.

A solução deve ser a mais simples para quem usa.

---

# 2. Resposta rápida

O usuário deve descobrir um evento em poucos segundos.

A navegação deve exigir o menor número possível de cliques.

---

# 3. Nunca duplicar informações

Cada informação possui um único lugar.

Exemplos:

Marca possui Instagram.

Evento não copia Instagram.

Local possui endereço.

Evento apenas referencia o Local.

---

# 4. Dados normalizados

Sempre utilizar entidades separadas.

Marca.

Local.

Evento.

Festival.

Professor.

Banda.

DJ.

Nunca misturar conceitos.

---

# 5. Componentes reutilizáveis

Nunca criar dois componentes que fazem a mesma função.

Todo card deve nascer pensando em reutilização.

---

# 6. Arquitetura preparada para crescer

Toda implementação deve permitir evolução futura.

Mesmo quando o recurso ainda não existe.

Exemplo:

Campos de avaliações não devem existir antes do sistema de avaliações.

Mas a arquitetura deve permitir adicioná-los sem reescrever tudo.

---

# 7. Sem links mortos

Nenhum botão deve apontar para páginas inexistentes.

Se uma funcionalidade ainda não existe, ela simplesmente não aparece.

---

# 8. Dados reais

Nunca utilizar informações fictícias em produção.

Sempre que possível utilizar:

- eventos reais
- imagens reais
- locais reais

---

# 9. Performance importa

A maioria dos usuários utilizará celular.

As páginas devem carregar rapidamente.

Imagens devem ser otimizadas.

Lazy Loading sempre que possível.

---

# 10. Mobile First

A experiência principal acontece no celular.

Desktop é importante, mas secundário.

---

# 11. A comunidade é mais importante que o calendário

O calendário é apenas o começo.

O verdadeiro objetivo é fortalecer a comunidade.

Toda funcionalidade futura deve aproximar pessoas.

---

# 12. O histórico nunca é descartado

Eventos passados continuam importantes.

Eles alimentam:

- histórico da Marca
- histórico do Local
- histórico do Festival
- estatísticas
- memória da comunidade

---

# 13. O Google Agenda é uma ferramenta, não o sistema

O Google Agenda poderá alimentar os eventos.

Mas o site é o sistema principal.

A arquitetura nunca deve depender exclusivamente do Google.

---

# 14. Festivais são entidades próprias

Festival não é Evento.

Festival é composto por vários dias.

Exemplo:

Marca
↓

Festival

↓

Dias do Festival

↓

Eventos diários

Essa estrutura evita duplicação e permite programação completa.

---

# 15. Sempre pensar no futuro

Antes de implementar qualquer funcionalidade perguntar:

"Isso continua funcionando quando existirem 10.000 eventos?"

Se a resposta for não, a arquitetura deve ser revista.

---

# Nossa filosofia

Não estamos construindo apenas um calendário.

Estamos construindo a principal plataforma digital do Forró Pé de Serra.