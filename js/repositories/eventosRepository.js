// Repositório de eventos.
//
// Contrato (mantido estável independentemente da fonte de dados):
//   listar()            -> Promise<Evento[]>
//   buscarPorSlug(slug) -> Promise<Evento|null>
//
// Hoje lê data/eventos.json. Quando o projeto migrar para Google Calendar
// ou Supabase, cria-se um novo arquivo (ex. googleCalendarEventosRepository.js
// ou supabaseEventosRepository.js) implementando o mesmo contrato, e troca-se
// apenas a importação usada em js/services/eventosService.js.
// Nenhuma página faz fetch de JSON diretamente — todas passam pelo serviço.

let _cache = null;

export const eventosRepository = {
  async listar() {
    if (_cache) return _cache;
    const res = await fetch("data/eventos.json");
    if (!res.ok) throw new Error("Falha ao carregar data/eventos.json");
    const eventos = await res.json();
    eventos.sort((a, b) => a.inicio.localeCompare(b.inicio));
    _cache = eventos;
    return eventos;
  },

  async buscarPorSlug(slug) {
    const eventos = await this.listar();
    return eventos.find((e) => e.slug === slug) ?? null;
  },
};
