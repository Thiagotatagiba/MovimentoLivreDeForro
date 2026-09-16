# data/eventos.teste.json

Massa de dados só pra teste manual — **não é usada pelo site automaticamente**.
O `eventoRepository.js` sempre lê `data/eventos.json` (fixo no código), então esse
arquivo fica parado até você decidir usá-lo.

## Como testar com ele

1. Renomeie ou faça backup do `data/eventos.json` atual (ex: `eventos.real.json`)
2. Renomeie `eventos.teste.json` para `eventos.json`
3. Suba o servidor local e navegue
4. Quando terminar, desfaça a troca (volte o `eventos.real.json` pro lugar)

Datas geradas relativamente ao dia em que o arquivo foi criado (2026-09-06) — se
for testar bem depois dessa data, os casos que dependem da Tira de Dias (dias 0 a
6) podem já ter "saído da janela". Os títulos com prefixo `[TESTE]` deixam claro
que não é dado real, então não tem risco de misturar com o catálogo de verdade.

## O que cada caso de teste cobre

| Evento | O que testa |
|---|---|
| Evento de hoje, sem lineup | Seção "Line-up" deve **sumir** da página do evento quando bandas e DJs estão vazios |
| Amanhã, lineup misto | Bandas e DJs aparecendo juntos, ingresso pago (R$ 100) |
| "Local proposital errado" | **Erro intencional**: `localId` não bate com o `localPadraoId` da Marca — deve aparecer aviso no console do navegador (`eventValidator.js`) |
| 3 eventos no mesmo dia (×3) | Story viewer avançando por 3 slides e fechando sozinho no fim |
| 12 eventos no mesmo dia (×12) | Badge da Tira de Dias truncando pra "9+" |
| Último dia da Tira (dia 7) | Evento aparecendo certinho no card que fica ao lado do controle "Ver mais" |
| Fora da Tira de Dias (+25 dias) | Evento aparece na Agenda completa, mas **não** deve aparecer em nenhum card da Tira de Dias da Home |

Todos os `marcaId`/`localId` usados são reais (as 5 Marcas e os Locais atuais) —
só os eventos em si são fictícios, pra não precisar inventar Marca/Local também.
