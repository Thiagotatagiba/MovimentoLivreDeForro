// Estados de ingresso de um evento — decide o botão de ação principal, a
// badge informativa e o texto de valor exibido, tanto no card quanto na
// página do evento. Único lugar do projeto que sabe interpretar
// evento.ingresso — nenhuma página faz essa lógica por conta própria.
//
// evento.ingresso tem o formato:
//   { tipo: "antecipado" | "gratuito" | "couvert" | "local" | "lista" | "esgotado",
//     precoAPartirDe: number | null, link: string | null, plataforma: string | null }
//
// Por que "precoAPartirDe" e não um preço fixo: ingressos com venda
// antecipada tipicamente sobem de lote com o tempo. Guardar um preço fixo
// deixaria o site errado assim que o lote mudasse — por isso o valor
// exibido é sempre "a partir de", nunca um preço definitivo.
//
// Só "antecipado" está com botão ativo hoje. "esgotado" já funciona sem
// nenhum código especial: com `ativo: false`, o botão nunca aparece, mesmo
// que ainda exista um link — é a mesma regra que os demais estados usam.

import { formatarMoeda } from "./utils.js";

const ESTADOS_INGRESSO = {
  antecipado: { ativo: true, rotulo: "Ingressos", variante: "btn-primary", exigeLink: true },
  gratuito: { ativo: false, rotulo: "Participar", variante: "btn-primary", exigeLink: false }, // futuro
  couvert: { ativo: false, rotulo: null, variante: null, exigeLink: false },
  local: { ativo: false, rotulo: null, variante: null, exigeLink: false },
  lista: { ativo: false, rotulo: null, variante: null, exigeLink: false },
  esgotado: { ativo: false, rotulo: null, variante: null, exigeLink: false },
};

const BADGE_INGRESSO = {
  antecipado: { rotulo: "Ingresso antecipado", modificador: "badge--ticket" },
  gratuito: { rotulo: "Gratuito", modificador: "badge--free" },
  couvert: { rotulo: "Couvert na entrada", modificador: "badge--couvert" },
  local: { rotulo: "Pagamento no local", modificador: "badge--local" },
  lista: { rotulo: "Lista de convidados", modificador: "badge--list" },
  esgotado: { rotulo: "Esgotado", modificador: "badge--esgotado" },
};

/**
 * Botão de ação principal. Retorna { rotulo, url, variante } quando há algo
 * a mostrar, ou null quando deve ser omitido — o layout se reorganiza
 * sozinho porque o elemento simplesmente não é criado, nunca é escondido
 * via CSS.
 */
export function botaoIngresso(evento) {
  const ingresso = evento?.ingresso;
  if (!ingresso) return null;
  const estado = ESTADOS_INGRESSO[ingresso.tipo];
  if (!estado || !estado.ativo) return null;
  if (estado.exigeLink && !ingresso.link) return null;
  return { rotulo: estado.rotulo, url: ingresso.link, variante: estado.variante };
}

/** Badge informativa de acesso — independente do botão estar ativo ou não. */
export function badgeIngresso(evento) {
  const tipo = evento?.ingresso?.tipo;
  return tipo && BADGE_INGRESSO[tipo] ? BADGE_INGRESSO[tipo] : null;
}

export function ehGratuito(evento) {
  return evento?.ingresso?.tipo === "gratuito";
}

/**
 * Texto de valor exibido nos cards e na página do evento — única fonte de
 * verdade, pra nunca ter dois lugares formatando isso de jeitos diferentes.
 */
export function formatarValorIngresso(evento) {
  const ingresso = evento?.ingresso;
  if (!ingresso) return "";
  if (ingresso.tipo === "esgotado") return "Esgotado";
  if (ingresso.tipo === "gratuito") return "Gratuito";

  const badge = BADGE_INGRESSO[ingresso.tipo];
  const precoTxt =
    ingresso.precoAPartirDe != null
      ? ingresso.tipo === "antecipado"
        ? `A partir de ${formatarMoeda(ingresso.precoAPartirDe)}`
        : formatarMoeda(ingresso.precoAPartirDe)
      : null;

  if (ingresso.tipo === "antecipado") return precoTxt ?? badge?.rotulo ?? "";
  // couvert / local / lista: combina preço (quando existe) com o rótulo do tipo,
  // ex. "R$ 20,00 · Couvert na entrada". Sem preço conhecido, só o rótulo.
  if (precoTxt) return badge ? `${precoTxt} · ${badge.rotulo}` : precoTxt;
  return badge?.rotulo ?? "";
}
