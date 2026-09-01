// eventoService.js
// Camada de regra de negócio. Combina repositórios, nunca acessa fetch/JSON diretamente.

import { listarEventos, buscarEventoPorSlug } from '../repositories/eventoRepository.js';
import { buscarMarcaPorId } from '../repositories/marcaRepository.js';
import { buscarLocalPorId } from '../repositories/localRepository.js';
import { paraData, ehHoje } from '../utils/format.js';
import { validarLocalDoEvento } from './eventValidator.js';

async function enriquecer(evento) {
  const [marca, local] = await Promise.all([
    buscarMarcaPorId(evento.marcaId),
    buscarLocalPorId(evento.localId),
  ]);

  const validacao = validarLocalDoEvento(evento, marca);
  if (!validacao.valido) {
    console.warn('[integridade referencial]', validacao.motivo);
  }

  return { ...evento, marca, local };
}

export async function listarAgendaOrdenada() {
  const eventos = await listarEventos();
  const futuros = eventos
    .filter((e) => paraData(e.data) >= inicioDeHoje())
    .sort((a, b) => paraData(a.data) - paraData(b.data));
  return Promise.all(futuros.map(enriquecer));
}

export async function listarEventosDeHoje() {
  const eventos = await listarEventos();
  const hoje = eventos.filter((e) => ehHoje(e.data));
  return Promise.all(hoje.map(enriquecer));
}

export async function obterEventoCompleto(slug) {
  const evento = await buscarEventoPorSlug(slug);
  if (!evento) return null;
  return enriquecer(evento);
}

// Usado pela Tira de Dias da Home: eventos.json guarda "data" como string
// "YYYY-MM-DD", igual o que gerarCardsSemana() calcula pra cada card — então
// dá pra comparar direto como texto, sem precisar reconstruir objetos Date.
export async function listarEventosPorData(isoData) {
  const eventos = await listarEventos();
  const doDia = eventos.filter((e) => e.data === isoData);
  return Promise.all(doDia.map(enriquecer));
}

// Usado pelo badge de contagem da Tira de Dias. Não enriquece com Marca/Local
// de propósito — pra só contar, o join seria trabalho desperdiçado.
export async function contarEventosPorData(isoDatas) {
  const eventos = await listarEventos();
  const contagem = Object.fromEntries(isoDatas.map((data) => [data, 0]));

  eventos.forEach((evento) => {
    if (contagem[evento.data] !== undefined) {
      contagem[evento.data] += 1;
    }
  });

  return contagem;
}

function inicioDeHoje() {
  const agora = new Date();
  agora.setHours(0, 0, 0, 0);
  return agora;
}