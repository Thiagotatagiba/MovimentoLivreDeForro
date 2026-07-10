import { eventosRepository } from "../repositories/eventosRepository.js";
import { dentroDaJanela, periodoDoDia } from "../utils.js";

// Camada de serviço: é isso que home.js, agenda.js e evento.js importam —
// nunca o repositório diretamente. Aqui vivem as regras de negócio
// (o que conta como "publicado", janelas de tempo, relacionados, resumos).
// Páginas não sabem, e não precisam saber, de onde os dados vêm.

export const eventosService = {
  /** Todos os eventos visíveis ao público (exclui rascunhos e cancelados). */
  async listarTodos() {
    const eventos = await eventosRepository.listar();
    return eventos.filter((e) => e.status === "publicado");
  },

  /** Eventos dentro de uma janela de dias a partir de hoje (0 = hoje, 1 = hoje+amanhã, etc.). */
  async listarPorJanela(dias) {
    const eventos = await this.listarTodos();
    return eventos.filter((e) => dentroDaJanela(e, dias));
  },

  /** Eventos que batem com filtros de cidade / tipo / entrada / período / música / busca, dentro de uma janela. */
  async listarComFiltros({ dias, cidade, tipo, entrada, periodo, musica, busca } = {}) {
    let eventos = dias != null ? await this.listarPorJanela(dias) : await this.listarTodos();
    if (cidade) eventos = eventos.filter((e) => e.cidade === cidade);
    if (tipo) eventos = eventos.filter((e) => e.tipo === tipo);
    if (entrada) eventos = eventos.filter((e) => e.entrada === entrada);
    if (periodo) eventos = eventos.filter((e) => periodoDoDia(e) === periodo);
    if (musica) eventos = eventos.filter((e) => e.musica === musica);
    if (busca) {
      const termo = busca.trim().toLowerCase();
      eventos = eventos.filter((e) =>
        [e.titulo, e.cidade, e.tipo, e.descricao].some((campo) => campo?.toLowerCase().includes(termo))
      );
    }
    return eventos;
  },

  /** Atalho para a visualização semanal: sempre os próximos 7 dias (hoje incluso), com os mesmos filtros. */
  async listarSemana(filtros = {}) {
    return this.listarComFiltros({ ...filtros, dias: 6 });
  },

  async buscarPorSlug(slug) {
    return eventosRepository.buscarPorSlug(slug);
  },

  async listarRelacionados(evento, limite = 3) {
    const eventos = await this.listarTodos();
    return eventos
      .filter((e) => e.slug !== evento.slug && (e.cidade === evento.cidade || e.tipo === evento.tipo))
      .slice(0, limite);
  },

  /** Números-resumo da semana, usados no bloco de destaque da Home. */
  async resumoDaSemana() {
    const eventos = await this.listarPorJanela(6);
    const cidades = new Set(eventos.map((e) => e.cidade));
    const aulas = eventos.filter((e) => e.tipo === "Aula").length;
    return { totalEventos: eventos.length, totalCidades: cidades.size, totalAulas: aulas };
  },
};
