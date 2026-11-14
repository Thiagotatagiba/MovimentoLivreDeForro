// marcaRepository.js
import { lerCatalogo } from './catalogoRepository.js';

async function carregarTodas() {
  return (await lerCatalogo()).marcas;
}

export async function listarMarcas() {
  const marcas = await carregarTodas();
  return marcas.filter((m) => m.ativo);
}

export async function buscarMarcaPorId(id) {
  const marcas = await carregarTodas();
  return marcas.find((m) => m.id === id && m.ativo) ?? null;
}

export async function buscarMarcaPorSlug(slug) {
  const marcas = await carregarTodas();
  return marcas.find((m) => m.slug === slug && m.ativo) ?? null;
}
