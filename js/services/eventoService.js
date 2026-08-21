// eventoService.js
// Camada de regra de negócio. Combina repositórios, nunca acessa fetch/JSON diretamente.

import { listarEventos, buscarEventoPorSlug } from '../repositories/eventoRepository.js';
import { buscarMarcaPorId } from '../repositories/marcaRepository.js';
import { buscarLocalPorId } from '../repositories/localRepository.js';
import { paraData, ehHoje } from '../utils/format.js';

async function enriquecer(evento) {
  const [marca, local] = await Promise.all([
    buscarMarcaPorId(evento.marcaId),
    buscarLocalPorId(evento.localId),
  ]);
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

function inicioDeHoje() {
  const agora = new Date();
  agora.setHours(0, 0, 0, 0);
  return agora;
}
