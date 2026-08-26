// marcaService.js
import { listarMarcas, buscarMarcaPorSlug } from '../repositories/marcaRepository.js';
import { listarEventosPorMarca } from '../repositories/eventoRepository.js';
import { buscarLocalPorId } from '../repositories/localRepository.js';
import { paraData } from '../utils/format.js';

export async function listarMarcasAtivas() {
  return listarMarcas();
}

export async function obterPerfilMarca(slug) {
  const marca = await buscarMarcaPorSlug(slug);
  if (!marca) return null;

  const [eventos, localPadrao] = await Promise.all([
    listarEventosPorMarca(marca.id),
    marca.localPadraoId ? buscarLocalPorId(marca.localPadraoId) : Promise.resolve(null),
  ]);

  const eventosComLocal = await Promise.all(
    eventos.map(async (e) => ({ ...e, local: await buscarLocalPorId(e.localId) }))
  );

  const hoje = inicioDeHoje();
  const proximos = eventosComLocal
    .filter((e) => paraData(e.data) >= hoje)
    .sort((a, b) => paraData(a.data) - paraData(b.data));
  const historico = eventosComLocal
    .filter((e) => paraData(e.data) < hoje)
    .sort((a, b) => paraData(b.data) - paraData(a.data));

  return { marca, localPadrao, proximos, historico };
}

function inicioDeHoje() {
  const agora = new Date();
  agora.setHours(0, 0, 0, 0);
  return agora;
}