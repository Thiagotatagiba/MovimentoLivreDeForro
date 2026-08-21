// format.js
// Funções puras de formatação. Nunca acessam repositório nem DOM.

const DIAS_SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export function paraData(isoString) {
  // eventos.json guarda "2026-08-21" (sem hora) — construir em horário local evita
  // o bug clássico de virar o dia anterior por causa de fuso UTC.
  const [ano, mes, dia] = isoString.split('-').map(Number);
  return new Date(ano, mes - 1, dia);
}

export function formatarDataCurta(isoString) {
  const data = paraData(isoString);
  return `${String(data.getDate()).padStart(2, '0')} ${MESES[data.getMonth()]}`;
}

export function formatarDiaSemana(isoString) {
  const data = paraData(isoString);
  return DIAS_SEMANA[data.getDay()];
}

export function formatarDataCompleta(isoString) {
  const data = paraData(isoString);
  const diaSemana = DIAS_SEMANA[data.getDay()];
  return `${diaSemana}, ${data.getDate()} de ${nomeMesCompleto(data.getMonth())}`;
}

function nomeMesCompleto(indice) {
  const nomes = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho',
    'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  return nomes[indice];
}

export function ehHoje(isoString) {
  const hoje = new Date();
  const data = paraData(isoString);
  return hoje.toDateString() === data.toDateString();
}

export function formatarPreco(precoAPartirDe) {
  if (precoAPartirDe === 0) return 'Entrada gratuita';
  if (precoAPartirDe == null) return 'Valor em breve';
  return `A partir de R$ ${precoAPartirDe.toFixed(2).replace('.', ',')}`;
}

export function enderecoResumido(endereco) {
  if (!endereco) return 'Endereço em breve';
  const partes = [endereco.logradouro, endereco.numero].filter(Boolean);
  return partes.join(', ');
}

export function enderecoCompleto(endereco) {
  if (!endereco) return 'Endereço em breve';
  const linha1 = [endereco.logradouro, endereco.numero].filter(Boolean).join(', ');
  const linha2 = [endereco.bairro, endereco.cidade, endereco.estado].filter(Boolean).join(' — ');
  return [linha1, linha2].filter(Boolean).join(' · ');
}
