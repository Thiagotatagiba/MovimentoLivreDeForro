# Movimento Livre de Forró
## Glossário Oficial do Projeto

Este documento define os conceitos oficiais utilizados em todo o sistema.

Seu objetivo é garantir que pessoas e IAs utilizem sempre a mesma linguagem e os mesmos significados.

---

# Marca

A Marca representa a identidade permanente de um baile ou projeto de Forró.

É aquilo que o público reconhece e acompanha ao longo do tempo.

Exemplos:

- Forró Deck 16
- Forró da Nicinha
- Quinta do Forró
- Baile do Seu Zé

Uma Marca pode:

- realizar diversos eventos;
- mudar de endereço;
- mudar de produtores;
- mudar sua identidade visual.

Mesmo assim continua sendo a mesma Marca.

Uma Marca possui, entre outros:

- nome;
- descrição;
- logo;
- banner;
- Instagram;
- WhatsApp;
- frequência;
- data de criação (desde);
- status (ativa/inativa).

---

# Evento

Um Evento representa uma ocorrência específica de uma Marca.

Exemplos:

- Forró Deck 16 — Agosto 2026
- Forró Deck 16 — Especial São João
- Quinta do Forró — Julho 2027

Cada Evento possui:

- data;
- horário;
- local;
- ingresso;
- line-up;
- descrição;
- condições especiais;
- imagens.

Um Evento sempre pertence a uma única Marca.

---

# Local

O Local representa o endereço físico onde um Evento acontece.

Exemplos:

- Cerimonial Espaço Praia
- Casa da Música
- Clube Álvares Cabral

O Local possui:

- nome;
- endereço;
- cidade;
- estado;
- CEP;
- coordenadas geográficas;
- descrição;
- fotos.

Um mesmo Local pode receber diversas Marcas diferentes.

Uma Marca também pode mudar de Local ao longo do tempo.

---

# Festival

Festival é uma entidade diferente de Evento.

Um Festival acontece durante vários dias consecutivos e possui uma programação própria.

Estrutura:

Marca
↓

Festival
↓

Dias do Festival
↓

Eventos Diários

Exemplo:

Marca

FENFIT

↓

Festival

FENFIT 2026

↓

Dias

18/07
19/07
20/07
...

Cada dia possui sua própria programação.

Isso evita repetir informações e permite visualizar toda a programação do Festival.

---

# Evento Diário

Representa um único dia dentro de um Festival.

Possui:

- data;
- horário;
- line-up;
- atividades;
- observações.

É semelhante a um Evento comum, porém pertence a um Festival.

---

# Line-up

Conjunto de atrações de um Evento.

Pode conter:

- Bandas;
- DJs;
- Aulas;
- Workshops;
- Shows;
- Apresentações especiais.

---

# Banda

Grupo musical que se apresenta em Eventos.

No futuro terá página própria contendo:

- história;
- integrantes;
- Instagram;
- Spotify;
- agenda;
- eventos realizados;
- Próximos eventos.

---

# DJ

Responsável pela seleção musical de um Evento.

Também poderá possuir perfil próprio.

---

# Professor

Pessoa responsável por ministrar aulas.

No futuro poderá possuir:

- biografia;
- modalidades;
- agenda;
- contatos;
- avaliações.

---

# Organizador

Pessoa ou equipe responsável pela realização da Marca.

É diferente do professor e da banda.

No futuro poderá possuir acesso administrativo.

---

# Participante

Usuário da plataforma.

Pode:

- favoritar eventos;
- seguir Marcas;
- avaliar eventos;
- avaliar locais;
- participar da comunidade.

---

# Seguidor

Participante que acompanha uma Marca.

Recebe atualizações e novos eventos.

---

# Favorito

Evento salvo pelo usuário para consultar posteriormente.

---

# Avaliação

Opinião registrada por um participante.

No futuro poderá existir para:

- Eventos;
- Marcas;
- Locais;
- Professores;
- Bandas.

---

# Histórico

Todos os Eventos realizados permanecem cadastrados.

Nunca são apagados.

Eles alimentam:

- histórico da Marca;
- histórico do Local;
- histórico do Festival;
- estatísticas futuras.

---

# Agenda

Página responsável por descobrir eventos.

Seu objetivo é responder rapidamente:

> "Onde tem forró hoje?"

É uma ferramenta de descoberta.

---

# Home

Principal porta de entrada do sistema.

Deve apresentar rapidamente:

- eventos em destaque;
- próximos eventos;
- novidades da comunidade;
- acesso à Agenda.

---

# Comunidade

Conjunto de funcionalidades sociais do sistema.

No futuro incluirá:

- perfis;
- seguidores;
- avaliações;
- favoritos;
- comentários;
- notificações.

---

# Painel Administrativo

Área destinada aos organizadores.

Permitirá:

- cadastrar eventos;
- editar eventos;
- gerenciar Marcas;
- gerenciar Festivais;
- acompanhar estatísticas.

---

# Google Agenda

Ferramenta de integração.

Serve para facilitar o cadastro de eventos.

Não representa a base oficial do sistema.

O site sempre será a fonte principal dos dados.

---

# Rede Social

Objetivo de longo prazo do Movimento Livre de Forró.

O calendário é apenas a porta de entrada.

O propósito final é criar um ambiente onde a comunidade possa descobrir eventos, conhecer pessoas, acompanhar Marcas, preservar a memória do Forró e fortalecer toda a cena.

---

# Princípio Fundamental

Sempre que surgir uma dúvida sobre nomenclatura ou modelagem de dados, este documento deve ser consultado antes de criar novos campos, entidades ou funcionalidades.

A regra é simples:

**Se um conceito ainda não existe neste glossário, ele deve ser discutido antes de ser implementado.**