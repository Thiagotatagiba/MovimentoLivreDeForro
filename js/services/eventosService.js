import { eventosRepository } from "../repositories/eventosRepository.js";
import { marcasService } from "./marcasService.js";
import { dentroDaJanela, periodoDoDia, noPassado, formatoMusical, ROTULO_FORMATO_MUSICAL } from "../utils.js";

// Camada de serviço: é isso que home.js, agenda.js e evento.js importam —
// nunca o repositório diretamente. Aqui vivem as regras de negócio
// (o que conta como "publicado", janelas de tempo, relacionados, resumos).
// Páginas não sabem, e não precisam saber, de onde os dados vêm.
//
// Depende de marcasService (não o contrário) só para enriquecer a busca por
// texto com o nome da marca — composição de serviços é esperada aqui, o que
// não pode existir é um repositório dependendo de outro repositório.

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

  /** Eventos que batem com filtros de cidade / tipo / entrada / período / música / marca / busca, dentro de uma janela. */
  async listarComFiltros({ dias, cidade, tipo, entrada, periodo, musica, marca, busca } = {}) {
    let eventos = dias != null ? await this.listarPorJanela(dias) : await this.listarTodos();
    if (cidade) eventos = eventos.filter((e) => e.cidade === cidade);
    if (tipo) eventos = eventos.filter((e) => e.tipo === tipo);
    if (entrada === "gratuito") eventos = eventos.filter((e) => e.ingresso?.tipo === "gratuito");
    if (entrada === "pago") eventos = eventos.filter((e) => e.ingresso?.tipo && e.ingresso.tipo !== "gratuito");
    if (periodo) eventos = eventos.filter((e) => periodoDoDia(e) === periodo);
    if (musica) {
      eventos = eventos.filter((e) => {
        const formato = formatoMusical(e);
        return formato && ROTULO_FORMATO_MUSICAL[formato].rotulo === musica;
      });
    }
    if (marca) eventos = eventos.filter((e) => e.marcaSlug === marca);
    if (busca) {
      const termo = busca.trim().toLowerCase();
      const marcasPorSlug = await marcasService.mapaPorSlug();
      eventos = eventos.filter((e) => {
        const nomeMarca = marcasPorSlug.get(e.marcaSlug)?.nome ?? "";
        return [e.titulo, e.cidade, e.tipo, e.descricao, nomeMarca].some((campo) => campo?.toLowerCase().includes(termo));
      });
    }
    return eventos;
  },

  /** Atalho para a visualização semanal: sempre os próximos 7 dias (hoje incluso), com os mesmos filtros. */
  async listarSemana(filtros = {}) {
    return this.listarComFiltros({ ...filtros, dias: 6 });
  },

  /** Próximos eventos de uma marca — usado hoje nos cards, e é o que vai alimentar a futura página da Marca. */
  async listarPorMarca(marcaSlug, filtrosExtras = {}) {
    return this.listarComFiltros({ ...filtrosExtras, marca: marcaSlug });
  },

  /** Eventos passados de uma marca, mais recentes primeiro — base do futuro "Últimos eventos" na página da Marca. */
  async listarHistoricoPorMarca(marcaSlug, limite = 12) {
    const eventos = await this.listarTodos();
    return eventos
      .filter((e) => e.marcaSlug === marcaSlug && noPassado(e))
      .sort((a, b) => b.inicio.localeCompare(a.inicio))
      .slice(0, limite);
  },

  async buscarPorSlug(slug) {
    return eventosRepository.buscarPorSlug(slug);
  },

  async listarRelacionados(evento, limite = 3) {
    const eventos = await this.listarTodos();
    return eventos
      .filter((e) => e.slug !== evento.slug && (e.marcaSlug === evento.marcaSlug || e.cidade === evento.cidade || e.tipo === evento.tipo))
      .slice(0, limite);
  },
};
