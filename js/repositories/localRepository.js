// localRepository.js
const DATA_URL = 'data/locais.json';

let cache = null;

async function carregarTodos() {
  if (cache) return cache;
  const resposta = await fetch(DATA_URL);
  if (!resposta.ok) {
    throw new Error(`Não foi possível carregar locais (${resposta.status})`);
  }
  cache = await resposta.json();
  return cache;
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
