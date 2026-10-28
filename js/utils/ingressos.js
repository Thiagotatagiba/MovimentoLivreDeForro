// js/utils/ingressos.js
// Regras da Carteira de ingressos que não dependem de DOM nem de Supabase.
// Funções puras: recebem o "agora" por parâmetro, então são fáceis de testar.

// Baile costuma ir até de madrugada ("09 out 22:00 > 10 out 04:00"). Sem
// tolerância, à 1h da manhã do dia seguinte o ingresso já estaria arquivado,
// justo quando a pessoa ainda precisa dele na porta. Por isso o ingresso só
// é arquivado depois que passam algumas horas da virada do dia.
export const TOLERANCIA_MADRUGADA_HORAS = 6;

function doisDigitos(n) {
  return String(n).padStart(2, '0');
}

// "2026-10-09" no fuso LOCAL (toISOString() daria o dia em UTC e erraria à noite).
export function dataLocalISO(data) {
  return `${data.getFullYear()}-${doisDigitos(data.getMonth() + 1)}-${doisDigitos(data.getDate())}`;
}

// O "hoje" usado pra decidir o arquivamento: o dia de agora menos a tolerância.
export function hojeEfetivoISO(agora = new Date()) {
  return dataLocalISO(new Date(agora.getTime() - TOLERANCIA_MADRUGADA_HORAS * 3600 * 1000));
}

// dataEvento vem do banco como "YYYY-MM-DD", que ordena igual a como compara
// como texto — então não precisa converter pra Date (e escapa de bug de fuso).
export function ehArquivado(dataEvento, agora = new Date()) {
  return dataEvento < hojeEfetivoISO(agora);
}

// Divide em { ativos, arquivados }. Ativos: o mais próximo primeiro, e os já
// usados vão pro fim da lista. Arquivados: o mais recente primeiro.
export function separarIngressos(ingressos, agora = new Date()) {
  const ativos = [];
  const arquivados = [];
  for (const ingresso of ingressos) {
    (ehArquivado(ingresso.dataEvento, agora) ? arquivados : ativos).push(ingresso);
  }

  ativos.sort((a, b) => {
    const usadoA = a.usadoEm ? 1 : 0;
    const usadoB = b.usadoEm ? 1 : 0;
    if (usadoA !== usadoB) return usadoA - usadoB;
    return a.dataEvento.localeCompare(b.dataEvento);
  });
  arquivados.sort((a, b) => b.dataEvento.localeCompare(a.dataEvento));

  return { ativos, arquivados };
}

// "2026-10-09" -> "09/10/2026"
export function formatarDataBR(dataISO) {
  const [ano, mes, dia] = dataISO.split('-');
  return `${dia}/${mes}/${ano}`;
}

// "2026-10-09T22:41:00Z" -> "09/10 às 22:41" (no fuso de quem está olhando)
export function formatarMomento(timestamp) {
  const d = new Date(timestamp);
  return `${doisDigitos(d.getDate())}/${doisDigitos(d.getMonth() + 1)} às ${doisDigitos(d.getHours())}:${doisDigitos(d.getMinutes())}`;
}

// Escolhe o que mostrar na tela: se o ingresso aponta pra um evento da agenda
// que ainda existe, o catálogo manda (evento remarcado, título corrigido...).
// Senão usa a cópia guardada no ingresso, que nunca deixa de existir.
export function dadosParaExibir(ingresso, eventoDoCatalogo) {
  if (eventoDoCatalogo) {
    return {
      titulo: eventoDoCatalogo.titulo,
      dataEvento: eventoDoCatalogo.data,
      daAgenda: true,
      slug: eventoDoCatalogo.slug,
    };
  }
  return { titulo: ingresso.titulo, dataEvento: ingresso.dataEvento, daAgenda: false, slug: null };
}

// Procura eventos do catálogo pelo que a pessoa digitou. Ignora maiúsculas e
// acentos ("forro" acha "Forró"). Mostra primeiro os que ainda vão acontecer
// (o mais próximo antes), depois os que já passaram (o mais recente antes).
export function buscarEventosParaSugestao(eventos, texto, hojeISO, limite = 6) {
  const normalizar = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const busca = normalizar(texto.trim());
  if (!busca) return [];

  const achados = eventos.filter((e) => {
    const alvo = normalizar(`${e.titulo} ${e.marca?.nome ?? ''}`);
    return alvo.includes(busca);
  });

  const futuros = achados.filter((e) => e.data >= hojeISO).sort((a, b) => a.data.localeCompare(b.data));
  const passados = achados.filter((e) => e.data < hojeISO).sort((a, b) => b.data.localeCompare(a.data));
  return [...futuros, ...passados].slice(0, limite);
}

// ---- Imagem do ingresso ----
// O bucket do Supabase aplica os mesmos limites no servidor (5 MB; JPG/PNG/WebP),
// então isso aqui é só pra avisar a pessoa na hora, sem esperar o upload falhar.
export const TAMANHO_MAXIMO_BYTES = 5 * 1024 * 1024;
export const EXTENSOES_IMAGEM = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
export const FORMATOS_ACEITOS = 'JPG, PNG ou WebP';

// Devolve null se a imagem serve, ou a mensagem do que está errado.
export function validarImagem(arquivo) {
  if (!arquivo) return 'Anexe o print do ingresso.';
  if (!EXTENSOES_IMAGEM[arquivo.type]) {
    return `Formato não aceito. Envie um print em ${FORMATOS_ACEITOS}.`;
  }
  if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
    return 'Imagem muito grande (máximo 5 MB). Um print de tela costuma ser bem menor que uma foto da câmera.';
  }
  return null;
}
