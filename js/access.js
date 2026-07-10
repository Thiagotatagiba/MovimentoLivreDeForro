// Estados de acesso a um evento — decide o que aparece no lugar do botão
// de ação principal na página do evento.
//
// Hoje só "ingresso" está ativo. Os demais existem aqui como contrato pronto:
// quando formos implementá-los, é só trocar `ativo: false` para `true` e
// preencher `rotulo`/`variante` — nenhuma página precisa mudar, porque
// evento.js só chama botaoAcesso(evento) e renderiza o que vier (ou nada).
//
// evento.acesso tem o formato: { tipo: "ingresso" | "gratuito" | "couvert" | "local" | "lista", url: string | null }

const ESTADOS_ACESSO = {
  ingresso: {
    ativo: true,
    rotulo: "Ingressos",
    variante: "btn-primary",
    exigeUrl: true,
  },
  gratuito: {
    // Futuro: botão "Participar" (confirmação de presença simples, sem pagamento).
    ativo: false,
    rotulo: "Participar",
    variante: "btn-primary",
    exigeUrl: false,
  },
  couvert: {
    // Futuro: nota informativa "Couvert cobrado na entrada", sem botão de ação externa.
    ativo: false,
    rotulo: null,
    variante: null,
    exigeUrl: false,
  },
  local: {
    // Futuro: nota informativa "Pagamento no local".
    ativo: false,
    rotulo: null,
    variante: null,
    exigeUrl: false,
  },
  lista: {
    // Futuro: fluxo de lista de convidados (provavelmente um formulário, não um link externo).
    ativo: false,
    rotulo: null,
    variante: null,
    exigeUrl: false,
  },
};

/**
 * Decide o botão de acesso de um evento.
 * Retorna { rotulo, url, variante } quando há algo a mostrar, ou null quando
 * o botão deve ser omitido — nesse caso o layout se reorganiza sozinho porque
 * o elemento simplesmente não é criado no DOM (nunca é escondido via CSS).
 */
export function botaoAcesso(evento) {
  const acesso = evento?.acesso;
  if (!acesso) return null;

  const estado = ESTADOS_ACESSO[acesso.tipo];
  if (!estado || !estado.ativo) return null;
  if (estado.exigeUrl && !acesso.url) return null;

  return { rotulo: estado.rotulo, url: acesso.url, variante: estado.variante };
}
