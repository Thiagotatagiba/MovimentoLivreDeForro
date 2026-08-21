// eventoRepository.js
// Única responsabilidade: buscar eventos da fonte de dados (hoje JSON, futuramente Supabase).
// Nunca conter regra de negócio aqui — isso é papel do service.

const DATA_URL = 'data/eventos.json';

let cache = null;

async function carregarTodos() {
  if (cache) return cache;
  const resposta = await fetch(DATA_URL);
  if (!resposta.ok) {
    throw new Error(`Não foi possível carregar eventos (${resposta.status})`);
  }
  cache = await resposta.json();
  return cache;
}

export async function listarEventos() {
  const eventos = await carregarTodos();
  return eventos.filter((e) => e.ativo);
}

export async function buscarEventoPorSlug(slug) {
  const eventos = await carregarTodos();
  return eventos.find((e) => e.slug === slug && e.ativo) ?? null;
}

export async function listarEventosPorMarca(marcaId) {
  const eventos = await carregarTodos();
  return eventos.filter((e) => e.marcaId === marcaId && e.ativo);
}

export async function listarEventosPorLocal(localId) {
  const eventos = await carregarTodos();
  return eventos.filter((e) => e.localId === localId && e.ativo);
}
