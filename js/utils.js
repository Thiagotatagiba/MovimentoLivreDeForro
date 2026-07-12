// Utilitários de data e formatação — usados por todas as páginas.
// Trabalham sempre em cima de datas ISO 8601 com offset (ex. "2026-07-09T20:00:00-03:00"),
// o mesmo formato usado por evento.inicio/evento.fim e compatível com o
// campo start.dateTime do Google Calendar.

const DIA_SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const DIA_SEMANA_COMPLETO = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const NOME_MES = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];

export function paraDataHora(iso) {
  return new Date(iso);
}

function meiaNoite(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function hojeLocal() {
  return meiaNoite(new Date());
}

export function diffEmDias(dataA, dataB) {
  const MS_DIA = 1000 * 60 * 60 * 24;
  return Math.round((dataA.getTime() - dataB.getTime()) / MS_DIA);
}

/** Chave "AAAA-MM-DD" no calendário local, usada para agrupar eventos por dia. */
export function chaveDia(iso) {
  const d = paraDataHora(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function rotuloRelativo(iso) {
  const diff = diffEmDias(meiaNoite(paraDataHora(iso)), hojeLocal());
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Amanhã";
  return null;
}

export function formatarDataLonga(iso) {
  const d = paraDataHora(iso);
  const relativo = rotuloRelativo(iso);
  const base = `${DIA_SEMANA[d.getDay()]}, ${d.getDate()} de ${NOME_MES[d.getMonth()]}`;
  return relativo ? `${relativo} · ${capitalize(base)}` : capitalize(base);
}

export function formatarDataCurta(iso) {
  const d = paraDataHora(iso);
  return `${capitalize(DIA_SEMANA[d.getDay()]).slice(0, 3)}, ${d.getDate()} ${NOME_MES[d.getMonth()].slice(0, 3)}`;
}

/** "Sexta-feira, 10 de julho" — usado no banner de destaque do dia na Home. */
export function formatarDataCompleta(iso) {
  const d = paraDataHora(iso);
  return capitalize(`${DIA_SEMANA_COMPLETO[d.getDay()]}, ${d.getDate()} de ${NOME_MES[d.getMonth()]}`);
}

export function formatarHorario(iso) {
  const d = paraDataHora(iso);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Um evento está dentro de uma janela de `dias` a partir de hoje (0 = só hoje, 6 = semana...). */
export function dentroDaJanela(evento, dias) {
  const diff = diffEmDias(meiaNoite(paraDataHora(evento.inicio)), hojeLocal());
  return diff >= 0 && diff <= dias;
}

/** O inverso de dentroDaJanela: evento já aconteceu. Base do futuro histórico de eventos por Marca. */
export function noPassado(evento) {
  return diffEmDias(meiaNoite(paraDataHora(evento.inicio)), hojeLocal()) < 0;
}

export function ehHoje(evento) {
  return diffEmDias(meiaNoite(paraDataHora(evento.inicio)), hojeLocal()) === 0;
}

/** Período do dia do evento — usado no filtro de horário da Agenda. */
export function periodoDoDia(evento) {
  const h = paraDataHora(evento.inicio).getHours();
  if (h >= 5 && h < 12) return "manha";
  if (h >= 12 && h < 18) return "tarde";
  return "noite";
}

export const ROTULO_PERIODO = {
  manha: "Manhã",
  tarde: "Tarde",
  noite: "Noite",
};

export const ROTULO_ENTRADA = {
  gratuito: "Gratuito",
  pago: "Pago",
};

export const ROTULO_FREQUENCIA = {
  semanal: "Toda semana",
  quinzenal: "A cada duas semanas",
  mensal: "Uma vez por mês",
  eventual: "Eventual",
};
