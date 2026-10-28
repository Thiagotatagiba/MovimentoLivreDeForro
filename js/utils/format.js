// format.js
// Funções puras de formatação e utilidades de texto. Nunca acessam
// repositório nem DOM.
//
// Revisão 2026-10-28: helpers que estavam duplicados ou faltando
// (normalizar, escaparHtml, inicioDoDia, formatarHora, preço curto) e
// correção da capitalização de datas em pt-BR.

export const DIAS_SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
export const NOMES_DIAS_CURTOS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const NOMES_MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho',
  'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

// "Forró" → "forro": minúsculo e sem acento, para busca tolerante.
export function normalizar(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

// Escapa texto que vai entrar em template string com innerHTML.
// Dados vêm do JSON editado no admin: hoje é conteúdo controlado, mas o
// cadastro vai abrir para colaboradores — melhor já estar seguro.
export function escaparHtml(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function paraData(isoString) {
  // eventos.json guarda "2026-08-21" (sem hora) — construir em horário local evita
  // o bug clássico de virar o dia anterior por causa de fuso UTC.
  const [ano, mes, dia] = isoString.split('-').map(Number);
  return new Date(ano, mes - 1, dia);
}

export function paraISOLocal(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

export function inicioDoDia(data = new Date()) {
  const d = new Date(data);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function formatarDataCurta(isoString) {
  const data = paraData(isoString);
  return `${String(data.getDate()).padStart(2, '0')} ${MESES[data.getMonth()]}`;
}

// "30 out" + dia da semana abreviado → "Sex, 30 out"
export function formatarDataCurtaComDia(isoString) {
  const diaSemana = capitalizar(formatarDiaSemana(isoString)).slice(0, 3);
  return `${diaSemana}, ${formatarDataCurta(isoString)}`;
}

export function capitalizar(texto) {
  const valor = String(texto ?? '');
  return valor.charAt(0).toUpperCase() + valor.slice(1);
}

export function formatarDiaSemana(isoString) {
  const data = paraData(isoString);
  return DIAS_SEMANA[data.getDay()];
}

// Transforma ["sábado"] em "Sábados", ["quinta", "domingo"] em "Quintas e Domingos".
// Pluralização por "+s" funciona certo pros 7 dias da semana em português.
export function formatarDiasSemana(dias) {
  if (!dias || dias.length === 0) return '';

  const plural = dias.map((dia) => String(dia).charAt(0).toUpperCase() + String(dia).slice(1) + 's');

  if (plural.length === 1) return plural[0];
  if (plural.length === 2) return `${plural[0]} e ${plural[1]}`;
  return `${plural.slice(0, -1).join(', ')} e ${plural.at(-1)}`;
}

export function formatarDataCompleta(isoString) {
  const data = paraData(isoString);
  const diaSemana = DIAS_SEMANA[data.getDay()];
  return `${diaSemana}, ${data.getDate()} de ${NOMES_MESES[data.getMonth()]}`;
}

export function ehHoje(isoString) {
  const hoje = new Date();
  const data = paraData(isoString);
  return hoje.toDateString() === data.toDateString();
}

// "20:00" → "20h" | "21:30" → "21h30"
export function formatarHora(horario) {
  if (!horario) return '';
  const [hora, minuto] = String(horario).split(':');
  if (minuto && minuto !== '00') return `${hora}h${minuto}`;
  return `${hora}h`;
}

// Preço para selo de card. Sempre "A partir de", porque o valor do campo é
// mínimo (lote/portaria podem ser maiores) — evita prometer preço fixo.
// Retorna null quando o valor é desconhecido (aí o selo nem aparece).
export function formatarPrecoCurto(precoAPartirDe) {
  if (precoAPartirDe === 0) return 'Grátis';
  if (precoAPartirDe == null) return null;
  const valor = Number(precoAPartirDe);
  if (Number.isNaN(valor)) return null;
  const texto = valor % 1 === 0 ? String(valor) : valor.toFixed(2).replace('.', ',');
  return `A partir de R$ ${texto}`;
}

export function formatarPreco(precoAPartirDe) {
  if (precoAPartirDe === 0) return 'Entrada gratuita';
  if (precoAPartirDe == null) return 'Valor em breve';
  const valor = Number(precoAPartirDe);
  const texto = valor % 1 === 0 ? String(valor) : valor.toFixed(2).replace('.', ',');
  return `A partir de R$ ${texto}`;
}

export function enderecoResumido(endereco) {
  if (!endereco) return 'Endereço em breve';
  const partes = [endereco.logradouro, endereco.numero].filter(Boolean);
  return partes.join(', ') || 'Endereço em breve';
}

export function enderecoCompleto(endereco) {
  if (!endereco) return 'Endereço em breve';
  const linha1 = [endereco.logradouro, endereco.numero].filter(Boolean).join(', ');
  const linha2 = [endereco.bairro, endereco.cidade, endereco.estado].filter(Boolean).join(' — ');
  return [linha1, linha2].filter(Boolean).join(' · ');
}

// Redes sociais: aceita URL completa, @handle ou telefone cru e devolve um
// link válido — ou null quando não dá pra montar. Antes cada página repetia
// essa lógica e um telefone sem https virava link relativo quebrado.
export function linkInstagram(valor) {
  const texto = String(valor ?? '').trim();
  if (!texto || texto === 'em breve') return null;
  if (/^https?:\/\//i.test(texto)) return texto;
  return `https://instagram.com/${texto.replace(/^@/, '')}`;
}

export function linkWhatsapp(valor) {
  const texto = String(valor ?? '').trim();
  if (!texto || texto === 'em breve') return null;
  if (/^https?:\/\//i.test(texto)) return texto;
  const digitos = texto.replace(/\D/g, '');
  if (digitos.length < 10) return null;
  return `https://wa.me/${digitos.startsWith('55') ? digitos : `55${digitos}`}`;
}

export function linkTelefone(valor) {
  const digitos = String(valor ?? '').replace(/\D/g, '');
  return digitos.length >= 10 ? `tel:${digitos}` : null;
}

// Rota até o Local: usa coordenadas quando existem (mais preciso), senão o
// endereço completo; por último, o link curto do Maps.
export function linkRota(local) {
  if (!local) return null;

  if (local.latitude != null && local.longitude != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${local.latitude},${local.longitude}`;
  }

  const enderecoTexto = enderecoCompleto(local.endereco);
  if (enderecoTexto && enderecoTexto !== 'Endereço em breve') {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(enderecoTexto)}`;
  }

  return local.mapsLink ?? null;
}

// Estilo inline de background para capas (evento, Marca, Local, story).
// Só a imagem: tamanho/posição e o véu de legibilidade são do CSS. Antes o
// gradiente era aplicado duas vezes e a posição inline vencia o ajuste de
// enquadramento do evento.
export function estiloMidia(imagemUrl) {
  const semImagem = !imagemUrl || imagemUrl === 'em breve';
  if (semImagem) return '';
  return `background-image: url('${escaparHtml(imagemUrl)}');`;
}

// Imagem do evento: a própria, se existir; senão a capa da Marca.
export function imagemDoEvento(evento) {
  const propria = evento.imagemUrl;
  if (propria && propria !== 'em breve') return propria;
  return evento.marca?.capa ?? null;
}

export function estiloCapa(capaUrl) {
  if (!capaUrl) return '';
  return `background-image: url('${escaparHtml(capaUrl)}');`;
}

// Gera os 7 cards de dia pra fileira de destaques da Home.
// Posição 0 = "Hoje", posição 1 = "Amanhã", posições 2-6 = nome do dia da semana.
export function gerarCardsSemana() {
  const hoje = inicioDoDia();

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
      mesAbreviado: MESES[data.getMonth()].toUpperCase(),
      data: paraISOLocal(data),
      ehHoje: i === 0,
    });
  }
  return cards;
}
