// localService.js
// Perfil do Local: próximos eventos, marcas que já usaram o espaço.
//
// Revisão 2026-10-28: respeita Marca inativa (soft-delete) e não gera mais
// ocorrências semanais — só eventos reais.

import { buscarLocalPorSlug } from '../repositories/localRepository.js';
import { listarEventos } from '../repositories/eventoRepository.js';
import { listarMarcas } from '../repositories/marcaRepository.js';
import { paraData, inicioDoDia } from '../utils/format.js';

export async function obterPerfilLocal(slug) {
  const local = await buscarLocalPorSlug(slug);
  if (!local) return null;

  const [eventos, marcas] = await Promise.all([listarEventos(), listarMarcas()]);
  const marcasPorId = new Map(marcas.map((marca) => [marca.id, marca]));

  const eventosDoLocal = eventos
    .filter((evento) => evento.localId === local.id)
    .map((evento) => ({ ...evento, marca: marcasPorId.get(evento.marcaId) ?? null }))
    .filter((evento) => evento.marca);

  const hoje = inicioDoDia();
  const proximos = eventosDoLocal
    .filter((evento) => paraData(evento.data) >= hoje)
    .sort((a, b) => a.data.localeCompare(b.data) || String(a.horario).localeCompare(String(b.horario)));

  // Marcas distintas que já usaram este Local — reforça o conceito de que
  // um Local é independente e pode ser usado por várias Marcas ao longo do tempo.
  const marcasDoLocal = [...new Map(
    eventosDoLocal.map((evento) => [evento.marca.id, evento.marca])
  ).values()];

  return { local, proximos, marcas: marcasDoLocal };
}
