// Camada de dados. Hoje lê arquivos JSON estáticos; no futuro, troca-se
// apenas a URL do fetch por um endpoint de API — nenhuma outra página
// do site precisa mudar.

let _eventosCache = null;
let _locaisCache = null;

export async function carregarEventos() {
  if (_eventosCache) return _eventosCache;
  const res = await fetch("data/eventos.json");
  if (!res.ok) throw new Error("Não foi possível carregar os eventos.");
  const eventos = await res.json();
  eventos.sort((a, b) => a.data.localeCompare(b.data) || a.horario.localeCompare(b.horario));
  _eventosCache = eventos;
  return eventos;
}

export async function carregarLocais() {
  if (_locaisCache) return _locaisCache;
  const res = await fetch("data/locais.json");
  if (!res.ok) throw new Error("Não foi possível carregar os locais.");
  _locaisCache = await res.json();
  return _locaisCache;
}

export async function buscarLocalPorSlug(slug) {
  const locais = await carregarLocais();
  return locais.find((l) => l.slug === slug) ?? null;
}

export async function buscarEventoPorSlug(slug) {
  const eventos = await carregarEventos();
  return eventos.find((e) => e.slug === slug) ?? null;
}

export async function eventosRelacionados(evento, limite = 3) {
  const eventos = await carregarEventos();
  return eventos
    .filter((e) => e.slug !== evento.slug && (e.cidade === evento.cidade || e.tipo === evento.tipo))
    .slice(0, limite);
}
