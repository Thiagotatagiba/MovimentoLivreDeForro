# Modelo de Dados — Evento

Este documento existe para uma finalidade específica: no dia em que
implementarmos sincronização com o Google Calendar (ou qualquer outra fonte
externa), quem for fazer esse trabalho precisa saber exatamente para onde
cada campo da API externa deve ir no nosso modelo — sem precisar reler todo
o código primeiro.

**Nada disso está implementado ainda.** `origem` é sempre `"manual"` hoje.
Isso é só a planta do que vai ser construído.

## Schema atual (`data/eventos.json`)

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
  "localSlug": "forro-do-nicinha",       // referência a data/locais.json
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
| `tipo`, `cidade`, `entrada`, `preco`, `acesso`, `instagram`, `whatsapp` | — | Sem equivalente direto na API. Também viriam de `extendedProperties.private`, que aceita pares chave/valor arbitrários — é o mecanismo natural do Calendar para "esticar" o schema com dados nossos. |

## Decisão de arquitetura

Quando a sincronização for implementada, ela vive inteiramente dentro de um
novo repositório (`js/repositories/googleCalendarEventosRepository.js`) que
converte o formato da API para este schema e devolve exatamente o mesmo
formato de array que `eventosRepository.listar()` devolve hoje.
`eventosService.js` e todas as páginas continuam iguais — o esforço de
sincronização fica isolado numa única camada, que é justamente o motivo de
essa camada existir.
