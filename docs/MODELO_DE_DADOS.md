# MODELO_DE_DADOS.md

Entidades:

- Marca
- Evento
- Local

> Nota: "Categoria" foi removida do modelo em 03/08/2026 por não ter sido
> implementada e não ter rastro em nenhuma decisão de arquitetura. Se surgir
> necessidade de classificação de eventos (tipo, estilo, público), deve ser
> reintroduzida como campo estruturado (ex: `evento.categoria`) e registrada
> em DECISOES_DE_ARQUITETURA.md antes da implementação.

Relacionamento:

Marca
↓
Evento
↓
Local

Princípios:
- IDs únicos
- Slugs
- Sem duplicação de dados
