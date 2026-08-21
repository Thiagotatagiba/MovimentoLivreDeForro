// localService.js
import { buscarLocalPorSlug } from '../repositories/localRepository.js';
import { listarEventosPorLocal } from '../repositories/eventoRepository.js';
import { buscarMarcaPorId } from '../repositories/marcaRepository.js';
import { paraData } from '../utils/format.js';

export async function obterPerfilLocal(slug) {
  const local = await buscarLocalPorSlug(slug);
  if (!local) return null;

  const eventos = await listarEventosPorLocal(local.id);
  const eventosComMarca = await Promise.all(
    eventos.map(async (e) => ({ ...e, marca: await buscarMarcaPorId(e.marcaId) }))
  );

  const hoje = inicioDeHoje();
  const proximos = eventosComMarca
    .filter((e) => paraData(e.data) >= hoje)
    .sort((a, b) => paraData(a.data) - paraData(b.data));

  // Marcas distintas que já usaram este Local — reforça o conceito de que
  // um Local é independente e pode ser usado por várias Marcas ao longo do tempo.
  const marcasDoLocal = [...new Map(
    eventosComMarca.map((e) => [e.marca?.id, e.marca]).filter(([id]) => id)
  ).values()];

  return { local, proximos, marcas: marcasDoLocal };
}

function inicioDeHoje() {
  const agora = new Date();
  agora.setHours(0, 0, 0, 0);
  return agora;
}
