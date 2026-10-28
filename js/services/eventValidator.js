// eventValidator.js
// Checagem de integridade referencial entre entidades. Nunca acessa fetch/DOM —
// recebe as entidades já resolvidas e devolve um veredito.
//
// Regra atual (2026-08-26): uma Marca tem no máximo 1 Local hoje (marca.localPadraoId).
// O Local de um Evento precisa respeitar o(s) Local(is) da sua Marca:
// - Se a Marca tem localPadraoId definido, o Evento.localId TEM que ser igual.
// - Se a Marca ainda não tem localPadraoId (null), qualquer Local ativo é aceito
//   por enquanto — ela ainda não tem um endereço fixo.
//
// 2026-10-28: passou a validar também a existência/atividade do Local. Antes,
// um localId quebrado virava "Local em breve" silencioso na tela.

export function validarLocalDoEvento(evento, marca, local) {
  if (!marca) {
    return { valido: false, motivo: `Evento "${evento.slug ?? evento.id}" referencia uma Marca inexistente (${evento.marcaId}).` };
  }

  // Só checa o Local quando ele foi passado pelo chamador (compatível com o
  // uso antigo de dois argumentos).
  if (arguments.length >= 3 && !local) {
    return {
      valido: false,
      motivo: `Evento "${evento.slug ?? evento.id}" referencia um Local inexistente ou inativo (${evento.localId}).`,
    };
  }

  if (!marca.localPadraoId) {
    // Marca ainda não tem local fixo — qualquer Local ativo vale por enquanto.
    return { valido: true };
  }

  if (evento.localId !== marca.localPadraoId) {
    return {
      valido: false,
      motivo: `Evento "${evento.slug ?? evento.id}" usa o Local ${evento.localId}, mas a Marca "${marca.nome}" `
        + `tem localPadraoId ${marca.localPadraoId}. Corrija o localId do evento ou o localPadraoId da marca.`,
    };
  }

  return { valido: true };
}
