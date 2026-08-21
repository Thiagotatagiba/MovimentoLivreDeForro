// marcaRepository.js
const DATA_URL = 'data/marcas.json';

let cache = null;

async function carregarTodas() {
  if (cache) return cache;
  const resposta = await fetch(DATA_URL);
  if (!resposta.ok) {
    throw new Error(`Não foi possível carregar marcas (${resposta.status})`);
  }
  cache = await resposta.json();
  return cache;
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
