# Modelo de Dados

Este documento existe para uma finalidade específica: no dia em que
implementarmos sincronização com o Google Calendar (ou qualquer outra fonte
externa), quem for fazer esse trabalho precisa saber exatamente para onde
cada campo da API externa deve ir no nosso modelo — sem precisar reler todo
o código primeiro. Também documenta o relacionamento entre as três entidades
centrais do projeto: **Local**, **Marca** e **Evento**.

**Nada da sincronização externa está implementado ainda.** `origem` é sempre
`"manual"` hoje. Isso é só a planta do que vai ser construído.

## As três entidades e por que elas são separadas

Um baile como "Deck 16" não é a mesma coisa que "Deck 16 — Edição de Agosto"
nem que o clube onde ele acontece. São três conceitos com ciclos de vida
diferentes:

- **Local** — um endereço físico. Existe independente de quem promove
  eventos ali. Um clube pode receber vários bailes diferentes ao longo do
  tempo.
- **Marca** — a identidade recorrente de um baile ou projeto (ex. "Forró da
  Nicinha", "Quintal Pé de Serra"). É **permanente**: tem Instagram, WhatsApp,
  história, e continua existindo entre uma edição e outra.
- **Evento** — uma ocorrência específica, com data e hora. É **temporário**:
  acontece uma vez (ou se repete, mas cada edição é um registro próprio).

```
Local (endereço físico, permanente)
Marca (identidade do baile, permanente) ──┐
                                            ├──> Evento (ocorrência, temporário)
Local ─────────────────────────────────────┘
```

Um Evento referencia uma Marca (`marcaSlug`) e um Local (`localSlug`)
diretamente — não por herança. Isso importa na prática: a banda de uma turnê
pode tocar num local diferente do local principal da Marca sem que o modelo
precise de nenhum caso especial, e a Marca continua existindo mesmo em uma
semana sem nenhum evento agendado.

## Schema atual

### Marca (`data/marcas.json`)

```jsonc
{
  "id": "marca-forro-do-nicinha",
  "slug": "forro-do-nicinha",           // usado como marcaSlug nos eventos e, futuramente, na URL da página da marca
  "nome": "Forró da Nicinha",
  "descricao": "...",
  "cidade": "Vitória",
  "localPrincipalSlug": "espaco-triangulo", // onde o baile costuma acontecer — cada evento pode ter um localSlug diferente se precisar
  "instagram": "https://instagram.com/...",
  "whatsapp": "https://wa.me/...",
  "logo": null,                          // preparado para a futura página da marca
  "banner": null,
  "origem": "manual",
  "status": "publicado",                 // publicado | rascunho
  "atualizadoEm": "2026-07-01T10:00:00-03:00"
}
```

### Local (`data/locais.json`)

```jsonc
{
  "id": "loc-espaco-triangulo",
  "slug": "espaco-triangulo",
  "nome": "Espaço Triângulo das Bicicletas",
  "cidade": "Vitória",
  "endereco": "...",
  "latitude": -20.3181,
  "longitude": -40.3378
}
```

### Evento (`data/eventos.json`)

```jsonc
{
  "id": "evt-forro-de-quinta-nicinha",   // estável, não muda mesmo se o slug mudar
  "slug": "forro-de-quinta-nicinha",     // usado na URL (evento.html?slug=...)
  "titulo": "Forró de Quinta na Nicinha",
  "descricao": "...",
  "inicio": "2026-07-09T20:00:00-03:00", // ISO 8601 com offset
  "fim": "2026-07-09T23:30:00-03:00",
  "fusoHorario": "America/Sao_Paulo",
  "cidade": "Vitória",
  "marcaSlug": "forro-do-nicinha",       // referência a data/marcas.json — a identidade do baile
  "localSlug": "espaco-triangulo",       // referência a data/locais.json — o endereço físico desta ocorrência
  "enderecoTexto": null,                 // fallback quando não há localSlug (ex. evento importado sem local cadastrado)
  "tipo": "Baile",                       // Baile | Aula | Festival | Workshop
  "entrada": "pago",                     // pago | gratuito — informativo, não decide o botão
  "preco": "R$ 20",
  "musica": "Música ao vivo",            // Música ao vivo | DJ
  "acesso": { "tipo": "ingresso", "url": "https://..." }, // decide o botão de ação — ver js/access.js
  "instagram": "https://instagram.com/...",
  "whatsapp": "https://wa.me/...",
  "imagem": null,                        // URL de imagem; card e hero já sabem renderizar quando existir
  "origem": "manual",                    // manual | google_calendar (futuro)
  "idExterno": null,                     // id do evento na fonte externa, quando origem !== "manual"
  "linkExterno": null,                   // link para a página/evento original na fonte externa
  "coordenadas": { "latitude": null, "longitude": null }, // usado quando não há localSlug com coordenadas próprias
  "status": "publicado",                 // publicado | rascunho | cancelado
  "atualizadoEm": "2026-07-01T10:00:00-03:00"
}
```

## Mapeamento para a API do Google Calendar (`events` resource)

| Campo nosso | Campo do Google Calendar | Observação |
|---|---|---|
| `id` | `id` | O Calendar já tem um id próprio; guardamos em `idExterno`, mantendo nosso `id` interno estável mesmo se reimportarmos. |
| `titulo` | `summary` | — |
| `descricao` | `description` | — |
| `inicio` | `start.dateTime` | Já usamos o mesmo formato ISO 8601 com offset. |
| `fim` | `end.dateTime` | — |
| `fusoHorario` | `start.timeZone` / `end.timeZone` | — |
| `enderecoTexto` (fallback) | `location` | Quando o evento vier só do Calendar, sem `localSlug` casado, o texto bruto de `location` cai aqui. |
| `coordenadas` | — | O Calendar não retorna coordenadas nativamente; ficaria a cargo de geocodificar `location` no momento da importação. |
| `linkExterno` | `htmlLink` | Link para abrir o evento original no Google Calendar. |
| `idExterno` | `id` (do evento no Calendar) | — |
| `origem` | — | Setado como `"google_calendar"` pelo importador, não vem da API. |
| `imagem` | — | O Calendar não tem campo de imagem nativo; viria de `extendedProperties.private` ou de um campo próprio definido por nós na hora de cadastrar o evento no Calendar. |
| `marcaSlug` | — | Sem equivalente na API. Um evento importado sem marca reconhecida cai num estado "sem marca" a ser tratado na hora da importação (fora de escopo agora). |
| `tipo`, `cidade`, `entrada`, `preco`, `acesso`, `instagram`, `whatsapp` | — | Sem equivalente direto na API. Viriam de `extendedProperties.private`, que aceita pares chave/valor arbitrários — é o mecanismo natural do Calendar para "esticar" o schema com dados nossos. |

## Decisão de arquitetura

Quando a sincronização for implementada, ela vive inteiramente dentro de um
novo repositório (`js/repositories/googleCalendarEventosRepository.js`) que
converte o formato da API para este schema e devolve exatamente o mesmo
formato de array que `eventosRepository.listar()` devolve hoje.
`eventosService.js` e todas as páginas continuam iguais — o esforço de
sincronização fica isolado numa única camada, que é justamente o motivo de
essa camada existir. O mesmo vale para `marcasRepository.js` e
`locaisRepository.js` — cada entidade tem seu próprio par
repositório/serviço, podendo migrar de fonte de dados de forma independente.

