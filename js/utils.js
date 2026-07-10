// Utilitários de data e formatação — usados por todas as páginas.

const DIA_SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** Converte "2026-07-09" (string local, sem fuso) em Date à meia-noite local. */
export function parseDataLocal(isoDate) {
  const [ano, mes, dia] = isoDate.split("-").map(Number);
  return new Date(ano, mes - 1, dia);
}

export function hojeLocal() {
  const agora = new Date();
  return new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
}

export function diffEmDias(dataA, dataB) {
  const MS_DIA = 1000 * 60 * 60 * 24;
  return Math.round((dataA.getTime() - dataB.getTime()) / MS_DIA);
}

export function rotuloRelativo(isoDate) {
  const diff = diffEmDias(parseDataLocal(isoDate), hojeLocal());
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Amanhã";
  return null;
}

export function formatarDataLonga(isoDate) {
  const d = parseDataLocal(isoDate);
  const relativo = rotuloRelativo(isoDate);
  const base = `${DIA_SEMANA[d.getDay()]}, ${d.getDate()} de ${nomeMesLongo(d.getMonth())}`;
  return relativo ? `${relativo} · ${capitalize(base)}` : capitalize(base);
}

export function formatarDataCurta(isoDate) {
  const d = parseDataLocal(isoDate);
  return `${capitalize(DIA_SEMANA[d.getDay()]).slice(0, 3)}, ${d.getDate()} ${MES[d.getMonth()]}`;
}

function nomeMesLongo(indice) {
  const nomes = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  return nomes[indice];
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Filtra eventos dentro de uma janela de dias a partir de hoje. 0 = só hoje, 1 = hoje+amanhã, 6 = semana. */
export function dentroDaJanela(evento, dias) {
  const diff = diffEmDias(parseDataLocal(evento.data), hojeLocal());
  return diff >= 0 && diff <= dias;
}

export function ehHoje(evento) {
  return diffEmDias(parseDataLocal(evento.data), hojeLocal()) === 0;
}

export const ROTULO_TIPO = {
  "Baile": "Baile",
  "Aula": "Aula",
  "Festival": "Festival",
  "Workshop": "Workshop",
};

export const ROTULO_ENTRADA = {
  gratuito: "Gratuito",
  pago: "Pago",
};
