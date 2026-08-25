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

const NOMES_DIAS_CURTOS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

function paraISOLocal(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

// Gera os 7 cards de dia pra fileira de destaques da Home.
// Posição 0 = "Hoje", posição 1 = "Amanhã", posições 2-6 = nome do dia da semana.
export function gerarCardsSemana() {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const cards = [];
  for (let i = 0; i < 7; i++) {
    const data = new Date(hoje);
    data.setDate(hoje.getDate() + i);

    let rotulo;
    if (i === 0) rotulo = 'Hoje';
    else if (i === 1) rotulo = 'Amanhã';
    else rotulo = NOMES_DIAS_CURTOS[data.getDay()];

    cards.push({
      rotulo,
      diaDoMes: data.getDate(),
      data: paraISOLocal(data),
      ehHoje: i === 0,
    });
  }
  return cards;
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

// Estilo inline de background pra card/hero de evento. Se não houver imagem
// (ou o campo estiver "em breve"), retorna string vazia e o CSS de .midia
// assume o fundo sólido padrão (var(--cor-clay)) — nunca fica sem visual.
// Se a imagem existir mas o arquivo não carregar, o background-color por
// trás continua garantindo o fallback (camadas de background não quebram
// umas às outras quando uma falha).
export function estiloMidia(imagemUrl) {
  const semImagem = !imagemUrl || imagemUrl === 'em breve';
  if (semImagem) return '';
  return `background-image: linear-gradient(180deg, rgba(20,47,38,0) 40%, rgba(20,47,38,0.7) 100%), url('${imagemUrl}'); background-size: cover; background-position: center;`;
}
