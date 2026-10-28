// eventoService.js
// Camada de regra de negócio. Combina repositórios, nunca acessa fetch/JSON.
//
// Revisão 2026-10-28:
// - soft-delete passa a valer: evento de Marca/Local inativo some da agenda
//   (antes continuava aparecendo como "Marca em breve");
// - enriquecimento devolve null para referência quebrada, em vez de objeto
//   com campos nulos;
// - as ocorrências semanais geradas em memória foram REMOVIDAS (2026-10-28,
//   ver DECISOES_DE_ARQUITETURA.md): a agenda mostra apenas eventos reais.

import { listarEventos, buscarEventoPorSlug } from '../repositories/eventoRepository.js';
import { buscarMarcaPorId } from '../repositories/marcaRepository.js';
import { buscarLocalPorId } from '../repositories/localRepository.js';
import { paraData, ehHoje, inicioDoDia } from '../utils/format.js';
import { validarLocalDoEvento } from './eventValidator.js';

async function carregarEventos() {
  return listarEventos();
}

async function enriquecer(evento) {
  const [marca, local] = await Promise.all([
    buscarMarcaPorId(evento.marcaId),
    buscarLocalPorId(evento.localId),
  ]);

  // Marca/Local inexistente ou inativo = evento não deve aparecer.
  if (!marca || !local) {
    console.warn(
      '[integridade referencial] evento ignorado (Marca ou Local inexistente/inativo):',
      evento.slug ?? evento.id
    );
    return null;
  }

  const validacao = validarLocalDoEvento(evento, marca, local);
  if (!validacao.valido) {
    console.warn('[integridade referencial]', validacao.motivo);
  }

  return { ...evento, marca, local };
}

async function enriquecerTodos(lista) {
  const enriquecidos = await Promise.all(lista.map(enriquecer));
  return enriquecidos.filter(Boolean);
}

function ordenar(a, b) {
  return a.data.localeCompare(b.data) || String(a.horario ?? '').localeCompare(String(b.horario ?? ''));
}

export async function listarAgendaOrdenada() {
  const eventos = await carregarEventos();
  const hoje = inicioDoDia();
  const futuros = eventos
    .filter((evento) => paraData(evento.data) >= hoje)
    .sort(ordenar);
  return enriquecerTodos(futuros);
}

export async function listarEventosDeHoje() {
  const eventos = await carregarEventos();
  return enriquecerTodos(eventos.filter((evento) => ehHoje(evento.data)).sort(ordenar));
}

export async function obterEventoCompleto(slug) {
  const evento = await buscarEventoPorSlug(slug);
  if (!evento) return null;
  return enriquecer(evento);
}

// Usado pela página de Favoritos: ids reais salvos em interacoes.
export async function listarEventosPorIds(ids) {
  const eventos = await carregarEventos();
  return enriquecerTodos(eventos.filter((evento) => ids.includes(evento.id)).sort(ordenar));
}

// Usado pela Tira de Dias da Home: os cards são gerados no mesmo formato
// "YYYY-MM-DD" do JSON, então a comparação é direta.
export async function listarEventosPorData(isoData) {
  const eventos = await carregarEventos();
  return enriquecerTodos(eventos.filter((evento) => evento.data === isoData).sort(ordenar));
}

// Badge de contagem da Tira de Dias. Não enriquece de propósito: pra contar,
// o join com Marca/Local seria trabalho desperdiçado.
export async function contarEventosPorData(isoDatas) {
  const eventos = await carregarEventos();
  const contagem = Object.fromEntries(isoDatas.map((data) => [data, 0]));

  eventos.forEach((evento) => {
    if (contagem[evento.data] !== undefined) {
      contagem[evento.data] += 1;
    }
  });

  return contagem;
}

// Próximo evento a partir de hoje (inclui hoje), para o bloco "Hoje" da Home.
export async function obterProximoEvento() {
  const agenda = await listarAgendaOrdenada();
  return agenda[0] ?? null;
}
