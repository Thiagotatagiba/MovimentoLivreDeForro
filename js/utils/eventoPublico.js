import { formatarHora, formatarDataCurtaComDia, enderecoCompleto } from './format.js';
export function situacaoEvento(e) {
  return ({ cancelado: 'Evento cancelado', adiado: 'Evento adiado', interrompido: 'Evento interrompido' })[e.situacao] ?? '';
}
export function horarioEvento(e) {
  let texto = formatarHora(e.horario);
  if (e.horarioTermino && e.dataTermino) {
    texto += ' \u00e0s ' + formatarHora(e.horarioTermino);
    if (e.dataTermino !== e.data) texto += ' (' + formatarDataCurtaComDia(e.dataTermino) + ')';
    if (e.terminoEstimado) texto += ' \u00b7 t\u00e9rmino estimado';
  }
  return texto;
}
function escaparICS(texto) {
  return String(texto ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\\;')
    .replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}
export function gerarICS(e, agora = new Date()) {
  const instante = (d, h) => d.replace(/-/g, '') + 'T' + h.replace(':', '') + '00';
  const aviso = situacaoEvento(e);
  const linhas = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Vai Ter Forro//PT-BR',
    'BEGIN:VEVENT', 'UID:' + e.id + '@vaiterforro.com.br',
    'DTSTAMP:' + agora.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''),
    'SEQUENCE:' + (e.revisao ?? 0),
    'DTSTART;TZID=America/Sao_Paulo:' + instante(e.data, e.horario)];
  // No fabricated duration for legacy JSON.
  if (e.dataTermino && e.horarioTermino) linhas.push('DTEND;TZID=America/Sao_Paulo:' + instante(e.dataTermino, e.horarioTermino));
  if (['cancelado', 'interrompido'].includes(e.situacao)) linhas.push('STATUS:CANCELLED');
  if (e.situacao === 'adiado') linhas.push('STATUS:TENTATIVE');
  linhas.push('SUMMARY:' + escaparICS([aviso, e.titulo].filter(Boolean).join(' \u2014 ')),
    'LOCATION:' + escaparICS(enderecoCompleto(e.local?.endereco)),
    'DESCRIPTION:' + escaparICS([aviso, horarioEvento(e), e.descricao].filter(Boolean).join('\n')),
    'END:VEVENT', 'END:VCALENDAR');
  return linhas.join('\r\n') + '\r\n';
}
