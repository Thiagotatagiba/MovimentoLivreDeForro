// localRepository.js
import { lerCatalogo } from './catalogoRepository.js';

async function carregarTodos() {
  return (await lerCatalogo()).locais;
}

export async function listarLocais() {
  const locais = await carregarTodos();
  return locais.filter((l) => l.ativo);
}

export async function buscarLocalPorId(id) {
  const locais = await carregarTodos();
  return locais.find((l) => l.id === id && l.ativo) ?? null;
}

export async function buscarLocalPorSlug(slug) {
  const locais = await carregarTodos();
  return locais.find((l) => l.slug === slug && l.ativo) ?? null;
}
