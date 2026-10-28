// marcaService.js
import { listarMarcas, buscarMarcaPorSlug } from '../repositories/marcaRepository.js';
import { listarEventosPorMarca } from '../repositories/eventoRepository.js';
import { buscarLocalPorId } from '../repositories/localRepository.js';
import { paraData, inicioDoDia } from '../utils/format.js';

export async function listarMarcasAtivas() {
  return listarMarcas();
}

// Usado pela página de Favoritos: várias marcas pelos ids vindos de
// interacaoService.listarSeguindo().
export async function listarMarcasPorIds(ids) {
  const marcas = await listarMarcas();
  return marcas.filter((marca) => ids.includes(marca.id));
}

export async function obterPerfilMarca(slug) {
  const marca = await buscarMarcaPorSlug(slug);
  if (!marca) return null;

  const [eventosReais, localPadrao] = await Promise.all([
    listarEventosPorMarca(marca.id),
    marca.localPadraoId ? buscarLocalPorId(marca.localPadraoId) : Promise.resolve(null),
  ]);

  const hoje = inicioDoDia();

  // Só eventos reais: as ocorrências semanais geradas foram removidas em
  // 2026-10-28 (ver DECISOES_DE_ARQUITETURA.md).
  const eventos = eventosReais;

  const eventosComLocal = await Promise.all(
    eventos.map(async (evento) => ({ ...evento, local: await buscarLocalPorId(evento.localId) }))
  );

  const proximos = eventosComLocal
    .filter((evento) => paraData(evento.data) >= hoje)
    .sort((a, b) => a.data.localeCompare(b.data) || String(a.horario).localeCompare(String(b.horario)));
  const historico = eventosComLocal
    .filter((evento) => paraData(evento.data) < hoje)
    .sort((a, b) => b.data.localeCompare(a.data));

  return { marca, localPadrao, proximos, historico };
}
